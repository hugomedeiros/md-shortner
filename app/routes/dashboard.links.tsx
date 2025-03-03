import { useState } from "react";
import { Link, useLoaderData } from "@remix-run/react";
import { json } from "@remix-run/node";
import type { LoaderFunctionArgs } from "@remix-run/node";
import { requireUser } from "~/lib/auth.server";
import { db } from "~/lib/db.server";
import { Button } from "~/components/ui/button";
import { useToast } from "~/components/ui/use-toast";

export async function loader({ request }: LoaderFunctionArgs) {
  const user = await requireUser(request);
  
  // Get user's links
  const links = await db.execute({
    sql: `SELECT u.id, u.original_url, u.short_code, u.title, u.created_at,
          (SELECT COUNT(*) FROM analytics WHERE url_id = u.id) as clicks
          FROM urls u
          WHERE u.user_id = ?
          ORDER BY u.created_at DESC`,
    args: [user.id],
  });
  
  return json({
    links: links.rows,
  });
}

export default function Links() {
  const { links } = useLoaderData<typeof loader>();
  const { toast } = useToast();
  const [copiedId, setCopiedId] = useState<string | null>(null);
  
  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text).then(
      () => {
        setCopiedId(id);
        toast({
          title: "Copied to clipboard",
          description: "The link has been copied to your clipboard.",
        });
        
        setTimeout(() => {
          setCopiedId(null);
        }, 2000);
      },
      (err) => {
        console.error("Could not copy text: ", err);
        toast({
          title: "Error",
          description: "Failed to copy to clipboard",
          variant: "destructive",
        });
      }
    );
  };
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">My Links</h1>
          <p className="text-muted-foreground">
            Manage and track all your shortened URLs
          </p>
        </div>
        <Link to="/dashboard/create">
          <Button>
            <PlusIcon className="mr-2 h-4 w-4" />
            Create New Link
          </Button>
        </Link>
      </div>
      
      <div className="rounded-lg border shadow-sm">
        {links.length > 0 ? (
          <div className="relative w-full overflow-auto">
            <table className="w-full caption-bottom text-sm">
              <thead className="border-b">
                <tr className="border-b transition-colors hover:bg-muted/50">
                  <th className="h-12 px-4 text-left align-middle font-medium">Title</th>
                  <th className="h-12 px-4 text-left align-middle font-medium">Short URL</th>
                  <th className="h-12 px-4 text-left align-middle font-medium">Original URL</th>
                  <th className="h-12 px-4 text-left align-middle font-medium">Clicks</th>
                  <th className="h-12 px-4 text-left align-middle font-medium">Created</th>
                  <th className="h-12 px-4 text-left align-middle font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {links.map((link: any) => {
                  const shortUrl = `${typeof window !== "undefined" ? window.location.origin : ""}/${link.short_code}`;
                  return (
                    <tr key={link.id} className="border-b transition-colors hover:bg-muted/50">
                      <td className="p-4 align-middle">{link.title || "Untitled"}</td>
                      <td className="p-4 align-middle">
                        <div className="flex items-center gap-2">
                          <a
                            href={shortUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary hover:underline"
                          >
                            /{link.short_code}
                          </a>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                            onClick={() => copyToClipboard(shortUrl, link.id)}
                          >
                            {copiedId === link.id ? (
                              <CheckIcon className="h-4 w-4" />
                            ) : (
                              <CopyIcon className="h-4 w-4" />
                            )}
                            <span className="sr-only">Copy</span>
                          </Button>
                        </div>
                      </td>
                      <td className="p-4 align-middle">
                        <div className="max-w-[200px] truncate" title={link.original_url}>
                          {link.original_url}
                        </div>
                      </td>
                      <td className="p-4 align-middle">{link.clicks}</td>
                      <td className="p-4 align-middle">
                        {new Date(link.created_at).toLocaleDateString()}
                      </td>
                      <td className="p-4 align-middle">
                        <div className="flex items-center gap-2">
                          <Link to={`/dashboard/analytics/${link.id}`}>
                            <Button variant="ghost" size="sm">
                              <BarChartIcon className="h-4 w-4" />
                              <span className="sr-only">Analytics</span>
                            </Button>
                          </Link>
                          <Link to={`/dashboard/edit/${link.id}`}>
                            <Button variant="ghost" size="sm">
                              <EditIcon className="h-4 w-4" />
                              <span className="sr-only">Edit</span>
                            </Button>
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center p-8">
            <div className="text-center">
              <LinkIcon className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-2 text-lg font-medium">No links yet</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Create your first shortened URL to get started
              </p>
              <div className="mt-6">
                <Link to="/dashboard/create">
                  <Button>Create New Link</Button>
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function BarChartIcon(props: React.SVGProps<SVGSVGElement>) {
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
      <line x1="12" x2="12" y1="20" y2="10" />
      <line x1="18" x2="18" y1="20" y2="4" />
      <line x1="6" x2="6" y1="20" y2="16" />
    </svg>
  );
}

function CheckIcon(props: React.SVGProps<SVGSVGElement>) {
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
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function CopyIcon(props: React.SVGProps<SVGSVGElement>) {
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
      <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
      <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
    </svg>
  );
}

function EditIcon(props: React.SVGProps<SVGSVGElement>) {
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
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
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

function PlusIcon(props: React.SVGProps<SVGSVGElement>) {
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
      <path d="M5 12h14" />
      <path d="M12 5v14" />
    </svg>
  );
}
