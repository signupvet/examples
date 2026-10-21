# SignupVet examples

Copy-paste examples for [SignupVet](https://www.signupvet.com): one API call checks the **email, phone number and IP** of a new signup and returns a single risk score with the reasons.

```json
{
  "risk_score": 85,
  "recommendation": "block",
  "reason_codes": ["email_syntax_valid", "mx_records_present", "disposable_domain"]
}
```

Full API reference: [signupvet.com/docs](https://www.signupvet.com/docs) · OpenAPI: [signupvet.com/openapi.json](https://www.signupvet.com/openapi.json)

## Quick start

1. Create a free account at [signupvet.com/signup](https://www.signupvet.com/signup) (250 checks a month, no card).
2. Confirm your email and create an API key in the dashboard.
3. Put the key in an environment variable on your server, never in browser code:
   ```sh
   export SIGNUP_API_KEY=sv_live_...
   ```
4. Try it: `sh curl/score.sh`

## Examples

| Folder | What it shows |
| --- | --- |
| [`curl/`](curl/score.sh) | One request from the command line |
| [`node/`](node/signup-check.js) | `checkSignup()` for Node 18+, no dependencies |
| [`express/`](express/server.js) | Express signup route: block, review or allow |
| [`nextjs/`](nextjs/app/api/signup/route.ts) | Next.js App Router route handler |
| [`nextjs-supabase/`](nextjs-supabase/app/api/signup/route.ts) | Next.js + Supabase Auth: check before `supabase.auth.signUp()`, store the result in `app_metadata` (needs `SUPABASE_SERVICE_ROLE_KEY` on the server) |
| [`nextjs-clerk/`](nextjs-clerk/lib/signup-gate.ts) | Next.js + Clerk: check each new user once on the server, store the result in `publicMetadata`, ban clear fakes |
| [`firebase/`](firebase/functions/src/index.ts) | Firebase Authentication blocking function (`beforeUserCreated`): check before the user is created, result as a custom claim (needs Identity Platform) |
| [`python/`](python/signup_check.py) | `check_signup()` with `requests`, plus a [FastAPI route](python/app.py) |

## How to use the result

| `recommendation` | Score | Suggested action |
| --- | --- | --- |
| `allow` | below 30 | Create the account as usual |
| `review` | 30 to 79 | Create the account, but hold back free credits or trials until the email is confirmed, or look at it manually |
| `block` | 80 and above | Do not create the account. Show a neutral message |

`reason_codes` explains every score, for example `disposable_domain`, `tor_exit_node` or `signup_velocity_ip` (many signups from one IP within minutes). All codes are listed in the [docs](https://www.signupvet.com/docs#reasons).

## Good practice

- **Call it from your server**, right before you create the user. A check in the browser can be skipped by bots.
- **Fail open.** Every example uses a 2 second timeout and allows the signup if the API cannot be reached or returns an error (for example `402` when your monthly checks are used up). Your signup form never breaks because of SignupVet.
- **Send the real visitor IP.** Behind a proxy or on Vercel, use the first entry of `X-Forwarded-For` (see the examples), not your proxy's address.
- **Keep the block message neutral**, so bots learn nothing about which signal tripped.
- Optional: send the browser's time zone (`Intl.DateTimeFormat().resolvedOptions().timeZone`) as `context.timezone`. A mismatch with the IP's country is a useful signal.

## Privacy

SignupVet never stores full email addresses, phone numbers or IPs. Logs keep masked values (`m***@gmail.com`, `178.197.224.x`) and are deleted after 90 days. Details: [privacy policy](https://www.signupvet.com/privacy).

## License

MIT, see [LICENSE](LICENSE). Use the code however you like.
