import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";

const db = new Database("app.db");

// Recommended pragmas
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

// Initialize Database
db.exec(`
  CREATE TABLE IF NOT EXISTS store (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    closingTime TEXT NOT NULL,
    status TEXT NOT NULL,
    password TEXT NOT NULL,
    bankInfo TEXT
  );

  CREATE TABLE IF NOT EXISTS menu (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    price INTEGER NOT NULL,
    isAvailable INTEGER NOT NULL DEFAULT 1,
    imageUrl TEXT
  );

  CREATE TABLE IF NOT EXISTS orders (
    id TEXT PRIMARY KEY,
    customerPhone TEXT NOT NULL,
    receiveTime TEXT NOT NULL,
    receiveLocation TEXT NOT NULL,
    note TEXT,
    status TEXT NOT NULL,
    totalPrice INTEGER NOT NULL,
    createdAt INTEGER NOT NULL,
    paymentMethod TEXT
  );

  CREATE TABLE IF NOT EXISTS order_items (
    orderId TEXT NOT NULL,
    menuItemId TEXT NOT NULL,
    quantity INTEGER NOT NULL,
    price INTEGER NOT NULL,
    name TEXT NOT NULL
    -- If you want constraints later:
    -- ,FOREIGN KEY(orderId) REFERENCES orders(id) ON DELETE CASCADE
    -- ,FOREIGN KEY(menuItemId) REFERENCES menu(id) ON DELETE SET NULL
  );
`);

// Seed initial store data if empty
const store = db.prepare("SELECT * FROM store WHERE id = 1").get();
if (!store) {
  // ✅ Use parameterized SQL (no quoting issues, no SQL injection)
  db.prepare(
    "INSERT INTO store (id, name, closingTime, status, password, bankInfo) VALUES (?, ?, ?, ?, ?, ?)"
  ).run(
    1,
    "Quán Của Tui",
    "22:00",
    "OPEN",
    "123456",
    "Ngân hàng: VCB\nSTK: 123456789\nTen: NGUYEN VAN A"
  );

  const insertMenu = db.prepare(
    "INSERT INTO menu (id, name, price, isAvailable, imageUrl) VALUES (?, ?, ?, ?, ?)"
  );
  insertMenu.run("1", "Cà phê sữa đá", 25000, 1, "https://picsum.photos/seed/coffee1/200/200");
  insertMenu.run("2", "Bạc xỉu", 30000, 1, "https://picsum.photos/seed/coffee2/200/200");
  insertMenu.run("3", "Trà đào cam sả", 35000, 1, "https://picsum.photos/seed/tea1/200/200");
  insertMenu.run("4", "Trà vải", 35000, 0, "https://picsum.photos/seed/tea2/200/200");
  insertMenu.run("5", "Bánh mì thịt chả", 20000, 1, "https://picsum.photos/seed/bread/200/200");
}

const app = express();
app.use(express.json({ limit: "25mb" }));

// SSE Clients for Real-time updates
type SSEClient = { req: express.Request; res: express.Response };
let clients: SSEClient[] = [];

const broadcast = (type: string, payload: any) => {
  const data = `data: ${JSON.stringify({ type, payload })}\n\n`;
  clients.forEach((c) => {
    try {
      c.res.write(data);
    } catch {
      // ignore broken pipe
    }
  });
};

app.get("/api/events", (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  // Some proxies need this:
  (res as any).flushHeaders?.();

  // Keep-alive ping (optional but helpful)
  const ping = setInterval(() => {
    try {
      res.write(`event: ping\ndata: {}\n\n`);
    } catch {
      // ignore
    }
  }, 25000);

  const client: SSEClient = { req, res };
  clients.push(client);

  req.on("close", () => {
    clearInterval(ping);
    clients = clients.filter((c) => c !== client);
  });
});

// Authentication Middleware
const checkAuth = (req: any, res: any, next: any) => {
  const token = req.headers.authorization;
  const storeData = db.prepare("SELECT password FROM store WHERE id = 1").get() as any;

  if (token && storeData?.password && token === storeData.password) next();
  else res.status(401).json({ error: "Unauthorized" });
};

// API Routes
app.post("/api/auth", (req, res) => {
  const { password } = req.body || {};
  const storeData = db.prepare("SELECT password FROM store WHERE id = 1").get() as any;

  if (password && password === storeData.password) res.json({ token: password });
  else res.status(401).json({ error: "Sai mật khẩu" });
});

app.get("/api/data", (req, res) => {
  const storeData = db
    .prepare("SELECT id, name, closingTime, status, bankInfo FROM store WHERE id = 1")
    .get();

  const menu = db
    .prepare("SELECT * FROM menu")
    .all()
    .map((m: any) => ({ ...m, isAvailable: m.isAvailable === 1 }));

  const orders = db.prepare("SELECT * FROM orders ORDER BY createdAt DESC").all();
  const orderItems = db.prepare("SELECT * FROM order_items").all();

  const ordersWithItems = orders.map((o: any) => ({
    ...o,
    items: orderItems.filter((i: any) => i.orderId === o.id),
  }));

  res.json({ store: storeData, menu, orders: ordersWithItems });
});

app.put("/api/store", checkAuth, (req, res) => {
  const { name, closingTime, status, bankInfo, password } = req.body || {};

  // Minimal validation
  if (!name || !closingTime || !status) {
    return res.status(400).json({ error: "Thiếu name/closingTime/status" });
  }

  if (password) {
    db.prepare("UPDATE store SET name=?, closingTime=?, status=?, bankInfo=?, password=? WHERE id=1").run(
      name,
      closingTime,
      status,
      bankInfo ?? "",
      password
    );
  } else {
    db.prepare("UPDATE store SET name=?, closingTime=?, status=?, bankInfo=? WHERE id=1").run(
      name,
      closingTime,
      status,
      bankInfo ?? ""
    );
  }

  const updated = db
    .prepare("SELECT id, name, closingTime, status, bankInfo FROM store WHERE id = 1")
    .get();

  broadcast("UPDATE_STORE", updated);
  res.json(updated);
});

app.post("/api/menu", checkAuth, (req, res) => {
  const { id, name, price, isAvailable, imageUrl } = req.body || {};

  if (!id || !name || typeof price !== "number") {
    return res.status(400).json({ error: "Thiếu id/name/price" });
  }

  db.prepare("INSERT INTO menu (id, name, price, isAvailable, imageUrl) VALUES (?, ?, ?, ?, ?)")
    .run(id, name, price, isAvailable ? 1 : 0, imageUrl || "");

  broadcast("ADD_MENU_ITEM", { id, name, price, isAvailable: !!isAvailable, imageUrl: imageUrl || "" });
  res.json({ success: true });
});

app.put("/api/menu/:id", checkAuth, (req, res) => {
  const { name, price, isAvailable, imageUrl } = req.body || {};

  if (!name || typeof price !== "number") {
    return res.status(400).json({ error: "Thiếu name/price" });
  }

  db.prepare("UPDATE menu SET name=?, price=?, isAvailable=?, imageUrl=? WHERE id=?")
    .run(name, price, isAvailable ? 1 : 0, imageUrl || "", req.params.id);

  broadcast("UPDATE_MENU_ITEM", { id: req.params.id, name, price, isAvailable: !!isAvailable, imageUrl: imageUrl || "" });
  res.json({ success: true });
});

app.delete("/api/menu/:id", checkAuth, (req, res) => {
  db.prepare("DELETE FROM menu WHERE id=?").run(req.params.id);
  broadcast("DELETE_MENU_ITEM", { id: req.params.id });
  res.json({ success: true });
});

app.post("/api/orders", (req, res) => {
  const {
    id,
    customerPhone,
    receiveTime,
    receiveLocation,
    note,
    status,
    totalPrice,
    createdAt,
    paymentMethod,
    items,
  } = req.body || {};

  if (!id || !customerPhone || !receiveTime || !receiveLocation || !status || typeof totalPrice !== "number" || typeof createdAt !== "number") {
    return res.status(400).json({ error: "Thiếu dữ liệu đơn hàng bắt buộc" });
  }

  const safeItems: any[] = Array.isArray(items) ? items : [];
  if (safeItems.length === 0) {
    return res.status(400).json({ error: "Đơn hàng phải có ít nhất 1 món" });
  }

  db.prepare(
    "INSERT INTO orders (id, customerPhone, receiveTime, receiveLocation, note, status, totalPrice, createdAt, paymentMethod) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"
  ).run(
    id,
    customerPhone,
    receiveTime,
    receiveLocation,
    note ?? "",
    status,
    totalPrice,
    createdAt,
    paymentMethod ?? ""
  );

  const insertItem = db.prepare(
    "INSERT INTO order_items (orderId, menuItemId, quantity, price, name) VALUES (?, ?, ?, ?, ?)"
  );

  // Transaction for performance & consistency
  const insertTx = db.transaction((orderId: string, orderItems: any[]) => {
    for (const item of orderItems) {
      const menuItemId = item.menuItemId || item.id || "";
      const quantity = Number(item.quantity || 0);
      const price = Number(item.price || 0);
      const name = String(item.name || item.nameSnapshot || "");

      if (!menuItemId || !name || quantity <= 0) continue;
      insertItem.run(orderId, menuItemId, quantity, price, name);
    }
  });

  insertTx(id, safeItems);

  const payload = {
    ...req.body,
    note: note ?? "",
    paymentMethod: paymentMethod ?? "",
  };

  broadcast("ADD_ORDER", payload);
  res.json({ success: true });
});

app.put("/api/orders/:id/status", checkAuth, (req, res) => {
  const { status } = req.body || {};
  if (!status) return res.status(400).json({ error: "Thiếu status" });

  db.prepare("UPDATE orders SET status=? WHERE id=?").run(status, req.params.id);
  broadcast("UPDATE_ORDER_STATUS", { id: req.params.id, status });
  res.json({ success: true });
});

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static("dist"));
  }

  const PORT = Number(process.env.PORT || 3000);
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();