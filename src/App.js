import React, { useState } from "react";
import { BrowserRouter as Router, Routes, Route, useLocation } from "react-router-dom";
import "./responsive.css";
import "./styles.css";
import { Navigation } from "./components/Navigation";
import { AuthProvider, USER_ROLES } from "./contexts/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import CreateBill from "./components/CreateBill";
import Orders from "./components/Orders";
import { StockInventory } from "./components/StockInventory";
import { AddStocks } from "./components/AddStocks";
import { StockHistory } from "./components/StockHistory";
import Sales from "./components/Sales";
import Expense from "./components/Expense";
import AdminPanel from "./components/AdminPanel";
import Register from "./components/Register";
import PasswordReset from "./components/PasswordReset";

// Constants for sizes
export const SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL'];

// Helper function to convert file to base64
export function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const base64 = reader.result.split(",")[1];
      resolve(base64);
    };
    reader.onerror = error => reject(error);
  });
}

// Helper function to format datetime to India time for display
export function formatDateTime(dateString) {
  try {
    const date = new Date(dateString);
    // Format to India timezone for display
    const options = {
      timeZone: "Asia/Kolkata",
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true
    };
    return date.toLocaleString("en-IN", options);
  } catch (error) {
    return dateString; // Return original if parsing fails
  }
}

// Helper function to format numbers in Indian number system
export function formatIndianNumber(number) {
  if (number === null || number === undefined || isNaN(number)) {
    return '0';
  }
  
  const num = Math.round(Number(number));
  return num.toLocaleString('en-IN');
}

// Page name mapping for navigation
const pageNames = {
  "/create-bill": "Create Bill",
  "/orders": "Orders",
  "/add-stocks": "Add Stocks",
  "/stock-inventory": "Stock Inventory",
  "/stock-history": "Stock History",
  "/add-supplier": "Add Supplier",
  "/sales": "Sales",
  "/expense": "Expense",
  "/modification": "Modifications",
  "/admin-panel": "Admin Panel",
  "/register": "Create Account",
  "/reset-password": "Reset Password",
  "/": "Create Bill"
};

function AppContent({ navOpen, setNavOpen }) {
  const location = useLocation();
  const currentPage = pageNames[location.pathname] || "";
  const navLinks = [
    { to: "/create-bill", label: "Create Bill", icon: "🧾" },
    { to: "/orders", label: "Orders", icon: "�" },
    { to: "/add-stocks", label: "Add Stocks", icon: "➕" },
    { to: "/stock-inventory", label: "Stock Inventory", icon: "�" },
    { to: "/stock-history", label: "Stock History", icon: "�" },
    { to: "/add-supplier", label: "Add Supplier", icon: "�" }
  ];

  return (
    <div className="flex h-screen bg-gray-100">
      <Navigation navOpen={navOpen} setNavOpen={setNavOpen} currentPage={currentPage} navLinks={navLinks} />
      <div className="flex-1 flex flex-col overflow-hidden mt-16">
        <main className="flex-1 overflow-y-auto bg-gray-100">
          <Routes>
            {/* Public Routes */}
            <Route path="/register" element={<Register />} />
            <Route path="/reset-password" element={<PasswordReset />} />
            
            {/* Protected Routes - Available to all authenticated users */}
            <Route path="/" element={
              <ProtectedRoute>
                <CreateBill />
              </ProtectedRoute>
            } />
            <Route path="/create-bill" element={
              <ProtectedRoute requiredRole={USER_ROLES.EMPLOYEE}>
                <CreateBill />
              </ProtectedRoute>
            } />
            <Route path="/sales" element={
              <ProtectedRoute requiredRole={USER_ROLES.EMPLOYEE}>
                <Sales />
              </ProtectedRoute>
            } />
            <Route path="/modification" element={
              <ProtectedRoute requiredRole={USER_ROLES.EMPLOYEE}>
                {require('./components/Modification').default()}
              </ProtectedRoute>
            } />

            {/* Stock Management - Available to all employees */}
            <Route path="/add-stocks" element={
              <ProtectedRoute requiredRole={USER_ROLES.EMPLOYEE}>
                <AddStocks />
              </ProtectedRoute>
            } />
            <Route path="/stock-inventory" element={
              <ProtectedRoute requiredRole={USER_ROLES.EMPLOYEE}>
                <StockInventory />
              </ProtectedRoute>
            } />

            {/* Owner and Admin only routes */}
            <Route path="/orders" element={
              <ProtectedRoute requiredRole={USER_ROLES.OWNER}>
                <Orders />
              </ProtectedRoute>
            } />
            <Route path="/stock-history" element={
              <ProtectedRoute requiredRole={USER_ROLES.OWNER}>
                <StockHistory />
              </ProtectedRoute>
            } />
            <Route path="/expense" element={
              <ProtectedRoute requiredRole={USER_ROLES.OWNER}>
                <Expense />
              </ProtectedRoute>
            } />

            {/* Admin only routes */}
            <Route path="/admin-panel" element={
              <ProtectedRoute requiredRole={USER_ROLES.ADMIN}>
                <AdminPanel />
              </ProtectedRoute>
            } />
          </Routes>
        </main>
      </div>
    </div>
  );
}

function App() {
  const [navOpen, setNavOpen] = useState(true);
  return (
    <Router>
      <AuthProvider>
        <AppContent navOpen={navOpen} setNavOpen={setNavOpen} />
      </AuthProvider>
    </Router>
  );
}

export default App;
