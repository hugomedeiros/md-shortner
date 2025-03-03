import { json, redirect } from "@remix-run/node";
import type { LoaderFunctionArgs } from "@remix-run/node";
import { db } from "~/lib/db.server";
import { nanoid } from "nanoid";
import { trackAnalytics } from "~/lib/analytics.server";

export async function loader({ request, params }: LoaderFunctionArgs) {
  const shortCode = params.shortCode;
  
  if (!shortCode) {
    return redirect("/");
  }
  
  try {
    // Find the URL by short code
    const urlResult = await db.execute({
      sql: "SELECT id, original_url FROM urls WHERE short_code = ?",
      args: [shortCode],
    });
    
    if (urlResult.rows.length === 0) {
      return redirect("/");
    }
    
    const url = urlResult.rows[0];
    
    // Track analytics asynchronously
    trackAnalytics(request, url.id).catch(console.error);
    
    // Redirect to the original URL
    return redirect(url.original_url);
  } catch (error) {
    console.error("Error redirecting short URL:", error);
    return redirect("/");
  }
}
