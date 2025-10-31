# Supabase Setup Guide for Fashion Boutique Authentication

## 🚀 Setting up Supabase Authentication

### 1. Database Schema Setup

First, you need to set up the user profiles table in your Supabase database. Go to your Supabase dashboard and run these SQL commands:

```sql
-- Create profiles table
CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  name TEXT,
  role TEXT DEFAULT 'employee' CHECK (role IN ('admin', 'owner', 'employee')),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'pending')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS (Row Level Security)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles" ON public.profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Admins can update all profiles" ON public.profiles
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Function to handle new user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, name, role, status)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.email),
    COALESCE(NEW.raw_user_meta_data->>'role', 'employee'),
    COALESCE(NEW.raw_user_meta_data->>'status', 'active')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to automatically create profile on user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

### 2. Create Default Admin User

In your Supabase dashboard, go to **Authentication > Users** and manually create an admin user:

#### **Method 1: Add Metadata During User Creation (Preferred)**

1. **Click "Add User"**
2. **Fill basic information:**
   - Email: `biztarasolutions@gmail.com`
   - Password: `Admin123!`
   - Confirm Password: `Admin123!`
   - ✅ Check "Auto Confirm User" (important!)

3. **Find the User Metadata section:**
   - **Scroll down** in the form to find one of these sections:
     - **"Raw User Meta Data"** (most common)
     - **"User Metadata"** 
     - **"Additional Data"**
     - **"Custom Claims"**
   - It will be a **text area** that accepts JSON

4. **Add this JSON** in the metadata field:
   ```json
   {
     "name": "System Administrator",
     "role": "admin",
     "status": "active"
   }
   ```

5. **Click "Create User"**

#### **Method 2: If No Metadata Field Visible (Alternative)**

If you don't see a metadata field during creation:

1. **Create user** with just email and password first
2. **After creation**, click on the user's email in the users list
3. **Look for these tabs/sections:**
   - **"Raw User Meta Data"** tab
   - **"Details"** tab  
   - **"Edit User"** option
4. **Add the same JSON** metadata there
5. **Save changes**

#### **Method 3: Using SQL (Recommended - Always Works)**

Since the metadata field is not visible in your dashboard, use this SQL approach:

1. **First, create the user with basic info:**
   - Click "Add User"
   - Email: `admin@fashionboutique.com`
   - Password: `Admin123!`
   - ✅ Check "Auto Confirm User"
   - Click "Create User" (ignore that there's no metadata field)

2. **Then, go to SQL Editor:**
   - In your Supabase dashboard, click **"SQL Editor"** in the left sidebar
   - Click **"New query"**

3. **Run this query to add admin role:**
   ```sql
   UPDATE auth.users 
   SET raw_user_meta_data = '{"name": "System Administrator", "role": "admin", "status": "active"}'::jsonb
   WHERE email = 'biztarasolutions@gmail.com';
   ```

4. **Click "Run"** - you should see "Success. No rows returned"

5. **Verify it worked** by running this query:
   ```sql
   SELECT email, raw_user_meta_data FROM auth.users 
   WHERE email = 'admin@fashionboutique.com';
   ```
   You should see your admin user with the role metadata.

### 3. Email Configuration

#### Option 1: Use Supabase Email (Recommended for Development)
Supabase provides built-in email service for development. No additional setup required.

#### Option 2: Custom SMTP (Production)
1. Go to **Settings > Authentication**
2. Scroll to "SMTP Settings"
3. Configure your Gmail SMTP:
   - SMTP Host: `smtp.gmail.com`
   - SMTP Port: `587`
   - SMTP Username: Your Gmail address
   - SMTP Password: Your Gmail App Password
   - Sender Email: Your Gmail address
   - Sender Name: `Fashion Boutique`

### 4. Authentication Settings

In **Settings > Authentication**, configure:

1. **Site URL**: `http://localhost:3000` (development) or your production URL
2. **Redirect URLs**: Add your domain URLs
3. **Email Templates**: Customize invitation and password reset emails
4. **Auth Providers**: Enable only Email authentication (disable social logins if not needed)

### 5. Environment Variables

Your `.env.local` file should contain:
```env
REACT_APP_SUPABASE_URL=https://glcqkfikztijfdbmlkvc.supabase.co
REACT_APP_SUPABASE_ANON_KEY=your-anon-key-here
```

### 6. Testing the Setup

1. Start your React app: `npm start`
2. Go to `http://localhost:3000`
3. Click "Login"
4. Use admin credentials:
   - Email: `admin@fashionboutique.com`
   - Password: `Admin123!`
5. You should see the Admin Panel with "Send Invites" functionality

### 7. Creating Additional Users

#### Method 1: Admin Panel (Recommended)
1. Login as admin
2. Go to Admin Panel
3. Click "Send Invites" tab
4. Enter email and select role
5. User will receive signup email

#### Method 2: Direct Database Insert
```sql
-- Insert user directly (for testing)
INSERT INTO auth.users (
  id,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  raw_user_meta_data
) VALUES (
  gen_random_uuid(),
  'owner@fashionboutique.com',
  crypt('Owner123!', gen_salt('bf')),
  NOW(),
  NOW(),
  NOW(),
  '{"name": "Store Owner", "role": "owner", "status": "active"}'::jsonb
);
```

## 🔒 Security Best Practices

### Row Level Security (RLS)
- ✅ Enabled on profiles table
- ✅ Users can only see their own profile (unless admin)
- ✅ Admins can manage all users

### Password Policy
Configure in Supabase Auth settings:
- Minimum 8 characters
- Require uppercase, lowercase, number, symbol
- Password strength validation

### Email Verification
- Enable "Email Confirmations" in Auth settings
- Users must verify email before accessing system

## 🎯 User Role System

### Admin
- Full access to all features
- Can manage users via Admin Panel
- Can invite new users with any role

### Owner  
- Access to all inventory management features
- Cannot access Admin Panel
- Cannot manage users

### Employee
- Limited to billing and sales features
- Cannot access stock management
- Cannot access Admin Panel

## 🚦 Troubleshooting

### Common Issues

**Login fails with correct credentials:**
- Check if user email is confirmed in Supabase dashboard
- Verify user has correct role in user_metadata

**Can't find User Metadata field (COMMON ISSUE):**
- This is normal with newer Supabase versions - the metadata field is often hidden
- **Solution**: Use Method 3 (SQL approach) - it always works
- Create the user first, then use SQL to add the admin role
- This is actually more reliable than the UI method

**Admin Panel not accessible:**
- Ensure user has `role: "admin"` in user_metadata
- Check RLS policies are correctly applied

**Email invitations not working:**
- Verify SMTP settings in Supabase
- Check email templates are configured
- Ensure Site URL is correctly set

**Database connection errors:**
- Verify Supabase URL and anon key
- Check if database policies are properly configured

### Debug Commands

```javascript
// Check current user in browser console
console.log(await supabase.auth.getUser());

// Check user metadata
const { data: { user } } = await supabase.auth.getUser();
console.log(user?.user_metadata);

// Test database connection
const { data, error } = await supabase.from('profiles').select('*');
console.log({ data, error });
```

## ✅ Verification Checklist

- [ ] Database tables created with RLS enabled
- [ ] Default admin user created with correct metadata
- [ ] Email configuration completed
- [ ] Authentication settings configured
- [ ] Environment variables set
- [ ] Admin login successful
- [ ] Admin Panel accessible
- [ ] User invitation system working
- [ ] Role-based access control functioning

## 🎉 Next Steps

1. Test the complete authentication flow
2. Invite team members using Admin Panel
3. Configure production environment
4. Set up proper domain and SSL
5. Customize email templates with branding

Your Supabase-powered authentication system is now ready for production use! 🚀