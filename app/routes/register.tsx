import { useState } from "react";
import { Form, Link, useActionData, useSearchParams } from "@remix-run/react";
import { json, redirect } from "@remix-run/node";
import type { ActionFunctionArgs, MetaFunction } from "@remix-run/node";
import { Button } from "~/components/ui/button";
import { register, createUserSession, getUserSession } from "~/lib/auth.server";
import { useToast } from "~/components/ui/use-toast";

export const meta: MetaFunction = () => {
  return [
    { title: "Register - URL Shortener" },
    { name: "description", content: "Create a new URL shortener account" },
  ];
};

export async function action({ request }: ActionFunctionArgs) {
  const session = await getUserSession(request);
  if (session.has("userId")) {
    return redirect("/dashboard");
  }

  const formData = await request.formData();
  const name = formData.get("name") as string;
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const redirectTo = formData.get("redirectTo") as string || "/dashboard";

  if (!name || name.length < 2) {
    return json(
      { error: "Name must be at least 2 characters" },
      { status: 400 }
    );
  }

  if (!email || !email.includes("@")) {
    return json(
      { error: "Please enter a valid email address" },
      { status: 400 }
    );
  }

  if (!password || password.length < 6) {
    return json(
      { error: "Password must be at least 6 characters" },
      { status: 400 }
    );
  }

  try {
    const user = await register(email, password, name);
    if (!user) {
      return json(
        { error: "Error creating account. Please try again." },
        { status: 500 }
      );
    }
    return createUserSession(user.id, redirectTo);
  } catch (error) {
    if (error instanceof Error && error.message.includes("UNIQUE constraint failed")) {
      return json(
        { error: "A user with this email already exists" },
        { status: 400 }
      );
    }
    return json(
      { error: "Error creating account. Please try again." },
      { status: 500 }
    );
  }
}

export default function Register() {
  const [searchParams] = useSearchParams();
  const redirectTo = searchParams.get("redirectTo") || "/dashboard";
  const actionData = useActionData<typeof action>();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  if (actionData?.error) {
    toast({
      title: "Error",
      description: actionData.error,
      variant: "destructive",
    });
  }

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b">
        <div className="container flex h-16 items-center justify-between px-4 md:px-6">
          <div className="flex items-center gap-2">
            <Link to="/" className="flex items-center gap-2">
              <LinkIcon className="h-6 w-6 text-primary" />
              <span className="text-xl font-bold">ShortLink</span>
            </Link>
          </div>
          <nav className="flex gap-4">
            <Link to="/login">
              <Button variant="outline">Login</Button>
            </Link>
          </nav>
        </div>
      </header>
      <main className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md space-y-6">
          <div className="space-y-2 text-center">
            <h1 className="text-3xl font-bold">Create an account</h1>
            <p className="text-muted-foreground">
              Enter your information below to create your account
            </p>
          </div>
          <Form method="post" className="space-y-4" onSubmit={() => setIsLoading(true)}>
            <input type="hidden" name="redirectTo" value={redirectTo} />
            <div className="space-y-2">
              <label htmlFor="name" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                Name
              </label>
              <input
                id="name"
                name="name"
                type="text"
                autoComplete="name"
                required
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                placeholder="John Doe"
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                placeholder="name@example.com"
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                required
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "Creating account..." : "Create account"}
            </Button>
          </Form>
          <div className="text-center text-sm">
            Already have an account?{" "}
            <Link to="/login" className="text-primary hover:underline">
              Login
            </Link>
          </div>
        </div>
      </main>
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
