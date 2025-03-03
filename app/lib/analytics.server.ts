import { db } from "./db.server";
import { nanoid } from "nanoid";

// Record a visit to a shortened URL
export async function recordVisit(
  urlId: string,
  requestInfo: {
    ip?: string;
    userAgent?: string;
    referrer?: string;
    country?: string;
    city?: string;
    browser?: string;
    os?: string;
    device?: string;
  }
) {
  const id = nanoid();
  const timestamp = Date.now();
  
  try {
    await db.execute({
      sql: `
        INSERT INTO analytics (
          id, url_id, visitor_ip, user_agent, referrer, 
          country, city, browser, os, device, timestamp
        ) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      args: [
        id,
        urlId,
        requestInfo.ip || null,
        requestInfo.userAgent || null,
        requestInfo.referrer || null,
        requestInfo.country || null,
        requestInfo.city || null,
        requestInfo.browser || null,
        requestInfo.os || null,
        requestInfo.device || null,
        timestamp,
      ],
    });
    
    return true;
  } catch (error) {
    console.error("Error recording visit:", error);
    return false;
  }
}

// Get analytics for a URL
export async function getAnalytics(urlId: string) {
  try {
    const result = await db.execute({
      sql: "SELECT * FROM analytics WHERE url_id = ? ORDER BY timestamp DESC",
      args: [urlId],
    });
    
    return result.rows as AnalyticsInfo[];
  } catch (error) {
    console.error("Error getting analytics:", error);
    return [];
  }
}

// Get analytics summary for a URL
export async function getAnalyticsSummary(urlId: string) {
  try {
    // Total visits
    const totalVisits = await db.execute({
      sql: "SELECT COUNT(*) as count FROM analytics WHERE url_id = ?",
      args: [urlId],
    });
    
    // Unique visitors (by IP)
    const uniqueVisitors = await db.execute({
      sql: "SELECT COUNT(DISTINCT visitor_ip) as count FROM analytics WHERE url_id = ?",
      args: [urlId],
    });
    
    // Referrers
    const referrers = await db.execute({
      sql: `
        SELECT referrer, COUNT(*) as count 
        FROM analytics 
        WHERE url_id = ? AND referrer IS NOT NULL 
        GROUP BY referrer 
        ORDER BY count DESC
      `,
      args: [urlId],
    });
    
    // Browsers
    const browsers = await db.execute({
      sql: `
        SELECT browser, COUNT(*) as count 
        FROM analytics 
        WHERE url_id = ? AND browser IS NOT NULL 
        GROUP BY browser 
        ORDER BY count DESC
      `,
      args: [urlId],
    });
    
    // Countries
    const countries = await db.execute({
      sql: `
        SELECT country, COUNT(*) as count 
        FROM analytics 
        WHERE url_id = ? AND country IS NOT NULL 
        GROUP BY country 
        ORDER BY count DESC
      `,
      args: [urlId],
    });
    
    // Visits over time (last 7 days)
    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const visitsOverTime = await db.execute({
      sql: `
        SELECT 
          CAST(timestamp / 86400000 AS INTEGER) * 86400000 as day,
          COUNT(*) as count 
        FROM analytics 
        WHERE url_id = ? AND timestamp > ? 
        GROUP BY day 
        ORDER BY day
      `,
      args: [urlId, sevenDaysAgo],
    });
    
    return {
      totalVisits: totalVisits.rows[0]?.count || 0,
      uniqueVisitors: uniqueVisitors.rows[0]?.count || 0,
      referrers: referrers.rows as { referrer: string; count: number }[],
      browsers: browsers.rows as { browser: string; count: number }[],
      countries: countries.rows as { country: string; count: number }[],
      visitsOverTime: visitsOverTime.rows as { day: number; count: number }[],
    };
  } catch (error) {
    console.error("Error getting analytics summary:", error);
    return {
      totalVisits: 0,
      uniqueVisitors: 0,
      referrers: [],
      browsers: [],
      countries: [],
      visitsOverTime: [],
    };
  }
}

// Get user agent info
export function parseUserAgent(userAgent: string | null) {
  if (!userAgent) return { browser: "Unknown", os: "Unknown", device: "Unknown" };
  
  // This is a very simple parser - in production you'd use a proper library
  const browser = userAgent.includes("Chrome")
    ? "Chrome"
    : userAgent.includes("Firefox")
    ? "Firefox"
    : userAgent.includes("Safari")
    ? "Safari"
    : userAgent.includes("Edge")
    ? "Edge"
    : "Other";
    
  const os = userAgent.includes("Windows")
    ? "Windows"
    : userAgent.includes("Mac")
    ? "MacOS"
    : userAgent.includes("Linux")
    ? "Linux"
    : userAgent.includes("Android")
    ? "Android"
    : userAgent.includes("iOS")
    ? "iOS"
    : "Other";
    
  const device = userAgent.includes("Mobile")
    ? "Mobile"
    : userAgent.includes("Tablet")
    ? "Tablet"
    : "Desktop";
    
  return { browser, os, device };
}

// Types
export interface AnalyticsInfo {
  id: string;
  url_id: string;
  visitor_ip: string | null;
  user_agent: string | null;
  referrer: string | null;
  country: string | null;
  city: string | null;
  browser: string | null;
  os: string | null;
  device: string | null;
  timestamp: number;
}
