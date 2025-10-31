import React from 'react';
import { useAuth } from '../contexts/AuthContext';

const ProtectedRoute = ({ children, requiredRole = null, requireAuth = true }) => {
  const { isAuthenticated, hasPermission, loading } = useAuth();

  // Show loading spinner while checking authentication
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-16 h-16 bg-gradient-to-br from-purple-600 to-pink-500 rounded-full flex items-center justify-center">
            <svg className="animate-spin h-8 w-8 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          </div>
          <div className="text-center">
            <h2 className="text-xl font-semibold text-gray-900 mb-1">Fashion Boutique</h2>
            <p className="text-gray-600">Loading...</p>
          </div>
        </div>
      </div>
    );
  }

  // Check if authentication is required and user is not authenticated
  if (requireAuth && !isAuthenticated()) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 pt-16">
        <div className="max-w-md w-full mx-4">
          <div className="bg-white rounded-2xl shadow-2xl p-8 text-center">
            <div className="w-16 h-16 bg-gradient-to-br from-purple-600 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Access Restricted</h2>
            <p className="text-gray-600 mb-6">
              You need to be logged in to access this page. Please sign in to continue.
            </p>
            <div className="space-y-3">
              <button
                onClick={() => window.location.reload()}
                className="w-full bg-gradient-to-r from-purple-600 to-pink-500 text-white font-semibold py-3 rounded-xl hover:from-purple-700 hover:to-pink-600 transition-all duration-200"
              >
                Sign In
              </button>
              <p className="text-xs text-gray-500">
                Don't have an account? Check your email for an invitation link.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Check if specific role is required and user doesn't have permission
  if (requiredRole && !hasPermission(requiredRole)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 pt-16">
        <div className="max-w-md w-full mx-4">
          <div className="bg-white rounded-2xl shadow-2xl p-8 text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728L5.636 5.636m12.728 12.728L18.364 5.636M5.636 18.364l12.728-12.728" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h2>
            <p className="text-gray-600 mb-6">
              You don't have permission to access this page. Please contact your administrator if you believe this is an error.
            </p>
            <button
              onClick={() => window.history.back()}
              className="w-full bg-gray-200 text-gray-700 font-semibold py-3 rounded-xl hover:bg-gray-300 transition-all duration-200"
            >
              Go Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  // If all checks pass, render the protected content
  return children;
};

export default ProtectedRoute;