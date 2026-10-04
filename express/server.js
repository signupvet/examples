// Express signup route with a SignupVet check before the account is created.
// Run: npm install && SIGNUP_API_KEY=sv_live_... npm start
import express from "express";
import { checkSignup } from "../node/signup-check.js";

const app = express();
app.use(express.json());
// Behind a proxy or load balancer (Heroku, Render, Railway, Nginx ...), so req.ip is the visitor's IP.
app.set("trust proxy", 1);

app.post("/signup", async (req, res) => {
  const { email, password, phone, timezone } = req.body ?? {};

  const check = await checkSignup({
    email,
    phone,
    ip: req.ip,
    userAgent: req.get("user-agent"),
    acceptLanguage: req.get("accept-language"),
    timezone, // optional: Intl.DateTimeFormat().resolvedOptions().timeZone from the browser
  });

  if (check.recommendation === "block") {
    // Keep the message neutral; do not tell bots which signal tripped.
    return res.status(400).json({ error: "We could not create your account. Please use a different email address." });
  }

  const user = await createUser({ email, password });
  if (check.recommendation === "review") {
    // For example: hold free credits until the email is confirmed, or queue for a manual look.
    await flagForReview(user.id, check.reason_codes);
  }
  res.json({ ok: true });
});

// Replace these with your own user store.
async function createUser({ email }) {
  return { id: crypto.randomUUID(), email };
}
async function flagForReview(userId, reasons) {
  console.log(`review user ${userId}:`, reasons.join(", "));
}

app.listen(3000, () => console.log("Listening on http://localhost:3000"));
