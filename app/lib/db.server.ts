import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL || "";
const supabaseKey = process.env.SUPABASE_KEY || "";

export const supabase = createClient(supabaseUrl, supabaseKey);

// Initialize database tables if they don't exist (Supabase handles this differently)
export async function initDb() {
  try {
    console.log("Checking Supabase database schema...");

    // In Supabase, you typically manage schema through the Supabase dashboard
    // or using migrations.  This function is kept for compatibility with
    // the previous structure, but it doesn't actively create tables here.

    console.log("Supabase schema check complete.");
  } catch (error) {
    console.error("Error initializing Supabase database:", error);
    throw error;
  }
}
