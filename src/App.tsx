/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  Link,
  useLocation,
} from "react-router-dom";
import { AppProvider, useAppStore } from "./lib/store";
import Setup from "./pages/Setup";
import Owner from "./pages/Owner";
import Customer from "./pages/Customer";
import Login from "./pages/Login";

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { state } = useAppStore();
  if (!state.token) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
}

function DemoNavigation() {
  const location = useLocation();
  const { state, logout } = useAppStore();

  return (
    <div className="fixed top-0 left-0 right-0 bg-gray-900 text-white p-2 flex justify-center items-center gap-4 z-50 text-sm font-medium shadow-md">
      <Link
        to="/setup"
        className={`px-3 py-1 rounded ${location.pathname === "/setup" ? "bg-blue-600" : "hover:bg-gray-700"}`}
      >
        Thiết lập
      </Link>
      <Link
        to="/owner"
        className={`px-3 py-1 rounded ${location.pathname === "/owner" ? "bg-blue-600" : "hover:bg-gray-700"}`}
      >
        Quán (Owner)
      </Link>
      <Link
        to="/customer"
        className={`px-3 py-1 rounded ${location.pathname === "/customer" ? "bg-blue-600" : "hover:bg-gray-700"}`}
      >
        Khách (Customer)
      </Link>
      {state.token && (
        <button
          onClick={logout}
          className="px-3 py-1 rounded bg-red-600 hover:bg-red-700 ml-4"
        >
          Đăng xuất
        </button>
      )}
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <div className="min-h-screen bg-gray-50 text-gray-900 font-sans pt-12">
          <DemoNavigation />
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route
              path="/setup"
              element={
                <ProtectedRoute>
                  <Setup />
                </ProtectedRoute>
              }
            />
            <Route
              path="/owner"
              element={
                <ProtectedRoute>
                  <Owner />
                </ProtectedRoute>
              }
            />
            <Route path="/customer" element={<Customer />} />
            <Route path="/" element={<Navigate to="/customer" replace />} />
          </Routes>
        </div>
      </BrowserRouter>
    </AppProvider>
  );
}
