// src/lib/types.ts
export type StoreStatus = "OPEN" | "CLOSING_SOON" | "CLOSED";

/**
 * OrderStatus:
 * - NEW: mới đặt, cần xác nhận
 * - CONFIRMED: đã xác nhận, đang làm/đang chờ giao
 * - DONE: đã hoàn thành (giao xong / khách nhận xong)
 * - REJECTED: từ chối
 */
export type OrderStatus = "NEW" | "CONFIRMED" | "DONE" | "REJECTED";

export type PaymentMethod = "CASH" | "TRANSFER";

export interface Store {
  id?: string;
  slug?: string;

  name: string;
  closingTime: string;
  status: StoreStatus;
  bankInfo?: string;

  /**
   * Branding (optional)
   * - logoUrl: ảnh đại diện quán
   * - bannerUrl: ảnh banner quán
   *
   * Có thể là URL http(s) hoặc dataURL (base64).
   */
  logoUrl?: string;
  bannerUrl?: string;

  /**
   * QR chuyển khoản (optional)
   * Có thể là URL http(s) hoặc dataURL (base64).
   */
  transferQrUrl?: string;
}

export interface MenuItem {
  id: string;
  name: string;
  price: number;
  isAvailable: boolean;
  imageUrl?: string;

  /**
   * Inventory (optional)
   * - stockQty: tổng số lượng tồn (không bắt buộc). undefined = không dùng tồn kho
   * - unit: đơn vị (không bắt buộc): bát/chén/quả/kg...
   */
  stockQty?: number;
  unit?: string;
}

export interface OrderItem {
  menuItemId: string;
  quantity: number;
  price: number;
  name: string;

  // ✅ (nếu bạn đã thêm ở bước trước)
  note?: string;
}

export interface Order {
  id: string;
  shopId?: string;

  customerPhone: string;

  /**
   * Optional: khách có thể không chọn giờ nhận.
   * Nếu rỗng thì UI/Server vẫn chấp nhận.
   */
  receiveTime: string;

  /**
   * Required (UI đã bắt buộc).
   */
  receiveLocation: string;

  note?: string;

  status: OrderStatus;
  totalPrice: number;
  createdAt: number;

  paymentMethod: PaymentMethod;

  items: OrderItem[];
}

export interface AppState {
  store: Store;
  menu: MenuItem[];
  orders: Order[];
  token: string | null;
}