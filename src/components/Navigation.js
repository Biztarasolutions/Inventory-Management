import React, { useState, useEffect, useCallback } from 'react';
import { Link, useLocation } from 'react-router-dom';

export function Navigation({ navOpen, setNavOpen, currentPage }) {
  const [sidebarWidth, setSidebarWidth] = useState(200);
  const [isResizing, setIsResizing] = useState(false);
  const [expandedMenus, setExpandedMenus] = useState({ 
    billingSales: false,
    stockManagement: false,
    history: false
  }); // All menus collapsed by default
  const location = useLocation();

  const navItems = [
    {
      type: 'menu',
      id: 'billingSales',
      label: 'Billing & Sales',
      icon: '💰',
      children: [
        { to: '/create-bill', label: 'Create Bill', icon: '🧾' },
        { to: '/sales', label: 'Sales', icon: '💰' },
        { to: '/modification', label: 'Modifications', icon: '✏️' },
      ]
    },
    {
      type: 'menu',
      id: 'stockManagement',
      label: 'Stock Management',
      icon: '�',
      children: [
        { to: '/add-stocks', label: 'Add Stocks', icon: '📦' },
        { to: '/stock-inventory', label: 'Stock Inventory', icon: <img src="/stock%20inventory.png" alt="Stock Inventory" style={{ width: 22, height: 22, display: 'inline', verticalAlign: 'middle' }} /> },
      ]
    },
    {
      type: 'menu',
      id: 'history',
      label: 'History',
      icon: '📊',
      children: [
        { to: '/orders', label: 'Orders', icon: '📋' },
        { to: '/stock-history', label: 'Stock History', icon: '🕑' },
        { to: '/expense', label: 'Expense', icon: '📝' },
      ]
    },
  ];

  const toggleMenu = (menuId) => {
    setExpandedMenus(prev => {
      // If clicking on an already expanded menu, just toggle it
      if (prev[menuId]) {
        return {
          ...prev,
          [menuId]: false
        };
      }
      // Otherwise, collapse all menus and expand only the clicked one
      const newState = {
        billingSales: false,
        stockManagement: false,
        history: false
      };
      newState[menuId] = true;
      return newState;
    });
  };

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
        <span>Fashion Studio</span>
        <span className="ml-4 text-lg font-normal">{currentPage}</span>
      </header>

      {/* Left Navigation - Fixed (Desktop) / Bottom Navigation (Mobile) */}
      <nav 
        className={`bg-white pl-5 pr-1 pb-6 pt-4 flex flex-col space-y-4 relative transition-all duration-300 flex-shrink-0 fixed left-0 top-16 bottom-0 z-40 mobile-nav-transition desktop-nav`}
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
        
        {/* Navigation menu content - Desktop */}
        <div className="space-y-1 overflow-y-auto">
          {navItems.map((item, index) => (
            <div key={index}>
              {item.type === 'link' ? (
                <Link
                  to={item.to}
                  className={
                    navOpen
                      ? `text-lg font-semibold mt-2 block ${location.pathname === item.to ? 'text-white rounded px-2 py-1 bg-gray-800' : 'text-black hover:text-gray-700'}`
                      : `text-xs font-semibold text-center mt-2 block ${location.pathname === item.to ? 'text-white rounded px-1 py-1 bg-gray-800' : 'text-black hover:text-gray-700'}`
                  }
                >
                  {navOpen ? item.label : <span title={item.label}>{item.icon}</span>}
                </Link>
              ) : (
                <div className="mt-2">
                  {/* Menu Header */}
                  <button
                    onClick={() => toggleMenu(item.id)}
                    className={
                      navOpen
                        ? `w-full text-left text-lg font-semibold px-2 py-1 rounded flex items-center justify-between ${
                            item.children?.some(child => location.pathname === child.to)
                              ? 'text-gray-900 bg-gray-100'
                              : 'text-black hover:text-gray-700'
                          }`
                        : `w-full text-xs font-semibold text-center py-1 rounded ${
                            item.children?.some(child => location.pathname === child.to)
                              ? 'text-white bg-gray-800'
                              : 'text-black hover:text-gray-700'
                          }`
                    }
                  >
                    {navOpen ? (
                      <>
                        <span className="flex items-center gap-2">
                          <span>{item.icon}</span>
                          <span>{item.label}</span>
                        </span>
                        <svg
                          className={`w-4 h-4 transition-transform ${expandedMenus[item.id] ? 'rotate-180' : ''}`}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </>
                    ) : (
                      <span title={item.label}>{item.icon}</span>
                    )}
                  </button>
                  
                  {/* Submenu Items - Desktop */}
                  {navOpen && expandedMenus[item.id] && (
                    <div className="ml-4 mt-1 space-y-1">
                      {item.children?.map((child) => (
                        <Link
                          key={child.to}
                          to={child.to}
                          className={`block text-base px-3 py-1.5 rounded ${
                            location.pathname === child.to
                              ? 'text-white bg-gray-700'
                              : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                          }`}
                        >
                          <span className="flex items-center gap-2">
                            <span>{child.icon}</span>
                            <span>{child.label}</span>
                          </span>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </nav>

      {/* Mobile Bottom Navigation */}
      <nav className="mobile-nav fixed bottom-0 left-0 right-0 bg-white border-t-2 border-gray-200 z-50 desktop-hidden">
        {/* Submenu overlay for mobile - shows when a menu is expanded */}
        {Object.entries(expandedMenus).some(([key, value]) => value) && (
          <div className="absolute bottom-full left-0 right-0 bg-white border-t-2 border-gray-200 shadow-lg">
            {navItems.map((item) => {
              if (item.type === 'menu' && expandedMenus[item.id]) {
                return (
                  <div key={item.id} className="flex justify-around py-3 px-2">
                    {item.children?.map((child) => (
                      <Link
                        key={child.to}
                        to={child.to}
                        onClick={() => toggleMenu(item.id)}
                        className={`flex flex-col items-center justify-center px-3 py-2 min-w-0 flex-1 rounded ${
                          location.pathname === child.to ? 'text-white bg-gray-700' : 'text-gray-700 hover:bg-gray-100'
                        }`}
                      >
                        <span className="text-2xl mb-1">{child.icon}</span>
                        <span className="text-xs leading-tight text-center" style={{ fontSize: '0.7rem' }}>
                          {child.label}
                        </span>
                      </Link>
                    ))}
                  </div>
                );
              }
              return null;
            })}
          </div>
        )}
        
        {/* Main navigation bar */}
        <div className="flex items-center justify-around h-full px-2" style={{ height: '70px' }}>
          {navItems.map((item, index) => {
            if (item.type === 'link') {
              const isActive = location.pathname === item.to;
              return (
                <Link
                  key={index}
                  to={item.to}
                  className={`flex flex-col items-center justify-center px-2 py-1 min-w-0 flex-1 rounded ${
                    isActive ? 'text-white bg-gray-800' : 'text-gray-600'
                  }`}
                >
                  <span className="text-2xl mb-1">{item.icon}</span>
                  <span className="text-xs leading-tight text-center nav-label" style={{ fontSize: '0.7rem' }}>
                    {item.label}
                  </span>
                </Link>
              );
            } else {
              // For menu items, show a button that toggles the submenu
              const isActive = item.children?.some(child => location.pathname === child.to);
              return (
                <button
                  key={index}
                  onClick={() => toggleMenu(item.id)}
                  className={`flex flex-col items-center justify-center px-2 py-1 min-w-0 flex-1 rounded ${
                    isActive ? 'text-white bg-gray-800' : 'text-gray-600'
                  }`}
                >
                  <span className="text-2xl mb-1">{item.icon}</span>
                  <span className="text-xs leading-tight text-center nav-label" style={{ fontSize: '0.7rem' }}>
                    {item.label}
                  </span>
                  {expandedMenus[item.id] && (
                    <svg
                      className="w-3 h-3 mt-0.5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                    </svg>
                  )}
                </button>
              );
            }
          })}
        </div>
      </nav>
    </>
  );
}
