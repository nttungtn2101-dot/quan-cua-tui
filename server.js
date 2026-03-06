"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const vite_1 = require("vite");
const better_sqlite3_1 = __importDefault(require("better-sqlite3"));
const db = new better_sqlite3_1.default("app.db");
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
// SEED DEFAULT SHOP (shop_1)
// ================================
const defaultShopId = "shop_1";
const defaultShop = db
    .prepare("SELECT * FROM shops WHERE id = ?")
    .get(defaultShopId);
if (!defaultShop) {
    db.prepare("INSERT INTO shops (id, slug, name, closingTime, status, password, bankInfo) VALUES (?, ?, ?, ?, ?, ?, ?)").run(defaultShopId, "quan-cua-tui", "Quán Của Tui", "22:00", "OPEN", "123456", "Ngân hàng: VCB\nSTK: 123456789\nTen: NGUYEN VAN A");
    const insertMenu = db.prepare("INSERT INTO menu (id, shopId, name, price, isAvailable, imageUrl) VALUES (?, ?, ?, ?, ?, ?)");
    insertMenu.run("1", defaultShopId, "Cà phê sữa đá", 25000, 1, "https://picsum.photos/seed/coffee1/200/200");
    insertMenu.run("2", defaultShopId, "Bạc xỉu", 30000, 1, "https://picsum.photos/seed/coffee2/200/200");
    insertMenu.run("3", defaultShopId, "Trà đào cam sả", 35000, 1, "https://picsum.photos/seed/tea1/200/200");
    insertMenu.run("4", defaultShopId, "Trà vải", 35000, 0, "https://picsum.photos/seed/tea2/200/200");
    insertMenu.run("5", defaultShopId, "Bánh mì thịt chả", 20000, 1, "https://picsum.photos/seed/bread/200/200");
}
const app = (0, express_1.default)();
app.use(express_1.default.json({ limit: "25mb" }));
// ================================
// Helpers
// ================================
const getShopId = (req) => String(req.query.shopId || defaultShopId);
const getShopById = (shopId) => db.prepare("SELECT * FROM shops WHERE id = ?").get(shopId);
let clients = [];
const broadcast = (type, payload, shopId) => {
    const data = `data: ${JSON.stringify({ type, payload })}\n\n`;
    clients.forEach((c) => {
        // If client subscribed with shopId, only send matching shop events
        if (c.shopId && shopId && c.shopId !== shopId)
            return;
        try {
            c.res.write(data);
        }
        catch {
            // ignore broken pipe
        }
    });
};
app.get("/api/events", (req, res) => {
    const shopId = String(req.query.shopId || ""); // optional filter
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders?.();
    const ping = setInterval(() => {
        try {
            res.write(`event: ping\ndata: {}\n\n`);
        }
        catch { }
    }, 25000);
    const client = { req, res, shopId: shopId || undefined };
    clients.push(client);
    req.on("close", () => {
        clearInterval(ping);
        clients = clients.filter((c) => c !== client);
    });
});
// ================================
// Auth middleware (per shop)
// ================================
const checkAuth = (req, res, next) => {
    const shopId = getShopId(req);
    const token = req.headers.authorization;
    const shop = getShopById(shopId);
    if (!shop)
        return res.status(404).json({ error: "Shop not found" });
    if (token && shop.password && token === shop.password)
        next();
    else
        res.status(401).json({ error: "Unauthorized" });
};
// ================================
// API ROUTES
// ================================
// Login owner (per shop)
app.post("/api/auth", (req, res) => {
    const shopId = getShopId(req);
    const { password } = req.body || {};
    const shop = getShopById(shopId);
    if (!shop)
        return res.status(404).json({ error: "Shop not found" });
    if (password && password === shop.password)
        res.json({ token: password });
    else
        res.status(401).json({ error: "Sai mật khẩu" });
});
// Get shop data (per shop)
app.get("/api/data", (req, res) => {
    const shopId = getShopId(req);
    const shop = db
        .prepare("SELECT id, slug, name, closingTime, status, bankInfo FROM shops WHERE id = ?")
        .get(shopId);
    if (!shop)
        return res.status(404).json({ error: "Shop not found" });
    const menu = db
        .prepare("SELECT * FROM menu WHERE shopId = ?")
        .all(shopId)
        .map((m) => ({ ...m, isAvailable: m.isAvailable === 1 }));
    const orders = db
        .prepare("SELECT * FROM orders WHERE shopId = ? ORDER BY createdAt DESC")
        .all(shopId);
    const orderItems = db
        .prepare("SELECT * FROM order_items WHERE shopId = ?")
        .all(shopId);
    const ordersWithItems = orders.map((o) => ({
        ...o,
        items: orderItems.filter((i) => i.orderId === o.id),
    }));
    res.json({ store: shop, menu, orders: ordersWithItems });
});
// Update shop info (per shop)
app.put("/api/store", checkAuth, (req, res) => {
    const shopId = getShopId(req);
    const { name, closingTime, status, bankInfo, password } = req.body || {};
    if (!name || !closingTime || !status) {
        return res.status(400).json({ error: "Thiếu name/closingTime/status" });
    }
    if (password) {
        db.prepare("UPDATE shops SET name=?, closingTime=?, status=?, bankInfo=?, password=? WHERE id=?")
            .run(name, closingTime, status, bankInfo ?? "", password, shopId);
    }
    else {
        db.prepare("UPDATE shops SET name=?, closingTime=?, status=?, bankInfo=? WHERE id=?")
            .run(name, closingTime, status, bankInfo ?? "", shopId);
    }
    const updated = db
        .prepare("SELECT id, slug, name, closingTime, status, bankInfo FROM shops WHERE id = ?")
        .get(shopId);
    broadcast("UPDATE_STORE", updated, shopId);
    res.json(updated);
});
// Add menu item (per shop)
app.post("/api/menu", checkAuth, (req, res) => {
    const shopId = getShopId(req);
    const { id, name, price, isAvailable, imageUrl } = req.body || {};
    if (!id || !name || typeof price !== "number") {
        return res.status(400).json({ error: "Thiếu id/name/price" });
    }
    db.prepare("INSERT INTO menu (id, shopId, name, price, isAvailable, imageUrl) VALUES (?, ?, ?, ?, ?, ?)")
        .run(id, shopId, name, price, isAvailable ? 1 : 0, imageUrl || "");
    const payload = { id, shopId, name, price, isAvailable: !!isAvailable, imageUrl: imageUrl || "" };
    broadcast("ADD_MENU_ITEM", payload, shopId);
    res.json({ success: true });
});
// Update menu item (per shop)
app.put("/api/menu/:id", checkAuth, (req, res) => {
    const shopId = getShopId(req);
    const { name, price, isAvailable, imageUrl } = req.body || {};
    if (!name || typeof price !== "number") {
        return res.status(400).json({ error: "Thiếu name/price" });
    }
    db.prepare("UPDATE menu SET name=?, price=?, isAvailable=?, imageUrl=? WHERE id=? AND shopId=?")
        .run(name, price, isAvailable ? 1 : 0, imageUrl || "", req.params.id, shopId);
    const payload = { id: req.params.id, shopId, name, price, isAvailable: !!isAvailable, imageUrl: imageUrl || "" };
    broadcast("UPDATE_MENU_ITEM", payload, shopId);
    res.json({ success: true });
});
// Delete menu item (per shop)
app.delete("/api/menu/:id", checkAuth, (req, res) => {
    const shopId = getShopId(req);
    db.prepare("DELETE FROM menu WHERE id=? AND shopId=?").run(req.params.id, shopId);
    broadcast("DELETE_MENU_ITEM", { id: req.params.id, shopId }, shopId);
    res.json({ success: true });
});
// Add order (per shop) - customer does NOT need auth
app.post("/api/orders", (req, res) => {
    const shopId = getShopId(req);
    const { id, customerPhone, receiveTime, receiveLocation, note, status, totalPrice, createdAt, paymentMethod, items, } = req.body || {};
    if (!id ||
        !customerPhone ||
        !receiveTime ||
        !receiveLocation ||
        !status ||
        typeof totalPrice !== "number" ||
        typeof createdAt !== "number") {
        return res.status(400).json({ error: "Thiếu dữ liệu đơn hàng bắt buộc" });
    }
    const safeItems = Array.isArray(items) ? items : [];
    if (safeItems.length === 0) {
        return res.status(400).json({ error: "Đơn hàng phải có ít nhất 1 món" });
    }
    // Ensure shop exists
    const shop = getShopById(shopId);
    if (!shop)
        return res.status(404).json({ error: "Shop not found" });
    db.prepare("INSERT INTO orders (id, shopId, customerPhone, receiveTime, receiveLocation, note, status, totalPrice, createdAt, paymentMethod) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)").run(id, shopId, customerPhone, receiveTime, receiveLocation, note ?? "", status, totalPrice, createdAt, paymentMethod ?? "");
    const insertItem = db.prepare("INSERT INTO order_items (orderId, shopId, menuItemId, quantity, price, name) VALUES (?, ?, ?, ?, ?, ?)");
    const insertTx = db.transaction((orderId, orderItems) => {
        for (const item of orderItems) {
            const menuItemId = String(item.menuItemId || item.id || "");
            const quantity = Number(item.quantity || 0);
            const price = Number(item.price || 0);
            const name = String(item.name || item.nameSnapshot || "");
            if (!menuItemId || !name || quantity <= 0)
                continue;
            insertItem.run(orderId, shopId, menuItemId, quantity, price, name);
        }
    });
    insertTx(id, safeItems);
    const payload = {
        ...req.body,
        shopId,
        note: note ?? "",
        paymentMethod: paymentMethod ?? "",
    };
    broadcast("ADD_ORDER", payload, shopId);
    res.json({ success: true });
});
// Update order status (per shop)
app.put("/api/orders/:id/status", checkAuth, (req, res) => {
    const shopId = getShopId(req);
    const { status } = req.body || {};
    if (!status)
        return res.status(400).json({ error: "Thiếu status" });
    db.prepare("UPDATE orders SET status=? WHERE id=? AND shopId=?")
        .run(status, req.params.id, shopId);
    broadcast("UPDATE_ORDER_STATUS", { id: req.params.id, status, shopId }, shopId);
    res.json({ success: true });
});
// ================================
// START SERVER
// ================================
async function startServer() {
    if (process.env.NODE_ENV !== "production") {
        const vite = await (0, vite_1.createServer)({
            server: { middlewareMode: true },
            appType: "spa",
        });
        app.use(vite.middlewares);
    }
    else {
        app.use(express_1.default.static("dist"));
    }
    const PORT = Number(process.env.PORT || 3000);
    app.listen(PORT, "0.0.0.0", () => {
        console.log(`Server running on port ${PORT}`);
    });
}
startServer();
