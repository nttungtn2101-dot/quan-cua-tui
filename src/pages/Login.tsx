import React, { useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

function normalizePhone(phone: string) {
  let s = (phone || "").trim();
  s = s.replace(/[^\d+]/g, "");
  if (s.startsWith("+84")) s = "0" + s.slice(3);
  if (s.startsWith("84") && s.length >= 10 && s.length <= 12) s = "0" + s.slice(2);
  s = s.replace(/\D/g, "");
  return s;
}

function isValidPhone(phone: string) {
  return /^[0-9]{9,11}$/.test(phone);
}

function safeNextPath(next: string) {
  // Chỉ cho phép điều hướng nội bộ dạng "/..."
  // Tránh next kiểu "http://..." hoặc "//evil.com"
  if (!next) return null;
  if (!next.startsWith("/")) return null;
  if (next.startsWith("//")) return null;
  return next;
}

function isOwnerNext(next: string) {
  try {
    const clean = (next || "").split("?")[0].split("#")[0];
    return clean.startsWith("/o/");
  } catch {
    return false;
  }
}

export default function Login() {
  const nav = useNavigate();
  const [params] = useSearchParams();

  const nextRaw = params.get("next") || "/o";
  const next = useMemo(() => safeNextPath(nextRaw) || "/o", [nextRaw]);

  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const p = normalizePhone(phone);
    const pw = password.trim();

    if (!isValidPhone(p)) return setError("Vui lòng nhập Số điện thoại hợp lệ.");
    if (!pw) return setError("Vui lòng nhập Mật khẩu.");

    setBusy(true);
    try {
      const r = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: p, password: pw }),
      });

      const j = await r.json().catch(() => ({}));
      if (!r.ok) {
        setError(j?.error || "Đăng nhập thất bại.");
        return;
      }

      const slug = String(j?.slug || "");
      const token = String(j?.token || "");

      if (!slug || !token) {
        setError("Máy chủ trả về thiếu dữ liệu (slug/token).");
        return;
      }

      // token per shop
      localStorage.setItem(`ownerToken_${slug}`, token);

      // ✅ FIX LOOP: hard redirect để AppProvider đọc token ngay khi load lại
      const target = isOwnerNext(next) ? next : `/o/${encodeURIComponent(slug)}`;
      window.location.replace(target);
    } catch {
      setError("Không kết nối được máy chủ. Hãy thử lại.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="max-w-md mx-auto p-4 mt-20">
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <h1 className="text-2xl font-bold mb-2 text-center">Đăng nhập Quản lý</h1>
        <p className="text-sm text-gray-600 text-center mb-6">
          Nhập số điện thoại đã dùng khi tạo quán và mật khẩu quản lý.
        </p>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Số điện thoại (hoặc Zalo)
            </label>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none"
              placeholder="Ví dụ: 0901234567"
              inputMode="tel"
              autoComplete="tel"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Mật khẩu
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none"
              placeholder="Nhập mật khẩu..."
              autoComplete="current-password"
            />
          </div>

          {error && <p className="text-red-500 text-sm">{error}</p>}

          <button
            disabled={busy}
            type="submit"
            className={`w-full text-white font-semibold py-2 rounded-lg transition-colors ${
              busy ? "bg-blue-400" : "bg-blue-600 hover:bg-blue-700"
            }`}
          >
            {busy ? "Đang đăng nhập..." : "Đăng nhập"}
          </button>

          <button
            type="button"
            onClick={() => nav("/o")}
            className="w-full py-2 rounded-lg border bg-white hover:bg-gray-50 font-semibold"
          >
            Quay lại Khu Quán
          </button>
        </form>
      </div>
    </div>
  );
}