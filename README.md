# Toldo Pro

Application for managing customers, quotes, work orders, production, installations, inventory, finance, and company access.

## Supabase setup

1. Create a Supabase project and configure its authentication email templates and site/redirect URLs for the deployed app.
2. Copy `.env.example` to `.env.local` and set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` from the project API settings. These are public frontend settings; never put a service-role key or Gemini key in a `VITE_` variable.
3. Apply all migrations in order with the Supabase CLI:

   ```sh
   supabase link --project-ref YOUR_PROJECT_REF
   supabase db push
   ```

   The migration sequence is `001` through `004`; `004` adds permission-scoped contextual search for the assistant.

4. In Supabase **Project Settings → Edge Functions → Secrets**, set `GEMINI_API_KEY` (required for chat), optional `GEMINI_MODEL`, and `APP_URL` (set this to the production Vercel origin after the Vercel project has a domain). Keep these server-only; never add them to `.env.local`, Vercel frontend variables, or any `VITE_` variable. Then deploy the Edge Functions:

   ```sh
   supabase functions deploy invite-employee
   supabase functions deploy assistant-chat
   ```

   Supabase provides the standard `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` function secrets. `APP_URL` is used in employee invitation links.

5. In Vercel, import/link this repository as a Vite project. The existing `vercel.json` rewrites application routes to `index.html`. Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in the Vercel project's Development, Preview, and Production environments using the values from Supabase **Project Settings → API**. Do not add `GEMINI_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, or any other server secret to Vercel frontend variables. Redeploy after adding or changing the public variables.
6. In Supabase **Authentication → URL Configuration**, set the production Vercel domain as the Site URL and allow the production callback URL (and only the Preview URLs you use). Set the Supabase function secret `APP_URL` to the production Vercel origin so employee invitations return to the deployed app.

New company administrators register through the app. Employees are invited from the team area and set their password from the email link. Company data and sensitive operations are protected by Supabase row-level security and database functions; the app requires migrations `001` through `004`.

## Local development

```sh
corepack pnpm install
corepack pnpm dev
```
