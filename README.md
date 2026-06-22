# Camp Registration Website

## 1. Project overview

This project is a production-ready Next.js camp registration website built for local development and Vercel deployment.

It includes:

- A single responsive registration page with a polished live invoice sidebar
- Dynamic people entries with per-person meal selections and invoice-level accommodation selection
- Central pricing utilities for meal and tent totals
- Client + server validation
- A Next.js route handler that accepts validated submissions immediately and forwards to Google Apps Script in the background
- Google Apps Script code that writes to Google Sheets, optionally stores JSON in Google Drive, and queues admin/registrant invoice emails
- A printable invoice view and copy-to-clipboard invoice summary
- A lightweight honeypot anti-spam field

The recommended architecture is:

1. Browser submits the form to the local Next.js app
2. Next.js validates and enriches the submission with totals and a reference number
3. Next.js creates the final payload, returns the confirmation screen immediately, and schedules the Google Apps Script handoff after the response
4. Google Apps Script writes the row to Google Sheets, optionally stores JSON in Drive, queues both emails, and returns quickly
5. A short-lived Apps Script trigger processes the email queue in the background

This proxy approach is Vercel-friendly and avoids common browser CORS friction with direct Apps Script requests.

## 2. Folder structure

```text
CampApp/
├── app/
│   ├── api/
│   │   └── register/
│   │       └── route.ts
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx
├── components/
│   ├── camp-registration-page.tsx
│   ├── invoice-preview.tsx
│   ├── person-card.tsx
│   └── section-card.tsx
├── google-apps-script/
│   ├── appsscript.json
│   └── Code.gs
├── lib/
│   ├── format.ts
│   ├── invoice.ts
│   ├── pricing.ts
│   ├── schema.ts
│   ├── submission.ts
│   └── utils.ts
├── public/
├── types/
│   └── registration.ts
├── .env.local.example
├── .gitignore
├── eslint.config.mjs
├── next-env.d.ts
├── next.config.ts
├── package.json
├── postcss.config.js
├── tailwind.config.ts
├── tsconfig.json
└── README.md
```

## 3. Full code for each file

The full code is already present in this workspace in the files above.

Key files:

- `app/page.tsx`: top-level page entry
- `components/camp-registration-page.tsx`: main registration form and success state
- `components/person-card.tsx`: reusable per-person form section
- `components/invoice-preview.tsx`: live and confirmed invoice rendering
- `app/api/register/route.ts`: serverless submission proxy to Apps Script
- `lib/pricing.ts`: central pricing map and total calculation helpers
- `lib/schema.ts`: zod validation rules and default form values
- `lib/submission.ts`: builds the final payload with totals and reference number
- `google-apps-script/Code.gs`: full Google Apps Script backend with a retryable email queue

## 4. Google Apps Script code

Use the files inside `google-apps-script/`:

- `google-apps-script/Code.gs`
- `google-apps-script/appsscript.json`

### Sample Google Sheet header row

Create this header row in row 1, or let the script create it automatically:

```text
Timestamp | Reference Number | Church Selected | Other Church | Resolved Church | Primary Payer Full Name | Primary Payer Phone Number | Email Address | Exhibition Requested | Exhibition Description | Number of People | Adult Count | Teen Count | Child Count | Accommodation Type | Friday Supper Tally | Saturday Breakfast Tally | Saturday Lunch Tally | Saturday Supper Tally | Sunday Breakfast Tally | Sunday Lunch Tally | Sunday Supper Tally | Monday Breakfast Tally | Monday Lunch Tally | Monday Supper Tally | Tuesday Breakfast Tally | Total Amount (USD) | Age 3-9 Count | Age 10-15 Count | Age 16-20 Count
```

### Google Apps Script publishing steps

1. Open [https://script.google.com](https://script.google.com).
2. Create a new Apps Script project.
3. Replace the default code with the contents of `google-apps-script/Code.gs`.
4. Open project settings or the manifest file and set `appsscript.json` to match the local file if needed.
5. Update the `CONFIG` block in `Code.gs`:
   - `ADMIN_EMAIL`
   - `SPREADSHEET_ID`
   - `SHEET_NAME`
   - `DRIVE_FOLDER_ID` if you want JSON files stored in Drive
6. Save the project.
7. Click `Deploy` -> `New deployment`.
8. Choose `Web app`.
9. Set:
   - Execute as: `Me`
   - Who has access: `Anyone`
10. Deploy the web app.
11. Copy the web app URL ending in `/exec`.

### Connecting the website to the Apps Script URL

1. Copy `.env.local.example` to `.env.local`.
2. Set `APPS_SCRIPT_URL` to the deployed Apps Script `/exec` URL.
3. Optionally set `NEXT_PUBLIC_APPS_SCRIPT_URL` to the same value.
4. Restart `npm run dev` if it was already running.
5. Submit a test registration and confirm:
   - A row is appended in Google Sheets
   - JSON is stored in Drive if `DRIVE_FOLDER_ID` is configured
   - The `Email Queue` sheet is created automatically
   - Email queue rows move from `Queued` to `Sent`
   - The admin email arrives
   - The registrant email arrives

## 5. .env example

```env
APPS_SCRIPT_URL=https://script.google.com/macros/s/REPLACE_WITH_YOUR_DEPLOYMENT_ID/exec
NEXT_PUBLIC_APPS_SCRIPT_URL=https://script.google.com/macros/s/REPLACE_WITH_YOUR_DEPLOYMENT_ID/exec
```

## 6. Setup instructions

### Local development

1. Open this project folder in your terminal.
2. Install dependencies:

```bash
npm install
```

3. Create your local environment file:

```bash
cp .env.local.example .env.local
```

4. Add your Apps Script deployment URL to `.env.local`.
5. Start the development server:

```bash
npm run dev
```

6. Open [http://localhost:3000](http://localhost:3000).

### Major file responsibilities

- `types/registration.ts`: shared application types for form data and submission payloads
- `lib/pricing.ts`: pricing config and total calculations
- `lib/invoice.ts`: invoice copy text builder
- `components/*`: UI building blocks
- `app/api/register/route.ts`: form submission handoff to Apps Script

## 7. Deployment instructions

### Deploying to Vercel

1. Push this project to GitHub, GitLab, or Bitbucket.
2. Log in to [https://vercel.com](https://vercel.com).
3. Import the repository as a new project.
4. Keep the default Next.js framework detection.
5. Add the environment variables in Vercel project settings:
   - `APPS_SCRIPT_URL`
   - `NEXT_PUBLIC_APPS_SCRIPT_URL` if you want the public mirror too
6. Deploy.
7. After deployment, open the site and submit a real test registration.

### Notes for Vercel

- No extra server configuration is required.
- The project uses the App Router and a route handler, which is Vercel-friendly.
- The browser talks to `/api/register`, and Vercel handles the serverless route.

## 8. Testing instructions

### Frontend testing checklist

1. Load the page on desktop and mobile widths.
2. Confirm the church field is required.
3. Choose `Other` and confirm the custom church field appears and becomes required.
4. Add one or more people and confirm each person requires:
   - Full name
   - Age group
5. Toggle meals and confirm per-person totals and the grand total update immediately.
6. Confirm the invoice-level accommodation choice applies to the whole registration.
7. Use `Copy summary` and `Print invoice`.
8. Submit the form and confirm the success state appears with a submission reference.

### Full integration testing checklist

1. Submit a test registration locally.
2. Confirm the Next.js app returns success.
3. Open the target Google Sheet and verify the new row is present.
4. Confirm the `Email Queue` rows are processed to `Sent`.
5. Check the admin inbox for the structured registration email.
6. Check the registrant inbox for the invoice email.
7. If using Drive JSON storage, confirm the file exists in the configured Drive folder.

### Production verification

Run these before deployment:

```bash
npm run build
npm run start
```

Then test one end-to-end submission against the live Apps Script deployment.
