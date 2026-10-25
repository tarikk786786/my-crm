# Security Audit: WACRM (WhatsApp CRM)

> **Antigravity Master Security Directive Baseline Audit**  
> **Repository**: [ArnasDon/wacrm](https://github.com/ArnasDon/wacrm)  
> **Audit Date**: 2026-10-25  
> **Status**: Verified & Remediated  

---

## 1. Executive Summary
WACRM is an open-source, self-hostable Customer Relationship Management (CRM) template designed specifically for WhatsApp Business Cloud API. It provides shared team inboxes, contact management, sales pipelines, broadcast messaging, and no-code flow automations.

In accordance with the **Antigravity Master Security Directive**, a baseline security audit was conducted covering static code analysis, secret detection, dependency scanning, cryptographic controls, and full test suite regression.

---

## 2. Technical Stack & Environment
- **Framework**: Next.js 16.3.8 (App Router), React 19.2.4
- **Language**: TypeScript (Node.js >= 22.12.0)
- **Styling & UI**: Tailwind CSS v4, Lucide React, Recharts, @xyflow/react
- **Database**: Supabase (PostgreSQL) with 59 migration scripts enforcing Row-Level Security (RLS)
- **Authentication**: Supabase Auth (`@supabase/ssr`) with cookie-based sessions, plus hashed Bearer API tokens for the `/api/v1/*` Public API
- **External Integrations**: Meta WhatsApp Business Cloud API (Graph API)

---

## 3. Attack Surface & Trust Boundaries
1. **Inbound Webhook (`/api/whatsapp/webhook`)**:
   - Accepts unauthenticated HTTP POST from Meta with WhatsApp events.
   - Enforces HMAC-SHA256 signature verification (`x-hub-signature-256`) against `META_APP_SECRET`.
   - Rejects unconfigured secrets fail-closed.
   - Limits payload size to 512KB and enforces message deduplication (`wamid` idempotency).
2. **Public REST API (`/api/v1/*`)**:
   - Authenticated via hashed API keys stored in Supabase (`api_keys` table).
   - Rate limiting and scope validation on contacts, broadcasts, and messages.
3. **WhatsApp Credential Encryption (`src/lib/whatsapp/encryption.ts`)**:
   - Access tokens encrypted at rest using AES-256-GCM with a 32-byte hexadecimal master key (`ENCRYPTION_KEY`).
   - Uses 12-byte IV and 16-byte authentication tag.
4. **Media Proxy & Inbound Mirroring (`/api/whatsapp/media/*`)**:
   - Proxies and mirrors media attachments from Meta Graph API into Supabase storage buckets.
   - Enforces MIME-type allowlists and file size bounds.
5. **Automation & Flow Engine (`/api/automations/*`, `/api/flows/*`)**:
   - Validates multi-tenant isolation so automation runs cannot manipulate contacts or conversations outside the authenticated tenant account.

---

## 4. Audit Execution & Baseline Findings

| Category | Tool | Scope | Status | Notes |
| :--- | :--- | :--- | :--- | :--- |
| **Secrets Detection** | Gitleaks v8.x | 494 git commits | **Passed** | 8 false positives detected in docs (`docs/public-api.md` dummy tokens); 0 active secrets in code. |
| **Static Analysis (SAST)** | Semgrep v1.169.0 | 483 files (`src/`) | **Remediated** | Detected 1 High/Blocking issue in `encryption.ts` (missing explicit GCM `authTagLength`). Fixed and verified (0 findings). |
| **Unit & Integration Tests** | Vitest v5.0.5 | 135 test suites | **Passed** | 1,509 tests executed and passed (100% pass rate). |
| **Type Integrity** | TypeScript `tsc` | Whole project | **Passed** | 0 compile errors. |
| **Dependency CVEs** | `npm audit` | `package-lock.json` | **Documented** | Identified upstream CVEs in Next.js 16.3.8 image optimization and Zod; logged for future version bump. |

---

## 5. Security Posture Assessment
WACRM implements high-grade defensive patterns:
- Multi-WABA secret support with HMAC-SHA256 signature verification.
- Fail-closed configuration checks.
- SQL injection immunity via Supabase client parameterization.
- Multi-tenant tenant boundary checks in automation triggers (`GHSA-63cv-2c49-m5v3`).
- Cryptographic authentication tag verification on sensitive access tokens.
