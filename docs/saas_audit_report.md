# SaaS Readiness Audit Report: Prasan ERP

**Date:** May 2026
**Status:** Architectural Review (Pre-SaaS Migration)
**Auditor:** Antigravity AI

---

## 1. Database & Persistence Layer
> [!CAUTION]
> **SQLite is a blocker for SaaS.**

*   **Current State:** The application uses a local `dev.db` file (SQLite).
*   **The Problem:** SQLite is designed for single-user or low-concurrency scenarios. In a multi-tenant SaaS, multiple organizations performing write operations simultaneously will trigger "Database is Locked" errors. Furthermore, file-based databases are wiped on every redeploy in serverless environments (Vercel, Netlify).
*   **Requirement:** Migrate to a hosted **PostgreSQL** or **MySQL** database. Use a connection pooler (like Prisma Accelerate or Supabase) to handle high concurrency.

## 2. Multi-Tenancy & Identity Management
> [!WARNING]
> **Missing User-Level Authentication.**

*   **Current State:** Authorization is tied to an "Organization Password." There is no concept of an individual User.
*   **The Problem:** In a SaaS, one user (e.g., an accountant) often needs access to multiple organizations. Conversely, one organization needs to manage multiple users with different permissions (Owner, Staff, Auditor).
*   **Requirement:** 
    *   Implement a `User` model.
    *   Create a `Membership` table to link Users to Organizations.
    *   Implement **RBAC (Role-Based Access Control)** to prevent staff from deleting sensitive financial data.

## 3. Data Isolation & Routing
> [!IMPORTANT]
> **OrgID must move to the URL.**

*   **Current State:** The `activeOrgId` is stored in `localStorage` and managed by the global store.
*   **The Problem:** Sharing links is impossible. If a user opens a direct link to an invoice, the application will default to their *last used* organization from their own `localStorage`, causing a "Not Found" error or, worse, a data leak attempt.
*   **Requirement:** Move the Organization ID into the URL path: `app.prasan.com/[orgId]/dashboard`. This ensures the server and client are always in sync regarding the context.

## 4. Compliance & Auditability
> [!NOTE]
> **Zero Audit Trail.**

*   **Current State:** Changes are made directly to the database with no record of who performed the action.
*   **The Problem:** ERP systems handle business-critical financial data. For legal compliance and fraud prevention, every `create`, `update`, and `delete` must be logged.
*   **Requirement:** Implement an `AuditLog` table that records:
    *   Timestamp
    *   User ID
    *   Action Type (e.g., "Invoice Deleted")
    *   Changes (JSON diff of old vs new data)

## 5. Security & Infrastructure
*   **Session Secrets:** Secrets are currently generated on the server at boot time. In a multi-server SaaS environment, this causes session mismatches. Secrets must be centralized via environment variables.
*   **Rate Limiting:** The API endpoints are currently unprotected. A single bot could spam the "Add Account" endpoint and crash the database. Implement middleware-level rate limiting.
*   **Media Storage:** There is no provision for file uploads (Receipts, Logos). SaaS users expect to attach digital copies of physical documents. Integration with **AWS S3** or **Google Cloud Storage** is required.

## 6. Business Operations (SaaS Monetization)
*   **Subscription Logic:** No integration with payment gateways (Stripe/Razorpay).
*   **Usage Quotas:** No logic to limit "Free Tier" users to a specific number of invoices or accounts.
*   **Email Engine:** The system cannot send invoices to customers via email. Integration with **SendGrid** or **Amazon SES** is needed.

---

## Conclusion
The application is a high-quality **Local Management Tool**, but it is currently **unfit for SaaS deployment**. Transitioning will require a total refactor of the Authentication and Database layers.
