import { json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import type { LoaderFunctionArgs } from "@remix-run/node";
import { requireUser } from "~/lib/auth.server";
import { supabase } from "~/lib/db.server"; // Import Supabase client

export async function loader({ request }: LoaderFunctionArgs) {
  const user = await requireUser(request);

  try {
    // Get total links count
    const { data: linksData, error: linksError } = await supabase
      .from("urls")
      .select("*", { count: "exact", head: true }) // Use count: "exact" for accurate count
      .eq("user_id", user.id);

    if (linksError) {
      throw linksError;
    }
    const totalLinks = linksData?.length || 0; // Supabase returns an array even for count

    // Get total clicks count
    const { data: clicksData, error: clicksError } = await supabase
      .from("analytics")
      .select("url_id", { count: "exact", head: true }) // Select a specific column for counting
      .in(
        "url_id",
        (
          await supabase.from("urls").select("id").eq("user_id", user.id)
        ).data?.map((url) => url.id) || []
      ); // Subquery to get url_ids

    if (clicksError) {
      throw clicksError;
    }
    const totalClicks = clicksData?.length || 0;

    // Get recent links
    const { data: recentLinks, error: recentLinksError } = await supabase
      .from("urls")
      .select("id, original_url, short_code, title, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(5);

    if (recentLinksError) {
      throw recentLinksError;
    }

    return json({
      totalLinks,
      totalClicks,
      recentLinks: recentLinks || [], // Ensure recentLinks is an array
    });
  } catch (error) {
    console.error("Error in dashboard loader:", error);
    // Handle the error appropriately, perhaps returning an error state
    return json(
      {
        error: "Failed to load dashboard data",
        totalLinks: 0,
        totalClicks: 0,
        recentLinks: [],
      },
      { status: 500 }
    );
  }
}

export default function DashboardIndex() {
  const { totalLinks, totalClicks, recentLinks, error } =
    useLoaderData<typeof loader>();

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Overview of your shortened URLs and analytics
          </p>
        </div>
        <div className="rounded-lg border bg-card p-6 shadow-sm">
          <p className="text-red-500">Error: {error}</p>
        </div>
      </div>
    );
  }

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
              {totalLinks > 0
                ? Math.round((totalClicks / totalLinks) * 10) / 10
                : 0}
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
                      <p className="font-medium">
                        {link.title || "Untitled Link"}
                      </p>
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
