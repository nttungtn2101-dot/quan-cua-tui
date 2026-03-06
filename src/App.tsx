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
  useParams,
} from "react-router-dom";

import { AppProvider, useAppStore } from "./lib/store";

import Home from "./pages/Home";
import OwnerHub from "./pages/OwnerHub";
import Owner from "./pages/Owner";
import Customer from "./pages/Customer";
import Login from "./pages/Login";
import Setup from "./pages/Setup";

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { state, ready } = useAppStore();
  const location = useLocation();

  // ✅ Đợi store sync token theo URL xong rồi mới quyết định redirect
  if (!ready) {
    return (
      <div className="max-w-md mx-auto p-6 text-center text-gray-500">
        Đang kiểm tra đăng nhập...
      </div>
    );
  }

  if (!state.token) {
    const next = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/login?next=${next}`} replace />;
  }

  return <>{children}</>;
}

function AreaNavigation() {
  const location = useLocation();
  const { state, logout, slug } = useAppStore();

  const path = location.pathname;

  const isHome = path === "/";
  const isCustomer = path.startsWith("/c");
  // ✅ Owner area only (no /setup root nữa vì setup nằm dưới /o/:slug/setup)
  const isOwner = path.startsWith("/o") || path.startsWith("/login");

  if (isHome) return null;

  if (isCustomer) {
    return (
      <div className="fixed top-0 left-0 right-0 bg-gray-900 text-white p-2 flex justify-center items-center gap-4 z-50 text-sm font-medium shadow-md">
        <Link
          to="/"
          className="px-3 py-1 rounded hover:bg-gray-700"
          title="Về trang chủ"
        >
          Trang chủ
        </Link>
        <span className="opacity-80">Khu Khách</span>
      </div>
    );
  }

  if (isOwner) {
    const canShowOwnerTabs = !!state.token && !!slug;

    return (
      <div className="fixed top-0 left-0 right-0 bg-gray-900 text-white p-2 flex justify-center items-center gap-4 z-50 text-sm font-medium shadow-md">
        <Link
          to="/"
          className="px-3 py-1 rounded hover:bg-gray-700"
          title="Về trang chủ"
        >
          Trang chủ
        </Link>

        {canShowOwnerTabs ? (
          <>
            <Link
              to={`/o/${encodeURIComponent(slug!)}`}
              className={`px-3 py-1 rounded ${
                path === `/o/${slug}` ? "bg-blue-600" : "hover:bg-gray-700"
              }`}
            >
              Khu Quán
            </Link>

            <Link
              to={`/o/${encodeURIComponent(slug!)}/setup`}
              className={`px-3 py-1 rounded ${
                path.startsWith(`/o/${slug}/setup`)
                  ? "bg-blue-600"
                  : "hover:bg-gray-700"
              }`}
            >
              Thiết lập
            </Link>

            <button
              onClick={logout}
              className="px-3 py-1 rounded bg-red-600 hover:bg-red-700 ml-4"
            >
              Đăng xuất
            </button>
          </>
        ) : (
          <span className="opacity-80">Đăng nhập Quán</span>
        )}
      </div>
    );
  }

  return null;
}

export default function App() {
  return (
    <BrowserRouter>
      <AppProvider>
        <AppShell />
      </AppProvider>
    </BrowserRouter>
  );
}

function AppShell() {
  const location = useLocation();
  const showTopPadding = location.pathname !== "/";

  return (
    <div
      className={`min-h-screen bg-gray-50 text-gray-900 font-sans ${
        showTopPadding ? "pt-12" : ""
      }`}
    >
      <AreaNavigation />
      <Routes>
        {/* Public Home */}
        <Route path="/" element={<Home />} />

        {/* Customer area */}
        <Route path="/c/:slug" element={<CustomerSlugWrapper />} />
        <Route path="/customer" element={<Navigate to="/" replace />} />

        {/* Owner hub */}
        <Route path="/o" element={<OwnerHub />} />

        {/* Owner area per shop */}
        <Route
          path="/o/:slug"
          element={
            <ProtectedRoute>
              <OwnerSlugWrapper />
            </ProtectedRoute>
          }
        />

        {/* ✅ Setup per shop */}
        <Route
          path="/o/:slug/setup"
          element={
            <ProtectedRoute>
              <Setup />
            </ProtectedRoute>
          }
        />

        {/* Single login page (phone+password) */}
        <Route path="/login" element={<Login />} />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
}

function OwnerSlugWrapper() {
  const { slug } = useParams();
  return <Owner key={slug} />;
}

function CustomerSlugWrapper() {
  const { slug } = useParams();
  return <Customer key={slug} />;
}