import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || 'https://glcqkfikztijfdbmlkvc.supabase.co';
const supabaseKey = process.env.REACT_APP_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdsY3FrZmlrenRpamZkYm1sa3ZjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcwMDM5ODksImV4cCI6MjA3MjU3OTk4OX0.xgk3YfGkIjiOdLw9_iFO9_KtaOeaz8lLx_WBbrIfXzY';

export const supabase = createClient(supabaseUrl, supabaseKey);
