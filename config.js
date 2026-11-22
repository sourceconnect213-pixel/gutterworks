// Supabase connection for the website and the admin app.
// The "anon / publishable" key is safe to publish — the database rules
// (supabase/setup.sql) only let the public READ site content and SEND requests.
window.AD_CONFIG = {
  SUPABASE_URL: "",   // e.g. https://abcdefgh.supabase.co
  SUPABASE_KEY: ""    // anon / publishable key
};
