// src/pages/Owner.tsx
import React, { useMemo, useRef, useState } from "react";
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
  Download,
  Banknote,
  CreditCard,
  Eye,
  CheckCheck,
  Clock3,
  PackageCheck,
  CircleX,
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

function getSlugFromPath(): string | null {
  try {
    const parts = window.location.pathname.split("/").filter(Boolean);
    if (parts[0] === "o" && parts[1]) return parts[1];
    return null;
  } catch {
    return null;
  }
}

function safeFilenameSlug(input: string) {
  return String(input || "qr")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-_]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

async function downloadSvgAsPng(svgEl: SVGSVGElement, filename: string, size = 512) {
  const svgData = new XMLSerializer().serializeToString(svgEl);
  const svgBlob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(svgBlob);

  const img = new Image();
  img.crossOrigin = "anonymous";

  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error("Không render được QR để tải về"));
    img.src = url;
  });

  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    URL.revokeObjectURL(url);
    throw new Error("Canvas không sẵn sàng");
  }

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, size, size);
  ctx.drawImage(img, 0, 0, size, size);

  URL.revokeObjectURL(url);

  const pngUrl = canvas.toDataURL("image/png");
  const a = document.createElement("a");
  a.href = pngUrl;
  a.download = filename.endsWith(".png") ? filename : `${filename}.png`;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

function formatVND(n: number) {
  return (Number(n) || 0).toLocaleString("vi-VN") + "đ";
}

function formatTime(ts: number) {
  try {
    return new Date(ts).toLocaleTimeString("vi-VN", {
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "--:--";
  }
}

function formatDateTime(ts: number) {
  try {
    return new Date(ts).toLocaleString("vi-VN", {
      hour: "2-digit",
      minute: "2-digit",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  } catch {
    return "";
  }
}

function getOrderStatusBadge(status: OrderStatus) {
  if (status === "NEW") {
    return {
      text: "CHƯA XÁC NHẬN",
      className: "bg-blue-100 text-blue-700",
    };
  }
  if (status === "CONFIRMED") {
    return {
      text: "ĐÃ XÁC NHẬN",
      className: "bg-emerald-100 text-emerald-700",
    };
  }
  if (status === "DONE") {
    return {
      text: "HOÀN THÀNH",
      className: "bg-violet-100 text-violet-700",
    };
  }
  return {
    text: "ĐÃ TỪ CHỐI",
    className: "bg-red-100 text-red-700",
  };
}

function Pie2({
  cash,
  transfer,
  size = 140,
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

function OrderCardWide({
  order,
  onOpen,
  onReject,
  onConfirm,
  onDone,
}: {
  order: any;
  onOpen: () => void;
  onReject: () => void;
  onConfirm: () => void;
  onDone: () => void;
}) {
  const badge = getOrderStatusBadge(order.status as OrderStatus);
  const itemCount = Array.isArray(order.items)
    ? order.items.reduce((sum: number, item: any) => sum + Number(item.quantity || 0), 0)
    : 0;

  const firstItem = Array.isArray(order.items) && order.items.length > 0 ? order.items[0] : null;

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="font-bold text-lg text-gray-900">{order.customerPhone}</div>
          <div className="text-sm text-gray-500 mt-1">{formatTime(Number(order.createdAt || 0))}</div>
        </div>

        <span className={`px-2 py-1 rounded-md text-[10px] font-bold whitespace-nowrap ${badge.className}`}>
          {badge.text}
        </span>
      </div>

      <div className="mt-3 rounded-xl border border-gray-100 bg-gray-50 p-3">
        <div className="flex items-center justify-between gap-3 text-sm">
          <div className="font-medium text-gray-900">
            {firstItem
              ? `${firstItem.quantity}x ${firstItem.name}${itemCount > Number(firstItem.quantity || 0) ? ` • ${itemCount} món` : ""}`
              : `${itemCount} món`}
          </div>
          <div className="font-bold">{formatVND(order.totalPrice)}</div>
        </div>

        <div className="mt-2 text-sm text-gray-600 space-y-1">
          <div>
            Thanh toán:{" "}
            <span className="font-semibold text-gray-900">
              {String(order.paymentMethod || "CASH") === "TRANSFER" ? "Chuyển khoản" : "Tiền mặt"}
            </span>
          </div>
          <div>
            Giờ nhận:{" "}
            <span className="font-semibold text-gray-900">
              {order.receiveTime ? String(order.receiveTime) : "Không yêu cầu"}
            </span>
          </div>
          <div className="truncate">
            Địa điểm: <span className="font-semibold text-gray-900">{order.receiveLocation || "—"}</span>
          </div>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          onClick={onOpen}
          className="flex-1 min-w-[110px] py-2.5 px-3 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-sm font-semibold flex items-center justify-center gap-1"
        >
          <Eye size={16} />
          Chi tiết
        </button>

        {order.status === "NEW" && (
          <>
            <button
              onClick={onReject}
              className="py-2.5 px-3 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 text-sm font-semibold flex items-center justify-center gap-1"
            >
              <X size={16} />
              Từ chối
            </button>

            <button
              onClick={onConfirm}
              className="py-2.5 px-3 rounded-xl bg-green-600 text-white hover:bg-green-700 text-sm font-semibold flex items-center justify-center gap-1"
            >
              <Check size={16} />
              Xác nhận
            </button>
          </>
        )}

        {order.status === "CONFIRMED" && (
          <button
            onClick={onDone}
            className="py-2.5 px-3 rounded-xl bg-violet-600 text-white hover:bg-violet-700 text-sm font-semibold flex items-center justify-center gap-1"
          >
            <CheckCheck size={16} />
            Hoàn thành
          </button>
        )}
      </div>
    </div>
  );
}

function OrderDetailModal({
  order,
  onClose,
  onReject,
  onConfirm,
  onDone,
}: {
  order: any | null;
  onClose: () => void;
  onReject: (order: any) => void;
  onConfirm: (order: any) => void;
  onDone: (order: any) => void;
}) {
  if (!order) return null;

  const badge = getOrderStatusBadge(order.status as OrderStatus);

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center p-3">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        <div className="px-4 py-4 border-b border-gray-100 flex items-start justify-between gap-3">
          <div>
            <div className="text-lg font-bold">{order.customerPhone}</div>
            <div className="text-sm text-gray-500 mt-1">{formatDateTime(Number(order.createdAt || 0))}</div>
          </div>

          <div className="flex items-center gap-2">
            <span className={`px-2 py-1 rounded-md text-xs font-bold ${badge.className}`}>{badge.text}</span>
            <button
              onClick={onClose}
              className="w-9 h-9 rounded-lg border border-gray-200 hover:bg-gray-50 flex items-center justify-center"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="p-4 overflow-auto space-y-4">
          <div className="bg-gray-50 rounded-xl border border-gray-100 p-3 space-y-2 text-sm">
            <div className="flex justify-between gap-3">
              <span className="text-gray-500">Thanh toán</span>
              <span className="font-semibold">
                {String(order.paymentMethod || "CASH") === "TRANSFER" ? "Chuyển khoản" : "Tiền mặt"}
              </span>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-gray-500">Giờ nhận</span>
              <span className="font-semibold">{order.receiveTime ? String(order.receiveTime) : "Không yêu cầu"}</span>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-gray-500">Địa điểm</span>
              <span className="font-semibold">{order.receiveLocation || "—"}</span>
            </div>
            {order.note ? (
              <div className="pt-1">
                <div className="text-gray-500 mb-1">Ghi chú chung</div>
                <div className="font-medium">{String(order.note)}</div>
              </div>
            ) : null}
          </div>

          <div className="rounded-xl border border-gray-100 overflow-hidden">
            <div className="px-3 py-2 bg-gray-50 border-b border-gray-100 font-semibold text-sm">Chi tiết món</div>

            <div className="p-3 space-y-3">
              {Array.isArray(order.items) &&
                order.items.map((item: any, idx: number) => (
                  <div key={idx} className="rounded-lg border border-gray-100 p-3 bg-white">
                    <div className="flex justify-between gap-3 text-sm">
                      <div className="font-medium">
                        {item.quantity}x {item.name}
                      </div>
                      <div className="font-bold">{formatVND(Number(item.price || 0) * Number(item.quantity || 0))}</div>
                    </div>

                    {item.note ? (
                      <div className="mt-2 text-xs text-gray-500 italic">Ghi chú món: {String(item.note)}</div>
                    ) : null}
                  </div>
                ))}

              <div className="pt-2 border-t border-gray-200 flex justify-between font-bold">
                <span>Tổng cộng</span>
                <span>{formatVND(order.totalPrice)}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-gray-100 flex flex-wrap gap-2">
          {order.status === "NEW" && (
            <>
              <button
                onClick={() => onReject(order)}
                className="flex-1 min-w-[120px] py-3 px-4 border border-red-200 text-red-600 rounded-xl font-semibold hover:bg-red-50 transition-colors flex justify-center items-center gap-2"
              >
                <X size={18} /> Từ chối
              </button>
              <button
                onClick={() => onConfirm(order)}
                className="flex-1 min-w-[120px] py-3 px-4 bg-green-600 text-white rounded-xl font-semibold hover:bg-green-700 transition-colors flex justify-center items-center gap-2"
              >
                <Check size={18} /> Xác nhận
              </button>
            </>
          )}

          {order.status === "CONFIRMED" && (
            <button
              onClick={() => onDone(order)}
              className="flex-1 py-3 px-4 bg-violet-600 text-white rounded-xl font-semibold hover:bg-violet-700 transition-colors flex justify-center items-center gap-2"
            >
              <CheckCheck size={18} /> Đánh dấu hoàn thành
            </button>
          )}

          {order.status === "DONE" && (
            <div className="w-full text-center text-sm text-violet-700 bg-violet-50 border border-violet-100 rounded-xl py-3 font-semibold">
              Đơn này đã hoàn thành.
            </div>
          )}

          {order.status === "REJECTED" && (
            <div className="w-full text-center text-sm text-red-700 bg-red-50 border border-red-100 rounded-xl py-3 font-semibold">
              Đơn này đã bị từ chối.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

type OrderTab = "NEW" | "CONFIRMED" | "DONE";

export default function Owner() {
  const {
    state,
    updateStore,
    updateMenuItem,
    addMenuItem,
    deleteMenuItem,
    updateOrderStatus,
    slug: slugFromStore,
  } = useAppStore();

  const slugFromPath = getSlugFromPath();
  const slug = slugFromStore || slugFromPath || "";

  const [copied, setCopied] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const [downloadingQR, setDownloadingQR] = useState(false);

  const [newItemName, setNewItemName] = useState("");
  const [newItemPrice, setNewItemPrice] = useState("");
  const [newItemImage, setNewItemImage] = useState<string>("");
  const [uploadingNew, setUploadingNew] = useState(false);

  const [newItemStock, setNewItemStock] = useState<string>("");
  const [newItemUnit, setNewItemUnit] = useState<string>("");

  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
  const [orderTab, setOrderTab] = useState<OrderTab>("NEW");

  const newImageInputRef = useRef<HTMLInputElement | null>(null);
  const qrWrapRef = useRef<HTMLDivElement | null>(null);

  const handleStatusChange = async (status: StoreStatus) => {
    await updateStore({
      name: state.store.name,
      closingTime: state.store.closingTime,
      status,
      bankInfo: state.store.bankInfo || "",
      logoUrl: state.store.logoUrl || "",
      bannerUrl: state.store.bannerUrl || "",
      transferQrUrl: (state.store as any).transferQrUrl || "",
    } as any);
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

  const parseOptionalStock = (s: string): number | undefined => {
    const t = (s || "").trim();
    if (!t) return undefined;
    const n = Number(t);
    if (!Number.isFinite(n)) return undefined;
    return Math.max(0, Math.floor(n));
  };

  const handleAddItem = async () => {
    if (!newItemName.trim() || !newItemPrice) return;

    const stockQty = parseOptionalStock(newItemStock);
    const unit = (newItemUnit || "").trim();

    await addMenuItem({
      id: Date.now().toString(),
      name: newItemName.trim(),
      price: parseInt(newItemPrice, 10),
      isAvailable: true,
      imageUrl:
        newItemImage ||
        `https://picsum.photos/seed/${newItemName.replace(/\s/g, "")}/200/200`,
      stockQty,
      unit: unit || "",
    } as any);

    setNewItemName("");
    setNewItemPrice("");
    setNewItemImage("");
    setNewItemStock("");
    setNewItemUnit("");
    if (newImageInputRef.current) newImageInputRef.current.value = "";
  };

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
    try {
      await updateOrderStatus(id, status);
      setSelectedOrder((prev: any) => {
        if (!prev) return prev;
        if (String(prev.id) !== String(id)) return prev;
        return { ...prev, status };
      });
    } catch (e: any) {
      const msg = e?.message || "Cập nhật trạng thái thất bại";
      alert(msg);
    }
  };

  const customerLink = useMemo(() => {
    const origin = window.location.origin;
    if (!slug) return "";
    return `${origin}/c/${encodeURIComponent(slug)}`;
  }, [slug]);

  const copyLink = () => {
    if (!customerLink) return;
    navigator.clipboard.writeText(customerLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadQR = async () => {
    if (!customerLink) return;

    const wrap = qrWrapRef.current;
    const svgEl = wrap?.querySelector("svg");
    if (!svgEl) {
      alert("Không tìm thấy QR để tải về.");
      return;
    }

    setDownloadingQR(true);
    try {
      const filename = `qr-${safeFilenameSlug(slug || state.store?.name || "shop")}.png`;
      await downloadSvgAsPng(svgEl as any, filename, 768);
    } catch (e: any) {
      alert(e?.message || "Tải QR thất bại.");
    } finally {
      setDownloadingQR(false);
    }
  };

  const doneOrders = useMemo(
    () => state.orders.filter((o: any) => o.status === "DONE"),
    [state.orders]
  );

  const confirmedOrders = useMemo(
    () => state.orders.filter((o: any) => o.status === "CONFIRMED"),
    [state.orders]
  );

  const newOrders = useMemo(
    () => state.orders.filter((o: any) => o.status === "NEW"),
    [state.orders]
  );

  const rejectedOrders = useMemo(
    () => state.orders.filter((o: any) => o.status === "REJECTED"),
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

    for (const o of doneOrders as any[]) {
      const amt = Number(o.totalPrice || 0);
      if (String(o.paymentMethod || "CASH") === "TRANSFER") transfer += amt;
      else cash += amt;
    }

    return {
      cash,
      transfer,
      total: cash + transfer,
    };
  }, [confirmedOrders, doneOrders]);

  const currentOrders = useMemo(() => {
    if (orderTab === "NEW") return newOrders;
    if (orderTab === "CONFIRMED") return confirmedOrders;
    return doneOrders;
  }, [orderTab, newOrders, confirmedOrders, doneOrders]);

  const topUnitLabel = (unit: string) => {
    const s = (unit || "").trim();
    return s ? s : "đv";
  };

  const orderTabs = [
    {
      key: "NEW" as OrderTab,
      label: "Chưa xác nhận",
      count: newOrders.length,
      icon: <Clock3 size={15} />,
      activeClass: "bg-blue-600 text-white border-blue-600",
      idleClass: "bg-white text-blue-700 border-blue-200",
      emptyText: "Chưa có đơn mới.",
    },
    {
      key: "CONFIRMED" as OrderTab,
      label: "Đã xác nhận",
      count: confirmedOrders.length,
      icon: <CheckCheck size={15} />,
      activeClass: "bg-emerald-600 text-white border-emerald-600",
      idleClass: "bg-white text-emerald-700 border-emerald-200",
      emptyText: "Chưa có đơn đang làm.",
    },
    {
      key: "DONE" as OrderTab,
      label: "Hoàn thành",
      count: doneOrders.length,
      icon: <PackageCheck size={15} />,
      activeClass: "bg-violet-600 text-white border-violet-600",
      idleClass: "bg-white text-violet-700 border-violet-200",
      emptyText: "Chưa có đơn hoàn thành.",
    },
  ];

  return (
    <>
      <div className="max-w-md mx-auto p-4 pb-24 space-y-6">
        <h1 className="text-2xl font-bold">Quản lý quán</h1>

        {/* ===== Đơn hàng vận hành: mobile-first tabs ===== */}
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between gap-3 mb-4">
            <h2 className="font-semibold text-lg">Đơn hàng vận hành</h2>
            <div className="text-xs text-gray-500">
              Tổng: <b>{state.orders.length}</b> đơn
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 mb-4">
            {orderTabs.map((tab) => {
              const active = orderTab === tab.key;
              return (
                <button
                  key={tab.key}
                  onClick={() => setOrderTab(tab.key)}
                  className={`rounded-2xl border px-2 py-3 text-center transition-colors ${
                    active ? tab.activeClass : tab.idleClass
                  }`}
                >
                  <div className="flex items-center justify-center gap-1 text-xs font-semibold">
                    {tab.icon}
                    <span className="truncate">{tab.label}</span>
                  </div>
                  <div
                    className={`mt-2 inline-flex min-w-7 h-7 px-2 items-center justify-center rounded-full text-xs font-bold ${
                      active ? "bg-white/20 text-white border border-white/20" : "bg-gray-50 text-gray-900 border border-gray-200"
                    }`}
                  >
                    {tab.count}
                  </div>
                </button>
              );
            })}
          </div>

          <div className="space-y-3">
            {currentOrders.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 p-6 text-center text-sm text-gray-500">
                {orderTabs.find((t) => t.key === orderTab)?.emptyText}
              </div>
            ) : (
              currentOrders.map((order: any) => (
                <OrderCardWide
                  key={order.id}
                  order={order}
                  onOpen={() => setSelectedOrder(order)}
                  onReject={() => handleUpdateOrder(order.id, "REJECTED")}
                  onConfirm={() => handleUpdateOrder(order.id, "CONFIRMED")}
                  onDone={() => handleUpdateOrder(order.id, "DONE")}
                />
              ))
            )}
          </div>

          <div className="mt-4 text-xs text-gray-500">
            * Chạm vào tab để đổi nhóm đơn. Bấm <b>Chi tiết</b> để xem đầy đủ món, ghi chú và thao tác đơn.
          </div>
        </div>

        {/* ===== Trạng thái quán ===== */}
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

        {/* ===== Tổng quan doanh thu ===== */}
        <div className="bg-white p-3 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between gap-3">
            <div className="flex-1 space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
                  <div className="text-gray-500 mb-1 flex items-center gap-1 text-xs">
                    <ShoppingBag size={14} /> Đơn hoàn thành
                  </div>
                  <div className="text-xl font-bold text-gray-900">{doneOrders.length}</div>
                </div>

                <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
                  <div className="text-gray-500 mb-1 flex items-center gap-1 text-xs">
                    <TrendingUp size={14} /> Tổng doanh thu
                  </div>
                  <div className="text-xl font-bold text-green-600">{formatVND(revenue.total)}</div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="bg-white p-3 rounded-xl border border-gray-200">
                  <div className="text-gray-500 mb-1 flex items-center gap-2 text-xs">
                    <Banknote size={14} className="text-emerald-600" />
                    Tiền mặt
                  </div>
                  <div className="text-base font-bold text-gray-900">{formatVND(revenue.cash)}</div>
                </div>

                <div className="bg-white p-3 rounded-xl border border-gray-200">
                  <div className="text-gray-500 mb-1 flex items-center gap-2 text-xs">
                    <CreditCard size={14} className="text-blue-600" />
                    Chuyển khoản
                  </div>
                  <div className="text-base font-bold text-gray-900">{formatVND(revenue.transfer)}</div>
                </div>
              </div>
            </div>

            <div className="shrink-0 flex flex-col items-center gap-2 pt-1">
              <Pie2 cash={revenue.cash} transfer={revenue.transfer} size={92} />
              <div className="text-[11px] text-gray-500 text-center leading-tight">Tỷ lệ doanh thu</div>
              <div className="flex flex-col gap-1 text-[11px] text-gray-500">
                <div className="flex items-center gap-1">
                  <span className="inline-block w-2.5 h-2.5 rounded-sm" style={{ background: "#10b981" }} />
                  <span>Tiền mặt</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="inline-block w-2.5 h-2.5 rounded-sm" style={{ background: "#3b82f6" }} />
                  <span>CK</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ===== Link / QR ===== */}
        <div className="bg-white p-3 rounded-xl shadow-sm border border-gray-100">
          <h2 className="font-semibold text-base mb-3">Chia sẻ cho khách</h2>

          {!slug && (
            <div className="p-3 rounded-lg border border-yellow-200 bg-yellow-50 text-yellow-800 text-sm mb-3">
              Chưa xác định được <b>slug</b> của quán nên chưa tạo được link/QR khách.
            </div>
          )}

          {!showQR ? (
            <button
              onClick={() => setShowQR(true)}
              disabled={!slug}
              className={`w-full py-2.5 text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2 text-sm ${
                slug ? "bg-blue-600 hover:bg-blue-700" : "bg-blue-300 cursor-not-allowed"
              }`}
            >
              <QrCode size={18} /> Tạo mã QR đặt món
            </button>
          ) : (
            <div className="space-y-3">
              <div
                ref={qrWrapRef}
                className="flex justify-center p-3 bg-gray-50 rounded-xl border border-gray-200"
              >
                {customerLink ? <QRCodeSVG value={customerLink} size={180} /> : null}
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
                  disabled={!customerLink}
                  className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors disabled:opacity-50"
                  title="Copy link"
                >
                  {copied ? <Check size={18} /> : <Copy size={18} />}
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={downloadQR}
                  disabled={!customerLink || downloadingQR}
                  className={`py-2 rounded-lg font-semibold border transition-colors flex items-center justify-center gap-2 text-sm ${
                    downloadingQR
                      ? "bg-gray-100 text-gray-500 border-gray-200"
                      : "bg-white hover:bg-gray-50 text-gray-800 border-gray-200"
                  }`}
                >
                  <Download size={16} />
                  {downloadingQR ? "Đang tạo..." : "Tải QR"}
                </button>

                <button
                  onClick={() => setShowQR(false)}
                  className="py-2 bg-gray-100 text-gray-700 font-semibold rounded-lg hover:bg-gray-200 transition-colors text-sm"
                >
                  Ẩn QR
                </button>
              </div>

              <div className="text-[11px] text-gray-500">
                * Khách mở link này sẽ vào trang đặt món của quán.
              </div>
            </div>
          )}
        </div>

        {/* ===== Menu hôm nay ===== */}
        <div className="bg-white p-3 rounded-xl shadow-sm border border-gray-100">
          <h2 className="font-semibold text-base mb-3">Menu hôm nay</h2>

          <div className="space-y-2.5">
            {state.menu.map((item: any) => {
              const stockText =
                item.stockQty === null || item.stockQty === undefined || item.stockQty === ""
                  ? ""
                  : ` • Tồn: ${item.stockQty} ${topUnitLabel(item.unit)}`;

              return (
                <div
                  key={item.id}
                  className="flex items-center justify-between gap-3 p-2.5 bg-gray-50 rounded-xl border border-gray-100"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {item.imageUrl && (
                      <img
                        src={item.imageUrl}
                        alt={item.name}
                        className="w-11 h-11 rounded-lg object-cover shrink-0"
                        referrerPolicy="no-referrer"
                      />
                    )}

                    <div className="min-w-0">
                      <div className={`font-medium text-sm truncate ${!item.isAvailable && "text-gray-400 line-through"}`}>
                        {item.name}
                      </div>

                      <div className="text-xs text-gray-500 mt-0.5">
                        {formatVND(item.price)}
                        {stockText ? <span className="text-gray-400">{stockText}</span> : null}
                      </div>

                      <div className="mt-2 flex flex-wrap gap-1.5">
                        <label className="inline-flex items-center gap-1.5 text-[11px] px-2 py-1 rounded-lg bg-white border border-gray-200 hover:bg-gray-50 cursor-pointer">
                          <ImageIcon size={12} />
                          Đổi ảnh
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => handleReplaceItemImage(item, e.target.files?.[0] || null)}
                          />
                        </label>

                        <button
                          type="button"
                          className="text-[11px] px-2 py-1 rounded-lg bg-white border border-gray-200 hover:bg-gray-50"
                          onClick={async () => {
                            const current =
                              item.stockQty === null || item.stockQty === undefined ? "" : String(item.stockQty);
                            const next = prompt(
                              "Nhập tồn kho (để trống = không dùng tồn kho). Ví dụ: 10",
                              current
                            );
                            if (next === null) return;

                            const t = next.trim();
                            const stockQty = t ? Math.max(0, Math.floor(Number(t))) : undefined;

                            const unit = prompt(
                              "Nhập đơn vị (tuỳ chọn). Ví dụ: bát, chén, quả, kg...",
                              String(item.unit || "")
                            );
                            if (unit === null) return;

                            await updateMenuItem({
                              ...item,
                              stockQty,
                              unit: (unit || "").trim(),
                            });
                          }}
                        >
                          Sửa kho
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-2 shrink-0">
                    <button
                      onClick={() => handleToggleItem(item)}
                      className={`px-3 py-1 rounded-full text-[11px] font-medium transition-colors ${
                        item.isAvailable ? "bg-green-100 text-green-700" : "bg-gray-200 text-gray-600"
                      }`}
                    >
                      {item.isAvailable ? "Còn" : "Hết"}
                    </button>

                    <button
                      onClick={() => handleDeleteItem(String(item.id))}
                      className="p-2 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
                      title="Xoá món"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="pt-4 border-t border-gray-100 mt-4 space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <input
                type="text"
                placeholder="Tên món"
                value={newItemName}
                onChange={(e) => setNewItemName(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              />
              <input
                type="number"
                placeholder="Giá"
                value={newItemPrice}
                onChange={(e) => setNewItemPrice(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <input
                type="number"
                placeholder="Tồn kho (tuỳ chọn)"
                value={newItemStock}
                onChange={(e) => setNewItemStock(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              />
              <input
                type="text"
                placeholder="Đơn vị (tuỳ chọn)"
                value={newItemUnit}
                onChange={(e) => setNewItemUnit(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>

            <div className="flex gap-2 items-center">
              <input
                ref={newImageInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => handlePickNewImage(e.target.files?.[0] || null)}
              />
              <button
                type="button"
                onClick={() => newImageInputRef.current?.click()}
                className="flex-1 flex items-center justify-center gap-2 border border-gray-300 rounded-lg px-3 py-2 text-sm hover:bg-gray-50"
              >
                <ImageIcon size={16} />
                {uploadingNew ? "Đang tải ảnh..." : "Chọn ảnh"}
              </button>

              {newItemImage && (
                <button
                  type="button"
                  onClick={() => {
                    setNewItemImage("");
                    if (newImageInputRef.current) newImageInputRef.current.value = "";
                  }}
                  className="px-3 py-2 rounded-lg bg-gray-200 text-gray-700 hover:bg-gray-300 text-sm"
                >
                  Bỏ ảnh
                </button>
              )}
            </div>

            {newItemImage && (
              <div className="flex items-center gap-3 p-2.5 bg-gray-50 border border-gray-200 rounded-lg">
                <img src={newItemImage} alt="preview" className="w-10 h-10 rounded-lg object-cover" />
                <div className="text-sm text-gray-600">Preview ảnh món mới</div>
              </div>
            )}

            <button
              onClick={handleAddItem}
              className="w-full bg-blue-100 text-blue-600 px-4 py-2.5 rounded-lg hover:bg-blue-200 transition-colors font-medium text-sm"
            >
              Thêm món
            </button>

            <div className="text-[11px] text-gray-500">
              * Khi xác nhận đơn, hệ thống sẽ tự trừ tồn kho nếu món có bật tồn kho.
            </div>
          </div>
        </div>

        {/* ===== Đơn đã từ chối ===== */}
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center gap-2 font-semibold text-lg mb-3">
            <CircleX size={18} className="text-red-500" />
            Đơn đã từ chối ({rejectedOrders.length})
          </div>

          {rejectedOrders.length === 0 ? (
            <div className="text-sm text-gray-500">Chưa có đơn nào bị từ chối.</div>
          ) : (
            <div className="space-y-3">
              {rejectedOrders.map((order: any) => (
                <div
                  key={order.id}
                  className="rounded-xl border border-red-100 bg-red-50/40 p-3 flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <div className="font-semibold truncate">{order.customerPhone}</div>
                    <div className="text-xs text-gray-500 mt-1">
                      {formatTime(Number(order.createdAt || 0))} • {formatVND(order.totalPrice)}
                    </div>
                  </div>

                  <button
                    onClick={() => setSelectedOrder(order)}
                    className="px-3 py-2 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 text-xs font-semibold"
                  >
                    Xem
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <OrderDetailModal
        order={selectedOrder}
        onClose={() => setSelectedOrder(null)}
        onReject={(order) => handleUpdateOrder(order.id, "REJECTED")}
        onConfirm={(order) => handleUpdateOrder(order.id, "CONFIRMED")}
        onDone={(order) => handleUpdateOrder(order.id, "DONE")}
      />
    </>
  );
}