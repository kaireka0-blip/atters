import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const env = fs.readFileSync(path.resolve('.env'), 'utf8');
const supabaseUrlMatch = env.match(/VITE_SUPABASE_URL=(.*)/);
const supabaseKeyMatch = env.match(/VITE_SUPABASE_ANON_KEY=(.*)/);

if (!supabaseUrlMatch || !supabaseKeyMatch) {
  console.error("Missing env vars");
  process.exit(1);
}

const supabase = createClient(supabaseUrlMatch[1].trim(), supabaseKeyMatch[1].trim());

const adminEmail = 'atter@admin.com';
const adminPassword = process.env.ATTERA_ADMIN_PASSWORD;
if (!adminPassword) {
  throw new Error('Set ATTERA_ADMIN_PASSWORD before running this helper.');
}

async function run() {
  console.log("Signing in...");
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: adminEmail,
    password: adminPassword
  });

  if (authError || !authData.user) {
    console.error("Auth Error:", authError);
    return;
  }

  console.log("Signed in. User ID:", authData.user.id);

  console.log("Inserting into users table...");
  const { data, error } = await supabase
    .from('users')
    .upsert({
      id: authData.user.id,
      email: adminEmail,
      full_name: 'Admin Vena',
      role: 'Admin',
      permissions: []
    })
    .select();

  if (error) {
    console.error("Insert Error:", error);
  } else {
    console.log("Success:", data);
  }
}

run();
