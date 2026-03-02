import React, { useState, useMemo } from "react";
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
} from "lucide-react";

export default function Customer() {
  // ✅ Fail-safe: bắt buộc có shopId trong URL
  const params = new URLSearchParams(window.location.search);
  const shopId = params.get("shopId");
  if (!shopId) {
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
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [currentOrderId, setCurrentOrderId] = useState<string | null>(null);

  const [phone, setPhone] = useState("");
  const [receiveTime, setReceiveTime] = useState("15 phút nữa");
  const [location, setLocation] = useState("");
  const [note, setNote] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("CASH");

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

  // ✅ FIX: cartItems luôn là OrderItem chuẩn (không spread undefined)
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
        } as OrderItem;
      })
      .filter(Boolean) as OrderItem[];
  }, [cart, menu]);

  let totalItems = 0;
  for (const id in cart) totalItems += cart[id];

  const totalPrice = cartItems.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0,
  );

  const handleSubmitOrder = async () => {
    if (!phone.trim()) {
      alert("Vui lòng nhập số điện thoại");
      return;
    }
    if (cartItems.length === 0) {
      alert("Giỏ hàng đang trống");
      return;
    }

    const newOrder: Order = {
      id: Date.now().toString(),
      customerPhone: phone,
      receiveTime,
      receiveLocation: location,
      note,
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
  };

  const currentOrder = state.orders.find((o) => o.id === currentOrderId);

  if (currentOrder) {
    return (
      <div className="max-w-md mx-auto p-4 space-y-6 pb-24">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 text-center">
          <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <ShoppingBag size={32} />
          </div>
          <h1 className="text-2xl font-bold mb-2">Đơn hàng của bạn</h1>
          <p className="text-gray-500 mb-6">Mã đơn: #{currentOrder.id.slice(-4)}</p>

          <div className="bg-gray-50 rounded-xl p-4 text-left mb-6">
            <div className="flex items-center gap-3 mb-4">
              <div
                className={`w-3 h-3 rounded-full ${
                  currentOrder.status === "NEW"
                    ? "bg-blue-500 animate-pulse"
                    : currentOrder.status === "CONFIRMED"
                      ? "bg-green-500"
                      : "bg-red-500"
                }`}
              />
              <div className="font-semibold text-lg">
                {currentOrder.status === "NEW" && "Đang chờ quán xác nhận..."}
                {currentOrder.status === "CONFIRMED" && "Quán đã xác nhận!"}
                {currentOrder.status === "REJECTED" && "Quán đã từ chối đơn"}
              </div>
            </div>

            <div className="space-y-2 text-sm">
              {currentOrder.items.map((item, idx) => (
                <div key={idx} className="flex justify-between">
                  <span>
                    {item.quantity}x {item.name}
                  </span>
                  <span className="font-medium">
                    {(item.price * item.quantity).toLocaleString("vi-VN")}đ
                  </span>
                </div>
              ))}
              <div className="border-t border-gray-200 pt-2 flex justify-between font-bold mt-2">
                <span>Tổng cộng</span>
                <span>{currentOrder.totalPrice.toLocaleString("vi-VN")}đ</span>
              </div>
            </div>
          </div>

          {currentOrder.paymentMethod === "TRANSFER" && store.bankInfo && (
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-left mb-6">
              <h3 className="font-semibold text-blue-800 mb-2">
                Thông tin chuyển khoản
              </h3>
              <pre className="text-sm text-blue-700 whitespace-pre-wrap font-sans">
                {store.bankInfo}
              </pre>
              <p className="text-xs text-blue-600 mt-2 italic">
                Vui lòng ghi chú mã đơn: #{currentOrder.id.slice(-4)}
              </p>
            </div>
          )}

          <button
            onClick={() => setCurrentOrderId(null)}
            className="w-full py-3 bg-gray-100 text-gray-700 font-semibold rounded-xl hover:bg-gray-200 transition-colors"
          >
            Đặt đơn mới
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto pb-24">
      {/* Header */}
      <div className="bg-white p-6 shadow-sm border-b border-gray-100 sticky top-0 z-10">
        <h1 className="text-2xl font-bold mb-2">{store.name}</h1>
        <div className="flex items-center gap-2 text-sm">
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

      {/* Menu */}
      <div className="p-4 space-y-4">
        <h2 className="font-bold text-lg text-gray-800">MENU HÔM NAY</h2>
        {menu.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            Hôm nay quán chưa lên món
          </div>
        )}
        {menu.map((item) => (
          <div
            key={item.id}
            className={`bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex justify-between items-center ${
              !item.isAvailable ? "opacity-60" : ""
            }`}
          >
            <div className="flex items-center gap-3">
              {item.imageUrl && (
                <img
                  src={item.imageUrl}
                  alt={item.name}
                  className="w-16 h-16 rounded-lg object-cover"
                  referrerPolicy="no-referrer"
                />
              )}
              <div>
                <div className="font-semibold text-lg mb-1">{item.name}</div>
                <div className="text-gray-600 font-medium">
                  {item.price.toLocaleString("vi-VN")}đ
                </div>
              </div>
            </div>

            {item.isAvailable ? (
              <div className="flex items-center gap-3 ml-2">
                {cart[item.id] ? (
                  <>
                    <button
                      onClick={() => handleRemoveFromCart(item.id)}
                      className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 hover:bg-gray-200"
                    >
                      <Minus size={16} />
                    </button>
                    <span className="font-semibold w-4 text-center">
                      {cart[item.id]}
                    </span>
                    <button
                      onClick={() => handleAddToCart(item.id)}
                      className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 hover:bg-blue-200"
                    >
                      <Plus size={16} />
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => handleAddToCart(item.id)}
                    disabled={store.status === "CLOSED"}
                    className="px-4 py-2 bg-blue-50 text-blue-600 font-semibold rounded-lg hover:bg-blue-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Thêm
                  </button>
                )}
              </div>
            ) : (
              <span className="px-3 py-1 bg-gray-100 text-gray-500 text-sm font-medium rounded-lg whitespace-nowrap ml-2">
                Hết món
              </span>
            )}
          </div>
        ))}
      </div>

      {/* Bottom Bar */}
      {totalItems > 0 && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-200 z-20">
          <div className="max-w-md mx-auto">
            <button
              onClick={() => setIsDrawerOpen(true)}
              className="w-full bg-blue-600 text-white font-semibold py-3 px-4 rounded-xl hover:bg-blue-700 transition-colors flex justify-between items-center shadow-lg shadow-blue-200"
            >
              <div className="flex items-center gap-2">
                <div className="bg-white/20 w-6 h-6 rounded-full flex items-center justify-center text-sm">
                  {totalItems}
                </div>
                <span>Đặt món</span>
              </div>
              <span>{totalPrice.toLocaleString("vi-VN")}đ</span>
            </button>
          </div>
        </div>
      )}

      {/* Drawer */}
      {isDrawerOpen && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setIsDrawerOpen(false)}
          />
          <div className="bg-white w-full max-w-md mx-auto rounded-t-2xl relative flex flex-col max-h-[90vh]">
            <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-white rounded-t-2xl sticky top-0 z-10">
              <h2 className="text-xl font-bold">Giỏ hàng của bạn</h2>
              <button
                onClick={() => setIsDrawerOpen(false)}
                className="p-2 text-gray-400 hover:text-gray-600"
              >
                <X size={24} />
              </button>
            </div>

            <div className="p-4 overflow-y-auto space-y-6">
              {/* Cart Items */}
              <div className="space-y-3">
                {cartItems.map((item) => (
                  <div
                    key={item.menuItemId}
                    className="flex justify-between items-center"
                  >
                    <div>
                      <div className="font-medium">{item.name}</div>
                      <div className="text-sm text-gray-500">
                        {item.price.toLocaleString("vi-VN")}đ
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => handleRemoveFromCart(item.menuItemId)}
                        className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-600"
                      >
                        <Minus size={16} />
                      </button>
                      <span className="font-semibold w-4 text-center">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => handleAddToCart(item.menuItemId)}
                        className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600"
                      >
                        <Plus size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Form */}
              <div className="space-y-4 pt-4 border-t border-gray-100">
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
                    <Clock size={16} /> Giờ nhận *
                  </label>
                  <select
                    value={receiveTime}
                    onChange={(e) => setReceiveTime(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-3 focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                  >
                    <option value="15 phút nữa">15 phút nữa</option>
                    <option value="30 phút nữa">30 phút nữa</option>
                    <option value="45 phút nữa">45 phút nữa</option>
                    <option value="1 tiếng nữa">1 tiếng nữa</option>
                  </select>
                </div>
                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1">
                    <MapPin size={16} /> Địa điểm nhận
                  </label>
                  <input
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="VD: Bàn số 3, Tầng 2..."
                    className="w-full border border-gray-300 rounded-lg px-3 py-3 focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1">
                    <FileText size={16} /> Ghi chú
                  </label>
                  <input
                    type="text"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Ít đá, nhiều sữa..."
                    className="w-full border border-gray-300 rounded-lg px-3 py-3 focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                    Phương thức thanh toán
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
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
                </div>
              </div>
            </div>

            <div className="p-4 bg-white border-t border-gray-100 sticky bottom-0">
              <button
                onClick={handleSubmitOrder}
                className="w-full bg-blue-600 text-white font-semibold py-3 rounded-xl hover:bg-blue-700 transition-colors"
              >
                Gửi đơn ({totalPrice.toLocaleString("vi-VN")}đ)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}