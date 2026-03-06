// FILE: src/lib/store.tsx
import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
  useMemo,
} from "react";
import { AppState, Store, MenuItem, Order, OrderStatus } from "./types";

interface StoreContextType {
  state: AppState;
  ready: boolean; // ✅ NEW
  login: (password: string) => Promise<boolean>;
  logout: () => void;
  updateStore: (data: Partial<Store> & { password?: string }) => Promise<void>;
  addMenuItem: (item: MenuItem) => Promise<void>;
  updateMenuItem: (item: MenuItem) => Promise<void>;
  deleteMenuItem: (id: string) => Promise<void>;
  addOrder: (order: Order) => Promise<void>;
  updateOrderStatus: (id: string, status: OrderStatus) => Promise<void>;
  playNotificationSound: () => void;
  refreshData: () => Promise<void>;
  slug: string | null;
}

const AppContext = createContext<StoreContextType | null>(null);

function getSlugFromPath(pathname = window.location.pathname): string | null {
  const parts = pathname.split("/").filter(Boolean);
  if (parts.length < 2) return null;
  const area = parts[0];
  const slug = parts[1];
  if (area === "o" || area === "c") return slug || null;
  return null;
}

function installLocationChangeListener(onChange: () => void) {
  const w = window as any;
  if (w.__ALO_LOCATION_PATCHED__) return;
  w.__ALO_LOCATION_PATCHED__ = true;

  const notify = () => window.dispatchEvent(new Event("locationchange"));

  const pushState = history.pushState;
  history.pushState = function (...args: any[]) {
    const ret = pushState.apply(this, args as any);
    notify();
    return ret;
  };

  const replaceState = history.replaceState;
  history.replaceState = function (...args: any[]) {
    const ret = replaceState.apply(this, args as any);
    notify();
    return ret;
  };

  window.addEventListener("popstate", notify);
  window.addEventListener("locationchange", onChange);
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [slug, setSlug] = useState<string | null>(() => getSlugFromPath());
  const [ready, setReady] = useState(false); // ✅ NEW

  const [state, setState] = useState<AppState>(() => ({
    store: {
      name: "",
      closingTime: "",
      status: "OPEN",
      bankInfo: "",
      // VietQR fields (optional)
      bankCode: "",
      bankAccountNo: "",
      bankAccountName: "",
    },
    menu: [],
    orders: [],
    token: null,
  }));

  useEffect(() => {
    const sync = () => {
      const newSlug = getSlugFromPath();
      setSlug(newSlug);

      if (newSlug) {
        const t = localStorage.getItem(`ownerToken_${newSlug}`);
        setState((s) => ({ ...s, token: t }));
      } else {
        setState((s) => ({ ...s, token: null }));
      }

      // ✅ sau sync đầu tiên thì bật ready
      setReady(true);
    };

    sync();
    installLocationChangeListener(sync);

    return () => {
      window.removeEventListener("locationchange", sync);
    };
  }, []);

  const api = useMemo(() => {
    return (url: string) => {
      if (!slug) return url;
      const join = url.includes("?") ? "&" : "?";
      return `${url}${join}slug=${encodeURIComponent(slug)}`;
    };
  }, [slug]);

  const playNotificationSound = () => {
    try {
      const audio = new Audio(
        "https://actions.google.com/sounds/v1/alarms/beep_short.ogg"
      );
      audio.play().catch(() => {});
    } catch {}
  };

  const refreshData = async () => {
    if (!slug) return;
    const res = await fetch(api("/api/data"));
    if (!res.ok) return;
    const data = await res.json();

    // Defensive defaults so UI doesn't crash if old store schema exists
    const store: Store = data.store || ({} as any);

    setState((s) => ({
      ...s,
      store: {
        ...s.store,
        ...store,
        bankInfo: store.bankInfo ?? "",
        bankCode: store.bankCode ?? "",
        bankAccountNo: store.bankAccountNo ?? "",
        bankAccountName: store.bankAccountName ?? "",
      },
      menu: data.menu || [],
      orders: data.orders || [],
    }));
  };

  useEffect(() => {
    if (!slug) return;

    refreshData().catch(() => {});

    const evtSource = new EventSource(`/api/events?slug=${encodeURIComponent(slug)}`);

    evtSource.onmessage = (event) => {
      try {
        const { type, payload } = JSON.parse(event.data);
        setState((s) => {
          switch (type) {
            case "UPDATE_STORE": {
              const p = (payload || {}) as Partial<Store>;
              return {
                ...s,
                store: {
                  ...s.store,
                  ...p,
                  bankInfo: (p as any).bankInfo ?? s.store.bankInfo ?? "",
                  bankCode: (p as any).bankCode ?? s.store.bankCode ?? "",
                  bankAccountNo: (p as any).bankAccountNo ?? s.store.bankAccountNo ?? "",
                  bankAccountName: (p as any).bankAccountName ?? s.store.bankAccountName ?? "",
                },
              };
            }
            case "ADD_MENU_ITEM":
              return { ...s, menu: [...s.menu, payload] };
            case "UPDATE_MENU_ITEM":
              return { ...s, menu: s.menu.map((m) => (m.id === payload.id ? payload : m)) };
            case "DELETE_MENU_ITEM": {
              const id = typeof payload === "string" ? payload : payload?.id;
              if (!id) return s;
              return { ...s, menu: s.menu.filter((m) => String(m.id) !== String(id)) };
            }
            case "ADD_ORDER":
              if (s.token) playNotificationSound();
              return { ...s, orders: [payload, ...s.orders] };
            case "UPDATE_ORDER_STATUS":
              return {
                ...s,
                orders: s.orders.map((o) =>
                  o.id === payload.id ? { ...o, status: payload.status } : o
                ),
              };
            default:
              return s;
          }
        });
      } catch {}
    };

    return () => evtSource.close();
  }, [slug]);

  const headers = useMemo(() => {
    return { "Content-Type": "application/json", Authorization: state.token || "" };
  }, [state.token]);

  const login = async (password: string) => {
    const curSlug = getSlugFromPath();
    if (!curSlug) return false;

    try {
      const res = await fetch(`/api/auth?slug=${encodeURIComponent(curSlug)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      if (res.ok) {
        const { token } = await res.json();
        localStorage.setItem(`ownerToken_${curSlug}`, token);
        setState((s) => ({ ...s, token }));
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  const logout = () => {
    const curSlug = getSlugFromPath();
    if (curSlug) localStorage.removeItem(`ownerToken_${curSlug}`);
    setState((s) => ({ ...s, token: null }));
  };

  const updateStore = async (data: Partial<Store> & { password?: string }) => {
    const res = await fetch(api("/api/store"), {
      method: "PUT",
      headers,
      body: JSON.stringify(data),
    });

    if (!res.ok) {
      const j = await res.json().catch(() => ({} as any));
      throw new Error(j?.error || "Cập nhật quán thất bại");
    }

    // (Optional) refresh from server to ensure consistency
    // Not strictly required because SSE will push UPDATE_STORE,
    // but if SSE disconnects, this keeps UI consistent.
    // await refreshData();
  };

  const addMenuItem = async (item: MenuItem) => {
    const res = await fetch(api("/api/menu"), { method: "POST", headers, body: JSON.stringify(item) });
    if (!res.ok) {
      const j = await res.json().catch(() => ({} as any));
      throw new Error(j?.error || "Thêm món thất bại");
    }
  };

  const updateMenuItem = async (item: MenuItem) => {
    const res = await fetch(api(`/api/menu/${item.id}`), {
      method: "PUT",
      headers,
      body: JSON.stringify(item),
    });
    if (!res.ok) {
      const j = await res.json().catch(() => ({} as any));
      throw new Error(j?.error || "Cập nhật món thất bại");
    }
  };

  const deleteMenuItem = async (id: string) => {
    const res = await fetch(api(`/api/menu/${id}`), { method: "DELETE", headers });
    if (!res.ok) {
      const txt = await res.text();
      throw new Error(txt || "Unauthorized");
    }
    setState((s) => ({ ...s, menu: s.menu.filter((m) => String(m.id) !== String(id)) }));
  };

  const addOrder = async (order: Order) => {
    const res = await fetch(api("/api/orders"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(order),
    });
    if (!res.ok) {
      const j = await res.json().catch(() => ({} as any));
      throw new Error(j?.error || "Gửi đơn thất bại");
    }
  };

  const updateOrderStatus = async (id: string, status: OrderStatus) => {
    const res = await fetch(api(`/api/orders/${id}/status`), {
      method: "PUT",
      headers,
      body: JSON.stringify({ status }),
    });
    if (!res.ok) {
      const j = await res.json().catch(() => ({} as any));
      throw new Error(j?.error || "Cập nhật trạng thái đơn thất bại");
    }
  };

  return (
    <AppContext.Provider
      value={{
        state,
        ready, // ✅ NEW
        login,
        logout,
        updateStore,
        addMenuItem,
        updateMenuItem,
        deleteMenuItem,
        addOrder,
        updateOrderStatus,
        playNotificationSound,
        refreshData,
        slug,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useAppStore() {
  const context = useContext(AppContext);
  if (!context) throw new Error("useAppStore must be used within an AppProvider");
  return context;
}