# Fix: Email Verification Link Expired/Invalid

## 🚨 **Error:** `otp_expired` - Email verification link expired

### **Immediate Fix for Current User:**

```sql
-- Replace 'actual_email@domain.com' with the user's real email
UPDATE auth.users 
SET email_confirmed_at = NOW() 
WHERE email = 'actual_email@domain.com' 
AND email_confirmed_at IS NULL;

-- Verify it worked
SELECT email, email_confirmed_at, created_at 
FROM auth.users 
WHERE email = 'actual_email@domain.com';
```

### **Prevent Future Email Verification Issues:**

#### Option A: Disable Email Confirmation in Supabase Dashboard
1. **Go to Supabase Dashboard** → Your Project
2. **Authentication** → **Settings** 
3. **User Signups** section → **Enable email confirmations** → **Toggle OFF**
4. **Save**

#### Option B: Disable via SQL
```sql
-- This disables email confirmation at database level
-- Note: This might not work depending on your Supabase setup
-- The dashboard method above is more reliable
```

#### Option C: Set Proper URL Configuration
1. **Go to Supabase Dashboard** → **Authentication** → **URL Configuration**
2. **Site URL**: `http://localhost:3000`
3. **Redirect URLs**: Add these patterns:
   - `http://localhost:3000/**`
   - `http://localhost:3000/auth/callback`
   - `http://localhost:3000/verify`

### **Fix Email Links for Production:**

If you want email verification to work properly, set up proper redirect handling:

#### 1. Create Email Verification Handler Component:

```javascript
// Create src/components/EmailVerification.js
import { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { useNavigate } from 'react-router-dom';

const EmailVerification = () => {
  const [status, setStatus] = useState('loading');
  const [message, setMessage] = useState('Verifying your email...');
  const navigate = useNavigate();

  useEffect(() => {
    const handleEmailVerification = async () => {
      try {
        // Get the hash parameters from URL
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const accessToken = hashParams.get('access_token');
        const refreshToken = hashParams.get('refresh_token');
        const error = hashParams.get('error');
        const errorCode = hashParams.get('error_code');

        if (error) {
          if (errorCode === 'otp_expired') {
            setStatus('expired');
            setMessage('Verification link has expired. Please request a new one or contact admin.');
          } else {
            setStatus('error');
            setMessage(`Verification failed: ${hashParams.get('error_description') || error}`);
          }
          return;
        }

        if (accessToken && refreshToken) {
          // Set the session with the tokens
          const { data, error: sessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken
          });

          if (sessionError) {
            setStatus('error');
            setMessage('Failed to verify email. Please try again.');
          } else {
            setStatus('success');
            setMessage('Email verified successfully! Redirecting...');
            
            // Redirect to dashboard after 2 seconds
            setTimeout(() => {
              navigate('/dashboard'); // or wherever you want to redirect
            }, 2000);
          }
        } else {
          setStatus('error');
          setMessage('Invalid verification link.');
        }
      } catch (err) {
        setStatus('error');
        setMessage('An error occurred during verification.');
        console.error('Verification error:', err);
      }
    };

    handleEmailVerification();
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
            Email Verification
          </h2>
          
          {status === 'loading' && (
            <div className="mt-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
              <p className="mt-2 text-gray-600">{message}</p>
            </div>
          )}
          
          {status === 'success' && (
            <div className="mt-4">
              <div className="text-green-600 text-4xl mb-2">✓</div>
              <p className="text-green-600 font-medium">{message}</p>
            </div>
          )}
          
          {status === 'error' && (
            <div className="mt-4">
              <div className="text-red-600 text-4xl mb-2">✗</div>
              <p className="text-red-600">{message}</p>
              <button
                onClick={() => navigate('/login')}
                className="mt-4 bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700"
              >
                Go to Login
              </button>
            </div>
          )}
          
          {status === 'expired' && (
            <div className="mt-4">
              <div className="text-yellow-600 text-4xl mb-2">⚠</div>
              <p className="text-yellow-600">{message}</p>
              <div className="mt-4 space-y-2">
                <button
                  onClick={() => navigate('/login')}
                  className="block w-full bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700"
                >
                  Try Logging In
                </button>
                <p className="text-sm text-gray-600">
                  If login doesn't work, contact your administrator
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EmailVerification;
```

#### 2. Add Route for Email Verification:

```javascript
// In your App.js or main routing file, add:
import EmailVerification from './components/EmailVerification';

// Add this route
<Route path="/auth/verify" element={<EmailVerification />} />
```

#### 3. Update Supabase URL Configuration:
- **Site URL**: `http://localhost:3000`
- **Redirect URLs**: 
  - `http://localhost:3000/auth/verify`
  - `http://localhost:3000/**`

### **Quick Test:**

After setting up the email verification handler:

1. **Create a new user**
2. **Check email for verification link**  
3. **Click the link** - should redirect to `/auth/verify`
4. **Should show success** and redirect to dashboard

### **Recommended Approach:**

For **admin-created users**, I recommend **disabling email verification entirely** since:
- ✅ Admin vouches for the user
- ✅ No broken verification links  
- ✅ Immediate access
- ✅ Better user experience

Just run the SQL command to activate current users and disable email confirmation in dashboard!

**The email verification component above is useful if you want to support email verification for self-registered users later.** 🚀