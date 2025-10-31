import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';

// User roles
export const USER_ROLES = {
  ADMIN: 'admin',
  OWNER: 'owner',
  EMPLOYEE: 'employee'
};

// Create the context
const AuthContext = createContext();

// Custom hook to use auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// AuthProvider component
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

    // Check if user is authenticated
  const isAuthenticated = () => {
    return user !== null && session !== null;
  };

  // Check if user has specific permission
  const hasPermission = (requiredRole) => {
    if (!user || !user.user_metadata) return false;
    
    const userRole = user.user_metadata.role || USER_ROLES.EMPLOYEE;
    
    // Admin has access to everything
    if (userRole === USER_ROLES.ADMIN) return true;
    
    // Owner has access to everything except admin
    if (userRole === USER_ROLES.OWNER) {
      return requiredRole !== USER_ROLES.ADMIN;
    }
    
    // Employee has limited access
    if (userRole === USER_ROLES.EMPLOYEE) {
      return requiredRole === USER_ROLES.EMPLOYEE;
    }
    
    return false;
  };

  // Get pages accessible to current user
  const getAccessiblePages = () => {
    if (!user) return [];
    
    const allPages = {
      'billing-sales': ['create-bill', 'sales', 'modification'],
      'stock-management': ['add-stocks', 'stock-inventory'],
      'history': ['orders', 'stock-history', 'expense'],
      'admin': ['admin-panel']
    };
    
    switch (user.role) {
      case USER_ROLES.ADMIN:
        // Admin has access to all pages
        return Object.values(allPages).flat();
      
      case USER_ROLES.OWNER:
        // Owner has access to all pages except admin panel
        return [...allPages['billing-sales'], ...allPages['stock-management'], ...allPages['history']];
      
      case USER_ROLES.EMPLOYEE:
        // Employee only has access to billing & sales
        return allPages['billing-sales'];
      
      default:
        return [];
    }
  };

  // Login function
  const login = async (email, password) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        return { success: false, message: error.message };
      }

      setSession(data.session);
      setUser(data.user);
      return { success: true };
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, message: 'Network error. Please try again.' };
    }
  };

  // Register function (for invited users)
  const register = async (email, password, confirmPassword, role = USER_ROLES.EMPLOYEE, name = '') => {
    if (password !== confirmPassword) {
      return { success: false, message: 'Passwords do not match' };
    }

    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            role,
            name,
            status: 'active'
          }
        }
      });

      if (error) {
        return { success: false, message: error.message };
      }

      return { success: true, message: 'Registration successful! Please check your email to verify your account.' };
    } catch (error) {
      console.error('Registration error:', error);
      return { success: false, message: 'Network error. Please try again.' };
    }
  };

  // Reset password function
  const resetPassword = async (email) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) {
        return { success: false, message: error.message };
      }

      return { success: true, message: 'Password reset email sent!' };
    } catch (error) {
      console.error('Reset password error:', error);
      return { success: false, message: 'Network error. Please try again.' };
    }
  };

  // Logout function
  const logout = async () => {
    try {
      await supabase.auth.signOut();
      setSession(null);
      setUser(null);
    } catch (error) {
      console.error('Logout error:', error);
      setSession(null);
      setUser(null);
    }
  };

  // Initialize auth session
  const initializeAuth = useCallback(async () => {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) {
        console.error('Error getting session:', error);
      } else if (session) {
        setSession(session);
        setUser(session.user);
      }
    } catch (error) {
      console.error('Error initializing auth:', error);
    } finally {
      setLoading(false);
    }
  }, []);

    // Effect to initialize auth and listen for auth changes
  useEffect(() => {
    initializeAuth();

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [initializeAuth]);

  const value = {
    user,
    session,
    loading,
    isAuthenticated,
    hasPermission,
    getAccessiblePages,
    login,
    register,
    resetPassword,
    logout,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};