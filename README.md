# DC Challan - Delivery Challan Management System

Automated delivery challan generator for Sennheiser Electronics India Pvt Ltd.

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

## Supabase document storage

Saved challans and international invoices are stored in Supabase PostgreSQL. Invoice records also retain the editable data for their certificates, DHL authorisation, and mode-specific supporting documents. PDFs are generated from those saved fields when printed or downloaded.

1. Create a Supabase project.
2. In the Supabase SQL Editor, run [`supabase/migrations/20261023180000_create_documents.sql`](./supabase/migrations/20261023180000_create_documents.sql).
3. Add the following variables to a local `.env.local` file and to the Vercel project's Environment Variables:

   ```text
   SUPABASE_URL=https://<project-ref>.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=<server-only-service-role-key>
   ```


   Keep the service-role key server-side: do not add a `NEXT_PUBLIC_` prefix or commit the value.
4. After the table and environment variables are ready, run `npm run migrate:documents` once from the project root. This imports the existing JSON challans and invoices, then moves those legacy files from `public/data` into `data/legacy-documents` so they are no longer directly served as public files.
5. Deploy or restart the app. New and edited records will use Supabase.

The document API currently has no sign-in flow. Protect the Vercel deployment with access control before storing confidential business documents.