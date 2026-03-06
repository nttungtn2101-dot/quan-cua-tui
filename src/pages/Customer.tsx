// src/pages/Customer.tsx
import React, { useMemo, useState } from "react";
import { useAppStore } from "../lib/store";
import { Order, OrderItem, PaymentMethod } from "../lib/types";
import {
  Plus,
  Minus,
  ShoppingBag,
  X,
  Clock,
  MapPin,
  Phone,
  FileText,
  CreditCard,
  Banknote,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  Hourglass,
  CircleX,
  PackageCheck,
} from "lucide-react";

function getSlugFromPath() {
  try {
    const parts = window.location.pathname.split("/").filter(Boolean);
    if (parts[0] === "c" && parts[1]) return parts[1];
    return null;
  } catch {
    return null;
  }
}

function clampInt(n: any, min: number, max: number) {
  const x = Number(n);
  if (!Number.isFinite(x)) return min;
  const v = Math.floor(x);
  return Math.max(min, Math.min(max, v));
}

function formatVND(n: number) {
  return (Number(n) || 0).toLocaleString("vi-VN") + "đ";
}

function OrderStatusScreen({
  currentOrder,
  store,
  onReset,
}: {
  currentOrder: any;
  store: any;
  onReset: () => void;
}) {
  const statusUI =
    currentOrder.status === "NEW"
      ? {
          icon: <Hourglass size={28} />,
          iconWrap: "bg-blue-100 text-blue-600",
          dot: "bg-blue-500 animate-pulse",
          title: "Quán đang xem đơn của bạn",
          subtitle: "Đơn đã được gửi thành công. Vui lòng chờ quán xác nhận.",
        }
      : currentOrder.status === "CONFIRMED"
      ? {
          icon: <CheckCircle2 size={28} />,
          iconWrap: "bg-green-100 text-green-600",
          dot: "bg-green-500",
          title: "Quán đã xác nhận đơn",
          subtitle: "Quán đang chuẩn bị món cho bạn.",
        }
      : currentOrder.status === "DONE"
      ? {
          icon: <PackageCheck size={28} />,
          iconWrap: "bg-violet-100 text-violet-600",
          dot: "bg-violet-500",
          title: "Đơn đã hoàn thành",
          subtitle: "Cảm ơn bạn đã đặt món.",
        }
      : {
          icon: <CircleX size={28} />,
          iconWrap: "bg-red-100 text-red-600",
          dot: "bg-red-500",
          title: "Quán đã từ chối đơn",
          subtitle: "Quán hiện không thể nhận đơn này.",
        };

  const transferQrUrl =
    (store as any)?.transferQrUrl && String((store as any).transferQrUrl).trim()
      ? String((store as any).transferQrUrl).trim()
      : "";

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-6 pb-24">
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 text-center">
        <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${statusUI.iconWrap}`}>
          {statusUI.icon}
        </div>

        <h1 className="text-2xl font-bold mb-2">{statusUI.title}</h1>
        <p className="text-gray-500 mb-2">Mã đơn: #{String(currentOrder.id).slice(-4)}</p>
        <p className="text-sm text-gray-500 mb-6">{statusUI.subtitle}</p>

        <div className="bg-gray-50 rounded-xl p-4 text-left mb-6">
          <div className="flex items-center gap-3 mb-4">
            <div className={`w-3 h-3 rounded-full ${statusUI.dot}`} />
            <div className="font-semibold text-lg">
              {currentOrder.status === "NEW" && "Đang chờ quán xác nhận..."}
              {currentOrder.status === "CONFIRMED" && "Quán đã xác nhận"}
              {currentOrder.status === "DONE" && "Đơn đã hoàn thành"}
              {currentOrder.status === "REJECTED" && "Đơn đã bị từ chối"}
            </div>
          </div>

          <div className="space-y-2 text-sm">
            {currentOrder.items.map((item: any, idx: number) => (
              <div key={idx} className="flex justify-between gap-3">
                <div className="min-w-0">
                  <div className="truncate">
                    {item.quantity}x {item.name}
                  </div>

                  {String(item?.note || "").trim() ? (
                    <div className="text-xs text-gray-500 italic mt-0.5 whitespace-pre-wrap break-words">
                      Ghi chú: {String(item.note).trim()}
                    </div>
                  ) : null}
                </div>

                <span className="font-medium shrink-0">{formatVND(item.price * item.quantity)}</span>
              </div>
            ))}

            <div className="border-t border-gray-200 pt-2 flex justify-between font-bold mt-2">
              <span>Tổng cộng</span>
              <span>{formatVND(currentOrder.totalPrice)}</span>
            </div>
          </div>

          <div className="mt-4 space-y-1 text-sm text-gray-700">
            <div>
              <span className="text-gray-500">Địa điểm nhận:</span>{" "}
              <span className="font-medium">{currentOrder.receiveLocation}</span>
            </div>

            {currentOrder.receiveTime ? (
              <div>
                <span className="text-gray-500">Giờ nhận:</span>{" "}
                <span className="font-medium">{currentOrder.receiveTime}</span>
              </div>
            ) : (
              <div className="text-gray-500 italic">Giờ nhận: không yêu cầu</div>
            )}

            {currentOrder.note ? (
              <div>
                <span className="text-gray-500">Ghi chú cho quán:</span>{" "}
                <span className="font-medium">{currentOrder.note}</span>
              </div>
            ) : null}
          </div>
        </div>

        {currentOrder.paymentMethod === "TRANSFER" && (store.bankInfo || transferQrUrl) && (
          <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-left mb-6">
            <h3 className="font-semibold text-blue-800 mb-3">Thông tin chuyển khoản</h3>

            {transferQrUrl ? (
              <div className="mb-3 flex justify-center">
                <img
                  src={transferQrUrl}
                  alt="QR chuyển khoản"
                  className="w-44 h-44 rounded-xl border border-blue-100 bg-white object-contain"
                  referrerPolicy="no-referrer"
                />
              </div>
            ) : null}

            {store.bankInfo ? (
              <pre className="text-sm text-blue-700 whitespace-pre-wrap font-sans">{store.bankInfo}</pre>
            ) : null}

            <p className="text-xs text-blue-600 mt-2 italic">
              Vui lòng ghi chú mã đơn: #{String(currentOrder.id).slice(-4)}
            </p>
          </div>
        )}

        <button
          onClick={onReset}
          className="w-full py-3 bg-gray-100 text-gray-700 font-semibold rounded-xl hover:bg-gray-200 transition-colors"
        >
          Đặt đơn mới
        </button>
      </div>
    </div>
  );
}

function MenuItemCard({
  item,
  qty,
  note,
  noteExpanded,
  canOrder,
  onMinus,
  onPlus,
  onSetQty,
  onToggleNote,
  onChangeNote,
}: {
  item: any;
  qty: number;
  note: string;
  noteExpanded: boolean;
  canOrder: boolean;
  onMinus: () => void;
  onPlus: () => void;
  onSetQty: (v: any) => void;
  onToggleNote: () => void;
  onChangeNote: (v: string) => void;
}) {
  const selected = qty > 0;

  return (
    <div
      className={`bg-white p-3 rounded-2xl shadow-sm border transition-all ${
        selected ? "border-blue-200 ring-1 ring-blue-100 bg-blue-50/20" : "border-gray-100"
      } ${!item.isAvailable ? "opacity-60" : ""}`}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          {item.imageUrl ? (
            <img
              src={item.imageUrl}
              alt={item.name}
              className="w-14 h-14 rounded-xl object-cover shrink-0"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="w-14 h-14 rounded-xl bg-gray-100 shrink-0" />
          )}

          <div className="min-w-0 flex-1">
            <div className="font-semibold text-base text-gray-900 truncate">{item.name}</div>
            <div className="text-sm font-bold text-gray-800 mt-0.5">{formatVND(item.price)}</div>
            {!item.isAvailable ? <div className="text-xs text-red-500 mt-1">Tạm hết món</div> : null}
          </div>
        </div>

        {item.isAvailable ? (
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={onMinus}
              className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 hover:bg-gray-200 disabled:opacity-50"
              disabled={!qty || !canOrder}
              title="Giảm"
            >
              <Minus size={16} />
            </button>

            <input
              type="number"
              inputMode="numeric"
              min={0}
              max={999}
              value={qty}
              onChange={(e) => onSetQty(e.target.value)}
              onBlur={(e) => onSetQty(e.target.value)}
              disabled={!canOrder}
              className="w-14 text-center border border-gray-200 rounded-lg px-2 py-1.5 text-sm font-semibold outline-none focus:ring-2 focus:ring-blue-500"
              aria-label="Số lượng"
            />

            <button
              onClick={onPlus}
              className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 hover:bg-blue-200 disabled:opacity-50"
              disabled={!canOrder}
              title="Tăng"
            >
              <Plus size={16} />
            </button>
          </div>
        ) : (
          <span className="px-3 py-1.5 bg-gray-100 text-gray-500 text-sm font-medium rounded-lg whitespace-nowrap ml-2">
            Hết món
          </span>
        )}
      </div>

      {item.isAvailable && (
        <div className="mt-3">
          <button
            type="button"
            onClick={onToggleNote}
            className="text-xs font-medium text-gray-600 hover:text-gray-900 flex items-center gap-1"
            disabled={!canOrder}
          >
            <FileText size={13} />
            {noteExpanded ? "Ẩn ghi chú món" : "Thêm ghi chú món"}
            {noteExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>

          {noteExpanded && (
            <div className="mt-2">
              <input
                type="text"
                value={note}
                onChange={(e) => onChangeNote(e.target.value)}
                placeholder="VD: ít đá / không hành / thêm sốt..."
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                disabled={!canOrder}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function CartSidebar({
  cartItems,
  cart,
  totalItems,
  totalPrice,
  phone,
  setPhone,
  receiveTime,
  setReceiveTime,
  location,
  setLocation,
  note,
  setNote,
  paymentMethod,
  setPaymentMethod,
  canOrder,
  store,
  onMinus,
  onPlus,
  onSetQty,
  onSubmit,
}: {
  cartItems: any[];
  cart: Record<string, number>;
  totalItems: number;
  totalPrice: number;
  phone: string;
  setPhone: (v: string) => void;
  receiveTime: string;
  setReceiveTime: (v: string) => void;
  location: string;
  setLocation: (v: string) => void;
  note: string;
  setNote: (v: string) => void;
  paymentMethod: PaymentMethod;
  setPaymentMethod: (v: PaymentMethod) => void;
  canOrder: boolean;
  store: any;
  onMinus: (id: string) => void;
  onPlus: (id: string) => void;
  onSetQty: (id: string, v: any) => void;
  onSubmit: () => void;
}) {
  const transferQrUrl =
    (store as any)?.transferQrUrl && String((store as any)?.transferQrUrl).trim()
      ? String((store as any)?.transferQrUrl).trim()
      : "";

  return (
    <div className="hidden lg:block">
      <div className="sticky top-4 space-y-4">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-4 py-4 border-b border-gray-100">
            <h2 className="text-xl font-bold">Giỏ hàng của bạn</h2>
            <p className="text-sm text-gray-500 mt-1">
              {totalItems} món • {formatVND(totalPrice)}
            </p>
          </div>

          <div className="p-4 space-y-6 max-h-[calc(100vh-140px)] overflow-auto">
            <div className="space-y-3">
              <div className="font-semibold text-base">Món đã chọn</div>

              {cartItems.length === 0 ? (
                <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 p-4 text-sm text-gray-500 text-center">
                  Chưa có món nào trong giỏ.
                </div>
              ) : (
                cartItems.map((item: any) => (
                  <div key={item.menuItemId} className="rounded-xl border border-gray-100 p-3 bg-gray-50">
                    <div className="flex justify-between items-start gap-3">
                      <div className="min-w-0">
                        <div className="font-medium truncate">{item.name}</div>
                        <div className="text-sm text-gray-500">{formatVND(item.price)}</div>

                        {String(item?.note || "").trim() ? (
                          <div className="text-xs text-gray-500 italic mt-1 whitespace-pre-wrap break-words">
                            Ghi chú: {String(item.note).trim()}
                          </div>
                        ) : null}
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => onMinus(item.menuItemId)}
                          className="w-8 h-8 rounded-full bg-white border border-gray-200 flex items-center justify-center text-gray-600"
                        >
                          <Minus size={16} />
                        </button>

                        <input
                          type="number"
                          inputMode="numeric"
                          min={0}
                          max={999}
                          value={cart[item.menuItemId] ?? item.quantity ?? 0}
                          onChange={(e) => onSetQty(item.menuItemId, e.target.value)}
                          onBlur={(e) => onSetQty(item.menuItemId, e.target.value)}
                          className="w-14 text-center border border-gray-200 rounded-lg px-2 py-1 text-sm font-semibold outline-none focus:ring-2 focus:ring-blue-500"
                          aria-label="Số lượng"
                        />

                        <button
                          onClick={() => onPlus(item.menuItemId)}
                          className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600"
                        >
                          <Plus size={16} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="space-y-4 pt-4 border-t border-gray-100">
              <div className="font-semibold text-base">Thông tin nhận hàng</div>

              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1">
                  <Phone size={16} /> Số điện thoại *
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="09xx xxx xxx"
                  className="w-full border border-gray-300 rounded-lg px-3 py-3 focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1">
                  <Clock size={16} /> Giờ nhận (tuỳ chọn)
                </label>
                <select
                  value={receiveTime}
                  onChange={(e) => setReceiveTime(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-3 focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                >
                  <option value="">Không yêu cầu</option>
                  <option value="15 phút nữa">15 phút nữa</option>
                  <option value="30 phút nữa">30 phút nữa</option>
                  <option value="45 phút nữa">45 phút nữa</option>
                  <option value="1 tiếng nữa">1 tiếng nữa</option>
                </select>
              </div>

              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1">
                  <MapPin size={16} /> Địa điểm nhận *
                </label>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="VD: Bàn số 3, 12 Trần Phú..."
                  className="w-full border border-gray-300 rounded-lg px-3 py-3 focus:ring-2 focus:ring-blue-500 outline-none"
                />
                <p className="text-xs text-gray-500 mt-1">Bắt buộc để quán giao đúng chỗ.</p>
              </div>

              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1">
                  <FileText size={16} /> Ghi chú cho quán
                </label>
                <input
                  type="text"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Ít đá, nhiều sữa..."
                  className="w-full border border-gray-300 rounded-lg px-3 py-3 focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
            </div>

            <div className="space-y-4 pt-4 border-t border-gray-100">
              <div className="font-semibold text-base">Thanh toán</div>

              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setPaymentMethod("CASH")}
                  className={`py-3 px-4 rounded-xl border flex items-center justify-center gap-2 font-medium transition-colors ${
                    paymentMethod === "CASH"
                      ? "bg-blue-50 border-blue-500 text-blue-700"
                      : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  <Banknote size={18} /> Tiền mặt
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentMethod("TRANSFER")}
                  className={`py-3 px-4 rounded-xl border flex items-center justify-center gap-2 font-medium transition-colors ${
                    paymentMethod === "TRANSFER"
                      ? "bg-blue-50 border-blue-500 text-blue-700"
                      : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  <CreditCard size={18} /> Chuyển khoản
                </button>
              </div>

              {paymentMethod === "TRANSFER" && (store.bankInfo || transferQrUrl) && (
                <div className="rounded-xl border border-blue-100 bg-blue-50 p-4">
                  <div className="font-semibold text-blue-800 mb-2">Thông tin chuyển khoản</div>

                  {transferQrUrl ? (
                    <div className="mb-3 flex justify-center">
                      <img
                        src={transferQrUrl}
                        alt="QR chuyển khoản"
                        className="w-40 h-40 rounded-xl border border-blue-100 bg-white object-contain"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                  ) : null}

                  {store.bankInfo ? (
                    <pre className="text-sm text-blue-700 whitespace-pre-wrap font-sans">{store.bankInfo}</pre>
                  ) : null}
                </div>
              )}
            </div>

            <div className="pt-2">
              <button
                onClick={onSubmit}
                disabled={!canOrder}
                className={`w-full font-semibold py-3 rounded-xl transition-colors ${
                  canOrder
                    ? "bg-blue-600 text-white hover:bg-blue-700"
                    : "bg-gray-200 text-gray-500 cursor-not-allowed"
                }`}
              >
                Gửi đơn • {formatVND(totalPrice)}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Customer() {
  const slug = getSlugFromPath();
  if (!slug) {
    return (
      <div className="p-10 text-center">
        <h2 className="text-xl font-bold">QR không hợp lệ</h2>
        <p className="text-gray-500">Vui lòng quét lại mã QR của quán.</p>
      </div>
    );
  }

  const { state, addOrder } = useAppStore();
  const { store, menu } = state;

  const [cart, setCart] = useState<Record<string, number>>({});
  const [itemNotes, setItemNotes] = useState<Record<string, string>>({});
  const [expandedNotes, setExpandedNotes] = useState<Record<string, boolean>>({});

  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [currentOrderId, setCurrentOrderId] = useState<string | null>(null);

  const [phone, setPhone] = useState("");
  const [receiveTime, setReceiveTime] = useState<string>("");
  const [location, setLocation] = useState("");
  const [note, setNote] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("CASH");

  const handleSetQty = (id: string, qtyRaw: any) => {
    const qty = clampInt(qtyRaw, 0, 999);
    setCart((prev) => {
      const next = { ...prev };
      if (qty <= 0) delete next[id];
      else next[id] = qty;
      return next;
    });
  };

  const handleAddToCart = (id: string) => {
    setCart((prev) => ({ ...prev, [id]: (prev[id] || 0) + 1 }));
  };

  const handleRemoveFromCart = (id: string) => {
    setCart((prev) => {
      const newCart = { ...prev };
      if (newCart[id] > 1) newCart[id] -= 1;
      else delete newCart[id];
      return newCart;
    });
  };

  const cartItems = useMemo(() => {
    return Object.entries(cart)
      .map(([id, quantity]) => {
        const item = menu.find((m) => String(m.id) === String(id));
        if (!item) return null;

        return {
          menuItemId: item.id,
          quantity,
          price: item.price,
          name: item.name,
          note: (itemNotes[item.id] || "").trim() || undefined,
        } as OrderItem;
      })
      .filter(Boolean) as OrderItem[];
  }, [cart, menu, itemNotes]);

  const totalItems = useMemo(() => {
    let n = 0;
    for (const id in cart) n += cart[id];
    return n;
  }, [cart]);

  const totalPrice = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);

  const handleSubmitOrder = async () => {
    if (!phone.trim()) {
      alert("Vui lòng nhập số điện thoại");
      return;
    }
    if (!location.trim()) {
      alert("Vui lòng nhập địa điểm nhận hàng");
      return;
    }
    if (cartItems.length === 0) {
      alert("Giỏ hàng đang trống");
      return;
    }

    const newOrder: Order = {
      id: Date.now().toString(),
      customerPhone: phone.trim(),
      receiveTime: receiveTime.trim(),
      receiveLocation: location.trim(),
      note: note.trim(),
      items: cartItems,
      status: "NEW",
      createdAt: Date.now(),
      totalPrice,
      paymentMethod,
    };

    await addOrder(newOrder);
    setCurrentOrderId(newOrder.id);
    setIsDrawerOpen(false);
    setCart({});
    setItemNotes({});
    setExpandedNotes({});
  };

  const currentOrder = state.orders.find((o) => o.id === currentOrderId);

  if (currentOrder) {
    return (
      <OrderStatusScreen
        currentOrder={currentOrder}
        store={store}
        onReset={() => {
          setCurrentOrderId(null);
          setPhone("");
          setReceiveTime("");
          setLocation("");
          setNote("");
          setPaymentMethod("CASH");
        }}
      />
    );
  }

  const logoUrl =
    (store as any)?.logoUrl || (store as any)?.logo || (store as any)?.avatarUrl || "";
  const bannerUrl =
    (store as any)?.bannerUrl || (store as any)?.banner || (store as any)?.coverUrl || "";

  const canOrder = store.status !== "CLOSED";

  return (
    <div className="max-w-6xl mx-auto pb-28">
      {/* Store hero */}
      <div className="bg-white shadow-sm border-b border-gray-100">
        <div className="max-w-6xl mx-auto">
          <div className="relative">
            {bannerUrl ? (
              <img
                src={bannerUrl}
                alt="Banner quán"
                className="w-full h-40 md:h-56 object-cover"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="w-full h-40 md:h-56 bg-gradient-to-br from-gray-100 to-gray-200" />
            )}

            <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/10 to-transparent" />

            <div className="absolute -bottom-7 left-4 md:left-6 flex items-end gap-3">
              <div className="w-14 h-14 rounded-2xl overflow-hidden border bg-white shadow-sm flex items-center justify-center">
                {logoUrl ? (
                  <img
                    src={logoUrl}
                    alt="Logo quán"
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="text-xs text-gray-400 px-2 text-center">Logo</div>
                )}
              </div>
            </div>
          </div>

          <div className="p-4 pt-10 md:px-6">
            <h1 className="text-2xl md:text-3xl font-bold mb-2">{store.name}</h1>
            <div className="flex items-center gap-2 text-sm flex-wrap">
              <span
                className={`px-2 py-1 rounded-md font-medium ${
                  store.status === "OPEN"
                    ? "bg-green-100 text-green-700"
                    : store.status === "CLOSING_SOON"
                    ? "bg-yellow-100 text-yellow-700"
                    : "bg-red-100 text-red-700"
                }`}
              >
                {store.status === "OPEN" && "🟢 Đang mở"}
                {store.status === "CLOSING_SOON" && "🟡 Sắp đóng"}
                {store.status === "CLOSED" && "🔴 Nghỉ"}
              </span>
              <span className="text-gray-500">• Nhận đơn đến {store.closingTime}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile mini sticky bar */}
      <div className="sticky top-0 z-20 bg-white/95 backdrop-blur border-b border-gray-100 lg:hidden">
        <div className="max-w-6xl mx-auto px-4 py-2 md:px-6 flex items-center justify-between gap-3">
          {totalItems > 0 ? (
            <>
              <div className="min-w-0">
                <div className="text-sm font-semibold text-gray-900">
                  {totalItems} món • {formatVND(totalPrice)}
                </div>
                <div className="text-xs text-gray-500 truncate">
                  {canOrder ? "Bạn có thể mở giỏ để hoàn tất đơn." : "Quán hiện đang nghỉ."}
                </div>
              </div>
              <button
                onClick={() => setIsDrawerOpen(true)}
                disabled={!canOrder}
                className={`shrink-0 px-4 py-2 rounded-xl text-sm font-semibold ${
                  canOrder
                    ? "bg-blue-600 text-white hover:bg-blue-700"
                    : "bg-gray-200 text-gray-500 cursor-not-allowed"
                }`}
              >
                Xem giỏ
              </button>
            </>
          ) : (
            <>
              <div className="min-w-0">
                <div className="text-sm font-semibold text-gray-900">Chưa chọn món nào</div>
                <div className="text-xs text-gray-500">Thêm món để bắt đầu đặt hàng.</div>
              </div>
              <div className="text-xs text-gray-400">Giỏ hàng trống</div>
            </>
          )}
        </div>
      </div>

      {/* Main 2-column layout */}
      <div className="max-w-6xl mx-auto px-4 py-4 md:px-6 lg:grid lg:grid-cols-[minmax(0,1fr)_380px] lg:gap-6">
        {/* Left: menu */}
        <div className="space-y-4 min-w-0">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-bold text-lg text-gray-800">Menu hôm nay</h2>
            <div className="text-xs text-gray-500">{menu.length} món</div>
          </div>

          {menu.length === 0 && (
            <div className="text-center py-10 text-gray-500 bg-white rounded-2xl border border-gray-100">
              Hôm nay quán chưa lên món
            </div>
          )}

          <div className="space-y-3">
            {menu.map((item) => (
              <MenuItemCard
                key={item.id}
                item={item}
                qty={cart[item.id] ?? 0}
                note={itemNotes[item.id] || ""}
                noteExpanded={!!expandedNotes[item.id]}
                canOrder={canOrder}
                onMinus={() => handleRemoveFromCart(item.id)}
                onPlus={() => handleAddToCart(item.id)}
                onSetQty={(v) => handleSetQty(item.id, v)}
                onToggleNote={() =>
                  setExpandedNotes((prev) => ({
                    ...prev,
                    [item.id]: !prev[item.id],
                  }))
                }
                onChangeNote={(v) =>
                  setItemNotes((prev) => ({
                    ...prev,
                    [item.id]: v,
                  }))
                }
              />
            ))}
          </div>
        </div>

        {/* Right: desktop sticky cart */}
        <CartSidebar
          cartItems={cartItems}
          cart={cart}
          totalItems={totalItems}
          totalPrice={totalPrice}
          phone={phone}
          setPhone={setPhone}
          receiveTime={receiveTime}
          setReceiveTime={setReceiveTime}
          location={location}
          setLocation={setLocation}
          note={note}
          setNote={setNote}
          paymentMethod={paymentMethod}
          setPaymentMethod={setPaymentMethod}
          canOrder={canOrder}
          store={store}
          onMinus={handleRemoveFromCart}
          onPlus={handleAddToCart}
          onSetQty={handleSetQty}
          onSubmit={handleSubmitOrder}
        />
      </div>

      {/* Mobile bottom bar */}
      {totalItems > 0 && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-200 z-30 lg:hidden">
          <div className="max-w-3xl mx-auto">
            <button
              onClick={() => setIsDrawerOpen(true)}
              className="w-full bg-blue-600 text-white font-semibold py-3 px-4 rounded-xl hover:bg-blue-700 transition-colors flex justify-between items-center shadow-lg shadow-blue-200"
            >
              <div className="flex items-center gap-2 min-w-0">
                <div className="bg-white/20 w-6 h-6 rounded-full flex items-center justify-center text-sm">
                  {totalItems}
                </div>
                <span>Xem giỏ hàng</span>
              </div>
              <span>{formatVND(totalPrice)}</span>
            </button>
          </div>
        </div>
      )}

      {/* Mobile drawer only */}
      {isDrawerOpen && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end lg:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setIsDrawerOpen(false)} />
          <div className="bg-white w-full max-w-3xl mx-auto rounded-t-2xl relative flex flex-col max-h-[92vh]">
            <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-white rounded-t-2xl sticky top-0 z-10">
              <div>
                <h2 className="text-xl font-bold">Giỏ hàng của bạn</h2>
                <p className="text-sm text-gray-500 mt-1">
                  {totalItems} món • {formatVND(totalPrice)}
                </p>
              </div>
              <button onClick={() => setIsDrawerOpen(false)} className="p-2 text-gray-400 hover:text-gray-600">
                <X size={24} />
              </button>
            </div>

            <div className="p-4 overflow-y-auto space-y-6">
              <div className="space-y-3">
                <div className="font-semibold text-base">Món đã chọn</div>

                {cartItems.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 p-4 text-sm text-gray-500 text-center">
                    Giỏ hàng đang trống.
                  </div>
                ) : (
                  cartItems.map((item: any) => (
                    <div key={item.menuItemId} className="rounded-xl border border-gray-100 p-3 bg-gray-50">
                      <div className="flex justify-between items-start gap-3">
                        <div className="min-w-0">
                          <div className="font-medium truncate">{item.name}</div>
                          <div className="text-sm text-gray-500">{formatVND(item.price)}</div>

                          {String(item?.note || "").trim() ? (
                            <div className="text-xs text-gray-500 italic mt-1 whitespace-pre-wrap break-words">
                              Ghi chú: {String(item.note).trim()}
                            </div>
                          ) : null}
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            onClick={() => handleRemoveFromCart(item.menuItemId)}
                            className="w-8 h-8 rounded-full bg-white border border-gray-200 flex items-center justify-center text-gray-600"
                          >
                            <Minus size={16} />
                          </button>

                          <input
                            type="number"
                            inputMode="numeric"
                            min={0}
                            max={999}
                            value={cart[item.menuItemId] ?? item.quantity ?? 0}
                            onChange={(e) => handleSetQty(item.menuItemId, e.target.value)}
                            onBlur={(e) => handleSetQty(item.menuItemId, e.target.value)}
                            className="w-14 text-center border border-gray-200 rounded-lg px-2 py-1 text-sm font-semibold outline-none focus:ring-2 focus:ring-blue-500"
                            aria-label="Số lượng"
                          />

                          <button
                            onClick={() => handleAddToCart(item.menuItemId)}
                            className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600"
                          >
                            <Plus size={16} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="space-y-4 pt-4 border-t border-gray-100">
                <div className="font-semibold text-base">Thông tin nhận hàng</div>

                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1">
                    <Phone size={16} /> Số điện thoại *
                  </label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="09xx xxx xxx"
                    className="w-full border border-gray-300 rounded-lg px-3 py-3 focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>

                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1">
                    <Clock size={16} /> Giờ nhận (tuỳ chọn)
                  </label>
                  <select
                    value={receiveTime}
                    onChange={(e) => setReceiveTime(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-3 focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                  >
                    <option value="">Không yêu cầu</option>
                    <option value="15 phút nữa">15 phút nữa</option>
                    <option value="30 phút nữa">30 phút nữa</option>
                    <option value="45 phút nữa">45 phút nữa</option>
                    <option value="1 tiếng nữa">1 tiếng nữa</option>
                  </select>
                </div>

                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1">
                    <MapPin size={16} /> Địa điểm nhận *
                  </label>
                  <input
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="VD: Bàn số 3, 12 Trần Phú..."
                    className="w-full border border-gray-300 rounded-lg px-3 py-3 focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                  <p className="text-xs text-gray-500 mt-1">Bắt buộc để quán giao đúng chỗ.</p>
                </div>

                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1">
                    <FileText size={16} /> Ghi chú cho quán
                  </label>
                  <input
                    type="text"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Ít đá, nhiều sữa..."
                    className="w-full border border-gray-300 rounded-lg px-3 py-3 focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>

              <div className="space-y-4 pt-4 border-t border-gray-100">
                <div className="font-semibold text-base">Thanh toán</div>

                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod("CASH")}
                    className={`py-3 px-4 rounded-xl border flex items-center justify-center gap-2 font-medium transition-colors ${
                      paymentMethod === "CASH"
                        ? "bg-blue-50 border-blue-500 text-blue-700"
                        : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    <Banknote size={18} /> Tiền mặt
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMethod("TRANSFER")}
                    className={`py-3 px-4 rounded-xl border flex items-center justify-center gap-2 font-medium transition-colors ${
                      paymentMethod === "TRANSFER"
                        ? "bg-blue-50 border-blue-500 text-blue-700"
                        : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    <CreditCard size={18} /> Chuyển khoản
                  </button>
                </div>

                {paymentMethod === "TRANSFER" && ((store as any)?.bankInfo || (store as any)?.transferQrUrl) && (
                  <div className="rounded-xl border border-blue-100 bg-blue-50 p-4">
                    <div className="font-semibold text-blue-800 mb-2">Thông tin chuyển khoản</div>

                    {(store as any)?.transferQrUrl ? (
                      <div className="mb-3 flex justify-center">
                        <img
                          src={String((store as any).transferQrUrl)}
                          alt="QR chuyển khoản"
                          className="w-40 h-40 rounded-xl border border-blue-100 bg-white object-contain"
                          referrerPolicy="no-referrer"
                        />
                      </div>
                    ) : null}

                    {(store as any)?.bankInfo ? (
                      <pre className="text-sm text-blue-700 whitespace-pre-wrap font-sans">{String((store as any).bankInfo)}</pre>
                    ) : null}
                  </div>
                )}
              </div>
            </div>

            <div className="p-4 bg-white border-t border-gray-100 sticky bottom-0">
              <button
                onClick={handleSubmitOrder}
                disabled={!canOrder}
                className={`w-full font-semibold py-3 rounded-xl transition-colors ${
                  canOrder
                    ? "bg-blue-600 text-white hover:bg-blue-700"
                    : "bg-gray-200 text-gray-500 cursor-not-allowed"
                }`}
              >
                Gửi đơn • {formatVND(totalPrice)}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}