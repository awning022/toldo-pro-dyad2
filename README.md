# Toldo Pro

Application for managing customers, quotes, work orders, production, installations, inventory, finance, and company access.

## Supabase setup

1. Create a Supabase project and configure its authentication email templates and site/redirect URLs for the deployed app.
2. Copy `.env.example` to `.env.local` and set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` from the project API settings. `VITE_SUPABASE_ANON_KEY` accepts the project's publishable key (`sb_publishable_...`); both settings are public frontend values. Never put a secret/service-role key or Gemini key in a `VITE_` variable.
3. Apply all migrations in order with the Supabase CLI:

   ```sh
   supabase link --project-ref YOUR_PROJECT_REF
   supabase db push
   ```

   The migration sequence is `001` through `006`; `004` adds permission-scoped contextual search for the assistant, `005` keeps the employee profile email synchronized after a confirmed Auth email change, and `006` provisions company signup atomically.

4. In Supabase **Project Settings → Edge Functions → Secrets**, set `GEMINI_API_KEY` (required for chat), optional `GEMINI_MODEL`, and `APP_URL` (set this to the production Vercel origin after the Vercel project has a domain). Keep these server-only; never add them to `.env.local`, Vercel frontend variables, or any `VITE_` variable. Then deploy the Edge Functions:

   ```sh
   supabase functions deploy invite-employee
   supabase functions deploy assistente-ia
   ```

   Supabase provides the standard `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` function secrets. Edge Functions use the Deno `supabase-js` import directly, so no Node server package is required. `APP_URL` is used in employee invitation links.

5. In Vercel, import/link this repository as a Vite project. The existing `vercel.json` rewrites application routes to `index.html`. Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in the Vercel project's Development, Preview, and Production environments using the values from Supabase **Project Settings → API**. Do not add `GEMINI_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, or any other server secret to Vercel frontend variables. Redeploy after adding or changing the public variables.
6. In Supabase **Authentication → URL Configuration**, set the production Vercel origin as the Site URL and allow the exact callback URL `<production-origin>/auth/confirm` (plus local and only the Preview callback URLs you use). Signup confirmation, password recovery, employee invitations, and email changes all return through `/auth/confirm`; the app then routes to `/`, `/?setup=1`, `/auth/reset-password`, or `/auth/change-email` as appropriate. Set the Supabase function secret `APP_URL` to the production Vercel origin so employee invitations return to the deployed app.

New company administrators register through the app and confirm their email through Supabase Auth. The Auth database trigger creates their profile, company, and administrator membership in one transaction; it sends no email itself. Supabase Auth sends the confirmation after successful user creation. The app uses `company_members` as its canonical membership table (do not create a parallel `company_users` table). Members can read only their own membership row; the team directory and membership updates use company-admin-authorized database paths. Employees are invited from the team area and set and confirm their password from the email link. Password recovery requires the user to open the recovery link and save a new password in the app. Email changes are submitted from the account email button and take effect after confirmation by Supabase Auth. Configure the Supabase Auth email templates and SMTP/provider settings for your deployment; successful frontend requests alone do not confirm actual email delivery. Company data and sensitive operations are protected by Supabase row-level security and database functions; the app requires migrations `001` through `006`.

## Local development

```sh
corepack pnpm install
corepack pnpm dev
```
