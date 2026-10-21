// app/api/signup/route.ts (Next.js App Router + Supabase Auth)
//
// Check first, then call supabase.auth.signUp() on the server. If your signup form
// calls Supabase directly from the browser today, move it behind this route.
import { createClient } from "@supabase/supabase-js";
import { checkSignup, clientIp } from "@/lib/signup-check"; // same file as in ../nextjs/lib

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
// Server-only admin client: never expose the service role key to the browser.
const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

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

  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) return Response.json({ error: error.message }, { status: 400 });

  // app_metadata can only be changed with the service role key, so users cannot
  // edit their own risk. Read it in your app to hold back free credits for "review".
  if (data.user) {
    await admin.auth.admin.updateUserById(data.user.id, {
      app_metadata: { signup_risk: check.recommendation, signup_reasons: check.reason_codes },
    });
  }
  return Response.json({ ok: true, user_id: data.user?.id });
}
