import { json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import type { LoaderFunctionArgs } from "@remix-run/node";
import { requireUser } from "~/lib/auth.server";
import { db } from "~/lib/db.server";

export async function loader({ request }: LoaderFunctionArgs) {
  const user = await requireUser(request);
  
  // Get total links count
  const linksResult = await db.execute({
    sql: "SELECT COUNT(*) as count FROM urls WHERE user_id = ?",
    args: [user.id],
  });
  const totalLinks = linksResult.rows[0]?.count || 0;
  
  // Get total clicks count
  const clicksResult = await db.execute({
    sql: `SELECT COUNT(*) as count FROM analytics 
          WHERE url_id IN (SELECT id FROM urls WHERE user_id = ?)`,
    args: [user.id],
  });
  const totalClicks = clicksResult.rows[0]?.count || 0;
  
  // Get recent links
  const recentLinks = await db.execute({
    sql: `SELECT id, original_url, short_code, title, created_at 
          FROM urls 
          WHERE user_id = ? 
          ORDER BY created_at DESC 
          LIMIT 5`,
    args: [user.id],
  });
  
  return json({
    totalLinks,
    totalClicks,
    recentLinks: recentLinks.rows,
  });
}

export default function DashboardIndex() {
  const { totalLinks, totalClicks, recentLinks } = useLoaderData<typeof loader>();
  
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Overview of your shortened URLs and analytics
        </p>
      </div>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-lg border bg-card p-6 shadow-sm">
          <div className="flex items-center gap-2">
            <LinkIcon className="h-5 w-5 text-primary" />
            <h3 className="font-medium">Total Links</h3>
          </div>
          <div className="mt-3">
            <p className="text-3xl font-bold">{totalLinks}</p>
          </div>
        </div>
        
        <div className="rounded-lg border bg-card p-6 shadow-sm">
          <div className="flex items-center gap-2">
            <ClickIcon className="h-5 w-5 text-primary" />
            <h3 className="font-medium">Total Clicks</h3>
          </div>
          <div className="mt-3">
            <p className="text-3xl font-bold">{totalClicks}</p>
          </div>
        </div>
        
        <div className="rounded-lg border bg-card p-6 shadow-sm">
          <div className="flex items-center gap-2">
            <TrendingUpIcon className="h-5 w-5 text-primary" />
            <h3 className="font-medium">Click Rate</h3>
          </div>
          <div className="mt-3">
            <p className="text-3xl font-bold">
              {totalLinks > 0 ? Math.round((totalClicks / totalLinks) * 10) / 10 : 0}
            </p>
            <p className="text-sm text-muted-foreground">Clicks per link</p>
          </div>
        </div>
      </div>
      
      <div className="rounded-lg border shadow-sm">
        <div className="p-6">
          <h3 className="text-lg font-medium">Recent Links</h3>
        </div>
        <div className="border-t">
          {recentLinks.length > 0 ? (
            <div className="divide-y">
              {recentLinks.map((link: any) => (
                <div key={link.id} className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{link.title || 'Untitled Link'}</p>
                      <p className="text-sm text-muted-foreground truncate max-w-md">
                        {link.original_url}
                      </p>
                      <p className="text-sm text-primary mt-1">
                        {`${window.location.origin}/${link.short_code}`}
                      </p>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {new Date(link.created_at).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-6 text-center">
              <p className="text-muted-foreground">No links created yet</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function LinkIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </svg>
  );
}

function ClickIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M8 13v-1h1v1H8Z" />
      <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3Z" />
      <path d="M8 15v1" />
      <path d="M11 15v1" />
      <path d="M14 15v1" />
    </svg>
  );
}

function TrendingUpIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
      <polyline points="17 6 23 6 23 12" />
    </svg>
  );
}
