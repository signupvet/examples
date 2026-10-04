// app/api/signup/route.ts (Next.js App Router)
import { checkSignup, clientIp } from "@/lib/signup-check";

export async function POST(req: Request) {
  const { email, password, timezone } = await req.json();

  const check = await checkSignup({
    email,
    ip: clientIp(req.headers),
    userAgent: req.headers.get("user-agent") ?? undefined,
    timezone,
  });
  if (check.recommendation === "block") {
    return Response.json({ error: "We could not create your account. Please use a different email address." }, { status: 400 });
  }

  const user = await createUser({ email, password }); // your existing signup
  if (check.recommendation === "review") {
    await flagForReview(user.id, check.reason_codes); // e.g. no free credits until the email is confirmed
  }
  return Response.json({ ok: true });
}

// Replace these with your own user store.
async function createUser({ email }: { email: string; password: string }) {
  return { id: crypto.randomUUID(), email };
}
async function flagForReview(userId: string, reasons: string[]) {
  console.log(`review user ${userId}:`, reasons.join(", "));
}
