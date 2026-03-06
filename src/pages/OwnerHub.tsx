import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

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

// slugify tiếng Việt -> slug base
function slugifyVN(input: string) {
  return input
    .trim()
    .toLowerCase()
    .replace(/đ/g, "d")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

// suffix random (crypto-safe if possible)
function randomSuffix(len = 4) {
  try {
    const arr = new Uint8Array(len);
    window.crypto.getRandomValues(arr);
    return Array.from(arr)
      .map((n) => (n % 36).toString(36))
      .join("");
  } catch {
    return Math.random().toString(36).slice(2, 2 + len);
  }
}

export default function OwnerHub() {
  const nav = useNavigate();
  const [mode, setMode] = useState<"create" | "existing">("create");

  // Create form
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [closingTime, setClosingTime] = useState("22:00");
  const [password, setPassword] = useState("");

  // Existing form
  const [phoneExisting, setPhoneExisting] = useState("");
  const [passwordExisting, setPasswordExisting] = useState("");

  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  // slug gợi ý: <ten-quan>-<xxxx>
  const suggestedSlug = useMemo(() => {
    const base = slugifyVN(name);
    if (!base) return "";
    return `${base}-${randomSuffix(4)}`.slice(0, 50);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [name]);

  // ✅ đi thẳng vào /o/:slug sau khi lưu token
  // dùng hard redirect để AppProvider đọc token chắc chắn (tránh bị đá về /login)
  const goOwnerHard = (slug: string) => {
    window.location.href = `/o/${encodeURIComponent(slug)}`;
  };

  const createShop = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr("");

    const safeName = name.trim();
    const safePhone = normalizePhone(phone);
    const safePassword = password.trim();
    const safeClosing = (closingTime || "22:00").trim();

    if (!safeName) return setErr("Vui lòng nhập Tên quán.");
    if (!isValidPhone(safePhone)) return setErr("Vui lòng nhập Số điện thoại hợp lệ.");
    if (safePassword.length < 4) return setErr("Mật khẩu nên từ 4 ký tự trở lên.");

    // ✅ luôn gửi slug (server cần)
    const slug = suggestedSlug || `${slugifyVN(safeName)}-${randomSuffix(4)}`;

    setBusy(true);
    try {
      const r = await fetch("/api/shops", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: safeName,
          slug,
          closingTime: safeClosing,
          password: safePassword,
          phone: safePhone,
          bankInfo: "",
        }),
      });

      const j = await r.json().catch(() => ({}));

      if (r.status === 409) {
        // ✅ 1 phone = 1 shop
        setMode("existing");
        setErr(j?.error || "Số điện thoại này đã có quán. Bấm ‘Tôi đã có quán’ để đăng nhập.");
        setPhoneExisting(safePhone);
        return;
      }

      if (!r.ok) {
        setErr(j?.error || "Tạo quán thất bại. Hãy thử lại.");
        return;
      }

      // server mới trả token + shop.slug
      const realSlug = String(j?.shop?.slug || j?.slug || slug || "");
      const token = String(j?.token || "");

      if (!realSlug || !token) {
        setErr("Máy chủ trả về thiếu dữ liệu (slug/token). Hãy thử lại.");
        return;
      }

      // ✅ auto-login: lưu token theo slug rồi vào thẳng quản lý
      localStorage.setItem(`ownerToken_${realSlug}`, token);
      goOwnerHard(realSlug);
    } catch {
      setErr("Không kết nối được máy chủ. Hãy thử lại.");
    } finally {
      setBusy(false);
    }
  };

  const loginExisting = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr("");

    const p = normalizePhone(phoneExisting);
    const pw = passwordExisting.trim();

    if (!isValidPhone(p)) return setErr("Vui lòng nhập Số điện thoại hợp lệ.");
    if (!pw) return setErr("Vui lòng nhập Mật khẩu.");

    setBusy(true);
    try {
      const r = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: p, password: pw }),
      });

      const j = await r.json().catch(() => ({}));
      if (!r.ok) {
        setErr(j?.error || "Đăng nhập thất bại.");
        return;
      }

      const slug = String(j?.slug || "");
      const token = String(j?.token || "");

      if (!slug || !token) {
        setErr("Máy chủ trả về thiếu dữ liệu (slug/token). Hãy thử lại.");
        return;
      }

      localStorage.setItem(`ownerToken_${slug}`, token);
      goOwnerHard(slug);
    } catch {
      setErr("Không kết nối được máy chủ. Hãy thử lại.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto p-4 mt-10">
      <div className="bg-white border rounded-2xl shadow-sm p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Khu Quán</h1>
            <p className="text-gray-600 mt-1">Tạo quán để nhận đơn bằng QR. Không cần email.</p>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                setMode("create");
                setErr("");
              }}
              className={`px-3 py-2 rounded-lg text-sm font-semibold border ${
                mode === "create"
                  ? "bg-orange-600 text-white border-orange-600"
                  : "bg-white hover:bg-gray-50"
              }`}
            >
              Tạo quán mới
            </button>
            <button
              type="button"
              onClick={() => {
                setMode("existing");
                setErr("");
              }}
              className={`px-3 py-2 rounded-lg text-sm font-semibold border ${
                mode === "existing"
                  ? "bg-orange-600 text-white border-orange-600"
                  : "bg-white hover:bg-gray-50"
              }`}
            >
              Tôi đã có quán
            </button>
          </div>
        </div>

        {err && (
          <div className="mt-4 p-3 rounded-lg border border-red-200 bg-red-50 text-red-700 text-sm">
            {err}
          </div>
        )}

        {/* CREATE */}
        {mode === "create" && (
          <div className="mt-6">
            <form onSubmit={createShop} className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="text-sm font-medium">Tên quán</label>
                  <input
                    className="w-full border rounded-lg px-3 py-2 mt-1"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ví dụ: Bánh cuốn Bà Thái"
                    autoComplete="off"
                  />
                  <p className="text-xs text-gray-500 mt-1">Bạn chỉ cần nhập tên. Link/QR sẽ tự tạo.</p>
                </div>

                <div>
                  <label className="text-sm font-medium">Số điện thoại (hoặc Zalo)</label>
                  <input
                    className="w-full border rounded-lg px-3 py-2 mt-1"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="Ví dụ: 0901234567"
                    inputMode="tel"
                    autoComplete="tel"
                  />
                  <p className="text-xs text-gray-500 mt-1">Dùng để tìm lại quán khi đổi máy.</p>
                </div>

                <div>
                  <label className="text-sm font-medium">Giờ đóng cửa</label>
                  <input
                    className="w-full border rounded-lg px-3 py-2 mt-1"
                    value={closingTime}
                    onChange={(e) => setClosingTime(e.target.value)}
                    placeholder="22:00"
                    autoComplete="off"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium">Mật khẩu quản lý</label>
                  <input
                    type="password"
                    className="w-full border rounded-lg px-3 py-2 mt-1"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Đặt mật khẩu để vào quản lý"
                    autoComplete="new-password"
                  />
                  <p className="text-xs text-gray-500 mt-1">Mật khẩu này chỉ bạn biết. Khách không cần.</p>
                </div>
              </div>

              <button
                disabled={busy}
                className={`w-full py-2 rounded-lg font-semibold text-white ${
                  busy ? "bg-orange-400" : "bg-orange-600 hover:bg-orange-700"
                }`}
              >
                {busy ? "Đang tạo..." : "Tạo quán & vào quản lý"}
              </button>

              {/* debug nhẹ (không lộ ra cho user nếu bạn không muốn, cứ xoá cũng được) */}
              {name.trim() && (
                <div className="text-xs text-gray-500">
                  Link/QR sẽ là: <span className="font-mono">/o/{suggestedSlug || "ten-quan-xxxx"}</span>
                </div>
              )}
            </form>
          </div>
        )}

        {/* EXISTING */}
        {mode === "existing" && (
          <div className="mt-6">
            <div className="border rounded-xl p-4">
              <div className="font-semibold">Đăng nhập quán của bạn</div>
              <p className="text-sm text-gray-600 mt-1">
                Nhập đúng số điện thoại đã dùng khi tạo quán và mật khẩu quản lý.
              </p>

              <form onSubmit={loginExisting} className="mt-4 space-y-3">
                <div>
                  <label className="text-sm font-medium">Số điện thoại (hoặc Zalo)</label>
                  <input
                    className="w-full border rounded-lg px-3 py-2 mt-1"
                    value={phoneExisting}
                    onChange={(e) => setPhoneExisting(e.target.value)}
                    placeholder="Ví dụ: 0901234567"
                    inputMode="tel"
                    autoComplete="tel"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium">Mật khẩu quản lý</label>
                  <input
                    type="password"
                    className="w-full border rounded-lg px-3 py-2 mt-1"
                    value={passwordExisting}
                    onChange={(e) => setPasswordExisting(e.target.value)}
                    placeholder="Nhập mật khẩu..."
                    autoComplete="current-password"
                  />
                </div>

                <button
                  disabled={busy}
                  className={`w-full py-2 rounded-lg font-semibold text-white ${
                    busy ? "bg-orange-400" : "bg-orange-600 hover:bg-orange-700"
                  }`}
                >
                  {busy ? "Đang đăng nhập..." : "Tiếp tục"}
                </button>

                <div className="text-xs text-gray-500">
                  * Nếu quên mật khẩu: hiện tại chưa có tính năng khôi phục. (Sẽ làm sau.)
                </div>
              </form>

              <div className="mt-3">
                <button
                  type="button"
                  onClick={() => {
                    setMode("create");
                    setErr("");
                  }}
                  className="text-sm text-gray-600 hover:text-gray-900 underline"
                >
                  Tôi muốn tạo quán mới
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}