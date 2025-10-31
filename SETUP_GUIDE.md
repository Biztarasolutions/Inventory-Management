# 🎯 Supabase Setup Instructions

## Step-by-Step Setup Process

### 1. **Access Your Supabase Dashboard**
1. Go to [https://app.supabase.com](https://app.supabase.com)
2. Login to your account
3. Select your project: `glcqkfikztijfdbmlkvc`

### 2. **Set Up Database Schema**
1. In your Supabase dashboard, go to **SQL Editor**
2. Create a new query
3. Copy and paste the contents from `supabase_schema.sql`
4. Click **Run** to execute the schema
5. You should see: "Database schema created successfully!"

### 3. **Create Admin User**

#### Option A: Create New Admin User (Recommended)
1. Go to **Authentication → Users**
2. Click **Add User** button
3. Fill in the details:
   - **Email**: `admin@fashionboutique.com`
   - **Password**: `Admin123!`
   - **Confirm Password**: `Admin123!`
   - **Auto Confirm User**: ✅ (check this)
4. Click **Create User**
5. Find the user in the list and click on them
6. Go to **Raw User Meta Data** tab
7. Add this JSON:
   ```json
   {
     "name": "System Administrator",
     "role": "admin",
     "status": "active"
   }
   ```
8. Click **Save**

#### Option B: Make Your Existing User Admin
If you already have a user account:
1. Go to **SQL Editor**
2. Use the queries in `create_admin.sql`
3. Replace `your-user-email@example.com` with your email
4. Run the update query to make yourself admin

### 4. **Configure Authentication Settings**
1. Go to **Settings → Authentication**
2. **Site URL**: `http://localhost:3000`
3. **Redirect URLs**: Add these:
   ```
   http://localhost:3000
   http://localhost:3000/auth/callback
   ```
4. **Email Auth**: Make sure it's enabled
5. **Confirm Email**: You can disable this for testing, enable for production

### 5. **Test Your Setup**

#### Check Database
1. Go to **Table Editor → profiles**
2. You should see your admin user with role "admin"

#### Test Authentication
1. Open your React app: http://localhost:3000
2. Click **Login**
3. Use admin credentials:
   - Email: `admin@fashionboutique.com`
   - Password: `Admin123!`
4. You should see "Welcome, System Administrator!" 
5. Admin Panel should be accessible in navigation

### 6. **Verify Everything Works**

Run this quick test:
- [ ] Database tables created (check Table Editor)
- [ ] Admin user exists in Authentication → Users
- [ ] Admin user has correct metadata (role: admin)
- [ ] Profile created in profiles table
- [ ] Login works in React app
- [ ] Admin Panel is accessible
- [ ] Send Invites feature works

### 7. **Troubleshooting**

#### "Login failed" error:
- Check if user email is confirmed
- Verify password is correct
- Check user metadata has role: "admin"

#### "Admin Panel not accessible":
- Ensure user role is "admin" in user_metadata
- Check profiles table has role "admin"
- Verify RLS policies are working

#### "Database connection error":
- Check Supabase URL and key in supabaseClient.js
- Verify project is active and not paused

### 8. **Email Configuration (Optional)**

#### For Production (Custom SMTP):
1. **Settings → Authentication → SMTP Settings**
2. Configure Gmail SMTP:
   - Host: `smtp.gmail.com`
   - Port: `587`
   - Username: Your Gmail
   - Password: Gmail App Password
   - Sender Name: `Fashion Boutique`

#### For Development:
Supabase's built-in email works fine for testing.

## 🎉 Success Indicators

When setup is complete, you should have:
- ✅ Admin user can login
- ✅ Admin Panel accessible
- ✅ User invitation system works
- ✅ Role-based navigation functions
- ✅ Database queries work properly

## 🚀 Next Steps

Once Supabase is configured:
1. **Test user creation** via Admin Panel
2. **Invite team members** with different roles
3. **Configure production settings** when ready to deploy

## 📞 Need Help?

If you encounter issues:
1. Check the browser console for errors
2. Verify Supabase dashboard shows no errors
3. Test database queries in SQL Editor
4. Check authentication logs in Supabase

Your Fashion Boutique authentication system will be fully functional once these steps are complete! 🎯