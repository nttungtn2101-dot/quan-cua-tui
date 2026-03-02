import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAppStore } from "../lib/store";

export default function Login() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const { login } = useAppStore();
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const success = await login(password);
    if (success) {
      navigate("/owner");
    } else {
      setError("Sai mật khẩu! (Mặc định: 123456)");
    }
  };

  return (
    <div className="max-w-md mx-auto p-4 mt-20">
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <h1 className="text-2xl font-bold mb-6 text-center">
          Đăng nhập Quản lý
        </h1>
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Mật khẩu
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="Nhập mật khẩu..."
            />
          </div>
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <button
            type="submit"
            className="w-full bg-blue-600 text-white font-semibold py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Đăng nhập
          </button>
        </form>
      </div>
    </div>
  );
}
