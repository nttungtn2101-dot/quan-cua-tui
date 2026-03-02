import React, { useRef, useState } from "react";
import { useAppStore } from "../lib/store";
import { StoreStatus, OrderStatus } from "../lib/types";
import {
  Copy,
  QrCode,
  Check,
  X,
  TrendingUp,
  ShoppingBag,
  Trash2,
  Image as ImageIcon,
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";

async function fileToDataUrl(file: File): Promise<string> {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("read file failed"));
    reader.readAsDataURL(file);
  });
  return dataUrl;
}

export default function Owner() {
  const {
    state,
    updateStore,
    updateMenuItem,
    addMenuItem,
    deleteMenuItem,
    updateOrderStatus,
    shopId, // from store.ts (nếu bạn đã dán store.ts mình đưa)
  } = useAppStore();

  // ✅ fallback nếu store.ts chưa expose shopId
  const urlParams = new URLSearchParams(window.location.search);
  const shopIdFromUrl = urlParams.get("shopId") || "shop_1";
  const finalShopId = shopId || shopIdFromUrl;

  const [copied, setCopied] = useState(false);
  const [showQR, setShowQR] = useState(false);

  const [newItemName, setNewItemName] = useState("");
  const [newItemPrice, setNewItemPrice] = useState("");
  const [newItemImage, setNewItemImage] = useState<string>(""); // dataUrl hoặc rỗng
  const [uploadingNew, setUploadingNew] = useState(false);

  // input file cho thêm món
  const newImageInputRef = useRef<HTMLInputElement | null>(null);

  const handleStatusChange = async (status: StoreStatus) => {
    await updateStore({ status });
  };

  const handleToggleItem = async (item: any) => {
    await updateMenuItem({ ...item, isAvailable: !item.isAvailable });
  };

  const handleDeleteItem = async (id: string) => {
    const ok = confirm("Bạn chắc chắn muốn xoá món này khỏi menu?");
    if (!ok) return;
    try {
      await deleteMenuItem(id);
    } catch (e: any) {
      alert("Xoá thất bại: " + (e?.message || "Unauthorized"));
    }
  };

  // ✅ Upload ảnh cho món mới
  const handlePickNewImage = async (file: File | null) => {
    if (!file) return;
    setUploadingNew(true);
    try {
      const dataUrl = await fileToDataUrl(file);
      setNewItemImage(dataUrl);
    } catch (e: any) {
      alert("Tải ảnh thất bại: " + (e?.message || e));
    } finally {
      setUploadingNew(false);
    }
  };

  const handleAddItem = async () => {
    if (!newItemName.trim() || !newItemPrice) return;

    await addMenuItem({
      id: Date.now().toString(),
      name: newItemName.trim(),
      price: parseInt(newItemPrice, 10),
      isAvailable: true,
      // Nếu user không upload ảnh thì dùng picsum để demo
      imageUrl:
        newItemImage ||
        `https://picsum.photos/seed/${newItemName.replace(/\s/g, "")}/200/200`,
    });

    setNewItemName("");
    setNewItemPrice("");
    setNewItemImage("");
    if (newImageInputRef.current) newImageInputRef.current.value = "";
  };

  // ✅ Đổi ảnh cho món có sẵn (upload thủ công)
  const handleReplaceItemImage = async (item: any, file: File | null) => {
    if (!file) return;
    try {
      const dataUrl = await fileToDataUrl(file);
      await updateMenuItem({ ...item, imageUrl: dataUrl });
    } catch (e: any) {
      alert("Đổi ảnh thất bại: " + (e?.message || e));
    }
  };

  const handleUpdateOrder = async (id: string, status: OrderStatus) => {
    await updateOrderStatus(id, status);
  };

  // ✅ Multi-shop link: giữ nguyên 1 QR cho quán (shopId)
  const customerLink = `${window.location.origin}/customer?shopId=${encodeURIComponent(
    finalShopId,
  )}`;

  const copyLink = () => {
    navigator.clipboard.writeText(customerLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Stats
  const confirmedOrders = state.orders.filter((o) => o.status === "CONFIRMED");
  const totalRevenue = confirmedOrders.reduce((sum, o) => sum + o.totalPrice, 0);

  return (
    <div className="max-w-md mx-auto p-4 pb-24 space-y-6">
      <h1 className="text-2xl font-bold">Quản lý quán</h1>

      {/* Thống kê */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
          <div className="text-gray-500 mb-1 flex items-center gap-1 text-sm">
            <ShoppingBag size={16} /> Đơn hoàn thành
          </div>
          <div className="text-2xl font-bold text-gray-900">
            {confirmedOrders.length}
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
          <div className="text-gray-500 mb-1 flex items-center gap-1 text-sm">
            <TrendingUp size={16} /> Doanh thu
          </div>
          <div className="text-2xl font-bold text-green-600">
            {totalRevenue.toLocaleString("vi-VN")}đ
          </div>
        </div>
      </div>

      {/* Trạng thái quán */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
        <h2 className="font-semibold text-lg mb-3">Trạng thái hôm nay</h2>
        <div className="flex gap-2">
          {(["OPEN", "CLOSING_SOON", "CLOSED"] as StoreStatus[]).map((status) => (
            <button
              key={status}
              onClick={() => handleStatusChange(status)}
              className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                state.store.status === status
                  ? status === "OPEN"
                    ? "bg-green-100 text-green-700 border-green-200"
                    : status === "CLOSING_SOON"
                      ? "bg-yellow-100 text-yellow-700 border-yellow-200"
                      : "bg-red-100 text-red-700 border-red-200"
                  : "bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100"
              } border`}
            >
              {status === "OPEN" && "🟢 Đang mở"}
              {status === "CLOSING_SOON" && "🟡 Sắp đóng"}
              {status === "CLOSED" && "🔴 Nghỉ"}
            </button>
          ))}
        </div>
      </div>

      {/* Link / QR */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
        <h2 className="font-semibold text-lg mb-3">Chia sẻ cho khách</h2>
        {!showQR ? (
          <button
            onClick={() => setShowQR(true)}
            className="w-full py-3 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
          >
            <QrCode size={20} /> Tạo mã QR đặt món
          </button>
        ) : (
          <div className="space-y-4">
            <div className="flex justify-center p-4 bg-gray-50 rounded-xl border border-gray-200">
              <QRCodeSVG value={customerLink} size={200} />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={customerLink}
                className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-600 outline-none"
              />
              <button
                onClick={copyLink}
                className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors"
                title="Copy link"
              >
                {copied ? <Check size={20} /> : <Copy size={20} />}
              </button>
            </div>
            <button
              onClick={() => setShowQR(false)}
              className="w-full py-2 bg-gray-100 text-gray-700 font-medium rounded-lg hover:bg-gray-200 transition-colors"
            >
              Ẩn mã QR
            </button>
          </div>
        )}
      </div>

      {/* Menu hôm nay */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
        <h2 className="font-semibold text-lg mb-3">Menu hôm nay</h2>

        <div className="space-y-3">
          {state.menu.map((item: any) => (
            <div
              key={item.id}
              className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100"
            >
              <div className="flex items-center gap-3">
                {item.imageUrl && (
                  <img
                    src={item.imageUrl}
                    alt={item.name}
                    className="w-12 h-12 rounded-lg object-cover"
                    referrerPolicy="no-referrer"
                  />
                )}
                <div>
                  <div
                    className={`font-medium ${
                      !item.isAvailable && "text-gray-400 line-through"
                    }`}
                  >
                    {item.name}
                  </div>
                  <div className="text-sm text-gray-500">
                    {item.price.toLocaleString("vi-VN")}đ
                  </div>

                  {/* ✅ Nút đổi ảnh (upload thủ công) */}
                  <div className="mt-2">
                    <label className="inline-flex items-center gap-2 text-xs px-2 py-1 rounded-lg bg-white border border-gray-200 hover:bg-gray-50 cursor-pointer">
                      <ImageIcon size={14} />
                      Đổi ảnh
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) =>
                          handleReplaceItemImage(
                            item,
                            e.target.files?.[0] || null,
                          )
                        }
                      />
                    </label>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleToggleItem(item)}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                    item.isAvailable
                      ? "bg-green-100 text-green-700"
                      : "bg-gray-200 text-gray-600"
                  }`}
                >
                  {item.isAvailable ? "Còn" : "Hết"}
                </button>

                <button
                  onClick={() => handleDeleteItem(String(item.id))}
                  className="p-2 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
                  title="Xoá món"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Add item */}
        <div className="pt-4 border-t border-gray-100 mt-4 space-y-2">
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Tên món"
              value={newItemName}
              onChange={(e) => setNewItemName(e.target.value)}
              className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            />
            <input
              type="number"
              placeholder="Giá"
              value={newItemPrice}
              onChange={(e) => setNewItemPrice(e.target.value)}
              className="w-24 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>

          {/* ✅ Upload ảnh khi thêm món */}
          <div className="flex gap-2 items-center">
            <input
              ref={newImageInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) =>
                handlePickNewImage(e.target.files?.[0] || null)
              }
            />
            <button
              type="button"
              onClick={() => newImageInputRef.current?.click()}
              className="flex-1 flex items-center justify-center gap-2 border border-gray-300 rounded-lg px-3 py-2 text-sm hover:bg-gray-50"
            >
              <ImageIcon size={18} />
              {uploadingNew ? "Đang tải ảnh..." : "Chọn ảnh minh hoạ (upload)"}
            </button>

            {newItemImage && (
              <button
                type="button"
                onClick={() => {
                  setNewItemImage("");
                  if (newImageInputRef.current)
                    newImageInputRef.current.value = "";
                }}
                className="px-3 py-2 rounded-lg bg-gray-200 text-gray-700 hover:bg-gray-300 text-sm"
              >
                Bỏ ảnh
              </button>
            )}
          </div>

          {newItemImage && (
            <div className="flex items-center gap-3 p-3 bg-gray-50 border border-gray-200 rounded-lg">
              <img
                src={newItemImage}
                alt="preview"
                className="w-12 h-12 rounded-lg object-cover"
              />
              <div className="text-sm text-gray-600">
                Preview ảnh món mới
              </div>
            </div>
          )}

          <button
            onClick={handleAddItem}
            className="w-full bg-blue-100 text-blue-600 px-4 py-2 rounded-lg hover:bg-blue-200 transition-colors font-medium"
          >
            Thêm món
          </button>
        </div>
      </div>

      {/* Đơn hàng */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
        <h2 className="font-semibold text-lg mb-3">
          Đơn hàng ({state.orders.length})
        </h2>
        <div className="space-y-4">
          {state.orders.length === 0 && (
            <div className="text-center py-8 text-gray-500 text-sm">
              Chưa có đơn hàng nào
            </div>
          )}
          {state.orders.map((order: any) => (
            <div
              key={order.id}
              className={`border rounded-xl p-4 ${
                order.status === "NEW"
                  ? "border-blue-300 bg-blue-50/30"
                  : "border-gray-200"
              }`}
            >
              <div className="flex justify-between items-start mb-3">
                <div>
                  <div className="font-semibold text-lg">
                    {order.customerPhone}
                  </div>
                  <div className="text-sm text-gray-500">
                    {new Date(order.createdAt).toLocaleTimeString("vi-VN", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </div>
                </div>
                <span
                  className={`px-2 py-1 rounded text-xs font-bold ${
                    order.status === "NEW"
                      ? "bg-blue-100 text-blue-700"
                      : order.status === "CONFIRMED"
                        ? "bg-green-100 text-green-700"
                        : "bg-red-100 text-red-700"
                  }`}
                >
                  {order.status === "NEW" && "MỚI"}
                  {order.status === "CONFIRMED" && "ĐÃ XÁC NHẬN"}
                  {order.status === "REJECTED" && "ĐÃ TỪ CHỐI"}
                </span>
              </div>

              <div className="bg-white rounded-lg p-3 mb-3 space-y-2 text-sm border border-gray-100 shadow-sm">
                {order.items.map((item: any, idx: number) => (
                  <div key={idx} className="flex justify-between">
                    <span>
                      {item.quantity}x {item.name}
                    </span>
                    <span className="font-medium">
                      {(item.price * item.quantity).toLocaleString("vi-VN")}đ
                    </span>
                  </div>
                ))}
                <div className="border-t border-gray-200 pt-2 flex justify-between font-bold">
                  <span>Tổng cộng</span>
                  <span>{order.totalPrice.toLocaleString("vi-VN")}đ</span>
                </div>
              </div>

              <div className="text-sm space-y-1 mb-4">
                <p>
                  <span className="text-gray-500">Thanh toán:</span>{" "}
                  <span className="font-medium">
                    {order.paymentMethod === "TRANSFER"
                      ? "Chuyển khoản"
                      : "Tiền mặt"}
                  </span>
                </p>
                <p>
                  <span className="text-gray-500">Giờ nhận:</span>{" "}
                  <span className="font-medium">{order.receiveTime}</span>
                </p>
                {order.receiveLocation && (
                  <p>
                    <span className="text-gray-500">Địa điểm:</span>{" "}
                    {order.receiveLocation}
                  </p>
                )}
                {order.note && (
                  <p>
                    <span className="text-gray-500">Ghi chú:</span> {order.note}
                  </p>
                )}
              </div>

              {order.status === "NEW" && (
                <div className="flex gap-2">
                  <button
                    onClick={() => handleUpdateOrder(order.id, "REJECTED")}
                    className="flex-1 py-2 px-4 border border-red-200 text-red-600 rounded-lg font-medium hover:bg-red-50 transition-colors flex justify-center items-center gap-1"
                  >
                    <X size={18} /> Từ chối
                  </button>
                  <button
                    onClick={() => handleUpdateOrder(order.id, "CONFIRMED")}
                    className="flex-1 py-2 px-4 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors flex justify-center items-center gap-1"
                  >
                    <Check size={18} /> Xác nhận
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}