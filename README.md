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
7. Deploy only after both database migrations and the required environment variables are configured. The app's API routes require authentication.

International invoice business details and supporting-document defaults now start blank rather than using another business's shared hard-coded data. Fill them in per invoice. Team invitations and multi-user workspace membership are not included yet; each workspace currently has one owner account.