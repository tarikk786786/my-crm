# STRIDE Threat Model: WACRM (WhatsApp CRM)

> **Antigravity Threat Modeling Artifact**  
> **Target**: WACRM Core Web Application, Webhook Ingestion, and WhatsApp API Pipeline  
> **Methodology**: Microsoft STRIDE  

---

## 1. System Context & Trust Boundaries
```
[External: Meta WhatsApp API]
       |
       | HTTPS POST (Inbound Webhook with x-hub-signature-256)
       v
[Boundary 1: Next.js Edge / API Route (/api/whatsapp/webhook)]
       |
       | Validated Payload & Idempotency Key (wamid)
       v
[Boundary 2: Application Service Layer & Automation Engine]
       |
       | Row-Level Security & Service-Role RPCs
       v
[Boundary 3: Supabase PostgreSQL Database & Storage]
       ^
       | User Session Cookie (Supabase Auth SSR)
[Boundary 4: Next.js Client Dashboard / Browser]
```

---

## 2. STRIDE Threat Analysis

### 2.1 Spoofing (Identity & Authenticity)
- **Threat**: Attacker sends forged WhatsApp inbound messages to `/api/whatsapp/webhook` to trigger fake leads or automated workflows.
  - **Mitigation**: Webhook requires valid HMAC-SHA256 signature in `x-hub-signature-256` matching `META_APP_SECRET`.
  - **Verification**: `src/lib/whatsapp/webhook-signature.test.ts` verifies tamper rejection, missing secret fail-closed, and invalid hex handling.
- **Threat**: Attacker calls `/api/v1/*` public endpoints with forged credentials.
  - **Mitigation**: API keys are hashed and authenticated against database entries; invalid keys receive 401 Unauthorized.

### 2.2 Tampering (Data Integrity)
- **Threat**: Modification of WhatsApp access tokens stored in the database.
  - **Mitigation**: Tokens are encrypted using AES-256-GCM with a 16-byte authentication tag (`AUTH_TAG_LENGTH = 16`). Any flipped bit or tag corruption throws an error during decryption.
  - **Verification**: `src/lib/whatsapp/encryption.test.ts` tests ciphertext bit-flipping and tamper rejection.
- **Threat**: Replay of webhook messages causing duplicate broadcasts or messages.
  - **Mitigation**: Idempotency checks on Meta `wamid` ensure duplicate deliveries are discarded.

### 2.3 Repudiation
- **Threat**: Disputed broadcast or customer message dispatch without logs.
  - **Mitigation**: All outbound messages, delivery statuses, failure reasons, and webhook events are persisted with timestamps and delivery metadata in Supabase tables.

### 2.4 Information Disclosure
- **Threat**: Exposure of tenant contacts or conversations across account boundaries.
  - **Mitigation**: Supabase PostgreSQL Row-Level Security (RLS) policies isolate accounts by `account_id` and verified membership.
  - **Mitigation**: Token and key redaction in logging and error handling.

### 2.5 Denial of Service
- **Threat**: Massive incoming HTTP POST bodies crashing webhook route or exhausting memory.
  - **Mitigation**: Webhook route limits Content-Length and incoming stream to 512KB (`oversized body cap`), answering `413 Payload Too Large`.
  - **Mitigation**: Rate limiting applied to sensitive API routes.

### 2.6 Elevation of Privilege
- **Threat**: A team member with `viewer` role attempting to send messages or configure WhatsApp accounts.
  - **Mitigation**: Role check `requireRole('agent')` enforced server-side in `/api/whatsapp/send/route.ts` and related endpoints.
  - **Verification**: `src/app/api/whatsapp/send/route.test.ts` verifies that `viewer` requests receive 403 Forbidden.
