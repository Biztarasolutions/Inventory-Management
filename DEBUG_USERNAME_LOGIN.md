# Debug Username Login Issue

## 🔍 **Step 1: Verify Username in Database**

Run this in Supabase SQL Editor to check if your username is properly set:

```sql
-- Check if username 'admin' exists in profiles table
SELECT 
  p.id,
  p.username,
  p.email,
  p.name,
  p.role,
  au.email as auth_email
FROM public.profiles p
JOIN auth.users au ON p.id = au.id
WHERE p.username = 'admin';
```

**Expected Result:**
- Should show: username='admin', email='biztarasolutions@gmail.com'

## 🔍 **Step 2: Check All Profiles**

```sql
-- See all profiles to check data structure
SELECT 
  username,
  email,
  role,
  name
FROM public.profiles
ORDER BY created_at DESC;
```

## 🔍 **Step 3: Check Auth Users**

```sql
-- Check your auth user
SELECT 
  id,
  email,
  created_at,
  raw_user_meta_data
FROM auth.users 
WHERE email = 'biztarasolutions@gmail.com';
```

## 🛠️ **Common Issues & Fixes**

### Issue 1: Username Not Set Properly
If username shows as NULL or empty:

```sql
-- Fix: Set username properly
UPDATE public.profiles 
SET 
  username = 'admin',
  email = 'biztarasolutions@gmail.com'
WHERE id = (
  SELECT id FROM auth.users 
  WHERE email = 'biztarasolutions@gmail.com'
);
```

### Issue 2: Profile Record Doesn't Exist
If no profile record exists:

```sql
-- Fix: Create profile record
INSERT INTO public.profiles (id, username, email, name, role, status)
SELECT 
  au.id,
  'admin' as username,
  au.email,
  COALESCE(au.raw_user_meta_data->>'name', 'Admin') as name,
  'admin' as role,
  'active' as status
FROM auth.users au
WHERE au.email = 'biztarasolutions@gmail.com'
ON CONFLICT (id) DO UPDATE SET
  username = EXCLUDED.username,
  email = EXCLUDED.email;
```

### Issue 3: Wrong Column Names
If columns don't exist:

```sql
-- Fix: Add missing columns
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS username TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS email TEXT;
```

## 🧪 **Test Login in Browser Console**

Open your app, press F12, go to Console, and run:

```javascript
// Test the username lookup directly
const testUsername = async () => {
  const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2');
  const supabase = createClient('YOUR_SUPABASE_URL', 'YOUR_SUPABASE_ANON_KEY');
  
  const { data, error } = await supabase
    .from('profiles')
    .select('email, username, role')
    .eq('username', 'admin')
    .single();
    
  console.log('Username lookup result:', { data, error });
};

testUsername();
```

## 📱 **Step-by-Step Debug Process**

### 1. **Run the SQL queries above**
- Check if username 'admin' exists
- Verify it's linked to your email

### 2. **Check browser console**
- Look for any errors when trying to login
- Check network tab for API responses

### 3. **Verify database connection**
```sql
-- Test basic query works
SELECT COUNT(*) FROM public.profiles;
```

### 4. **Test with email first**
- Try logging in with 'biztarasolutions@gmail.com' and password
- If this works, the issue is username lookup
- If this fails, the issue is password/auth

## 🚀 **Quick Fix Commands**

Run these in order:

```sql
-- 1. Ensure profile exists with correct data
INSERT INTO public.profiles (id, username, email, name, role, status)
SELECT 
  au.id,
  'admin',
  au.email,
  'Admin User',
  'admin',
  'active'
FROM auth.users au
WHERE au.email = 'biztarasolutions@gmail.com'
ON CONFLICT (id) DO UPDATE SET
  username = 'admin',
  email = au.email;

-- 2. Verify it worked
SELECT username, email, role FROM public.profiles WHERE username = 'admin';
```

## ❓ **What to Check Next**

1. **Run the SQL queries** - tell me what results you get
2. **Check browser console** - any errors when logging in?
3. **Try email login** - does 'biztarasolutions@gmail.com' work?

Let me know the results and I'll help you fix the specific issue! 🔧