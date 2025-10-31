import React, { useState, useEffect, useCallback } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth, USER_ROLES } from '../contexts/AuthContext';
import Login from './Login';
import PasswordReset from './PasswordReset';
import StockInventoryIcon from './icons/StockInventoryIcon';

export function Navigation({ navOpen, setNavOpen, currentPage }) {
  const [sidebarWidth, setSidebarWidth] = useState(200);
  const [isResizing, setIsResizing] = useState(false);
  const [expandedMenus, setExpandedMenus] = useState({ 
    billingSales: false,
    stockManagement: false,
    history: false
  }); // All menus collapsed by default
  const [showLogin, setShowLogin] = useState(false);
  const [showPasswordReset, setShowPasswordReset] = useState(false);
  const location = useLocation();
  const { user, isAuthenticated, hasPermission, logout } = useAuth();

  // Base navigation items
  const allNavItems = [
    {
      type: 'menu',
      id: 'billingSales',
      label: 'Billing & Sales',
      icon: '💰',
      requiredRole: USER_ROLES.EMPLOYEE, // Available to all roles
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
      icon: '📦',
      requiredRole: USER_ROLES.EMPLOYEE, // Available to all roles
      children: [
        { to: '/add-stocks', label: 'Add Stocks', icon: '📦' },
        { to: '/stock-inventory', label: 'Stock Inventory', icon: <StockInventoryIcon /> },
      ]
    },
    {
      type: 'menu',
      id: 'history',
      label: 'Reports & History',
      icon: '📊',
      requiredRole: USER_ROLES.OWNER, // Only Owner and Admin
      children: [
        { to: '/orders', label: 'Orders', icon: '📋' },
        { to: '/stock-history', label: 'Stock History', icon: '🕑' },
        { to: '/expense', label: 'Expense', icon: '📝' },
      ]
    },
  ];

  // Add Admin Panel for Admin users
  if (user?.user_metadata?.role === USER_ROLES.ADMIN) {
    allNavItems.push({
      type: 'link',
      to: '/admin-panel',
      label: 'Admin Panel',
      icon: '⚙️',
      requiredRole: USER_ROLES.ADMIN
    });
  }

  // Filter navigation items based on user role
  const navItems = isAuthenticated() 
    ? allNavItems.filter(item => hasPermission(item.requiredRole))
    : []; // Show no navigation when not authenticated

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
      {/* Premium Top Header - Fixed */}
      <header className="fixed top-0 left-0 right-0 text-white py-4 px-8 text-2xl font-bold shadow-xl z-50 backdrop-blur-md border-b border-white/10" 
        style={{ 
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%)',
          boxShadow: '0 10px 40px rgba(102, 126, 234, 0.2)'
        }}>
        <div className="flex items-center justify-between max-w-full">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-lg shadow-lg border border-white/30">
              <span className="text-3xl">👗</span>
            </div>
            <div className="flex flex-col">
              <span className="text-white font-bold tracking-tight text-2xl">Fashion Boutique</span>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            {isAuthenticated() ? (
              <>

                
                {/* Username display and logout */}
                <div className="relative group">
                  <button className="flex items-center space-x-2 bg-white/10 hover:bg-white/20 px-3 py-2 rounded-lg backdrop-blur-sm border border-white/20 text-xs font-medium text-white/90 transition-all duration-200">
                    <span>{user?.username || user?.name || 'User'}</span>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  
                  {/* Dropdown menu */}
                  <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-xl shadow-2xl border border-gray-200/50 backdrop-blur-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                    <div className="p-2">
                      <div className="px-3 py-2 text-sm text-gray-500 border-b border-gray-100">
                        <div className="font-medium text-gray-900">{user?.name || user?.username}</div>
                        <div className="text-xs">{user?.email}</div>
                        <div className="text-xs capitalize font-medium text-purple-600">{user?.role}</div>
                      </div>
                      <button
                        onClick={logout}
                        className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors duration-150 flex items-center space-x-2"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                        </svg>
                        <span>Sign Out</span>
                      </button>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <>
                {/* Empty space when not authenticated - sign in handled by ProtectedRoute */}
              </>
            )}
          </div>
        </div>
      </header>

      {/* Premium Desktop Navigation - Fixed */}
      <nav 
        className={`bg-white/95 backdrop-blur-xl pl-5 pr-1 pb-6 pt-4 flex flex-col space-y-4 relative transition-all duration-300 flex-shrink-0 fixed left-0 top-16 bottom-0 z-40 mobile-nav-transition desktop-nav border-r border-gray-200/50`}
        style={{ 
          width: navOpen ? `${sidebarWidth}px` : '72px',
          boxShadow: '4px 0 30px rgba(0, 0, 0, 0.04)',
          background: 'linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(249,250,251,0.95) 100%)'
        }}
      >
        {/* Premium toggle button */}
        <button
          className="absolute top-2 right-[-18px] text-white rounded-xl p-2 shadow-xl z-50 mobile-hidden transition-all duration-300 hover:scale-110 active:scale-95 border border-white/20"
          style={{ 
            width: '36px', 
            height: '36px',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            boxShadow: '0 8px 20px rgba(102, 126, 234, 0.4)'
          }}
          onClick={() => setNavOpen((v) => !v)}
          aria-label={navOpen ? 'Collapse sidebar' : 'Expand sidebar'}
        >
          {navOpen ? (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="m-auto">
              <path d="M15 18L9 12L15 6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          ) : (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="m-auto">
              <path d="M9 18L15 12L9 6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </button>
        
        {/* Premium Navigation menu content - Desktop */}
        <div className="space-y-2 overflow-y-auto pr-2 scrollbar-thin">
          {navItems.map((item, index) => (
            <div key={index} className="fade-in" style={{ animationDelay: `${index * 50}ms` }}>
              {item.type === 'link' ? (
                <Link
                  to={item.to}
                  className={
                    navOpen
                      ? `text-sm font-semibold mt-1 block rounded-xl px-4 py-3 transition-all duration-300 group ${
                          location.pathname === item.to 
                            ? 'bg-gradient-to-r from-purple-600 via-purple-500 to-pink-500 text-white shadow-lg shadow-purple-500/30 scale-[1.02]' 
                            : 'text-gray-700 hover:bg-gradient-to-r hover:from-purple-50 hover:to-pink-50 hover:text-purple-700 hover:scale-[1.01]'
                        }`
                      : `text-xs font-semibold text-center mt-1 block rounded-xl py-3 transition-all duration-300 ${
                          location.pathname === item.to 
                            ? 'bg-gradient-to-r from-purple-600 to-pink-500 text-white shadow-lg shadow-purple-500/30' 
                            : 'text-gray-700 hover:bg-gradient-to-r hover:from-purple-50 hover:to-pink-50 hover:text-purple-700'
                        }`
                  }
                >
                  {navOpen ? (
                    <div className="flex items-center gap-3">
                      <span className="text-xl">{item.icon}</span>
                      <span className="tracking-wide">{item.label}</span>
                    </div>
                  ) : (
                    <span title={item.label} className="text-2xl">{item.icon}</span>
                  )}
                </Link>
              ) : (
                <div className="mt-1">
                  {/* Premium Menu Header */}
                  <button
                    onClick={() => toggleMenu(item.id)}
                    className={
                      navOpen
                        ? `w-full text-left text-sm font-semibold px-4 py-3 rounded-xl flex items-center justify-between transition-all duration-300 group ${
                            item.children?.some(child => location.pathname === child.to)
                              ? 'bg-gradient-to-r from-purple-600 via-purple-500 to-pink-500 text-white shadow-lg shadow-purple-500/30 scale-[1.02]'
                              : expandedMenus[item.id]
                              ? 'bg-gradient-to-r from-purple-50 to-pink-50 text-purple-700 shadow-sm'
                              : 'text-gray-700 hover:bg-gradient-to-r hover:from-purple-50 hover:to-pink-50 hover:text-purple-700 hover:scale-[1.01]'
                          }`
                        : `w-full text-xs font-semibold text-center py-3 rounded-xl transition-all duration-300 ${
                            item.children?.some(child => location.pathname === child.to)
                              ? 'bg-gradient-to-r from-purple-600 to-pink-500 text-white shadow-lg shadow-purple-500/30'
                              : 'text-gray-700 hover:bg-gradient-to-r hover:from-purple-50 hover:to-pink-50 hover:text-purple-700'
                          }`
                    }
                  >
                    {navOpen ? (
                      <>
                        <span className="flex items-center gap-3">
                          <span className="text-xl">{item.icon}</span>
                          <span className="tracking-wide">{item.label}</span>
                        </span>
                        <svg
                          className={`w-4 h-4 transition-transform duration-300 ${expandedMenus[item.id] ? 'rotate-180' : ''}`}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                        </svg>
                      </>
                    ) : (
                      <span title={item.label} className="text-2xl">{item.icon}</span>
                    )}
                  </button>
                  
                  {/* Premium Submenu Items - Desktop */}
                  {navOpen && expandedMenus[item.id] && (
                    <div className="ml-4 mt-2 space-y-1.5 slide-in">
                      {item.children?.map((child) => (
                        <Link
                          key={child.to}
                          to={child.to}
                          className={`block text-sm px-4 py-2.5 rounded-lg transition-all duration-300 group ${
                            location.pathname === child.to
                              ? 'bg-gradient-to-r from-purple-600 to-pink-500 text-white shadow-md shadow-purple-500/20 translate-x-1'
                              : 'text-gray-600 hover:bg-gradient-to-r hover:from-purple-50 hover:to-pink-50 hover:text-purple-700 hover:translate-x-2 hover:shadow-sm'
                          }`}
                        >
                          <span className="flex items-center gap-3">
                            <span className="text-base">{child.icon}</span>
                            <span className="font-medium">{child.label}</span>
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

      {/* Premium Mobile Bottom Navigation */}
      <nav className="mobile-nav fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-xl border-t border-gray-200/50 z-50 desktop-hidden" 
        style={{ 
          boxShadow: '0 -8px 30px rgba(0, 0, 0, 0.08)',
          background: 'linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(249,250,251,0.95) 100%)'
        }}>
        {/* Premium Submenu overlay for mobile */}
        {Object.entries(expandedMenus).some(([key, value]) => value) && (
          <div className="absolute bottom-full left-0 right-0 bg-white/95 backdrop-blur-xl border-t border-gray-200/50 shadow-2xl">
            {navItems.map((item) => {
              if (item.type === 'menu' && expandedMenus[item.id]) {
                return (
                  <div key={item.id} className="flex justify-around py-3 px-3 gap-2 fade-in">
                    {item.children?.map((child) => (
                      <Link
                        key={child.to}
                        to={child.to}
                        onClick={() => toggleMenu(item.id)}
                        className={`flex flex-col items-center justify-center px-3 py-2 min-w-0 flex-1 rounded-xl transition-all duration-300 ${
                          location.pathname === child.to 
                            ? 'bg-gradient-to-br from-purple-600 via-purple-500 to-pink-500 text-white shadow-xl shadow-purple-500/30 scale-105' 
                            : 'text-gray-700 hover:bg-gradient-to-br hover:from-purple-50 hover:to-pink-50 active:scale-95'
                        }`}
                      >
                        <span className="text-2xl mb-1.5">{child.icon}</span>
                        <span className="text-xs leading-tight text-center font-semibold tracking-wide" style={{ fontSize: '0.65rem' }}>
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
        
        {/* Premium Main navigation bar */}
        <div className="flex items-center justify-around h-full px-3" style={{ height: '60px' }}>
          {navItems.map((item, index) => {
            if (item.type === 'link') {
              const isActive = location.pathname === item.to;
              return (
                <Link
                  key={index}
                  to={item.to}
                  className={`flex flex-col items-center justify-center px-2 py-1.5 min-w-0 flex-1 rounded-xl transition-all duration-300 ${
                    isActive 
                      ? 'bg-gradient-to-br from-purple-600 to-pink-500 text-white shadow-xl shadow-purple-500/30 scale-105' 
                      : 'text-gray-600 active:scale-95 hover:bg-gradient-to-br hover:from-purple-50 hover:to-pink-50'
                  }`}
                >
                  <span className="text-xl mb-1">{item.icon}</span>
                  <span className="text-xs leading-tight text-center nav-label font-semibold tracking-wide" style={{ fontSize: '0.65rem' }}>
                    {item.label}
                  </span>
                </Link>
              );
            } else {
              const isActive = item.children?.some(child => location.pathname === child.to);
              return (
                <button
                  key={index}
                  onClick={() => toggleMenu(item.id)}
                  className={`flex flex-col items-center justify-center px-2 py-1.5 min-w-0 flex-1 rounded-xl transition-all duration-300 ${
                    isActive 
                      ? 'bg-gradient-to-br from-purple-600 to-pink-500 text-white shadow-xl shadow-purple-500/30 scale-105' 
                      : expandedMenus[item.id]
                      ? 'bg-gradient-to-br from-purple-50 to-pink-50 text-purple-700'
                      : 'text-gray-600 active:scale-95 hover:bg-gradient-to-br hover:from-purple-50 hover:to-pink-50'
                  }`}
                >
                  <span className="text-xl mb-1">{item.icon}</span>
                  <span className="text-xs leading-tight text-center nav-label font-semibold tracking-wide" style={{ fontSize: '0.65rem' }}>
                    {item.label}
                  </span>
                  {expandedMenus[item.id] && (
                    <svg
                      className="w-2.5 h-2.5 mt-0.5 absolute top-0.5 right-0.5 opacity-70"
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

      {/* Login Modal */}
      {showLogin && (
        <Login onClose={() => setShowLogin(false)} />
      )}

      {/* Password Reset Modal */}
      {showPasswordReset && (
        <PasswordReset onClose={() => setShowPasswordReset(false)} />
      )}
    </>
  );
}
