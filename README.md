# Prasan Manufacturing Business Suite

**Prasan Manufacturing Business Suite** is a production-grade ERP solution designed for modern manufacturing enterprises. It combines robust accounting, inventory synchronization, and label generation into a single, high-performance local application.

---

## 🌟 Key Features

### 🏢 Core Management
*   **Multi-Organization Support**: Manage multiple business entities with complete data isolation.
*   **Dynamic Dashboard**: Real-time analytics for revenue, pending payments, and stock levels.
*   **Settings Engine**: Toggle global behaviors like "Strict Inventory Invoicing" or "Auto-Linked Ledgers."

### 🧾 Financials & Invoicing
*   **Professional Invoicing**: Generate sleek, branded invoices with auto-calculated taxes and discounts.
*   **PDF Export**: High-quality PDF generation for invoices and account statements.
*   **Smart Ledgers**: O(1) incremental balance tracking for high scalability. Manage Direct and Agency customers with ease.
*   **Automatic Reconciliation**: Invoices can be auto-linked to ledgers, ensuring your books are always in sync.

### 📦 Inventory & Manufacturing
*   **Lifecycle Tracking**: Manage Raw Materials, Work-in-Progress (WIP), and Finished Goods.
*   **Strict Synchronization**: Optional inventory-invoice link that automatically deducts stock upon sale and returns it upon deletion/return.
*   **Manufacturing Costs**: Track raw material usage and job-work costs for accurate product pricing.

### 🏷️ Barcode & Labeling
*   **Label Generator**: Create professional thermal labels with Style, Size, and Rate information.
*   **Batch Printing**: Generate labels in bulk for thermal printers (Zebra, TSC, etc.) with a single click.
*   **Invoice Integration**: Print barcodes directly from your invoice line items.

---

## 🔒 Enterprise Security

This suite is built with a "Security-First" architecture:
*   **Bcrypt Hashing**: Industry-standard password encryption with automatic legacy migration.
*   **Environment Secrets**: Cryptographically secure session management using `SESSION_SECRET`.
*   **Transactional Integrity**: All financial and inventory mutations use ACID-compliant database transactions to prevent data corruption.
*   **XSS Protection**: Sanitized label generation engine to prevent script injection.
*   **Input Validation**: Strict server-side validation to prevent negative quantities or rates.

---

## 🚀 Getting Started

### Prerequisites
*   [Node.js](https://nodejs.org) v18 or later

### The "One-Click" Launch
The suite includes self-healing startup scripts that automatically handle dependency installation and database migrations:
*   **macOS**: Double-click `start-mac.command`
*   **Windows**: Double-click `start-windows.bat`

*Note: These scripts automatically generate a unique security secret for your installation.*

---

## 🛠️ Tech Stack
*   **Framework**: Next.js 16 (App Router + Server Actions)
*   **ORM**: Prisma with SQLite
*   **Security**: Bcrypt.js + Jose (JWT)
*   **UI**: Shadcn/UI + Tailwind CSS + Framer Motion
*   **Utilities**: bwip-js (Barcodes), jsPDF (Documents)

---

## 📁 Project Structure
```text
├── prisma/schema.prisma    # Data models & relations
├── src/app/actions.ts      # Hardened Server Actions (Business Logic)
├── src/proxy.ts            # Global network boundary & session verification
├── src/lib/                # Core utilities (Auth, Sessions, Barcodes)
├── src/components/         # Modular UI Page components
├── docs/                   # SaaS & Mobile expansion plans
├── start-mac.command       # Auto-healing macOS launcher
└── start-windows.bat       # Auto-healing Windows launcher
```

---

## 📄 License
Private — All rights reserved. Built for Prasan Business Suite.
