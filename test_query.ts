import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://sfapdavtrpleeugbecln.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNmYXBkYXZ0cnBsZWV1Z2JlY2xuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQzNzM2OTUsImV4cCI6MjA4OTk0OTY5NX0.AYFNqewVZWy2U7gm3R2WFGQXF3F1Y_b5yKHkSGvywDI';
const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  const { data, error } = await supabase
    .from('processes')
    .select('id, number, clients!inner(name)')
    .or('number.ilike.%123%,clients.name.ilike.%123%')
    .limit(5);
  console.log(error ? error : 'Success: ' + data?.length);
}
test();
