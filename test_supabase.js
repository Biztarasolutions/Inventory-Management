import { supabase } from './src/supabaseClient.js';

// Test Supabase Connection and Setup
// Run this in browser console after setup

async function testSupabaseSetup() {
  console.log('🔍 Testing Supabase Setup...\n');

  // 1. Test connection
  console.log('1. Testing connection...');
  try {
    const { data, error } = await supabase.from('profiles').select('count');
    if (error) {
      console.error('❌ Connection failed:', error.message);
    } else {
      console.log('✅ Connection successful');
    }
  } catch (e) {
    console.error('❌ Connection error:', e.message);
  }

  // 2. Test admin user exists
  console.log('\n2. Checking admin user...');
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('role', 'admin')
      .single();
    
    if (error) {
      console.error('❌ No admin user found:', error.message);
      console.log('💡 Create admin user in Supabase dashboard');
    } else {
      console.log('✅ Admin user found:', data.name, `(${data.role})`);
    }
  } catch (e) {
    console.error('❌ Admin check error:', e.message);
  }

  // 3. Test authentication
  console.log('\n3. Testing current session...');
  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (session) {
      console.log('✅ User logged in:', session.user.email);
      console.log('   User role:', session.user.user_metadata?.role || 'Not set');
    } else {
      console.log('ℹ️  No active session (not logged in)');
    }
  } catch (e) {
    console.error('❌ Session error:', e.message);
  }

  // 4. Test RLS policies
  console.log('\n4. Testing database policies...');
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, name, role, status');
    
    if (error) {
      console.error('❌ RLS policy error:', error.message);
    } else {
      console.log(`✅ Can access ${data.length} profiles`);
    }
  } catch (e) {
    console.error('❌ Policy test error:', e.message);
  }

  console.log('\n🎯 Test complete!');
  console.log('\nIf all tests pass, your setup is ready!');
  console.log('If not, follow the SETUP_GUIDE.md instructions.');
}

// Auto-run test
testSupabaseSetup();

// Export for manual use
window.testSupabase = testSupabaseSetup;