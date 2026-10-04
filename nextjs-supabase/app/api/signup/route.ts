// app/api/signup/route.ts (Next.js App Router + Supabase Auth)
//
// Check first, then call supabase.auth.signUp() on the server. If your signup form
// calls Supabase directly from the browser today, move it behind this route,
// otherwise a bot can skip the check by talking to Supabase directly.
import { createClient } from "@supabase/supabase-js";
import { checkSignup, clientIp } from "@/lib/signup-check"; // same file as in ../nextjs/lib

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

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

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    // Stored on the user, so your app can hold back free credits for "review" signups.
    options: { data: { signup_risk: check.recommendation, signup_reasons: check.reason_codes } },
  });
  if (error) return Response.json({ error: error.message }, { status: 400 });
  return Response.json({ ok: true, user_id: data.user?.id });
}
