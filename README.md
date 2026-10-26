# DC Challan - Delivery Challan Management System

Business delivery challan and international invoice management system.

## Features

- ✅ Pre-filled sender and client details
- ✅ Quick client selection from saved database
- ✅ Product catalog with auto-fill pricing
- ✅ Automatic calculation of totals
- ✅ Amount conversion to words in Indian Rupees
- ✅ A4-size optimized printing
- ✅ PDF download capability
- ✅ Unique challan numbering system (DC-YYYYMMDD-XXXX)
- ✅ Challan history and search functionality
- ✅ Supabase-backed storage for challans and international invoices
- ✅ Edit and reprint saved challans, invoices, and their supporting documents
- ✅ Email/password authentication with separate business workspaces

## Tech Stack

- **Frontend**: React.js with Next.js
- **Styling**: CSS Modules
- **Form Management**: React Hook Form
- **PDF Generation**: jsPDF + html2canvas
- **Date Handling**: date-fns
- **Hosting**: Vercel

## Installation

### Prerequisites
- Node.js (v20.9 or higher)
- npm or yarn

### Steps

1. **Clone the repository**
```bash
git clone <repository-url>
cd dc-challan-system
```

## Supabase setup and tenant isolation

Saved challans, international invoices, and business setup records are stored in Supabase PostgreSQL. Authenticated API requests are scoped to the signed-in user's workspace, and row-level security also protects workspace-owned tables.

1. Create a Supabase project and enable the Email provider under **Authentication → Providers**. Configure the project's Site URL and allowed redirect URLs to include `<your-app-url>/login`.
2. Add these variables to a local `.env.local` file and to the Vercel project's Environment Variables:

   ```text
   SUPABASE_URL=https://<project-ref>.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=<server-only-service-role-key>
   NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=<public-anon-key>
   ```

   Keep the service-role key server-side: never add a `NEXT_PUBLIC_` prefix or commit its value. The anon key is intended for the browser; database access remains constrained by row-level security.
3. In the Supabase SQL Editor, run [`supabase/migrations/20261023180000_create_documents.sql`](./supabase/migrations/20261023180000_create_documents.sql) if the `documents` table has not been created yet.
4. Run [`supabase/migrations/20261026190000_add_workspaces_and_auth.sql`](./supabase/migrations/20261026190000_add_workspaces_and_auth.sql). It creates workspace membership, tenant-owned records, row-level security policies, and the signup trigger. Existing database documents are assigned to the legacy workspace; the existing clients, senders, and products are seeded into that workspace.
5. If legacy challan/invoice JSON files still need to be imported, run `npm run migrate:documents` after the tenant migration. The script imports or updates archived legacy documents in the initial workspace.
6. The migration reserves the legacy workspace for the configured initial owner email. That owner must sign up with the same email to claim its data; other signups create separate empty workspaces. New users can add their own clients, senders, and products under **Business setup**.
7. Deploy only after the required database migrations and environment variables are configured. The app's API routes require authentication.

International invoice business details and supporting-document defaults now start blank rather than using another business's shared hard-coded data. Fill them in per invoice. Team invitations and multi-user workspace membership are not included yet; each workspace currently has one owner account.

## Razorpay subscriptions (test mode)

The billing page offers Starter at ₹499/month (100 documents per month) and Business at ₹1,499/month (500 documents per month). Challans and international invoices share the same monthly document allowance. New workspaces receive a 7-day trial; a subscription selected during the trial is scheduled to start after the trial ends. Enterprise pricing is handled separately.

1. Create **monthly** plans in the Razorpay Dashboard's **test mode**:
   - Starter: ₹499 per billing period (49,900 paise)
   - Business: ₹1,499 per billing period (149,900 paise)
2. Add the Razorpay values from `.env.example` to your server environment. Use test credentials only; `RAZORPAY_KEY_ID` must start with `rzp_test_`. The key secret and webhook secret must remain server-side. The plan IDs are the IDs for your monthly test-mode plans.
3. Configure a Razorpay webhook pointing to `https://<your-app-url>/api/webhooks/razorpay`, using the same signing secret as `RAZORPAY_WEBHOOK_SECRET`. Subscribe it to `subscription.authenticated`, `subscription.activated`, `subscription.charged`, `subscription.pending`, `subscription.halted`, `subscription.paused`, `subscription.resumed`, `subscription.cancelled`, `subscription.completed`, and `subscription.updated`.
4. Apply [`supabase/migrations/20261026200000_add_razorpay_subscriptions.sql`](./supabase/migrations/20261026200000_add_razorpay_subscriptions.sql) after the workspace migration. It initializes workspace trials, tracks billing webhooks, and enforces document limits in the database.
5. Set `NEXT_PUBLIC_SUPPORT_EMAIL` if Enterprise inquiries should go to a dedicated address. Keep all credentials out of source control.

The checkout flow and webhook are configured for Razorpay test mode. Before accepting real payments, a deliberate live-mode rollout is required, including code/configuration changes, live plans and credentials, and end-to-end live testing.