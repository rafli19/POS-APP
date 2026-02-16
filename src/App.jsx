import { Routes, Route, Navigate } from "react-router-dom";
import ProtectedRoute from "./components/ProtectedRoute";

import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import Products from "./pages/Products";
import Categories from "./pages/Categories";
import Reports from "./pages/Reports";
import Transaction from "./pages/Transaction";
import TransactionHistory from "./pages/TransactionHistory";
import PendingTransactions from "./pages/PendingTransactions";

function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Navigate to="/dashboard" replace />
          </ProtectedRoute>
        }
      />

      <Route
        path="/dashboard"
        element={
          <ProtectedRoute allowedRoles={["admin", "owner", "kasir"]}>
            <Dashboard />
          </ProtectedRoute>
        }
      />

      <Route
        path="/products"
        element={
          <ProtectedRoute allowedRoles={["admin", "owner", "kasir"]}>
            <Products />
          </ProtectedRoute>
        }
      />

      <Route
        path="/categories"
        element={
          <ProtectedRoute allowedRoles={["admin"]}>
            <Categories />
          </ProtectedRoute>
        }
      />

      <Route
        path="/reports"
        element={
          <ProtectedRoute allowedRoles={["admin", "owner"]}>
            <Reports />
          </ProtectedRoute>
        }
      />

      {/* HALAMAN TRANSAKSI BARU - HANYA KASIR */}
      <Route
        path="/transaction"
        element={
          <ProtectedRoute allowedRoles={["kasir"]}>
            <Transaction />
          </ProtectedRoute>
        }
      />

      {/* HALAMAN VERIFIKASI PEMBAYARAN - HANYA KASIR */}
      <Route
        path="/pending-transactions"
        element={
          <ProtectedRoute allowedRoles={["kasir"]}>
            <PendingTransactions />
          </ProtectedRoute>
        }
      />

      {/* HALAMAN HISTORY TRANSAKSI - HANYA ADMIN & OWNER */}
      <Route
        path="/transaction-history"
        element={
          <ProtectedRoute allowedRoles={["admin", "owner"]}>
            <TransactionHistory />
          </ProtectedRoute>
        }
      />

      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}

export default App;
