import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://kgozddcutazpqmfbzafa.supabase.co';
const supabaseAnonKey =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imtnb3pkZGN1dGF6cHFtZmJ6YWZhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMzOTMxOTYsImV4cCI6MjA4ODk2OTE5Nn0.aTi5ZXQi5zSTGb-xQyotF07Tcur5yizux3J8oNejRfE';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

export default supabase;
