import { db } from "./db.server";
import bcrypt from "bcryptjs";
import { createCookieSessionStorage, redirect } from "@remix-run/node";
import { nanoid } from "nanoid";

// Session storage
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
  return sessionStorage.getSession(request.headers.get("Cookie"));
}

// Get logged in user
export async function getUser(request: Request) {
  const session = await getUserSession(request);
  const userId = session.get("userId");
  
  if (!userId) return null;
  
  try {
    const user = await db.execute({
      sql: "SELECT id, email, name, role FROM users WHERE id = ?",
      args: [userId],
    });
    
    if (user.rows.length === 0) return null;
    return user.rows[0] as UserInfo;
  } catch (error) {
    console.error("Error getting user:", error);
    return null;
  }
}

// Login user
export async function login(email: string, password: string) {
  const user = await db.execute({
    sql: "SELECT * FROM users WHERE email = ?",
    args: [email],
  });
  
  if (user.rows.length === 0) {
    return null;
  }
  
  const isCorrectPassword = await bcrypt.compare(
    password,
    user.rows[0].password as string
  );
  
  if (!isCorrectPassword) {
    return null;
  }
  
  return {
    id: user.rows[0].id,
    email: user.rows[0].email,
    name: user.rows[0].name,
    role: user.rows[0].role,
  } as UserInfo;
}

// Register user
export async function register(email: string, password: string, name: string) {
  const hashedPassword = await bcrypt.hash(password, 10);
  const id = nanoid();
  
  try {
    await db.execute({
      sql: "INSERT INTO users (id, email, password, name, role, created_at) VALUES (?, ?, ?, ?, ?, ?)",
      args: [id, email, hashedPassword, name, "user", Date.now()],
    });
    
    return {
      id,
      email,
      name,
      role: "user",
    } as UserInfo;
  } catch (error) {
    console.error("Error registering user:", error);
    return null;
  }
}

// Create user session
export async function createUserSession(userId: string, redirectTo: string) {
  const session = await sessionStorage.getSession();
  session.set("userId", userId);
  
  return redirect(redirectTo, {
    headers: {
      "Set-Cookie": await sessionStorage.commitSession(session),
    },
  });
}

// Logout user
export async function logout(request: Request) {
  const session = await getUserSession(request);
  
  return redirect("/login", {
    headers: {
      "Set-Cookie": await sessionStorage.destroySession(session),
    },
  });
}

// Require user authentication
export async function requireUser(
  request: Request,
  redirectTo: string = new URL(request.url).pathname
) {
  const user = await getUser(request);
  
  if (!user) {
    const searchParams = new URLSearchParams([
      ["redirectTo", redirectTo],
    ]);
    throw redirect(`/login?${searchParams}`);
  }
  
  return user;
}

// Require admin role
export async function requireAdmin(request: Request) {
  const user = await requireUser(request);
  
  if (user.role !== "admin") {
    throw redirect("/dashboard");
  }
  
  return user;
}

// Types
export interface UserInfo {
  id: string;
  email: string;
  name: string | null;
  role: string;
}
