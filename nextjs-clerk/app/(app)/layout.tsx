// app/(app)/layout.tsx: the signed-in part of your app (protected by clerkMiddleware).
import { redirect } from "next/navigation";
import { signupRisk } from "@/lib/signup-gate";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const risk = await signupRisk();
  if (risk === "block") redirect("/blocked"); // a public page with a neutral message
  // For "review": hold back free credits or the trial until you have looked at the account.
  return children;
}
