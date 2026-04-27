# Prasan ERP

A professional business suite for jeans manufacturing — accounting, invoicing, CRM, and ledger management.

## Features

- 🏢 **Multi-Company** — Manage unlimited business entities with isolated data
- 📊 **Dashboard** — Real-time revenue, accounts, and invoice analytics
- 🧾 **Invoicing** — Create, track, and export professional invoices
- 📒 **Ledger Management** — Professional double-entry ledgers with Excel-style PDF export
- 📑 **Advanced PDF Export** — Filter by date, transaction type, or manually select rows to export
- 🔒 **Password Protected** — SHA-256 hashed master password
- 🗄️ **SQLite Database** — Permanent local storage via Prisma ORM

## Quick Start

### Prerequisites

- [Node.js](https://nodejs.org) v18 or later

### Option A: Double-Click Launch

- **macOS**: Double-click `start-mac.command`
- **Windows**: Double-click `start-windows.bat`

### Option B: Manual

```bash
npm install
npx prisma generate
npx prisma db push
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Troubleshooting

### Windows Users (Folder copied from Mac)

If you received this project folder from a Mac user, the app will handle everything automatically!

**Just run `start-windows.bat`**.
The script will now detect if the folders are from a Mac, delete the incorrect ones, and download the correct Windows version for you automatically.

**Requirements:**

1. Make sure [Node.js](https://nodejs.org) is installed.
2. If the terminal closes instantly, please restart your laptop and try once more.

## First Launch

On first launch, a **Setup Wizard** will guide you through:

1. Setting your **Company Name**
2. Creating a **Master Password**

After setup, use the password to log in on subsequent visits.

## Tech Stack

- **Framework**: Next.js 16 (Turbopack)
- **Database**: SQLite via Prisma ORM
- **Auth**: Client-side SHA-256 password hashing
- **UI**: shadcn/ui + Tailwind CSS

## Project Structure

```
├── prisma/schema.prisma    # Database schema
├── src/app/actions.ts      # Server Actions (CRUD)
├── src/lib/auth.tsx        # Auth + Setup Wizard
├── src/lib/store.tsx       # Global state (SQLite-backed)
├── src/lib/prisma.ts       # Database connection singleton
├── src/components/         # UI components
├── start-mac.command       # macOS launcher
├── start-windows.bat       # Windows launcher
└── dev.db                  # SQLite database (auto-created)
```

## License

Private — All rights reserved.
