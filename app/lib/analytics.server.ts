import { db } from "./db.server";
import { nanoid } from "nanoid";

/**
 * Tracks analytics for a URL click
 * @param request The request object
 * @param urlId The ID of the URL being accessed
 */
export async function trackAnalytics(request: Request, urlId: string): Promise<void> {
  try {
    const id = nanoid();
    const timestamp = Date.now();
    
    // Extract information from request
    const userAgent = request.headers.get("user-agent") || "";
    const referer = request.headers.get("referer") || "";
    
    // Get IP address (in a real app, you'd use request.ip or similar)
    const ip = "127.0.0.1"; // Placeholder
    
    // Parse user agent to get browser, OS, device info
    const browserInfo = parseUserAgent(userAgent);
    
    // Insert analytics data
    await db.execute({
      sql: `INSERT INTO analytics 
            (id, url_id, visitor_ip, user_agent, referrer, browser, os, device, timestamp) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        id,
        urlId,
        ip,
        userAgent,
        referer,
        browserInfo.browser,
        browserInfo.os,
        browserInfo.device,
        timestamp,
      ],
    });
  } catch (error) {
    console.error("Error tracking analytics:", error);
  }
}

/**
 * Simple user agent parser
 * In a production app, you'd use a proper user-agent parsing library
 */
function parseUserAgent(userAgent: string): { browser: string; os: string; device: string } {
  let browser = "Unknown";
  let os = "Unknown";
  let device = "Desktop";
  
  // Very basic detection - in a real app use a proper library
  if (userAgent.includes("Firefox")) {
    browser = "Firefox";
  } else if (userAgent.includes("Chrome")) {
    browser = "Chrome";
  } else if (userAgent.includes("Safari")) {
    browser = "Safari";
  } else if (userAgent.includes("Edge")) {
    browser = "Edge";
  } else if (userAgent.includes("MSIE") || userAgent.includes("Trident/")) {
    browser = "Internet Explorer";
  }
  
  if (userAgent.includes("Windows")) {
    os = "Windows";
  } else if (userAgent.includes("Mac OS")) {
    os = "macOS";
  } else if (userAgent.includes("Linux")) {
    os = "Linux";
  } else if (userAgent.includes("Android")) {
    os = "Android";
    device = "Mobile";
  } else if (userAgent.includes("iPhone") || userAgent.includes("iPad")) {
    os = "iOS";
    device = userAgent.includes("iPad") ? "Tablet" : "Mobile";
  }
  
  return { browser, os, device };
}

/**
 * Get analytics data for a specific URL
 */
export async function getUrlAnalytics(urlId: string) {
  try {
    // Get total clicks
    const clicksResult = await db.execute({
      sql: "SELECT COUNT(*) as count FROM analytics WHERE url_id = ?",
      args: [urlId],
    });
    const totalClicks = clicksResult.rows[0]?.count || 0;
    
    // Get browser stats
    const browserStats = await db.execute({
      sql: `SELECT browser, COUNT(*) as count 
            FROM analytics 
            WHERE url_id = ? 
            GROUP BY browser 
            ORDER BY count DESC`,
      args: [urlId],
    });
    
    // Get OS stats
    const osStats = await db.execute({
      sql: `SELECT os, COUNT(*) as count 
            FROM analytics 
            WHERE url_id = ? 
            GROUP BY os 
            ORDER BY count DESC`,
      args: [urlId],
    });
    
    // Get device stats
    const deviceStats = await db.execute({
      sql: `SELECT device, COUNT(*) as count 
            FROM analytics 
            WHERE url_id = ? 
            GROUP BY device 
            ORDER BY count DESC`,
      args: [urlId],
    });
    
    // Get referrer stats
    const referrerStats = await db.execute({
      sql: `SELECT referrer, COUNT(*) as count 
            FROM analytics 
            WHERE url_id = ? AND referrer != '' 
            GROUP BY referrer 
            ORDER BY count DESC 
            LIMIT 10`,
      args: [urlId],
    });
    
    // Get clicks over time (last 30 days)
    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
    const clicksOverTime = await db.execute({
      sql: `SELECT DATE(timestamp/1000, 'unixepoch') as date, COUNT(*) as count 
            FROM analytics 
            WHERE url_id = ? AND timestamp > ? 
            GROUP BY date 
            ORDER BY date`,
      args: [urlId, thirtyDaysAgo],
    });
    
    return {
      totalClicks,
      browserStats: browserStats.rows,
      osStats: osStats.rows,
      deviceStats: deviceStats.rows,
      referrerStats: referrerStats.rows,
      clicksOverTime: clicksOverTime.rows,
    };
  } catch (error) {
    console.error("Error getting URL analytics:", error);
    return null;
  }
}
