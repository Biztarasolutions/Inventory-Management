# Assign Username to Existing Admin Account

## 🎯 **Assigning Username to biztarasolutions@gmail.com**

Since you already have an admin account and we've updated the system to use usernames, you need to add a username to your existing profile.

### **Step 1: First, Update Your Database Schema (if not done already)**

Run this in your Supabase SQL Editor:

```sql
-- Add username column if it doesn't exist (skip if already done)
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS username TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS email TEXT;

-- Update the trigger function to handle username and email
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, name, username, email, role, status)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', 'User'),
    COALESCE(NEW.raw_user_meta_data->>'username', NEW.email),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'role', 'employee'),
    COALESCE(NEW.raw_user_meta_data->>'status', 'active')
  )
  ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    username = EXCLUDED.username,
    email = EXCLUDED.email,
    role = EXCLUDED.role,
    status = EXCLUDED.status;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### **Step 2: Assign Username to Your Admin Account**

Run this SQL to add a username to your existing admin account:

```sql
-- Find your admin user ID first
SELECT 
  au.id,
  au.email,
  p.name,
  p.role,
  p.username
FROM auth.users au
LEFT JOIN public.profiles p ON au.id = p.id
WHERE au.email = 'biztarasolutions@gmail.com';
```

### **Step 3: Update Your Admin Profile with Username**

Choose a username (e.g., 'admin', 'biztara', 'fashionadmin') and run:

```sql
-- Update your admin account with a username
-- Replace 'admin' with your preferred username
UPDATE public.profiles 
SET 
  username = 'admin',
  email = 'biztarasolutions@gmail.com'
WHERE id = (
  SELECT id FROM auth.users 
  WHERE email = 'biztarasolutions@gmail.com'
);
```

### **Step 4: Verify the Update**

```sql
-- Verify your username was assigned correctly
SELECT 
  au.id,
  au.email,
  p.name,
  p.username,
  p.role,
  p.status
FROM auth.users au
JOIN public.profiles p ON au.id = p.id
WHERE au.email = 'biztarasolutions@gmail.com';
```

### **Step 5: Test Login with Username**

After assigning the username, you can now login using:
- **Username**: `admin` (or whatever you chose)
- **Password**: Your current password

## 🚀 **Quick Setup Commands**

Copy and paste these commands in your Supabase SQL Editor:

```sql
-- 1. Update schema (if needed)
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS username TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS email TEXT;

-- 2. Assign username to your admin account
UPDATE public.profiles 
SET 
  username = 'admin',
  email = 'biztarasolutions@gmail.com'
WHERE id = (
  SELECT id FROM auth.users 
  WHERE email = 'biztarasolutions@gmail.com'
);

-- 3. Verify the assignment
SELECT 
  au.email,
  p.username,
  p.role
FROM auth.users au
JOIN public.profiles p ON au.id = p.id
WHERE au.email = 'biztarasolutions@gmail.com';
```

## 🔧 **Alternative Usernames**

If 'admin' is already taken, try these alternatives:

```sql
-- Option 1: Use your business name
UPDATE public.profiles 
SET username = 'biztara'
WHERE id = (SELECT id FROM auth.users WHERE email = 'biztarasolutions@gmail.com');

-- Option 2: Use fashion-related username
UPDATE public.profiles 
SET username = 'fashionadmin'
WHERE id = (SELECT id FROM auth.users WHERE email = 'biztarasolutions@gmail.com');

-- Option 3: Use your initials + admin
UPDATE public.profiles 
SET username = 'bsadmin'
WHERE id = (SELECT id FROM auth.users WHERE email = 'biztarasolutions@gmail.com');
```

## 📱 **After Setup**

Once you've assigned the username:

1. **Login URL**: Use the same login page
2. **Username**: Enter your chosen username (e.g., 'admin')
3. **Password**: Use your existing password
4. **Access**: Full admin panel access as before

## ⚠️ **Important Notes**

- **Unique Constraint**: Each username must be unique across all users
- **Case Sensitive**: Usernames are case-sensitive
- **No Spaces**: Use underscores or hyphens instead of spaces
- **Keep Email**: Your email remains the same for account recovery

## 🆘 **Troubleshooting**

### Error: "Username already exists"
```sql
-- Check if username is taken
SELECT username FROM public.profiles WHERE username = 'admin';

-- Use a different username
UPDATE public.profiles 
SET username = 'fashionadmin' -- Try this instead
WHERE id = (SELECT id FROM auth.users WHERE email = 'biztarasolutions@gmail.com');
```

### Error: "Column username does not exist"
```sql
-- Add the username column first
ALTER TABLE public.profiles ADD COLUMN username TEXT UNIQUE;
ALTER TABLE public.profiles ADD COLUMN email TEXT;
```

## ✅ **Success Verification**

You'll know it worked when:
1. ✅ SQL query returns your username
2. ✅ Login page accepts your username + password  
3. ✅ Admin panel loads correctly
4. ✅ User greeting shows your name/username

Need help with any step? Let me know! 🚀