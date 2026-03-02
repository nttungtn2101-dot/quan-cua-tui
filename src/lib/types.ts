export type StoreStatus = "OPEN" | "CLOSED" | "CLOSING_SOON";

export interface Store {
  // ✅ thêm để multi-shop chuẩn
  id?: string;
  slug?: string;

  name: string;
  closingTime: string;
  status: StoreStatus;

  // ✅ để tránh undefined lằng nhằng
  bankInfo: string;
}

export interface MenuItem {
  id: string;
  name: string;
  price: number;
  isAvailable: boolean;
  imageUrl?: string;
}

export interface OrderItem {
  menuItemId: string;
  quantity: number;
  price: number;
  name: string;
}

export type OrderStatus = "NEW" | "CONFIRMED" | "REJECTED";
export type PaymentMethod = "CASH" | "TRANSFER";

export interface Order {
  id: string;
  customerPhone: string;
  receiveTime: string;
  receiveLocation: string;
  note: string;
  items: OrderItem[];
  status: OrderStatus;
  createdAt: number;
  totalPrice: number;
  paymentMethod: PaymentMethod;
}

export interface AppState {
  store: Store;
  menu: MenuItem[];
  orders: Order[];
  token: string | null;
}