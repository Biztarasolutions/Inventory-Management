import React, { useState, useEffect } from 'react';
import { useAuth, USER_ROLES } from '../contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';

const AdminPanel = () => {
  const { hasPermission } = useAuth();
  const [activeTab, setActiveTab] = useState('users');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Check if user has admin permission
  if (!hasPermission(USER_ROLES.ADMIN)) {
    return <Navigate to="/create-bill" replace />;
  }

  const tabs = [
    { id: 'users', label: 'User Management', icon: '👥' },
    { id: 'tracking', label: 'Tracking', icon: '📊' },
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
          {activeTab === 'users' && (
            <UserManagement 
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
          
          {activeTab === 'tracking' && (
            <TrackingSection />
          )}
        </div>
      </div>
    </div>
  );
};

// User Management Component
const UserManagement = ({ onSuccess, onError }) => {
  const [activeSubTab, setActiveSubTab] = useState('users');
  
  const subTabs = [
    { id: 'create', label: 'Create User', icon: '�' },
    { id: 'users', label: 'Assigned Users', icon: '�' }
  ];

  return (
    <div className="p-6">
      <h2 className="text-xl font-semibold text-gray-900 mb-6">User Management</h2>
      
      {/* Sub-tabs */}
      <div className="mb-6">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            {subTabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveSubTab(tab.id)}
                className={`py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap flex items-center space-x-2 transition-colors duration-200 ${
                  activeSubTab === tab.id
                    ? 'border-purple-500 text-purple-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Sub-tab content */}
      {activeSubTab === 'create' && <CreateUser onSuccess={onSuccess} onError={onError} />}
      {activeSubTab === 'users' && <AssignedUsers />}
    </div>
  );
};

// Create User Component (direct creation with password)
const CreateUser = ({ onSuccess, onError }) => {
  const [formData, setFormData] = useState({
    email: '',
    username: '',
    password: '',
    confirmPassword: '',
    name: '',
    role: USER_ROLES.EMPLOYEE
  });
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Validation
      if (!formData.username || !formData.email || !formData.password || !formData.confirmPassword) {
        onError('All fields are required');
        setLoading(false);
        return;
      }

      if (formData.password !== formData.confirmPassword) {
        onError('Passwords do not match');
        setLoading(false);
        return;
      }

      if (formData.password.length < 6) {
        onError('Password must be at least 6 characters long');
        setLoading(false);
        return;
      }

      // Check if username already exists
      const { data: existingUser } = await supabase
        .from('profiles')
        .select('username')
        .eq('username', formData.username)
        .single();

      if (existingUser) {
        onError(`Username '${formData.username}' is already taken. Please choose a different username.`);
        setLoading(false);
        return;
      }

      // Create user with Supabase Auth
      const { data, error } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            role: formData.role,
            name: formData.name || formData.username,
            username: formData.username,
            status: 'active'
          }
        }
      });

      if (error) {
        onError(error.message);
      } else {
        console.log('✅ User created in auth:', data.user.id);
        console.log('📧 User email confirmed status:', data.user.email_confirmed_at);
        
        // If email is not confirmed, try to confirm it automatically (admin-created users should be trusted)
        if (!data.user.email_confirmed_at) {
          console.log('🔄 Auto-confirming email for admin-created user...');
          try {
            // Note: This requires admin privileges and might not work with current setup
            const { error: confirmError } = await supabase.auth.admin.updateUserById(
              data.user.id,
              { email_confirm: true }
            );
            
            if (confirmError) {
              console.warn('⚠️ Could not auto-confirm email:', confirmError.message);
            } else {
              console.log('✅ Email auto-confirmed for user');
            }
          } catch (confirmErr) {
            console.warn('⚠️ Email auto-confirmation not available:', confirmErr.message);
          }
        }

        console.log('📝 Creating profile with data:', {
          id: data.user.id,
          username: formData.username,
          email: formData.email,
          name: formData.name || formData.username,
          role: formData.role,
          status: 'active'
        });

        // Create profile record with proper error handling
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .insert({
            id: data.user.id,
            username: formData.username,
            email: formData.email,
            name: formData.name || formData.username,
            role: formData.role,
            status: 'active'
          })
          .select();

        console.log('📊 Profile creation result:', { profileData, profileError });

        if (profileError) {
          console.error('❌ Profile creation failed:', profileError);
          
          // Try to update existing profile instead
          console.log('🔄 Trying to update existing profile...');
          const { data: updateData, error: updateError } = await supabase
            .from('profiles')
            .update({
              username: formData.username,
              email: formData.email,
              name: formData.name || formData.username,
              role: formData.role,
              status: 'active'
            })
            .eq('id', data.user.id)
            .select();

          console.log('🔄 Profile update result:', { updateData, updateError });

          if (updateError) {
            onError(`User created but profile failed: ${updateError.message}. User may not be able to login properly.`);
            return;
          }
        }

        // Verify the profile was created/updated correctly
        const { data: verifyProfile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', data.user.id)
          .single();

        console.log('✅ Final profile verification:', verifyProfile);

        if (!verifyProfile || !verifyProfile.username || !verifyProfile.email) {
          onError('User created but username/email not saved properly. Check console logs.');
          return;
        }

        onSuccess(`User '${formData.username}' created successfully! They can now login immediately.`);
        setFormData({ email: '', username: '', password: '', confirmPassword: '', name: '', role: USER_ROLES.EMPLOYEE });
      }
    } catch (error) {
      console.error('Error creating user:', error);
      onError('Failed to create user. Please check your permissions and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h3 className="text-lg font-medium text-gray-900 mb-4">Create New User Account</h3>
      
      <form onSubmit={handleSubmit} className="max-w-md space-y-6">
        <div>
          <label htmlFor="create-username" className="block text-sm font-medium text-gray-700 mb-2">
            Username <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="create-username"
            value={formData.username}
            onChange={(e) => setFormData({ ...formData, username: e.target.value })}
            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200"
            placeholder="Enter unique username"
            required
          />
        </div>

        <div>
          <label htmlFor="create-email" className="block text-sm font-medium text-gray-700 mb-2">
            Email Address <span className="text-red-500">*</span>
          </label>
          <input
            type="email"
            id="create-email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200"
            placeholder="Enter email address"
            required
          />
        </div>

        <div>
          <label htmlFor="create-name" className="block text-sm font-medium text-gray-700 mb-2">
            Full Name
          </label>
          <input
            type="text"
            id="create-name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200"
            placeholder="Enter full name (optional)"
          />
        </div>

        <div>
          <label htmlFor="create-password" className="block text-sm font-medium text-gray-700 mb-2">
            Password <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              id="create-password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200"
              placeholder="Enter password (min 6 characters)"
              required
              minLength={6}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              {showPassword ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L8.464 8.464m1.414 1.414L8.464 8.464m5.656 5.656l1.415 1.415m-1.415-1.415l1.415 1.415M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.543 7-1.275 4.057-5.065 7-9.543 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              )}
            </button>
          </div>
        </div>

        <div>
          <label htmlFor="create-confirm-password" className="block text-sm font-medium text-gray-700 mb-2">
            Confirm Password <span className="text-red-500">*</span>
          </label>
          <input
            type="password"
            id="create-confirm-password"
            value={formData.confirmPassword}
            onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200"
            placeholder="Confirm password"
            required
          />
        </div>

        <div>
          <label htmlFor="create-role" className="block text-sm font-medium text-gray-700 mb-2">
            User Role <span className="text-red-500">*</span>
          </label>
          <select
            id="create-role"
            value={formData.role}
            onChange={(e) => setFormData({ ...formData, role: e.target.value })}
            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200"
            required
          >
            <option value={USER_ROLES.EMPLOYEE}>Employee</option>
            <option value={USER_ROLES.OWNER}>Owner</option>
            <option value={USER_ROLES.ADMIN}>Admin</option>
          </select>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white py-3 px-6 rounded-xl font-medium hover:from-purple-700 hover:to-pink-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
        >
          {loading ? (
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Creating User...
            </div>
          ) : (
            'Create User Account'
          )}
        </button>
      </form>

      <div className="mt-8 space-y-4">
        <div className="p-4 bg-yellow-50 rounded-xl border border-yellow-200">
          <h3 className="text-sm font-medium text-yellow-900 mb-2">Direct User Creation:</h3>
          <ul className="text-sm text-yellow-800 space-y-1">
            <li>• User account is created immediately with the password you set</li>
            <li>• User can login right away using their username and password</li>
            <li>• No email verification required - account is active instantly</li>
            <li>• Use this for creating accounts that need immediate access</li>
          </ul>
        </div>

        <div className="p-4 bg-purple-50 rounded-xl border border-purple-200">
          <h3 className="text-sm font-medium text-purple-900 mb-2">Security Notes:</h3>
          <ul className="text-sm text-purple-800 space-y-1">
            <li>• Choose a strong password (minimum 6 characters)</li>
            <li>• Username must be unique across all users</li>
            <li>• User can change their password after first login</li>
            <li>• Role determines their access level in the system</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

// Assigned Users Component
const AssignedUsers = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          id,
          username,
          email,
          name,
          role,
          status,
          created_at
        `)
        .order('created_at', { ascending: false });

      if (error) {
        setError('Failed to fetch users: ' + error.message);
      } else {
        setUsers(data || []);
      }
    } catch (err) {
      setError('Network error occurred while fetching users');
      console.error('Error fetching users:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = (user) => {
    setDeleteConfirm(user);
  };

  const confirmDeleteUser = async () => {
    if (!deleteConfirm) return;

    try {
      setDeleting(true);
      console.log('🗑️ Deleting user:', deleteConfirm.username || deleteConfirm.email);

      // Step 1: Delete from profiles table
      const { error: profileError } = await supabase
        .from('profiles')
        .delete()
        .eq('id', deleteConfirm.id);

      if (profileError) {
        console.error('❌ Failed to delete from profiles:', profileError);
        setError(`Failed to delete user profile: ${profileError.message}`);
        return;
      }

      console.log('✅ User deleted from profiles table');

      // Step 2: Try to delete from auth.users (this might require admin privileges)
      try {
        const { error: authError } = await supabase.auth.admin.deleteUser(deleteConfirm.id);
        
        if (authError) {
          console.warn('⚠️ Could not delete from auth.users (might need service role):', authError);
          // Don't fail completely, profile deletion succeeded
        } else {
          console.log('✅ User deleted from auth.users table');
        }
      } catch (authErr) {
        console.warn('⚠️ Auth deletion not available with current permissions:', authErr);
      }

      // Step 3: Remove user from local state
      setUsers(users.filter(u => u.id !== deleteConfirm.id));
      
      // Step 4: Clear delete confirmation
      setDeleteConfirm(null);
      setError(''); // Clear any previous errors
      
      console.log('✅ User deletion completed');
      
    } catch (err) {
      console.error('❌ Error during user deletion:', err);
      setError(`Failed to delete user: ${err.message}`);
    } finally {
      setDeleting(false);
    }
  };

  const cancelDelete = () => {
    setDeleteConfirm(null);
  };

  const getRoleColor = (role) => {
    switch (role?.toLowerCase()) {
      case 'admin':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'owner':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'employee':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'active':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'inactive':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
          <span className="ml-3 text-gray-600">Loading users...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-900">Assigned Users</h2>
        <div className="flex items-center space-x-2 text-sm text-gray-600">
          <span>Total: {users.length} users</span>
          <button
            onClick={fetchUsers}
            className="ml-2 p-1 text-gray-400 hover:text-gray-600 transition-colors"
            title="Refresh"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 text-red-600 rounded-xl">
          {error}
        </div>
      )}

      {users.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-gray-400 text-6xl mb-4">👥</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No users assigned yet</h3>
          <p className="text-gray-600">Users you invite will appear here once they register.</p>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    User Details
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Username
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Role
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Joined
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {users.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10">
                          <div className="h-10 w-10 rounded-full bg-gradient-to-r from-purple-400 to-pink-400 flex items-center justify-center">
                            <span className="text-white font-medium text-sm">
                              {(user.name || user.username || user.email)?.charAt(0)?.toUpperCase()}
                            </span>
                          </div>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {user.name || 'No name set'}
                          </div>
                          <div className="text-sm text-gray-500">
                            ID: {user.id?.slice(0, 8)}...
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {user.username || 'Not set'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{user.email}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full border ${getRoleColor(user.role)}`}>
                        {user.role || 'employee'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full border ${getStatusColor(user.status)}`}>
                        {user.status || 'active'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(user.created_at).toLocaleDateString('en-IN', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric'
                      })}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() => handleDeleteUser(user)}
                        className="text-red-600 hover:text-red-900 hover:bg-red-50 px-3 py-1 rounded-md transition-colors duration-200 flex items-center space-x-1"
                        title={`Delete user ${user.username || user.email}`}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                        <span>Delete</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center">
          <div className="relative mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3 text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
                <svg className="h-6 w-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <h3 className="text-lg leading-6 font-medium text-gray-900 mt-4">Delete User</h3>
              <div className="mt-2 px-7 py-3">
                <p className="text-sm text-gray-500">
                  Are you sure you want to delete user{' '}
                  <span className="font-semibold text-gray-900">
                    {deleteConfirm.username || deleteConfirm.email}
                  </span>
                  ?
                </p>
                <p className="text-xs text-red-600 mt-2">
                  This will remove the user from both the profiles and authentication tables. This action cannot be undone.
                </p>
                
                <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3 mt-3">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <svg className="h-5 w-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-yellow-800">User Details:</h3>
                      <div className="mt-1 text-sm text-yellow-700">
                        <p><strong>Username:</strong> {deleteConfirm.username || 'Not set'}</p>
                        <p><strong>Email:</strong> {deleteConfirm.email}</p>
                        <p><strong>Role:</strong> {deleteConfirm.role}</p>
                        <p><strong>Status:</strong> {deleteConfirm.status}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="items-center px-4 py-3">
                <div className="flex space-x-3">
                  <button
                    onClick={cancelDelete}
                    disabled={deleting}
                    className="flex-1 px-4 py-2 bg-gray-500 text-white text-base font-medium rounded-md shadow-sm hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-300 disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={confirmDeleteUser}
                    disabled={deleting}
                    className="flex-1 px-4 py-2 bg-red-600 text-white text-base font-medium rounded-md shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-300 disabled:opacity-50 flex items-center justify-center"
                  >
                    {deleting ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Deleting...
                      </>
                    ) : (
                      'Delete User'
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Tracking Section Component
const TrackingSection = () => {
  return (
    <div className="p-6">
      <h2 className="text-xl font-semibold text-gray-900 mb-6">Tracking Dashboard</h2>
      
      <div className="space-y-6">
        {/* Placeholder for future tracking features */}
        <div className="p-8 bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl border border-blue-200 text-center">
          <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl text-white">📊</span>
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">Tracking Features Coming Soon</h3>
          <p className="text-gray-600 mb-4">
            This section will contain advanced tracking and analytics features for your fashion boutique.
          </p>
          <div className="text-sm text-gray-500 bg-white/60 rounded-lg p-4 inline-block">
            Ready to be customized based on your requirements
          </div>
        </div>

        {/* Future tracking cards can be added here */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 bg-white rounded-xl border border-gray-200 shadow-sm">
            <h4 className="font-medium text-gray-900 mb-2">📈 Sales Analytics</h4>
            <p className="text-sm text-gray-600">Track sales performance and trends</p>
          </div>
          
          <div className="p-4 bg-white rounded-xl border border-gray-200 shadow-sm">
            <h4 className="font-medium text-gray-900 mb-2">📦 Inventory Tracking</h4>
            <p className="text-sm text-gray-600">Monitor stock levels and movements</p>
          </div>
          
          <div className="p-4 bg-white rounded-xl border border-gray-200 shadow-sm">
            <h4 className="font-medium text-gray-900 mb-2">👥 User Activity</h4>
            <p className="text-sm text-gray-600">Track user actions and engagement</p>
          </div>
          
          <div className="p-4 bg-white rounded-xl border border-gray-200 shadow-sm">
            <h4 className="font-medium text-gray-900 mb-2">💰 Revenue Insights</h4>
            <p className="text-sm text-gray-600">Analyze revenue patterns and growth</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminPanel;