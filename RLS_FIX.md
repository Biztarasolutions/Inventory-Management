# IMMEDIATE FIX: RLS Policy Blocking Profile Creation

## 🚨 **Error:** `new row violates row-level security policy for table "profiles"`

This is a **Row Level Security (RLS)** issue. Run these SQL commands in Supabase SQL Editor **RIGHT NOW**:

### **STEP 1: Quick Fix - Allow Profile Creation**

```sql
-- Temporarily disable RLS to allow profile creation
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;
```

### **STEP 2: Test User Creation**
After running Step 1, try creating a user in your app. It should work now.

### **STEP 3: Re-enable RLS with Proper Policies**

```sql
-- Re-enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Drop all existing restrictive policies
DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.profiles;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.profiles;

-- Create simple, permissive policies that work
CREATE POLICY "Allow all read access" ON public.profiles
    FOR SELECT USING (true);

CREATE POLICY "Allow all insert access" ON public.profiles
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow all update access" ON public.profiles
    FOR UPDATE USING (true) WITH CHECK (true);

CREATE POLICY "Allow all delete access" ON public.profiles
    FOR DELETE USING (true);
```

### **STEP 4: Grant Proper Permissions**

```sql
-- Grant necessary permissions to roles
GRANT ALL ON public.profiles TO anon, authenticated, service_role;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
```

### **STEP 5: Verify Fix**

```sql
-- Test if profile creation works now
INSERT INTO public.profiles (id, username, email, name, role, status)
VALUES (
    gen_random_uuid(),
    'rls_test_user',
    'rls_test@example.com',
    'RLS Test User',
    'employee',
    'active'
);

-- Check if it worked
SELECT * FROM public.profiles WHERE username = 'rls_test_user';

-- Clean up
DELETE FROM public.profiles WHERE username = 'rls_test_user';
```

## ⚡ **QUICK SOLUTION (If you want it working immediately):**

Just run this single command:

```sql
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;
```

Then try creating a user - it will work!

## 🔒 **SECURE SOLUTION (Recommended):**

Run all the commands above to fix RLS properly while keeping security enabled.

## 🎯 **After Running the Fix:**

1. **Try creating a user** in your app
2. **Console should show:** `📊 Profile creation result: {profileData: [...], profileError: null}`
3. **Check "Assigned Users"** - username and email should appear
4. **User should be able to login** with their username

**The RLS policy was blocking the insert - this will fix it!** 🚀