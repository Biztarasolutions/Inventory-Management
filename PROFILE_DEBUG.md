# Fix Username and Email Not Saving in Profiles

## 🔍 **Step 1: Check Database Setup**

Run these queries in Supabase SQL Editor to diagnose the issue:

### Check Profiles Table Structure:
```sql
-- Check if profiles table has username and email columns
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'profiles' 
AND column_name IN ('username', 'email', 'id', 'name', 'role', 'status');
```

### Check Current Profiles Data:
```sql
-- See what's currently in profiles table
SELECT id, username, email, name, role, status, created_at 
FROM public.profiles 
ORDER BY created_at DESC 
LIMIT 5;
```

### Check RLS Policies:
```sql
-- Check if RLS policies are blocking inserts
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'profiles';
```

## 🛠️ **Step 2: Fix RLS Permissions (Most Common Issue)**

If the above shows restrictive policies, run this fix:

```sql
-- Temporarily disable RLS to allow profile creation
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;

-- Grant necessary permissions
GRANT ALL ON public.profiles TO anon, authenticated, service_role;

-- Re-enable RLS with permissive policy
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create a simple policy that allows everything
DROP POLICY IF EXISTS "Allow all access to profiles" ON public.profiles;
CREATE POLICY "Allow all access to profiles" ON public.profiles
FOR ALL USING (true) WITH CHECK (true);
```

## 🛠️ **Step 3: Test Direct Profile Creation**

Test if you can create profiles manually:

```sql
-- Test direct profile insertion
INSERT INTO public.profiles (id, username, email, name, role, status, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'test_user_manual',
  'test_manual@example.com',
  'Test Manual User',
  'employee',
  'active',
  NOW(),
  NOW()
);

-- Check if it worked
SELECT * FROM public.profiles WHERE username = 'test_user_manual';

-- Clean up test data
DELETE FROM public.profiles WHERE username = 'test_user_manual';
```

## 🛠️ **Step 4: Check/Fix Trigger Function**

If you have a trigger that creates profiles automatically, it might be interfering:

```sql
-- Check existing triggers
SELECT trigger_name, event_manipulation, action_statement, action_timing
FROM information_schema.triggers 
WHERE trigger_name LIKE '%user%' OR trigger_name LIKE '%profile%';

-- If you have a handle_new_user trigger, make sure it doesn't conflict
-- You might need to drop it temporarily:
-- DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
-- DROP FUNCTION IF EXISTS public.handle_new_user();
```

## 🎯 **Step 5: Test User Creation**

After running the fixes above:

1. **Open your app** and go to Admin Panel → Create User
2. **Open browser console** (F12) and watch for these messages:
   ```
   ✅ User created in auth: [user-id]
   📝 Creating profile with data: {...}
   📊 Profile creation result: {...}
   ✅ Final profile verification: {...}
   ```
3. **Try creating a user** and see what the console shows
4. **Check "Assigned Users" tab** - username and email should appear

## 🚨 **Expected Console Output (Success):**

```
✅ User created in auth: 12345678-1234-1234-1234-123456789abc
📝 Creating profile with data: {id: "...", username: "testuser", email: "test@example.com", ...}
📊 Profile creation result: {profileData: [...], profileError: null}
✅ Final profile verification: {id: "...", username: "testuser", email: "test@example.com", ...}
```

## 🚨 **If Still Failing:**

If you see errors like:
- `❌ Profile creation failed: [error details]`
- `🔄 Trying to update existing profile...`

Then share the exact error message from the console and I'll help fix it!

## 🎯 **Quick Test Command:**

Run this in browser console after trying to create a user:

```javascript
// Check if profiles table is accessible
const testProfiles = async () => {
  const { data, error } = await window.supabase.from('profiles').select('*').limit(5);
  console.log('Profiles test:', { data, error });
};
testProfiles();
```