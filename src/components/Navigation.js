import React, { useState, useEffect, useCallback } from 'react';
import { Link, useLocation } from 'react-router-dom';

export function Navigation({ navOpen, setNavOpen, currentPage }) {
  const [sidebarWidth, setSidebarWidth] = useState(200);
  const [isResizing, setIsResizing] = useState(false);
  const location = useLocation();

  const navLinks = [
    { to: '/create-bill', label: 'Create Bill', icon: '🧾' },
    { to: '/orders', label: 'Orders', icon: '📋' },
    { to: '/add-stocks', label: 'Add Stocks', icon: '📦' },
    { to: '/stock-inventory', label: 'Stock Inventory', icon: <img src="/stock%20inventory.png" alt="Stock Inventory" style={{ width: 22, height: 22, display: 'inline', verticalAlign: 'middle' }} /> },
    { to: '/stock-history', label: 'Stock History', icon: '🕑' },
    { to: '/add-supplier', label: 'Add Supplier', icon: '🏷️' },
    { to: '/sales', label: 'Sales', icon: '💰' },
    { to: '/expense', label: 'Expense', icon: '📝' },
  ];

  const handleMouseMove = useCallback((e) => {
    if (!isResizing) return;
    const newWidth = e.clientX;
    if (newWidth >= 150 && newWidth <= 300) {
      setSidebarWidth(newWidth);
    }
  }, [isResizing]);

  const handleMouseUp = useCallback(() => {
    setIsResizing(false);
  }, []);

  useEffect(() => {
    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    } else {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isResizing, handleMouseMove, handleMouseUp]);

  return (
    <>
      {/* Top Header - Fixed */}
      <header className="fixed top-0 left-0 right-0 text-white py-4 px-8 text-2xl font-bold shadow flex items-center justify-between z-50" style={{ backgroundColor: 'rgb(22, 30, 45)' }}>
        <span>Inventory Management</span>
        <span className="ml-4 text-lg font-normal">{currentPage}</span>
      </header>

      {/* Left Navigation - Fixed */}
      <nav 
        className={`bg-white pl-5 pr-1 pb-6 pt-4 flex flex-col space-y-4 relative transition-all duration-300 flex-shrink-0 fixed left-0 top-16 bottom-0 z-40 mobile-nav-transition`}
        style={{ 
          width: navOpen ? `${sidebarWidth}px` : '64px',
          boxShadow: '2px 0 10px rgba(0, 0, 0, 0.05)'
        }}
      >
        {/* Toggle button with square/collapse icon */}
        <button
          className="absolute top-2 right-[-16px] bg-white text-gray-700 rounded p-1 shadow-md z-50 mobile-hidden hover:bg-gray-100 transition-all"
          style={{ width: '32px', height: '32px' }}
          onClick={() => setNavOpen((v) => !v)}
          aria-label={navOpen ? 'Collapse sidebar' : 'Expand sidebar'}
        >
          {navOpen ? (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="8" y="8" width="8" height="8" rx="1" stroke="currentColor" strokeWidth="2" />
              <path d="M5 5L19 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              <path d="M5 19L19 19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          ) : (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="4" y="4" width="16" height="16" rx="1" stroke="currentColor" strokeWidth="2" />
              <path d="M8 8L16 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              <path d="M8 12L16 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              <path d="M8 16L16 16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          )}
        </button>
        
        {/* Navigation menu content */}
        {navLinks.map(link => (
          <Link
            key={link.to}
            to={link.to}
            className={
              navOpen
                ? `text-lg font-semibold mt-2 ${location.pathname === link.to ? 'text-white rounded px-2 py-1 bg-gray-800' : 'text-black hover:text-gray-700'}`
                : `text-xs font-semibold text-center mt-2 ${location.pathname === link.to ? 'text-white rounded px-1 py-1 bg-gray-800' : 'text-black hover:text-gray-700'}`
            }
          >
            {/* For desktop: show label if nav is open, icon if closed */}
            <span className="desktop-view">
              {navOpen ? link.label : <span title={link.label}>{link.icon}</span>}
            </span>
            {/* For mobile: always show icon with label underneath */}
            <span className="mobile-view desktop-hidden">
              <span className="block text-center">{link.icon}</span>
              <span className="text-xs block mt-1 nav-label">{link.label}</span>
            </span>
          </Link>
        ))}
      </nav>
    </>
  );
}
