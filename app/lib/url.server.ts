import { db } from "./db.server";
import { nanoid } from "nanoid";
import { UserInfo } from "./auth.server";

// Generate a short code
export function generateShortCode(length = 6) {
  return nanoid(length);
}

// Create a new shortened URL
export async function createUrl(
  originalUrl: string,
  userId: string,
  title?: string,
  expiresAt?: number
) {
  const id = nanoid();
  const shortCode = generateShortCode();
  
  try {
    await db.execute({
      sql: "INSERT INTO urls (id, user_id, original_url, short_code, title, created_at, expires_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
      args: [id, userId, originalUrl, shortCode, title || null, Date.now(), expiresAt || null],
    });
    
    return {
      id,
      userId,
      originalUrl,
      shortCode,
      title,
      createdAt: Date.now(),
      expiresAt,
    };
  } catch (error) {
    console.error("Error creating URL:", error);
    return null;
  }
}

// Get URL by short code
export async function getUrlByShortCode(shortCode: string) {
  try {
    const result = await db.execute({
      sql: "SELECT * FROM urls WHERE short_code = ?",
      args: [shortCode],
    });
    
    if (result.rows.length === 0) {
      return null;
    }
    
    return result.rows[0] as UrlInfo;
  } catch (error) {
    console.error("Error getting URL:", error);
    return null;
  }
}

// Get URLs by user
export async function getUrlsByUser(userId: string) {
  try {
    const result = await db.execute({
      sql: "SELECT * FROM urls WHERE user_id = ? ORDER BY created_at DESC",
      args: [userId],
    });
    
    return result.rows as UrlInfo[];
  } catch (error) {
    console.error("Error getting URLs:", error);
    return [];
  }
}

// Delete URL
export async function deleteUrl(id: string, userId: string) {
  try {
    // First delete all analytics for this URL
    await db.execute({
      sql: "DELETE FROM analytics WHERE url_id = ?",
      args: [id],
    });
    
    // Then delete the URL
    const result = await db.execute({
      sql: "DELETE FROM urls WHERE id = ? AND user_id = ?",
      args: [id, userId],
    });
    
    return result.rowsAffected > 0;
  } catch (error) {
    console.error("Error deleting URL:", error);
    return false;
  }
}

// Update URL
export async function updateUrl(
  id: string,
  userId: string,
  data: { title?: string; expiresAt?: number | null }
) {
  try {
    const result = await db.execute({
      sql: "UPDATE urls SET title = ?, expires_at = ? WHERE id = ? AND user_id = ?",
      args: [data.title || null, data.expiresAt || null, id, userId],
    });
    
    return result.rowsAffected > 0;
  } catch (error) {
    console.error("Error updating URL:", error);
    return false;
  }
}

// Get all URLs (admin only)
export async function getAllUrls() {
  try {
    const result = await db.execute({
      sql: `
        SELECT urls.*, users.email as user_email, users.name as user_name
        FROM urls
        JOIN users ON urls.user_id = users.id
        ORDER BY urls.created_at DESC
      `,
    });
    
    return result.rows as (UrlInfo & { user_email: string; user_name: string | null })[];
  } catch (error) {
    console.error("Error getting all URLs:", error);
    return [];
  }
}

// Types
export interface UrlInfo {
  id: string;
  user_id: string;
  original_url: string;
  short_code: string;
  title: string | null;
  created_at: number;
  expires_at: number | null;
}
