-- Create Default Admin User
-- Run this AFTER running the schema setup

-- Method 1: Create admin user (if you haven't created one yet)
-- You'll need to run this in the Supabase dashboard or use the Auth API

-- The admin user should be created with these details:
-- Email: admin@fashionboutique.com
-- Password: Admin123!
-- User Metadata: 
-- {
--   "name": "System Administrator",
--   "role": "admin", 
--   "status": "active"
-- }

-- Method 2: Update existing user to admin (if you already have a user)
-- Replace 'your-user-email@example.com' with your actual email

-- First, get the user ID
SELECT id, email FROM auth.users WHERE email = 'your-user-email@example.com';

-- Then update their profile to admin (replace the UUID with actual user ID)
-- UPDATE public.profiles 
-- SET role = 'admin', name = 'System Administrator' 
-- WHERE id = 'YOUR-USER-ID-HERE';

-- Method 3: Verify admin user exists
SELECT 
  u.id,
  u.email,
  u.email_confirmed_at,
  p.name,
  p.role,
  p.status,
  p.created_at
FROM auth.users u
LEFT JOIN public.profiles p ON u.id = p.id
WHERE p.role = 'admin';

-- If you see a result, your admin user is ready!
-- If no results, you need to create an admin user first.