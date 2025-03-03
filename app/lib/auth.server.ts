import { supabase } from "./db.server";
import { createCookieSessionStorage, redirect } from "@remix-run/node";

// Define the session storage
const sessionStorage = createCookieSessionStorage({
  cookie: {
    name: "__session",
    httpOnly: true,
    path: "/",
    sameSite: "lax",
    secrets: [process.env.SESSION_SECRET || "s3cr3t"],
    secure: process.env.NODE_ENV === "production",
  },
});

// Get user session
export async function getUserSession(request: Request) {
  const cookie = request.headers.get("Cookie");
  if (!cookie) {
    console.log("getUserSession: No cookie found");
    return null;
  }
  const session = await sessionStorage.getSession(cookie);
  console.log("getUserSession: Session retrieved", session.data);
  return session;
}

// Get user details
export async function getUser(request: Request) {
  const session = await getUserSession(request);
  const userId = session?.get("userId");

  if (!userId) {
    console.log("getUser: No userId in session");
    return null;
  }

  try {
    const { data, error } = await supabase
      .from("users")
      .select("id, email, name, role")
      .eq("id", userId)
      .single();

    if (error) {
      throw error;
    }

    if (!data) {
      console.log("getUser: No user data found for userId", userId);
      return null;
    }

    console.log("getUser: User data retrieved", data);
    return data as UserInfo;
  } catch (error) {
    console.error("Database error fetching user:", error);
    return null;
  }
}

// Login function
export async function login(email: string, password: string) {
  if (!email || !password) {
    throw new Error("Email and password are required");
  }

  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      console.error("Supabase signInWithPassword error:", error);
      throw error;
    }
     if (!data || !data.user) {
        console.error("Supabase signInWithPassword: No user data");
        throw new Error("Invalid credentials");
      }

    console.log("Supabase signInWithPassword successful:", data);

    return {
      id: data.user.id,
      email: data.user.email,
      name: data.user.user_metadata?.name, // Fetch name from user_metadata
      role: data.user.user_metadata?.role,  // Fetch role from user_metadata
    } as UserInfo;

  } catch (error) {
    console.error("Login error:", error);
    throw error;
  }
}

// Create user session
export async function createUserSession(userId: string, redirectTo: string) {
  const session = await sessionStorage.getSession();
  session.set("userId", userId);
  console.log("createUserSession: Session created with userId", userId);
  const committed = await sessionStorage.commitSession(session);
    console.log("createUserSession: committed", committed);

  return redirect(redirectTo, {
    headers: {
      "Set-Cookie": committed,
    },
  });
}

// User info type
export interface UserInfo {
  id: string;
  email: string;
  name: string | null;
  role: string | null;
}

// Register function
export async function register(email: string, password: string, name: string) {
    if (!email || !password || !name) {
        throw new Error("Email, password, and name are required");
    }

    try {
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    name: name,
                    role: 'user', // Set a default role
                }
            }
        });

        if (error) {
            throw error;
        }

        if (!data || !data.user) {
            throw new Error("User creation failed");
        }

        // Insert user details into 'users' table (if not already handled by a trigger)
        const { error: insertError } = await supabase.from('users').insert([
            { id: data.user.id, email: data.user.email, name: name, role: 'user' },
        ]);

        if (insertError) {
          console.warn("Failed to insert user details into 'users' table:", insertError);
          // Consider deleting the user from auth if profile insertion fails.
        }

        return {
            id: data.user.id,
            email: data.user.email,
            name: data.user.user_metadata.name,
            role: data.user.user_metadata.role,
        } as UserInfo;

    } catch (error) {
        console.error("Registration error:", error);
        throw error;
    }
}

// Require user function
export async function requireUser(request: Request) {
    const user = await getUser(request);
    if (!user) {
        throw redirect("/login");
    }
    return user;
}
