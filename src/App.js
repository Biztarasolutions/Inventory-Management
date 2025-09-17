import React, { useState } from "react";
import { BrowserRouter as Router, Routes, Route, useLocation } from "react-router-dom";
import "./responsive.css";
import { Navigation } from "./components/Navigation";
import { CreateBill } from "./components/CreateBill";
import { StockInventory } from "./components/StockInventory";
import { AddStocks } from "./components/AddStocks";
import { StockHistory } from "./components/StockHistory";
import { AddSupplier } from "./components/AddSupplier";

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

// Page name mapping for navigation
const pageNames = {
  "/create-bill": "Create Bill",
  "/add-stocks": "Add Stocks",
  "/stock-inventory": "Stock Inventory",
  "/stock-history": "Stock History",
  "/add-supplier": "Add Supplier",
  "/": "Add Stocks"
};

function AppContent({ navOpen, setNavOpen }) {
  const location = useLocation();
  const currentPage = pageNames[location.pathname] || "";
  const navLinks = [
    { to: "/create-bill", label: "Create Bill", icon: "🧾" },
    { to: "/add-stocks", label: "Add Stocks", icon: "📦" },
    { to: "/stock-inventory", label: "Stock Inventory", icon: "📋" },
    { to: "/stock-history", label: "Stock History", icon: "🕑" },
    { to: "/add-supplier", label: "Add Supplier", icon: "🏷️" }
  ];

  return (
    <div className="flex h-screen bg-gray-100">
      <Navigation navOpen={navOpen} setNavOpen={setNavOpen} currentPage={currentPage} navLinks={navLinks} />
      <div className="flex-1 flex flex-col overflow-hidden mt-16">
        <main className="flex-1 overflow-y-auto bg-gray-100">
          <Routes>
            <Route path="/" element={<CreateBill />} />
            <Route path="/create-bill" element={<CreateBill />} />
            <Route path="/add-stocks" element={<AddStocks />} />
            <Route path="/stock-inventory" element={<StockInventory />} />
            <Route path="/stock-history" element={<StockHistory />} />
            <Route path="/add-supplier" element={<AddSupplier />} />
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
      <AppContent navOpen={navOpen} setNavOpen={setNavOpen} />
    </Router>
  );
}

export default App;
