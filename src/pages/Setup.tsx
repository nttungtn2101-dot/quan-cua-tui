// FILE: src/pages/Setup.tsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useAppStore } from "../lib/store";
import { StoreStatus } from "../lib/types";
import {
  Image as ImageIcon,
  Save,
  Store as StoreIcon,
  Clock,
  Shield,
  CreditCard,
  ExternalLink,
  Trash2,
  CalendarDays,
  Banknote,
  CreditCard as CreditCardIcon,
} from "lucide-react";

async function fileToDataUrl(file: File): Promise<string> {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("read file failed"));
    reader.readAsDataURL(file);
  });
  return dataUrl;
}

// ===== Date helpers =====
const DAY_MS = 86400000;

function startOfDay(ts: number) {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}
function startOfMonth(ts: number) {
  const d = new Date(ts);
  return new Date(d.getFullYear(), d.getMonth(), 1).getTime();
}
function startOfWeekMonday(ts: number) {
  const d = new Date(ts);
  const day = d.getDay(); // 0 Sun .. 6 Sat
  const diff = (day === 0 ? -6 : 1) - day; // shift to Monday
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}
function pad2(n: number) {
  return String(n).padStart(2, "0");
}
function dayKey(ts: number) {
  const d = new Date(ts);
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}
function monthKey(ts: number) {
  const d = new Date(ts);
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}`;
}
function weekKey(ts: number) {
  const wStart = startOfWeekMonday(ts);
  const d = new Date(wStart);
  const year = d.getFullYear();
  const yearStart = startOfWeekMonday(new Date(year, 0, 1).getTime());
  const weekNo = Math.floor((wStart - yearStart) / (7 * DAY_MS)) + 1;
  return `${year}-W${pad2(weekNo)}`;
}

function formatVND(n: number) {
  return (Number(n) || 0).toLocaleString("vi-VN") + "đ";
}

type ReportTab = "day" | "week" | "month";

// ===== Pie chart (2 slices, pure SVG) =====
function Pie2({
  cash,
  transfer,
  size = 120,
}: {
  cash: number;
  transfer: number;
  size?: number;
}) {
  const total = Math.max(0, (cash || 0) + (transfer || 0));
  const r = size / 2;
  const cx = r;
  const cy = r;
  const radius = r - 6;

  if (total <= 0) {
    return (
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={cx} cy={cy} r={radius} fill="none" stroke="#E5E7EB" strokeWidth="12" />
        <circle cx={cx} cy={cy} r={radius - 18} fill="white" />
      </svg>
    );
  }

  const cashRatio = cash / total;
  const cashAngle = cashRatio * Math.PI * 2;

  const x1 = cx + radius * Math.cos(0);
  const y1 = cy + radius * Math.sin(0);
  const x2 = cx + radius * Math.cos(cashAngle);
  const y2 = cy + radius * Math.sin(cashAngle);

  const largeArc = cashAngle > Math.PI ? 1 : 0;

  const cashPath = [
    `M ${cx} ${cy}`,
    `L ${x1} ${y1}`,
    `A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2}`,
    "Z",
  ].join(" ");

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={cx} cy={cy} r={radius} fill="#DBEAFE" />
      <path d={cashPath} fill="#DCFCE7" />
      <circle cx={cx} cy={cy} r={radius - 18} fill="white" />
    </svg>
  );
}

export default function Setup() {
  const { state, updateStore } = useAppStore();
  const store = state.store;

  const [name, setName] = useState(store.name || "");
  const [closingTime, setClosingTime] = useState(store.closingTime || "22:00");
  const [status, setStatus] = useState<StoreStatus>(store.status || "OPEN");
  const [bankInfo, setBankInfo] = useState(store.bankInfo || "");

  const [logoUrl, setLogoUrl] = useState(store.logoUrl || "");
  const [bannerUrl, setBannerUrl] = useState(store.bannerUrl || "");

  // ✅ Quick QR image/url
  const [transferQrUrl, setTransferQrUrl] = useState(store.transferQrUrl || "");
  const [transferQrLink, setTransferQrLink] = useState(
    store.transferQrUrl?.startsWith("http") ? store.transferQrUrl : ""
  );

  const [newPassword, setNewPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string>("");

  const logoInputRef = useRef<HTMLInputElement | null>(null);
  const bannerInputRef = useRef<HTMLInputElement | null>(null);
  const qrInputRef = useRef<HTMLInputElement | null>(null);

  // ===== Revenue report states (moved from Owner -> Setup) =====
  const [reportTab, setReportTab] = useState<ReportTab>("day");
  const [rangeValue, setRangeValue] = useState<string>("day_14");

  useEffect(() => {
    setName(store.name || "");
    setClosingTime(store.closingTime || "22:00");
    setStatus((store.status as StoreStatus) || "OPEN");
    setBankInfo(store.bankInfo || "");
    setLogoUrl(store.logoUrl || "");
    setBannerUrl(store.bannerUrl || "");

    setTransferQrUrl(store.transferQrUrl || "");
    setTransferQrLink(store.transferQrUrl?.startsWith("http") ? store.transferQrUrl : "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    store.name,
    store.closingTime,
    store.status,
    store.bankInfo,
    store.logoUrl,
    store.bannerUrl,
    store.transferQrUrl,
  ]);

  const pickLogo = async (file: File | null) => {
    if (!file) return;
    setMsg("");
    setBusy(true);
    try {
      const data = await fileToDataUrl(file);
      setLogoUrl(data);
    } catch {
      setMsg("Tải ảnh logo thất bại.");
    } finally {
      setBusy(false);
    }
  };

  const pickBanner = async (file: File | null) => {
    if (!file) return;
    setMsg("");
    setBusy(true);
    try {
      const data = await fileToDataUrl(file);
      setBannerUrl(data);
    } catch {
      setMsg("Tải ảnh banner thất bại.");
    } finally {
      setBusy(false);
    }
  };

  const pickTransferQr = async (file: File | null) => {
    if (!file) return;
    setMsg("");
    setBusy(true);
    try {
      const data = await fileToDataUrl(file);
      setTransferQrUrl(data);
      setTransferQrLink("");
    } catch {
      setMsg("Tải ảnh QR thất bại.");
    } finally {
      setBusy(false);
    }
  };

  const save = async () => {
    setMsg("");
    setBusy(true);
    try {
      const payload: any = {
        name: name.trim() || store.name,
        closingTime: (closingTime || "22:00").trim(),
        status,
        bankInfo: bankInfo ?? "",
        logoUrl: logoUrl || "",
        bannerUrl: bannerUrl || "",
        transferQrUrl: transferQrUrl || "",
      };

      if (newPassword.trim()) payload.password = newPassword.trim();

      await updateStore(payload);
      setNewPassword("");
      setMsg("✅ Đã lưu thiết lập.");
    } catch {
      setMsg("❌ Lưu thất bại. Hãy thử lại.");
    } finally {
      setBusy(false);
    }
  };

  const applyQrLink = () => {
    const v = (transferQrLink || "").trim();
    if (!v) {
      setTransferQrUrl("");
      return;
    }
    if (!/^https?:\/\//i.test(v)) {
      setMsg("❌ Link ảnh QR phải bắt đầu bằng http:// hoặc https://");
      return;
    }
    setTransferQrUrl(v);
    setMsg("✅ Đã áp dụng link ảnh QR (nhớ bấm Lưu thiết lập).");
  };

  // ===== Revenue computations (from orders) =====
  const confirmedOrders = useMemo(
    () => state.orders.filter((o: any) => o.status === "CONFIRMED"),
    [state.orders]
  );

  const revenue = useMemo(() => {
    let cash = 0;
    let transfer = 0;

    for (const o of confirmedOrders as any[]) {
      const amt = Number(o.totalPrice || 0);
      if (String(o.paymentMethod || "CASH") === "TRANSFER") transfer += amt;
      else cash += amt;
    }

    return { cash, transfer, total: cash + transfer };
  }, [confirmedOrders]);

  const reportOptions = useMemo(() => {
    const optsDay = [
      { value: "day_7", label: "7 ngày gần nhất" },
      { value: "day_14", label: "14 ngày gần nhất" },
      { value: "day_30", label: "30 ngày gần nhất" },
    ];
    const optsWeek = [
      { value: "week_4", label: "4 tuần gần nhất" },
      { value: "week_8", label: "8 tuần gần nhất" },
      { value: "week_12", label: "12 tuần gần nhất" },
    ];
    const optsMonth = [
      { value: "month_6", label: "6 tháng gần nhất" },
      { value: "month_12", label: "12 tháng gần nhất" },
    ];
    if (reportTab === "day") return optsDay;
    if (reportTab === "week") return optsWeek;
    return optsMonth;
  }, [reportTab]);

  useEffect(() => {
    const isValid = reportOptions.some((o) => o.value === rangeValue);
    if (!isValid) {
      if (reportTab === "day") setRangeValue("day_14");
      else if (reportTab === "week") setRangeValue("week_8");
      else setRangeValue("month_6");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reportTab, reportOptions]);

  const reportData = useMemo(() => {
    const now = Date.now();

    const parseRange = (v: string) => {
      const [t, nStr] = String(v || "").split("_");
      const n = Math.max(1, Number(nStr || 0) || 0);
      return { t, n };
    };

    const { t, n } = parseRange(rangeValue);

    if (t === "day") {
      const days: { key: string; total: number; cash: number; transfer: number }[] = [];
      for (let i = n - 1; i >= 0; i--) {
        const ts = startOfDay(now - i * DAY_MS);
        const key = dayKey(ts);
        days.push({ key, total: 0, cash: 0, transfer: 0 });
      }
      const idx = new Map(days.map((d, i) => [d.key, i]));

      for (const o of confirmedOrders as any[]) {
        const createdAt = Number(o.createdAt || 0);
        const amt = Number(o.totalPrice || 0);
        const isTransfer = String(o.paymentMethod || "CASH") === "TRANSFER";
        const k = dayKey(createdAt);
        const i = idx.get(k);
        if (i !== undefined) {
          days[i].total += amt;
          if (isTransfer) days[i].transfer += amt;
          else days[i].cash += amt;
        }
      }

      const label = reportOptions.find((x) => x.value === rangeValue)?.label || `${n} ngày gần nhất`;
      return {
        rangeLabel: `Theo ngày (${label})`,
        rows: days.map((d) => ({ keyLabel: d.key, total: d.total, cash: d.cash, transfer: d.transfer })),
      };
    }

    if (t === "week") {
      const weeks: { key: string; total: number; cash: number; transfer: number }[] = [];
      for (let i = n - 1; i >= 0; i--) {
        const ts = startOfWeekMonday(now - i * 7 * DAY_MS);
        const key = weekKey(ts);
        weeks.push({ key, total: 0, cash: 0, transfer: 0 });
      }
      const idx = new Map(weeks.map((w, i) => [w.key, i]));

      for (const o of confirmedOrders as any[]) {
        const createdAt = Number(o.createdAt || 0);
        const amt = Number(o.totalPrice || 0);
        const isTransfer = String(o.paymentMethod || "CASH") === "TRANSFER";
        const k = weekKey(createdAt);
        const i = idx.get(k);
        if (i !== undefined) {
          weeks[i].total += amt;
          if (isTransfer) weeks[i].transfer += amt;
          else weeks[i].cash += amt;
        }
      }

      const label = reportOptions.find((x) => x.value === rangeValue)?.label || `${n} tuần gần nhất`;
      return {
        rangeLabel: `Theo tuần (${label})`,
        rows: weeks.map((w) => ({ keyLabel: w.key, total: w.total, cash: w.cash, transfer: w.transfer })),
      };
    }

    // month
    const months: { key: string; total: number; cash: number; transfer: number }[] = [];
    {
      const d0 = new Date(now);
      for (let i = n - 1; i >= 0; i--) {
        const d = new Date(d0.getFullYear(), d0.getMonth() - i, 1);
        const ts = startOfMonth(d.getTime());
        const key = monthKey(ts);
        months.push({ key, total: 0, cash: 0, transfer: 0 });
      }
    }
    const idx = new Map(months.map((m, i) => [m.key, i]));

    for (const o of confirmedOrders as any[]) {
      const createdAt = Number(o.createdAt || 0);
      const amt = Number(o.totalPrice || 0);
      const isTransfer = String(o.paymentMethod || "CASH") === "TRANSFER";
      const k = monthKey(createdAt);
      const i = idx.get(k);
      if (i !== undefined) {
        months[i].total += amt;
        if (isTransfer) months[i].transfer += amt;
        else months[i].cash += amt;
      }
    }

    const label = reportOptions.find((x) => x.value === rangeValue)?.label || `${n} tháng gần nhất`;
    return {
      rangeLabel: `Theo tháng (${label})`,
      rows: months.map((m) => ({ keyLabel: m.key, total: m.total, cash: m.cash, transfer: m.transfer })),
    };
  }, [confirmedOrders, rangeValue, reportOptions]);

  return (
    <div className="max-w-md mx-auto p-4 pb-24 space-y-6">
      <h1 className="text-2xl font-bold">Thiết lập quán</h1>

      {/* Branding */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 space-y-4">
        <div className="flex items-center gap-2 font-semibold">
          <StoreIcon size={18} /> Nhận diện quán
        </div>

        <div className="rounded-xl overflow-hidden border bg-gray-50">
          {bannerUrl ? (
            <img src={bannerUrl} alt="Banner quán" className="w-full h-32 object-cover" />
          ) : (
            <div className="w-full h-32 flex items-center justify-center text-gray-500 text-sm">
              Chưa có banner (nên thêm để khách dễ nhận diện)
            </div>
          )}
        </div>

        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl overflow-hidden border bg-gray-50 flex items-center justify-center">
            {logoUrl ? (
              <img src={logoUrl} alt="Logo quán" className="w-full h-full object-cover" />
            ) : (
              <div className="text-gray-400 text-xs text-center px-2">Chưa có logo</div>
            )}
          </div>

          <div className="flex-1 space-y-2">
            <input
              ref={logoInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => pickLogo(e.target.files?.[0] || null)}
            />
            <button
              type="button"
              onClick={() => logoInputRef.current?.click()}
              disabled={busy}
              className="w-full px-3 py-2 rounded-lg border bg-white hover:bg-gray-50 text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-60"
            >
              <ImageIcon size={16} /> Chọn ảnh đại diện (logo)
            </button>

            {logoUrl && (
              <button
                type="button"
                onClick={() => {
                  setLogoUrl("");
                  if (logoInputRef.current) logoInputRef.current.value = "";
                }}
                className="w-full px-3 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-sm font-semibold"
              >
                Xoá logo
              </button>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <input
            ref={bannerInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => pickBanner(e.target.files?.[0] || null)}
          />

          <button
            type="button"
            onClick={() => bannerInputRef.current?.click()}
            disabled={busy}
            className="w-full px-3 py-2 rounded-lg border bg-white hover:bg-gray-50 text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-60"
          >
            <ImageIcon size={16} /> Chọn ảnh banner
          </button>

          {bannerUrl && (
            <button
              type="button"
              onClick={() => {
                setBannerUrl("");
                if (bannerInputRef.current) bannerInputRef.current.value = "";
              }}
              className="w-full px-3 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-sm font-semibold"
            >
              Xoá banner
            </button>
          )}
        </div>

        <p className="text-xs text-gray-500">
          * Ảnh được lưu trực tiếp trong DB dạng dataURL (local/mini app).
        </p>
      </div>

      {/* ===== NEW: Báo cáo doanh thu (moved here) ===== */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 font-semibold">
            <CalendarDays size={18} /> Báo cáo doanh thu
          </div>

          <select
            value={rangeValue}
            onChange={(e) => setRangeValue(e.target.value)}
            className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white"
            style={{ minWidth: 190 }}
            title={reportData.rangeLabel}
          >
            {reportOptions.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>

        {/* mini summary */}
        <div className="p-4 border-b border-gray-100">
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-xl border bg-gray-50">
              <div className="text-xs text-gray-600 font-semibold">Tổng doanh thu (đã xác nhận)</div>
              <div className="text-lg font-extrabold text-green-600 mt-1">{formatVND(revenue.total)}</div>
            </div>

            <div className="p-3 rounded-xl border bg-gray-50 flex items-center justify-between">
              <div>
                <div className="text-xs text-gray-600 font-semibold">Tỉ trọng TM / CK</div>
                <div className="text-xs text-gray-500 mt-1">
                  TM {formatVND(revenue.cash)} • CK {formatVND(revenue.transfer)}
                </div>
              </div>
              <Pie2 cash={revenue.cash} transfer={revenue.transfer} size={92} />
            </div>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-3">
            <div className="p-3 rounded-xl border bg-white">
              <div className="flex items-center gap-2 text-sm text-gray-700 font-semibold">
                <Banknote size={16} /> Tiền mặt
              </div>
              <div className="text-base font-extrabold mt-1">{formatVND(revenue.cash)}</div>
              {revenue.total > 0 && (
                <div className="text-xs text-gray-500 mt-1">
                  {Math.round((revenue.cash / revenue.total) * 100)}%
                </div>
              )}
            </div>

            <div className="p-3 rounded-xl border bg-white">
              <div className="flex items-center gap-2 text-sm text-gray-700 font-semibold">
                <CreditCardIcon size={16} /> Chuyển khoản
              </div>
              <div className="text-base font-extrabold mt-1">{formatVND(revenue.transfer)}</div>
              {revenue.total > 0 && (
                <div className="text-xs text-gray-500 mt-1">
                  {Math.round((revenue.transfer / revenue.total) * 100)}%
                </div>
              )}
            </div>
          </div>

          <div className="mt-3 text-[11px] text-gray-400">
            * Chỉ tính đơn <b>ĐÃ XÁC NHẬN</b>. Đơn cũ không có paymentMethod sẽ được hiểu là <b>Tiền mặt</b>.
          </div>
        </div>

        {/* Tabs */}
        <div className="px-4 border-b border-gray-100 flex gap-5">
          {[
            { k: "day" as const, label: "Theo ngày" },
            { k: "week" as const, label: "Theo tuần" },
            { k: "month" as const, label: "Theo tháng" },
          ].map((t) => {
            const active = reportTab === t.k;
            return (
              <button
                key={t.k}
                onClick={() => setReportTab(t.k)}
                className={`py-3 text-sm font-semibold border-b-2 ${
                  active ? "text-red-600 border-red-500" : "text-gray-700 border-transparent"
                }`}
              >
                {t.label}
              </button>
            );
          })}
        </div>

        {/* Table */}
        <div className="p-4">
          <div className="text-xs text-gray-500 mb-2">{reportData.rangeLabel}</div>

          <div className="border border-gray-100 rounded-xl overflow-hidden">
            <div className="max-h-[320px] overflow-auto">
              <table className="w-full border-collapse">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left text-xs text-gray-500 font-semibold px-3 py-2">
                      {reportTab === "day" ? "Ngày" : reportTab === "week" ? "Tuần" : "Tháng"}
                    </th>
                    <th className="text-right text-xs text-gray-500 font-semibold px-3 py-2">
                      Doanh thu
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {reportData.rows.length === 0 ? (
                    <tr>
                      <td colSpan={2} className="px-3 py-4 text-sm text-gray-500">
                        Chưa có dữ liệu doanh thu trong khoảng này.
                      </td>
                    </tr>
                  ) : (
                    reportData.rows.map((r, idx) => (
                      <tr key={r.keyLabel + idx} className="border-t border-gray-100">
                        <td className="px-3 py-3 align-top">
                          <div className="font-semibold text-sm text-gray-900">{r.keyLabel}</div>
                          <div className="text-xs text-gray-500 mt-1">
                            TM {formatVND(r.cash)} • CK {formatVND(r.transfer)}
                          </div>
                        </td>
                        <td className="px-3 py-3 text-right align-top">
                          <div className="font-extrabold text-sm">{formatVND(r.total)}</div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="mt-2 text-[11px] text-gray-400">
            * Danh sách cuộn trong khung để không chiếm hết màn hình.
          </div>
        </div>
      </div>

      {/* Basic settings */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 space-y-3">
        <div className="flex items-center gap-2 font-semibold">
          <Clock size={18} /> Thông tin vận hành
        </div>

        <div>
          <label className="text-sm font-medium">Tên quán</label>
          <input
            className="w-full border rounded-lg px-3 py-2 mt-1"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ví dụ: Bánh cuốn Bà Thái"
          />
        </div>

        <div>
          <label className="text-sm font-medium">Giờ nhận đơn đến</label>
          <input
            className="w-full border rounded-lg px-3 py-2 mt-1"
            value={closingTime}
            onChange={(e) => setClosingTime(e.target.value)}
            placeholder="22:00"
          />
        </div>

        <div>
          <label className="text-sm font-medium">Trạng thái</label>
          <select
            className="w-full border rounded-lg px-3 py-2 mt-1 bg-white"
            value={status}
            onChange={(e) => setStatus(e.target.value as StoreStatus)}
          >
            <option value="OPEN">🟢 Đang mở</option>
            <option value="CLOSING_SOON">🟡 Sắp đóng</option>
            <option value="CLOSED">🔴 Nghỉ</option>
          </select>
        </div>

        <div>
          <label className="text-sm font-medium">Thông tin chuyển khoản (văn bản)</label>
          <textarea
            className="w-full border rounded-lg px-3 py-2 mt-1 min-h-[110px]"
            value={bankInfo}
            onChange={(e) => setBankInfo(e.target.value)}
            placeholder={"Ngân hàng: ...\nSTK: ...\nTên: ..."}
          />
        </div>
      </div>

      {/* ✅ Transfer QR Image */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 space-y-3">
        <div className="flex items-center gap-2 font-semibold">
          <CreditCard size={18} /> QR chuyển khoản (ảnh)
        </div>

        <div className="rounded-xl border bg-gray-50 p-3">
          {transferQrUrl ? (
            <div className="flex gap-3 items-start">
              <img
                src={transferQrUrl}
                alt="QR chuyển khoản"
                className="w-32 h-32 rounded-lg border bg-white object-contain"
                onError={() => {
                  setMsg("❌ Ảnh QR không tải được. Nếu dùng link hãy kiểm tra lại link public.");
                }}
              />
              <div className="text-sm">
                <div className="font-semibold">Xem trước QR</div>
                <div className="text-xs text-gray-600 mt-1">
                  * Khách sẽ thấy QR này khi chọn “Chuyển khoản”.
                </div>
                {transferQrUrl.startsWith("http") ? (
                  <a
                    className="inline-flex items-center gap-1 text-blue-700 underline font-semibold text-xs mt-2"
                    href={transferQrUrl}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Mở ảnh <ExternalLink size={14} />
                  </a>
                ) : null}

                <button
                  type="button"
                  onClick={() => {
                    setTransferQrUrl("");
                    setTransferQrLink("");
                    if (qrInputRef.current) qrInputRef.current.value = "";
                  }}
                  className="mt-3 w-full px-3 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-sm font-semibold flex items-center justify-center gap-2"
                >
                  <Trash2 size={16} /> Xoá QR
                </button>
              </div>
            </div>
          ) : (
            <div className="text-sm text-gray-600">
              Chưa có QR. Bạn có thể <b>upload ảnh QR</b> hoặc <b>dán link ảnh QR</b>.
            </div>
          )}
        </div>

        <input
          ref={qrInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => pickTransferQr(e.target.files?.[0] || null)}
        />
        <button
          type="button"
          onClick={() => qrInputRef.current?.click()}
          disabled={busy}
          className="w-full px-3 py-2 rounded-lg border bg-white hover:bg-gray-50 text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-60"
        >
          <ImageIcon size={16} /> Upload ảnh QR chuyển khoản
        </button>

        <div>
          <label className="text-sm font-medium">Hoặc dán link ảnh QR (public)</label>
          <div className="flex gap-2 mt-1">
            <input
              className="flex-1 border rounded-lg px-3 py-2"
              value={transferQrLink}
              onChange={(e) => setTransferQrLink(e.target.value)}
              placeholder="https://..."
            />
            <button
              type="button"
              onClick={applyQrLink}
              className="px-3 py-2 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700"
            >
              Áp dụng
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            * Nếu VietQR QuickLink bị lỗi mạng/CDN như bạn gặp, dùng cách này sẽ luôn ổn định.
          </p>
        </div>
      </div>

      {/* Security */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 space-y-3">
        <div className="flex items-center gap-2 font-semibold">
          <Shield size={18} /> Bảo mật
        </div>

        <div>
          <label className="text-sm font-medium">Đổi mật khẩu quản lý</label>
          <input
            type="password"
            className="w-full border rounded-lg px-3 py-2 mt-1"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="Nhập mật khẩu mới (nếu muốn đổi)"
            autoComplete="new-password"
          />
          <p className="text-xs text-gray-500 mt-1">* Để trống nếu không đổi.</p>
        </div>
      </div>

      {msg && <div className="p-3 rounded-lg border bg-gray-50 text-sm">{msg}</div>}

      <button
        onClick={save}
        disabled={busy}
        className={`w-full py-3 rounded-xl font-semibold text-white flex items-center justify-center gap-2 ${
          busy ? "bg-blue-400" : "bg-blue-600 hover:bg-blue-700"
        }`}
      >
        <Save size={18} />
        {busy ? "Đang lưu..." : "Lưu thiết lập"}
      </button>
    </div>
  );
}