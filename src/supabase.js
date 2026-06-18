import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://nzfpgkloqwjrsbvdegsx.supabase.co";

const supabaseAnonKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im56ZnBna2xvcXdqcnNidmRlZ3N4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE3NTExMjAsImV4cCI6MjA5NzMyNzEyMH0.8WnshqYLrA5QfSai7DxLpTrnKY5NkzmfYkBotiZuzBM";

export const supabase = createClient(
  supabaseUrl,
  supabaseAnonKey
);

export default supabase;