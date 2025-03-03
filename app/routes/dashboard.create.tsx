import { useState } from "react";
import { Form, useActionData, useNavigate } from "@remix-run/react";
import { json, redirect } from "@remix-run/node";
import type { ActionFunctionArgs } from "@remix-run/node";
import { requireUser } from "~/lib/auth.server";
import { db } from "~/lib/db.server";
import { Button } from "~/components/ui/button";
import { useToast } from "~/components/ui/use-toast";
import { nanoid } from "nanoid";
import { generateShortCode } from "~/lib/url.server";

export async function action({ request }: ActionFunctionArgs) {
  const user = await requireUser(request);
  const formData = await request.formData();
  
  const url = formData.get("url") as string;
  const title = formData.get("title") as string || "";
  const customCode = formData.get("customCode") as string || "";
  
  if (!url) {
    return json({ error: "URL is required" }, { status: 400 });
  }
  
  try {
    // Validate URL
    new URL(url);
  } catch (error) {
    return json({ error: "Please enter a valid URL" }, { status: 400 });
  }
  
  try {
    const id = nanoid();
    const shortCode = customCode || generateShortCode();
    
    // Check if custom code already exists
    if (customCode) {
      const existingUrl = await db.execute({
        sql: "SELECT id FROM urls WHERE short_code = ?",
        args: [customCode],
      });
      
      if (existingUrl.rows.length > 0) {
        return json(
          { error: "This custom URL is already taken. Please try another." },
          { status: 400 }
        );
      }
    }
    
    await db.execute({
      sql: "INSERT INTO urls (id, user_id, original_url, short_code, title, created_at) VALUES (?, ?, ?, ?, ?, ?)",
      args: [id, user.id, url, shortCode, title, Date.now()],
    });
    
    return redirect("/dashboard/links");
  } catch (error) {
    console.error("Error creating short URL:", error);
    return json(
      { error: "Failed to create short URL. Please try again." },
      { status: 500 }
    );
  }
}

export default function CreateLink() {
  const actionData = useActionData<typeof action>();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  
  if (actionData?.error) {
    toast({
      title: "Error",
      description: actionData.error,
      variant: "destructive",
    });
  }
  
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Create New Link</h1>
        <p className="text-muted-foreground">
          Shorten a URL and customize its settings
        </p>
      </div>
      
      <div className="rounded-lg border bg-card p-6 shadow-sm">
        <Form method="post" className="space-y-4" onSubmit={() => setIsLoading(true)}>
          <div className="space-y-2">
            <label htmlFor="url" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
              URL to Shorten <span className="text-destructive">*</span>
            </label>
            <input
              id="url"
              name="url"
              type="url"
              required
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              placeholder="https://example.com/very-long-url-that-needs-shortening"
            />
          </div>
          
          <div className="space-y-2">
            <label htmlFor="title" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
              Link Title (Optional)
            </label>
            <input
              id="title"
              name="title"
              type="text"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              placeholder="My awesome link"
            />
            <p className="text-xs text-muted-foreground">
              A title to help you identify this link later
            </p>
          </div>
          
          <div className="space-y-2">
            <label htmlFor="customCode" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
              Custom URL (Optional)
            </label>
            <div className="flex items-center">
              <span className="inline-flex items-center px-3 h-10 rounded-l-md border border-r-0 border-input bg-muted text-muted-foreground text-sm">
                {typeof window !== "undefined" ? window.location.origin : ""}/
              </span>
              <input
                id="customCode"
                name="customCode"
                type="text"
                className="flex h-10 w-full rounded-none rounded-r-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                placeholder="custom-url"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Leave blank to generate a random short code
            </p>
          </div>
          
          <div className="flex gap-2 pt-2">
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Creating..." : "Create Short Link"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate(-1)}
              disabled={isLoading}
            >
              Cancel
            </Button>
          </div>
        </Form>
      </div>
    </div>
  );
}
