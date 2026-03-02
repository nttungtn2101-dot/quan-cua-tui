import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAppStore } from "../lib/store";
import { StoreStatus } from "../lib/types";
import { Plus, Trash2 } from "lucide-react";

export default function Setup() {
  const { state, updateStore, addMenuItem, deleteMenuItem } = useAppStore();
  const navigate = useNavigate();

  const [name, setName] = useState(state.store.name);
  const [closingTime, setClosingTime] = useState(state.store.closingTime);
  const [status, setStatus] = useState<StoreStatus>(state.store.status);
  const [bankInfo, setBankInfo] = useState(state.store.bankInfo || "");
  const [password, setPassword] = useState("");

  const [newItemName, setNewItemName] = useState("");
  const [newItemPrice, setNewItemPrice] = useState("");
  const [newItemImage, setNewItemImage] = useState("");

  useEffect(() => {
    setName(state.store.name);
    setClosingTime(state.store.closingTime);
    setStatus(state.store.status);
    setBankInfo(state.store.bankInfo || "");
  }, [state.store]);

  const handleSaveStore = async () => {
    const data: any = { name, closingTime, status, bankInfo };
    if (password) data.password = password;
    await updateStore(data);
    navigate("/owner");
  };

  const handleAddItem = async () => {
    if (!newItemName.trim() || !newItemPrice) return;
    await addMenuItem({
      id: Date.now().toString(),
      name: newItemName,
      price: parseInt(newItemPrice, 10),
      isAvailable: true,
      imageUrl:
        newItemImage ||
        `https://picsum.photos/seed/${newItemName.replace(/\s/g, "")}/200/200`,
    });
    setNewItemName("");
    setNewItemPrice("");
    setNewItemImage("");
  };

  const handleDeleteItem = async (id: string) => {
    await deleteMenuItem(id);
  };

  return (
    <div className="max-w-md mx-auto p-4 pb-24">
      <h1 className="text-2xl font-bold mb-6">Thiết lập quán</h1>

      <div className="space-y-4 bg-white p-4 rounded-xl shadow-sm border border-gray-100 mb-6">
        <h2 className="font-semibold text-lg">Thông tin chung</h2>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Tên quán
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Giờ nhận đơn đến
          </label>
          <input
            type="time"
            value={closingTime}
            onChange={(e) => setClosingTime(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Trạng thái hôm nay
          </label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as StoreStatus)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
          >
            <option value="OPEN">🟢 Đang mở</option>
            <option value="CLOSING_SOON">🟡 Sắp đóng</option>
            <option value="CLOSED">🔴 Nghỉ</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Thông tin chuyển khoản (Tuỳ chọn)
          </label>
          <textarea
            value={bankInfo}
            onChange={(e) => setBankInfo(e.target.value)}
            placeholder="Ngân hàng: VCB&#10;STK: 123456789&#10;Tên: NGUYEN VAN A"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none h-24 resize-none"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Đổi mật khẩu quản lý (Để trống nếu không đổi)
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Mật khẩu mới..."
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
          />
        </div>
      </div>

      <div className="space-y-4 bg-white p-4 rounded-xl shadow-sm border border-gray-100 mb-6">
        <h2 className="font-semibold text-lg">Menu hôm nay</h2>
        <div className="space-y-3">
          {state.menu.length === 0 && (
            <div className="text-center py-4 text-gray-500 text-sm">
              Chưa có món nào
            </div>
          )}
          {state.menu.map((item) => (
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
                  <div className="font-medium">{item.name}</div>
                  <div className="text-sm text-gray-500">
                    {item.price.toLocaleString("vi-VN")}đ
                  </div>
                </div>
              </div>
              <button
                onClick={() => handleDeleteItem(item.id)}
                className="p-2 text-red-500 hover:bg-red-50 rounded-full transition-colors"
              >
                <Trash2 size={18} />
              </button>
            </div>
          ))}
        </div>

        <div className="pt-4 border-t border-gray-100 mt-4 space-y-2">
          <h3 className="text-sm font-medium text-gray-700">Thêm món mới</h3>
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
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Link ảnh (tuỳ chọn)"
              value={newItemImage}
              onChange={(e) => setNewItemImage(e.target.value)}
              className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            />
            <button
              onClick={handleAddItem}
              className="bg-blue-100 text-blue-600 px-4 py-2 rounded-lg hover:bg-blue-200 transition-colors font-medium"
            >
              Thêm
            </button>
          </div>
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-200">
        <div className="max-w-md mx-auto">
          <button
            onClick={handleSaveStore}
            className="w-full bg-blue-600 text-white font-semibold py-3 rounded-xl hover:bg-blue-700 transition-colors"
          >
            Lưu thiết lập
          </button>
        </div>
      </div>
    </div>
  );
}
