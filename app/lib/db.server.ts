import { createClient } from "@libsql/client";

const dbUrl = process.env.DATABASE_URL || "file:./data.db";
const dbAuthToken = process.env.DATABASE_AUTH_TOKEN;

export const db = createClient({
  url: dbUrl,
  authToken: dbAuthToken,
});

// Initialize database tables if they don't exist
export async function initDb() {
  await db.execute(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      name TEXT,
      role TEXT NOT NULL DEFAULT 'user',
      created_at INTEGER NOT NULL
    )
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS urls (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      original_url TEXT NOT NULL,
      short_code TEXT UNIQUE NOT NULL,
      title TEXT,
      created_at INTEGER NOT NULL,
      expires_at INTEGER,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS analytics (
      id TEXT PRIMARY KEY,
      url_id TEXT NOT NULL,
      visitor_ip TEXT,
      user_agent TEXT,
      referrer TEXT,
      country TEXT,
      city TEXT,
      browser TEXT,
      os TEXT,
      device TEXT,
      timestamp INTEGER NOT NULL,
      FOREIGN KEY (url_id) REFERENCES urls(id)
    )
  `);
}
