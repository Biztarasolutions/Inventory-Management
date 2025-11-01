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
  const login = async (username, password) => {
    try {
      // First, try to find the email associated with this username
      const { data: profileData } = await supabase
        .from('profiles')
        .select('email')
        .eq('username', username)
        .single();

      let emailToUse = username; // If username is actually an email

      if (profileData && profileData.email) {
        // Found username, use the associated email
        emailToUse = profileData.email;
      } else if (!username.includes('@')) {
        // Username provided but not found in database
        return { success: false, error: 'Invalid username or password' };
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email: emailToUse,
        password,
      });

      if (error) {
        return { success: false, error: error.message };
      }

      const enrichedUser = await enrichUserData(data.user);
      
      setSession(data.session);
      setUser(enrichedUser);
      return { success: true };
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, error: 'Network error. Please try again.' };
    }
  };

  // Register function (for invited users)
  const register = async (email, username, password, confirmPassword, role = USER_ROLES.EMPLOYEE, name = '') => {
    if (password !== confirmPassword) {
      return { success: false, message: 'Passwords do not match' };
    }

    try {
      // Check if username already exists
      const { data: existingUser } = await supabase
        .from('profiles')
        .select('username')
        .eq('username', username)
        .single();

      if (existingUser) {
        return { success: false, message: 'Username already exists. Please choose a different username.' };
      }

      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            role,
            name: name || username,
            username,
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

  // Enrich user data with profile information - optimized for speed
  const enrichUserData = async (user) => {
    if (!user) return null;
    
    try {
      // Add timeout to prevent slow database queries from blocking UI
      const profilePromise = supabase
        .from('profiles')
        .select('username, name, role, status')
        .eq('id', user.id)
        .single();
      
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Profile query timeout')), 2000)
      );
      
      const { data: profileData } = await Promise.race([profilePromise, timeoutPromise]);
      
      return {
        ...user,
        username: profileData?.username,
        name: profileData?.name,
        role: profileData?.role || USER_ROLES.EMPLOYEE,
        status: profileData?.status || 'active'
      };
    } catch (error) {
      // Return user with defaults if profile query fails or times out
      return {
        ...user,
        username: user.email?.split('@')[0] || 'user',
        name: user.user_metadata?.name || user.email?.split('@')[0] || 'User',
        role: user.user_metadata?.role || USER_ROLES.EMPLOYEE,
        status: 'active'
      };
    }
  };

  // Initialize auth session - optimized for speed
  const initializeAuth = useCallback(async () => {
    try {
      // Add timeout to session check to prevent hanging
      const sessionPromise = supabase.auth.getSession();
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Session check timeout')), 2500)
      );
      
      const { data: { session }, error } = await Promise.race([sessionPromise, timeoutPromise]);
      
      if (error) {
        console.error('Error getting session:', error);
      } else if (session) {
        // Set basic session immediately for faster UI response
        setSession(session);
        setUser(session.user);
        setLoading(false);
        
        // Enrich user data in background
        enrichUserData(session.user).then(enrichedUser => {
          setUser(enrichedUser);
        });
      }
    } catch (error) {
      console.error('Error initializing auth:', error.message);
    } finally {
      setLoading(false);
    }
  }, []);

    // Effect to initialize auth and listen for auth changes
  useEffect(() => {
    initializeAuth();

    // Safety timeout to prevent infinite loading - reduced for faster UI response
    const loadingTimeout = setTimeout(() => {
      setLoading(false);
    }, 3000); // 3 second timeout for faster initial load

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        const enrichedUser = await enrichUserData(session.user);
        setSession(session);
        setUser(enrichedUser);
      } else {
        setSession(session);
        setUser(null);
      }
      setLoading(false);
      clearTimeout(loadingTimeout); // Clear timeout if auth resolves
    });

    return () => {
      subscription.unsubscribe();
      clearTimeout(loadingTimeout);
    };
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