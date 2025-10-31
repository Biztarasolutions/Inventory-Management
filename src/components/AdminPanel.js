import React, { useState } from 'react';
import { useAuth, USER_ROLES } from '../contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';

const AdminPanel = () => {
  const { hasPermission } = useAuth();
  const [activeTab, setActiveTab] = useState('invites');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Check if user has admin permission
  if (!hasPermission(USER_ROLES.ADMIN)) {
    return <Navigate to="/create-bill" replace />;
  }

  const tabs = [
    { id: 'invites', label: 'Send Invites', icon: '📧' },
    { id: 'info', label: 'System Info', icon: '⚙️' },
  ];

  return (
    <div className="min-h-screen bg-gray-50 pt-20 pb-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Admin Panel</h1>
          <p className="text-gray-600">Manage users, send invitations, and configure system settings</p>
        </div>

        {/* Error/Success Messages */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl">
            <div className="flex items-center">
              <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              {error}
            </div>
          </div>
        )}

        {success && (
          <div className="mb-6 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl">
            <div className="flex items-center">
              <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              {success}
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="mb-8">
          <div className="border-b border-gray-200 bg-white rounded-t-xl">
            <nav className="-mb-px flex space-x-8 px-6">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap flex items-center space-x-2 transition-colors duration-200 ${
                    activeTab === tab.id
                      ? 'border-purple-500 text-purple-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <span className="text-lg">{tab.icon}</span>
                  <span>{tab.label}</span>
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Tab Content */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-200">
          {activeTab === 'invites' && (
            <SendInvites 
              onSuccess={(msg) => {
                setSuccess(msg);
                setTimeout(() => setSuccess(''), 5000);
              }} 
              onError={(msg) => {
                setError(msg);
                setTimeout(() => setError(''), 5000);
              }}
            />
          )}
          
          {activeTab === 'info' && (
            <SystemInfo />
          )}
        </div>
      </div>
    </div>
  );
};

// Send Invites Component
const SendInvites = ({ onSuccess, onError }) => {
  const [inviteMethod, setInviteMethod] = useState('email'); // 'email' or 'phone'
  const [formData, setFormData] = useState({
    email: '',
    phone: '',
    role: USER_ROLES.EMPLOYEE
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (inviteMethod === 'email') {
        // Email-based invitation
        const { error } = await supabase.auth.signUp({
          email: formData.email,
          password: 'TempPass123!', // Temporary password - user will need to reset
          options: {
            data: {
              role: formData.role,
              name: formData.email.split('@')[0],
              status: 'pending'
            }
          }
        });

        if (error) {
          onError(error.message);
        } else {
          onSuccess(`User ${formData.email} created successfully! They will receive an email to set up their account.`);
          setFormData({ email: '', phone: '', role: USER_ROLES.EMPLOYEE });
        }
      } else {
        // Phone-based invitation using OTP
        const { error } = await supabase.auth.signInWithOtp({
          phone: formData.phone,
          options: {
            data: {
              role: formData.role,
              status: 'pending'
            }
          }
        });

        if (error) {
          onError(error.message);
        } else {
          onSuccess(`OTP sent to ${formData.phone}! The user will receive an SMS with a verification code to complete registration.`);
          setFormData({ email: '', phone: '', role: USER_ROLES.EMPLOYEE });
        }
      }
    } catch (error) {
      console.error('Error creating user:', error);
      onError('Failed to create user. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6">
      <h2 className="text-xl font-semibold text-gray-900 mb-6">Send User Invitation</h2>
      
      <form onSubmit={handleSubmit} className="max-w-md space-y-6">
        {/* Invitation Method Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Invitation Method
          </label>
          <div className="flex space-x-4">
            <label className="flex items-center">
              <input
                type="radio"
                name="inviteMethod"
                value="email"
                checked={inviteMethod === 'email'}
                onChange={(e) => setInviteMethod(e.target.value)}
                className="mr-2 text-purple-600"
              />
              <span className="text-sm">📧 Email</span>
            </label>
            <label className="flex items-center">
              <input
                type="radio"
                name="inviteMethod"
                value="phone"
                checked={inviteMethod === 'phone'}
                onChange={(e) => setInviteMethod(e.target.value)}
                className="mr-2 text-purple-600"
              />
              <span className="text-sm">📱 Phone (SMS)</span>
            </label>
          </div>
        </div>

        {/* Email Input */}
        {inviteMethod === 'email' && (
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
              Email Address
            </label>
            <input
              type="email"
              id="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200"
              placeholder="Enter user's email address"
              required
            />
          </div>
        )}

        {/* Phone Input */}
        {inviteMethod === 'phone' && (
          <div>
            <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
              Phone Number
            </label>
            <input
              type="tel"
              id="phone"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200"
              placeholder="+1234567890 (with country code)"
              required
            />
            <p className="mt-1 text-xs text-gray-500">
              Include country code (e.g., +1 for US, +91 for India)
            </p>
          </div>
        )}

        <div>
          <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-2">
            User Role
          </label>
          <select
            id="role"
            value={formData.role}
            onChange={(e) => setFormData({ ...formData, role: e.target.value })}
            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200"
            required
          >
            <option value={USER_ROLES.EMPLOYEE}>Employee (Billing & Sales only)</option>
            <option value={USER_ROLES.OWNER}>Owner (All pages except Admin)</option>
          </select>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-gradient-to-r from-purple-600 to-pink-500 text-white font-semibold py-3 rounded-xl hover:from-purple-700 hover:to-pink-600 focus:ring-4 focus:ring-purple-300 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? (
            <div className="flex items-center justify-center">
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              {inviteMethod === 'email' ? 'Sending Email...' : 'Sending SMS...'}
            </div>
          ) : (
            inviteMethod === 'email' ? 'Send Email Invitation' : 'Send SMS Invitation'
          )}
        </button>
      </form>

      <div className="mt-8 p-4 bg-blue-50 rounded-xl border border-blue-200">
        <h3 className="text-sm font-medium text-blue-900 mb-2">How it works:</h3>
        {inviteMethod === 'email' ? (
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• The user will receive an email invitation with a secure registration link</li>
            <li>• They can click the link to create their username and password</li>
            <li>• Once registered, they can log in with their credentials</li>
            <li>• Their access will be limited based on the role you assign</li>
          </ul>
        ) : (
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• The user will receive an SMS with a 6-digit verification code</li>
            <li>• They need to enter this code within 60 seconds to verify their phone</li>
            <li>• Once verified, they can set up their profile and password</li>
            <li>• They can then log in using their phone number for future sessions</li>
          </ul>
        )}
      </div>

      {inviteMethod === 'phone' && (
        <div className="mt-4 p-4 bg-amber-50 rounded-xl border border-amber-200">
          <h3 className="text-sm font-medium text-amber-900 mb-2">⚠️ SMS Setup Required:</h3>
          <p className="text-sm text-amber-800">
            Phone authentication requires SMS provider configuration in your Supabase project settings. 
            Make sure you have enabled phone auth and configured an SMS provider (Twilio, MessageBird, Vonage, or TextLocal).
          </p>
        </div>
      )}
    </div>
  );
};

// System Settings Component
const SystemInfo = () => {
  return (
    <div className="p-6">
      <h2 className="text-xl font-semibold text-gray-900 mb-6">System Information</h2>
      
      <div className="space-y-6">
        <div className="p-4 bg-blue-50 rounded-xl border border-blue-200">
          <h3 className="text-sm font-medium text-blue-900 mb-2">Authentication</h3>
          <p className="text-sm text-blue-700 mb-2">✅ Supabase Authentication Active</p>
          <p className="text-xs text-blue-600">User authentication and authorization via Supabase</p>
        </div>

        <div className="p-4 bg-green-50 rounded-xl border border-green-200">
          <h3 className="text-sm font-medium text-green-900 mb-2">Database</h3>
          <p className="text-sm text-green-700 mb-2">✅ Supabase PostgreSQL Database</p>
          <p className="text-xs text-green-600">Real-time database with automatic backups</p>
        </div>

        <div className="p-4 bg-purple-50 rounded-xl border border-purple-200">
          <h3 className="text-sm font-medium text-purple-900 mb-2">User Roles</h3>
          <div className="text-sm text-purple-700 space-y-1">
            <p>• Admin: Full system access</p>
            <p>• Owner: All inventory features</p>
            <p>• Employee: Billing and sales only</p>
          </div>
        </div>

        <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
          <h3 className="text-sm font-medium text-gray-900 mb-2">Version Info</h3>
          <p className="text-sm text-gray-700">Fashion Boutique Inventory v1.0.0</p>
          <p className="text-xs text-gray-600">React + Supabase Authentication System</p>
        </div>
      </div>
    </div>
  );
};

export default AdminPanel;