// FILE: server.ts
import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";

const db = new Database("app.db");

// Recommended pragmas
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

// ================================
// DB INIT (MULTI-SHOP)
// ================================
db.exec(`
  CREATE TABLE IF NOT EXISTS shops (
    id TEXT PRIMARY KEY,
    slug TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    closingTime TEXT NOT NULL,
    status TEXT NOT NULL,
    password TEXT NOT NULL,
    bankInfo TEXT
  );

  CREATE TABLE IF NOT EXISTS menu (
    id TEXT NOT NULL,
    shopId TEXT NOT NULL,
    name TEXT NOT NULL,
    price INTEGER NOT NULL,
    isAvailable INTEGER NOT NULL DEFAULT 1,
    imageUrl TEXT,
    PRIMARY KEY (id, shopId)
  );

  CREATE TABLE IF NOT EXISTS orders (
    id TEXT PRIMARY KEY,
    shopId TEXT NOT NULL,
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
    shopId TEXT NOT NULL,
    menuItemId TEXT NOT NULL,
    quantity INTEGER NOT NULL,
    price INTEGER NOT NULL,
    name TEXT NOT NULL
  );
`);

// ================================
// MIGRATIONS
// - add phone
// - add logoUrl/bannerUrl for branding
// - add transferQrUrl
// - add menu.stockQty/menu.unit (inventory + unit)
// - add order_items.note
// ================================
const ensureColumns = () => {
  try {
    // --- shops ---
    const shopCols = db.prepare(`PRAGMA table_info(shops)`).all() as any[];
    const shopHas = (name: string) => shopCols.some((c) => String(c.name) === name);

    if (!shopHas("phone")) db.exec(`ALTER TABLE shops ADD COLUMN phone TEXT;`);
    if (!shopHas("logoUrl")) db.exec(`ALTER TABLE shops ADD COLUMN logoUrl TEXT;`);
    if (!shopHas("bannerUrl")) db.exec(`ALTER TABLE shops ADD COLUMN bannerUrl TEXT;`);
    if (!shopHas("transferQrUrl")) db.exec(`ALTER TABLE shops ADD COLUMN transferQrUrl TEXT;`);

    db.exec(`CREATE UNIQUE INDEX IF NOT EXISTS idx_shops_phone_unique ON shops(phone);`);

    // --- menu ---
    const menuCols = db.prepare(`PRAGMA table_info(menu)`).all() as any[];
    const menuHas = (name: string) => menuCols.some((c) => String(c.name) === name);

    if (!menuHas("stockQty")) db.exec(`ALTER TABLE menu ADD COLUMN stockQty INTEGER;`);
    if (!menuHas("unit")) db.exec(`ALTER TABLE menu ADD COLUMN unit TEXT;`);

    // --- order_items ---
    const orderItemCols = db.prepare(`PRAGMA table_info(order_items)`).all() as any[];
    const orderItemHas = (name: string) => orderItemCols.some((c) => String(c.name) === name);

    if (!orderItemHas("note")) db.exec(`ALTER TABLE order_items ADD COLUMN note TEXT;`);
  } catch (e) {
    console.error("Migration ensureColumns failed:", e);
  }
};
ensureColumns();

// ================================
// SEED DEFAULT SHOP (shop_1)
// ================================
const defaultShopId = "shop_1";
const defaultShop = db.prepare("SELECT * FROM shops WHERE id = ?").get(defaultShopId);

if (!defaultShop) {
  db.prepare(
    `INSERT INTO shops (id, slug, name, closingTime, status, password, bankInfo, phone, logoUrl, bannerUrl, transferQrUrl)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    defaultShopId,
    "quan-cua-tui",
    "Quán Của Tui",
    "22:00",
    "OPEN",
    "123456",
    "Ngân hàng: VCB\nSTK: 123456789\nTen: NGUYEN VAN A",
    null,
    "",
    "",
    ""
  );

  const insertMenu = db.prepare(
    "INSERT INTO menu (id, shopId, name, price, isAvailable, imageUrl, stockQty, unit) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
  );

  insertMenu.run("1", defaultShopId, "Cà phê sữa đá", 25000, 1, "https://picsum.photos/seed/coffee1/200/200", null, "");
  insertMenu.run("2", defaultShopId, "Bạc xỉu", 30000, 1, "https://picsum.photos/seed/coffee2/200/200", null, "");
  insertMenu.run("3", defaultShopId, "Trà đào cam sả", 35000, 1, "https://picsum.photos/seed/tea1/200/200", null, "");
  insertMenu.run("4", defaultShopId, "Trà vải", 35000, 0, "https://picsum.photos/seed/tea2/200/200", null, "");
  insertMenu.run("5", defaultShopId, "Bánh mì thịt chả", 20000, 1, "https://picsum.photos/seed/bread/200/200", null, "ổ");
}

const app = express();
app.use(express.json({ limit: "25mb" }));

// ================================
// Helpers (User-lite by slug / phone)
// ================================
const normalizePhone = (p: any) => String(p || "").replace(/\D/g, "");

const getShopIdQuery = (req: any) => String(req.query.shopId || "");
const getShopSlugQuery = (req: any) => String(req.query.slug || "");

const getShopById = (shopId: string) =>
  db.prepare("SELECT * FROM shops WHERE id = ?").get(shopId) as any;

const getShopBySlug = (slug: string) =>
  db.prepare("SELECT * FROM shops WHERE slug = ?").get(slug) as any;

const getShopByPhone = (phone: string) =>
  db.prepare("SELECT * FROM shops WHERE phone = ?").get(phone) as any;

/**
 * Resolve shop:
 * - Prefer slug (clean for URLs)
 * - Fallback shopId (compat old UI)
 * - Final fallback defaultShopId
 */
const resolveShop = (req: any) => {
  const slug = getShopSlugQuery(req);
  if (slug) {
    const s = getShopBySlug(slug);
    if (s) return s;
  }

  const shopId = getShopIdQuery(req);
  if (shopId) {
    const s = getShopById(shopId);
    if (s) return s;
  }

  return getShopById(defaultShopId);
};

const getShopId = (req: any) => {
  const shop = resolveShop(req);
  return shop?.id || defaultShopId;
};

const clampInt = (n: any, min: number, max: number) => {
  const x = Number(n);
  if (!Number.isFinite(x)) return min;
  const v = Math.floor(x);
  return Math.max(min, Math.min(max, v));
};

const isAllowedOrderStatus = (status: any) => {
  const s = String(status || "");
  return s === "NEW" || s === "CONFIRMED" || s === "DONE" || s === "REJECTED";
};

// ================================
// SSE
// ================================
type SSEClient = { req: express.Request; res: express.Response; shopId?: string };
let clients: SSEClient[] = [];

const broadcast = (type: string, payload: any, shopId?: string) => {
  const data = `data: ${JSON.stringify({ type, payload })}\n\n`;
  clients.forEach((c) => {
    if (c.shopId && shopId && c.shopId !== shopId) return;
    try {
      c.res.write(data);
    } catch {}
  });
};

app.get("/api/events", (req, res) => {
  const slug = String(req.query.slug || "");
  const shopIdFromQuery = String(req.query.shopId || "");

  let shopId = "";
  if (slug) {
    const s = getShopBySlug(slug);
    if (s?.id) shopId = s.id;
  }
  if (!shopId && shopIdFromQuery) shopId = shopIdFromQuery;

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  (res as any).flushHeaders?.();

  const ping = setInterval(() => {
    try {
      res.write(`event: ping\ndata: {}\n\n`);
    } catch {}
  }, 25000);

  const client: SSEClient = { req, res, shopId: shopId || undefined };
  clients.push(client);

  req.on("close", () => {
    clearInterval(ping);
    clients = clients.filter((c) => c !== client);
  });
});

// ================================
// Auth middleware (per shop)
// ================================
const checkAuth = (req: any, res: any, next: any) => {
  const token = req.headers.authorization;
  const shop = resolveShop(req);

  if (!shop) return res.status(404).json({ error: "Shop not found" });

  if (token && shop.password && token === shop.password) next();
  else res.status(401).json({ error: "Unauthorized" });
};

// ================================
// API ROUTES
// ================================

// (Optional) list shops - debug
app.get("/api/shops", (req, res) => {
  const shops = db
    .prepare("SELECT id, slug, name, closingTime, status FROM shops ORDER BY rowid DESC")
    .all();
  res.json({ shops });
});

// Resolve a shop by slug or shopId
app.get("/api/shop", (req, res) => {
  const shop = resolveShop(req);
  if (!shop) return res.status(404).json({ error: "Shop not found" });

  res.json({
    id: shop.id,
    slug: shop.slug,
    name: shop.name,
    closingTime: shop.closingTime,
    status: shop.status,
  });
});

// Resolve by phone -> slug
app.post("/api/shops/resolve", (req, res) => {
  const phone = normalizePhone(req.body?.phone);
  if (!phone || phone.length < 9) {
    return res.status(400).json({ error: "Số điện thoại không hợp lệ" });
  }
  const shop = getShopByPhone(phone);
  if (!shop) return res.status(404).json({ error: "Không tìm thấy quán theo số điện thoại này" });

  res.json({ slug: shop.slug, id: shop.id, name: shop.name });
});

// Create shop
app.post("/api/shops", (req, res) => {
  const { slug, name, closingTime, password, bankInfo, phone } = req.body || {};

  const safePhone = normalizePhone(phone);
  if (!safePhone || safePhone.length < 9) {
    return res.status(400).json({ error: "Thiếu hoặc sai Số điện thoại" });
  }

  if (!slug || !name || !closingTime || !password) {
    return res.status(400).json({ error: "Thiếu slug/name/closingTime/password" });
  }

  const safeSlug = String(slug).trim().toLowerCase();
  if (!/^[a-z0-9-]{3,50}$/.test(safeSlug)) {
    return res.status(400).json({ error: "Slug chỉ gồm a-z, 0-9, dấu -, dài 3-50 ký tự" });
  }

  const existingByPhone = db.prepare("SELECT id FROM shops WHERE phone = ?").get(safePhone);
  if (existingByPhone) {
    return res.status(409).json({
      error: "Số điện thoại này đã có quán. Bấm “Tôi đã có quán” để đăng nhập.",
      code: "PHONE_EXISTS",
    });
  }

  const existingBySlug = db.prepare("SELECT id FROM shops WHERE slug = ?").get(safeSlug);
  if (existingBySlug) {
    return res.status(409).json({ error: "Slug đã tồn tại, hãy tạo lại", code: "SLUG_EXISTS" });
  }

  const id = `shop_${Date.now()}`;

  db.prepare(
    `INSERT INTO shops (id, slug, name, closingTime, status, password, bankInfo, phone, logoUrl, bannerUrl, transferQrUrl)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    id,
    safeSlug,
    String(name),
    String(closingTime),
    "OPEN",
    String(password),
    String(bankInfo || ""),
    safePhone,
    "",
    "",
    ""
  );

  res.json({
    success: true,
    token: String(password),
    shop: {
      id,
      slug: safeSlug,
      name: String(name),
      closingTime: String(closingTime),
      status: "OPEN",
      phone: safePhone,
      logoUrl: "",
      bannerUrl: "",
      transferQrUrl: "",
    },
  });
});

// ---- Auth ----
app.post("/api/auth", (req, res) => {
  const { password, phone } = req.body || {};
  const pass = String(password || "");

  if (!pass) return res.status(400).json({ error: "Thiếu mật khẩu" });

  const p = normalizePhone(phone);
  if (p) {
    const shop = getShopByPhone(p);
    if (!shop) return res.status(404).json({ error: "Không tìm thấy quán theo số điện thoại này" });

    if (pass === shop.password) return res.json({ token: pass, slug: shop.slug });
    return res.status(401).json({ error: "Sai mật khẩu" });
  }

  const shop = resolveShop(req);
  if (!shop) return res.status(404).json({ error: "Shop not found" });

  if (pass === shop.password) return res.json({ token: pass, slug: shop.slug });
  return res.status(401).json({ error: "Sai mật khẩu" });
});

// ---- Data ----
app.get("/api/data", (req, res) => {
  const shop = resolveShop(req);
  if (!shop) return res.status(404).json({ error: "Shop not found" });

  const shopId = shop.id;

  const store = db
    .prepare(
      "SELECT id, slug, name, closingTime, status, bankInfo, logoUrl, bannerUrl, transferQrUrl FROM shops WHERE id = ?"
    )
    .get(shopId);

  if (!store) return res.status(404).json({ error: "Shop not found" });

  const menu = db
    .prepare("SELECT * FROM menu WHERE shopId = ?")
    .all(shopId)
    .map((m: any) => ({
      ...m,
      isAvailable: m.isAvailable === 1,
      stockQty: m.stockQty === null || m.stockQty === undefined ? undefined : Number(m.stockQty),
      unit: typeof m.unit === "string" ? m.unit : "",
    }));

  const orders = db.prepare("SELECT * FROM orders WHERE shopId = ? ORDER BY createdAt DESC").all(shopId);
  const orderItems = db.prepare("SELECT * FROM order_items WHERE shopId = ?").all(shopId);

  const ordersWithItems = orders.map((o: any) => ({
    ...o,
    items: orderItems
      .filter((i: any) => i.orderId === o.id)
      .map((i: any) => ({
        ...i,
        note: typeof i.note === "string" ? i.note : "",
      })),
  }));

  res.json({ store, menu, orders: ordersWithItems });
});

// Update shop info
app.put("/api/store", checkAuth, (req, res) => {
  const shop = resolveShop(req);
  if (!shop) return res.status(404).json({ error: "Shop not found" });

  const shopId = shop.id;
  const { name, closingTime, status, bankInfo, password, logoUrl, bannerUrl, transferQrUrl } = req.body || {};

  if (!name || !closingTime || !status) {
    return res.status(400).json({ error: "Thiếu name/closingTime/status" });
  }

  const safeLogoUrl = typeof logoUrl === "string" ? logoUrl : "";
  const safeBannerUrl = typeof bannerUrl === "string" ? bannerUrl : "";
  const safeTransferQrUrl = typeof transferQrUrl === "string" ? transferQrUrl : "";

  if (password) {
    db.prepare(
      "UPDATE shops SET name=?, closingTime=?, status=?, bankInfo=?, password=?, logoUrl=?, bannerUrl=?, transferQrUrl=? WHERE id=?"
    ).run(
      name,
      closingTime,
      status,
      bankInfo ?? "",
      password,
      safeLogoUrl,
      safeBannerUrl,
      safeTransferQrUrl,
      shopId
    );
  } else {
    db.prepare(
      "UPDATE shops SET name=?, closingTime=?, status=?, bankInfo=?, logoUrl=?, bannerUrl=?, transferQrUrl=? WHERE id=?"
    ).run(
      name,
      closingTime,
      status,
      bankInfo ?? "",
      safeLogoUrl,
      safeBannerUrl,
      safeTransferQrUrl,
      shopId
    );
  }

  const updated = db
    .prepare(
      "SELECT id, slug, name, closingTime, status, bankInfo, logoUrl, bannerUrl, transferQrUrl FROM shops WHERE id = ?"
    )
    .get(shopId);

  broadcast("UPDATE_STORE", updated, shopId);
  res.json(updated);
});

// Add menu item
app.post("/api/menu", checkAuth, (req, res) => {
  const shop = resolveShop(req);
  if (!shop) return res.status(404).json({ error: "Shop not found" });

  const shopId = shop.id;
  const { id, name, price, isAvailable, imageUrl, stockQty, unit } = req.body || {};

  if (!id || !name || typeof price !== "number") {
    return res.status(400).json({ error: "Thiếu id/name/price" });
  }

  const safeStock =
    stockQty === null || stockQty === undefined || stockQty === ""
      ? null
      : Number.isFinite(Number(stockQty))
      ? Math.max(0, Math.floor(Number(stockQty)))
      : null;

  const safeUnit = typeof unit === "string" ? unit.slice(0, 30) : "";

  db.prepare(
    "INSERT INTO menu (id, shopId, name, price, isAvailable, imageUrl, stockQty, unit) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
  ).run(
    id,
    shopId,
    name,
    price,
    isAvailable ? 1 : 0,
    imageUrl || "",
    safeStock,
    safeUnit
  );

  const payload = {
    id,
    shopId,
    name,
    price,
    isAvailable: !!isAvailable,
    imageUrl: imageUrl || "",
    stockQty: safeStock === null ? undefined : safeStock,
    unit: safeUnit,
  };
  broadcast("ADD_MENU_ITEM", payload, shopId);
  res.json({ success: true });
});

// Update menu item
app.put("/api/menu/:id", checkAuth, (req, res) => {
  const shop = resolveShop(req);
  if (!shop) return res.status(404).json({ error: "Shop not found" });

  const shopId = shop.id;
  const { name, price, isAvailable, imageUrl, stockQty, unit } = req.body || {};

  if (!name || typeof price !== "number") {
    return res.status(400).json({ error: "Thiếu name/price" });
  }

  const safeStock =
    stockQty === null || stockQty === undefined || stockQty === ""
      ? null
      : Number.isFinite(Number(stockQty))
      ? Math.max(0, Math.floor(Number(stockQty)))
      : null;

  const safeUnit = typeof unit === "string" ? unit.slice(0, 30) : "";

  db.prepare(
    "UPDATE menu SET name=?, price=?, isAvailable=?, imageUrl=?, stockQty=?, unit=? WHERE id=? AND shopId=?"
  ).run(
    name,
    price,
    isAvailable ? 1 : 0,
    imageUrl || "",
    safeStock,
    safeUnit,
    req.params.id,
    shopId
  );

  const payload = {
    id: req.params.id,
    shopId,
    name,
    price,
    isAvailable: !!isAvailable,
    imageUrl: imageUrl || "",
    stockQty: safeStock === null ? undefined : safeStock,
    unit: safeUnit,
  };
  broadcast("UPDATE_MENU_ITEM", payload, shopId);
  res.json({ success: true });
});

// Delete menu item
app.delete("/api/menu/:id", checkAuth, (req, res) => {
  const shop = resolveShop(req);
  if (!shop) return res.status(404).json({ error: "Shop not found" });

  const shopId = shop.id;

  db.prepare("DELETE FROM menu WHERE id=? AND shopId=?").run(req.params.id, shopId);

  broadcast("DELETE_MENU_ITEM", { id: req.params.id, shopId }, shopId);
  res.json({ success: true });
});

// Add order (customer no auth)
app.post("/api/orders", (req, res) => {
  const shop = resolveShop(req);
  if (!shop) return res.status(404).json({ error: "Shop not found" });

  const shopId = shop.id;

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

  const safeReceiveTime = String(receiveTime || "").trim();
  const safeReceiveLocation = String(receiveLocation || "").trim();

  if (
    !id ||
    !customerPhone ||
    !safeReceiveLocation ||
    !status ||
    typeof totalPrice !== "number" ||
    typeof createdAt !== "number"
  ) {
    return res.status(400).json({ error: "Thiếu dữ liệu đơn hàng bắt buộc" });
  }

  if (!isAllowedOrderStatus(status)) {
    return res.status(400).json({ error: "Status đơn hàng không hợp lệ" });
  }

  const safeItems: any[] = Array.isArray(items) ? items : [];
  if (safeItems.length === 0) {
    return res.status(400).json({ error: "Đơn hàng phải có ít nhất 1 món" });
  }

  db.prepare(
    "INSERT INTO orders (id, shopId, customerPhone, receiveTime, receiveLocation, note, status, totalPrice, createdAt, paymentMethod) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
  ).run(
    id,
    shopId,
    customerPhone,
    safeReceiveTime,
    safeReceiveLocation,
    note ?? "",
    status,
    totalPrice,
    createdAt,
    paymentMethod ?? ""
  );

  const insertItem = db.prepare(
    "INSERT INTO order_items (orderId, shopId, menuItemId, quantity, price, name, note) VALUES (?, ?, ?, ?, ?, ?, ?)"
  );

  const insertTx = db.transaction((orderId: string, orderItems: any[]) => {
    for (const item of orderItems) {
      const menuItemId = String(item.menuItemId || item.id || "");
      const quantity = Number(item.quantity || 0);
      const price = Number(item.price || 0);
      const name = String(item.name || item.nameSnapshot || "");
      const itemNote = String(item.note || "").trim();

      if (!menuItemId || !name || quantity <= 0) continue;
      insertItem.run(orderId, shopId, menuItemId, quantity, price, name, itemNote);
    }
  });

  insertTx(id, safeItems);

  const payload = {
    ...req.body,
    shopId,
    receiveTime: safeReceiveTime,
    receiveLocation: safeReceiveLocation,
    note: note ?? "",
    paymentMethod: paymentMethod ?? "",
    items: safeItems.map((item: any) => ({
      ...item,
      note: String(item.note || "").trim(),
    })),
  };

  broadcast("ADD_ORDER", payload, shopId);
  res.json({ success: true });
});

// Update order status (owner auth)
// - CONFIRMED: subtract inventory one time
// - DONE / REJECTED: no inventory subtraction
app.put("/api/orders/:id/status", checkAuth, (req, res) => {
  const shop = resolveShop(req);
  if (!shop) return res.status(404).json({ error: "Shop not found" });

  const shopId = shop.id;
  const { status } = req.body || {};
  if (!status) return res.status(400).json({ error: "Thiếu status" });
  if (!isAllowedOrderStatus(status)) {
    return res.status(400).json({ error: "Status không hợp lệ" });
  }

  const orderId = String(req.params.id || "");

  const order = db.prepare("SELECT * FROM orders WHERE id=? AND shopId=?").get(orderId, shopId) as any;
  if (!order) return res.status(404).json({ error: "Không tìm thấy đơn" });

  const currentStatus = String(order.status || "");

  // If moving to CONFIRMED from non-CONFIRMED: inventory transaction
  if (String(status) === "CONFIRMED" && currentStatus !== "CONFIRMED") {
    const tx = db.transaction(() => {
      const items = db.prepare("SELECT * FROM order_items WHERE orderId=? AND shopId=?").all(orderId, shopId) as any[];
      if (!items || items.length === 0) {
        throw new Error("Đơn không có món (order_items rỗng)");
      }

      const insufficient: { menuItemId: string; name: string; need: number; left: number }[] = [];

      for (const it of items) {
        const menuItemId = String(it.menuItemId);
        const qty = clampInt(it.quantity, 0, 1_000_000);

        const m = db
          .prepare("SELECT id, name, stockQty, isAvailable, unit, price, imageUrl FROM menu WHERE id=? AND shopId=?")
          .get(menuItemId, shopId) as any;

        // item deleted from menu -> allow confirm, skip inventory
        if (!m) continue;

        // only enforce if stockQty is NOT NULL
        if (m.stockQty === null || m.stockQty === undefined) continue;

        const left = Number(m.stockQty || 0);
        if (left < qty) {
          insufficient.push({ menuItemId, name: String(m.name || it.name), need: qty, left });
        }
      }

      if (insufficient.length > 0) {
        const first = insufficient[0];
        const msg = `Không đủ tồn kho: ${first.name}. Cần ${first.need} nhưng còn ${first.left}.`;
        const err: any = new Error(msg);
        err.code = "INSUFFICIENT_STOCK";
        err.detail = insufficient;
        throw err;
      }

      for (const it of items) {
        const menuItemId = String(it.menuItemId);
        const qty = clampInt(it.quantity, 0, 1_000_000);

        const m = db
          .prepare("SELECT id, name, stockQty, isAvailable, unit, price, imageUrl FROM menu WHERE id=? AND shopId=?")
          .get(menuItemId, shopId) as any;

        if (!m) continue;
        if (m.stockQty === null || m.stockQty === undefined) continue;

        const left = Number(m.stockQty || 0);
        const next = Math.max(0, left - qty);
        const nextAvailable = next === 0 ? 0 : 1;

        db.prepare("UPDATE menu SET stockQty=?, isAvailable=? WHERE id=? AND shopId=?").run(
          next,
          nextAvailable,
          menuItemId,
          shopId
        );

        const updatedMenu = db
          .prepare("SELECT * FROM menu WHERE id=? AND shopId=?")
          .get(menuItemId, shopId) as any;

        const payload = {
          ...updatedMenu,
          isAvailable: updatedMenu.isAvailable === 1,
          stockQty:
            updatedMenu.stockQty === null || updatedMenu.stockQty === undefined
              ? undefined
              : Number(updatedMenu.stockQty),
          unit: typeof updatedMenu.unit === "string" ? updatedMenu.unit : "",
        };
        broadcast("UPDATE_MENU_ITEM", payload, shopId);
      }

      db.prepare("UPDATE orders SET status=? WHERE id=? AND shopId=?").run(status, orderId, shopId);
    });

    try {
      tx();
      broadcast("UPDATE_ORDER_STATUS", { id: orderId, status, shopId }, shopId);
      return res.json({ success: true });
    } catch (e: any) {
      if (e?.code === "INSUFFICIENT_STOCK") {
        return res.status(409).json({
          error: e.message || "Không đủ tồn kho để xác nhận đơn",
          code: "INSUFFICIENT_STOCK",
          detail: e.detail || [],
        });
      }
      return res.status(500).json({ error: e?.message || "Lỗi xác nhận đơn" });
    }
  }

  // Other statuses or CONFIRMED -> CONFIRMED: just update
  db.prepare("UPDATE orders SET status=? WHERE id=? AND shopId=?").run(status, orderId, shopId);
  broadcast("UPDATE_ORDER_STATUS", { id: orderId, status, shopId }, shopId);
  res.json({ success: true });
});

// ================================
// START SERVER
// ================================
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