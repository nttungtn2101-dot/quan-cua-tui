import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import {
  AppState,
  Store,
  MenuItem,
  Order,
  OrderStatus,
} from "./types";

interface StoreContextType {
  state: AppState;
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
  shopId: string; // tiện debug
}

const AppContext = createContext<StoreContextType | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  // ✅ Read shopId from URL (default shop_1)
  const params = new URLSearchParams(window.location.search);
  const shopId = params.get("shopId") || "shop_1";

  const [state, setState] = useState<AppState>({
    store: { name: "", closingTime: "", status: "OPEN", bankInfo: "" },
    menu: [],
    orders: [],
    // ✅ token tách theo quán
    token: localStorage.getItem(`ownerToken_${shopId}`),
  });

  // helper: append shopId to every API call
  const api = (url: string) => {
    const join = url.includes("?") ? "&" : "?";
    return `${url}${join}shopId=${encodeURIComponent(shopId)}`;
  };

  const playNotificationSound = () => {
    try {
      const audio = new Audio(
        "https://actions.google.com/sounds/v1/alarms/beep_short.ogg",
      );
      audio.play().catch((e) =>
        console.log("Audio play blocked by browser:", e),
      );
    } catch (e) {
      console.log("Error playing sound", e);
    }
  };

  const refreshData = async () => {
    const res = await fetch(api("/api/data"));
    if (!res.ok) return;
    const data = await res.json();
    setState((s) => ({
      ...s,
      store: data.store,
      menu: data.menu,
      orders: data.orders,
    }));
  };

  useEffect(() => {
    refreshData().catch((err) =>
      console.error("Failed to fetch initial data", err),
    );

    // ✅ SSE subscribe with shopId so only this shop’s events are sent
    const evtSource = new EventSource(api("/api/events"));

    evtSource.onmessage = (event) => {
      try {
        const { type, payload } = JSON.parse(event.data);
        setState((s) => {
          switch (type) {
            case "UPDATE_STORE":
              return { ...s, store: { ...s.store, ...payload } };

            case "ADD_MENU_ITEM":
              // payload already belongs to this shop (server filtered)
              return { ...s, menu: [...s.menu, payload] };

            case "UPDATE_MENU_ITEM":
              return {
                ...s,
                menu: s.menu.map((m) => (m.id === payload.id ? payload : m)),
              };

            case "DELETE_MENU_ITEM": {
              const id =
                typeof payload === "string" ? payload : payload?.id;
              if (!id) return s;
              return {
                ...s,
                menu: s.menu.filter((m) => String(m.id) !== String(id)),
              };
            }

            case "ADD_ORDER":
              if (s.token) playNotificationSound();
              return { ...s, orders: [payload, ...s.orders] };

            case "UPDATE_ORDER_STATUS":
              return {
                ...s,
                orders: s.orders.map((o) =>
                  o.id === payload.id ? { ...o, status: payload.status } : o,
                ),
              };

            default:
              return s;
          }
        });
      } catch (e) {
        console.error("Error parsing SSE", e);
      }
    };

    return () => evtSource.close();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shopId]);

  const headers = {
    "Content-Type": "application/json",
    Authorization: state.token || "",
  };

  const login = async (password: string) => {
    try {
      const res = await fetch(api("/api/auth"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (res.ok) {
        const { token } = await res.json();
        localStorage.setItem(`ownerToken_${shopId}`, token);
        setState((s) => ({ ...s, token }));
        return true;
      }
      return false;
    } catch (e) {
      return false;
    }
  };

  const logout = () => {
    localStorage.removeItem(`ownerToken_${shopId}`);
    setState((s) => ({ ...s, token: null }));
  };

  const updateStore = async (data: any) => {
    await fetch(api("/api/store"), {
      method: "PUT",
      headers,
      body: JSON.stringify(data),
    });
  };

  const addMenuItem = async (item: MenuItem) => {
    await fetch(api("/api/menu"), {
      method: "POST",
      headers,
      body: JSON.stringify(item),
    });
  };

  const updateMenuItem = async (item: MenuItem) => {
    await fetch(api(`/api/menu/${item.id}`), {
      method: "PUT",
      headers,
      body: JSON.stringify(item),
    });
  };

  const deleteMenuItem = async (id: string) => {
    const res = await fetch(api(`/api/menu/${id}`), {
      method: "DELETE",
      headers,
    });
    if (!res.ok) {
      const txt = await res.text();
      throw new Error(txt || "Unauthorized");
    }

    // Update UI immediately
    setState((s) => ({
      ...s,
      menu: s.menu.filter((m) => String(m.id) !== String(id)),
    }));
  };

  const addOrder = async (order: Order) => {
    await fetch(api("/api/orders"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(order),
    });
  };

  const updateOrderStatus = async (id: string, status: OrderStatus) => {
    await fetch(api(`/api/orders/${id}/status`), {
      method: "PUT",
      headers,
      body: JSON.stringify({ status }),
    });
  };

  return (
    <AppContext.Provider
      value={{
        state,
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
        shopId,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useAppStore() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error("useAppStore must be used within an AppProvider");
  }
  return context;
}