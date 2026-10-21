// lib/signup-gate.ts (Next.js App Router + Clerk)
//
// Clerk creates the account in the browser, so there is no server step before signup to hook into.
// Instead, run the check once on the server the first time a new user opens your app, and keep the
// result in publicMetadata: only your backend can change it, users cannot.
import "server-only";
import { headers } from "next/headers";
import { clerkClient, currentUser } from "@clerk/nextjs/server";
import { checkSignup, clientIp } from "@/lib/signup-check"; // same file as in ../nextjs/lib

export type SignupRisk = "allow" | "review" | "block";

const NEW_USER_WINDOW_MS = 24 * 60 * 60 * 1000;

export async function signupRisk(): Promise<SignupRisk | null> {
  const user = await currentUser();
  if (!user) return null;

  const stored = user.publicMetadata.signup_risk as SignupRisk | undefined;
  if (stored) return stored;
  // Only check fresh signups, never users who signed up before you added this.
  if (Date.now() - user.createdAt > NEW_USER_WINDOW_MS) return "allow";

  const h = await headers();
  const check = await checkSignup({
    email: user.primaryEmailAddress?.emailAddress,
    phone: user.primaryPhoneNumber?.phoneNumber,
    ip: clientIp(h),
    userAgent: h.get("user-agent") ?? undefined,
  });
  // The API could not be reached: let the user in and try again on the next visit.
  if (check.failed_open) return "allow";

  const client = await clerkClient();
  await client.users.updateUserMetadata(user.id, {
    publicMetadata: { signup_risk: check.recommendation, signup_reasons: check.reason_codes },
  });
  // A ban signs the user out and can be undone in the Clerk dashboard.
  if (check.recommendation === "block") await client.users.banUser(user.id);
  return check.recommendation;
}
