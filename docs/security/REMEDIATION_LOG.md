# Security Remediation Log: WACRM (WhatsApp CRM)

> **Antigravity Vulnerability Remediation Tracking**  

---

## Logged Findings & Actions

### VULN-001: Missing Explicit GCM Authentication Tag Length in Decipher and Cipher Construction
- **Date Identified**: 2026-10-25
- **Severity**: High / Blocking
- **Tool**: Semgrep Static Application Security Testing (`javascript.node-crypto.security.gcm-no-tag-length.gcm-no-tag-length`)
- **File**: `src/lib/whatsapp/encryption.ts`
- **Description**: 
  The calls to `crypto.createCipheriv` and `crypto.createDecipheriv` with `aes-256-gcm` were invoked without explicitly declaring `{ authTagLength: AUTH_TAG_LENGTH }` in the options object. In Node.js crypto, failing to enforce expected tag length at construction time can allow an attacker to attempt tag truncation or spoofing if shorter authentication tags are permitted by runtime defaults.
- **Root Cause**:
  Omission of options argument in `createCipheriv` and `createDecipheriv`.
- **Remediation**:
  Updated both `createCipheriv` and `createDecipheriv` in `src/lib/whatsapp/encryption.ts` to pass `{ authTagLength: AUTH_TAG_LENGTH }`:
  ```typescript
  const cipher = crypto.createCipheriv(
    'aes-256-gcm',
    Buffer.from(ENCRYPTION_KEY, 'hex'),
    iv,
    { authTagLength: AUTH_TAG_LENGTH },
  )

  const decipher = crypto.createDecipheriv(
    'aes-256-gcm',
    Buffer.from(ENCRYPTION_KEY, 'hex'),
    iv,
    { authTagLength: AUTH_TAG_LENGTH },
  )
  ```
- **Retest Verification**:
  - `semgrep scan`: 0 findings (blocking finding cleared).
  - `vitest run src/lib/whatsapp/encryption.test.ts`: 15 passed in 169ms.
  - Full test suite: 1,509 tests passed.
  - TypeScript typecheck: 0 errors.
- **Status**: **RESOLVED**

---

### VULN-002: Upstream Dependency Advisories in Next.js & Zod
- **Date Identified**: 2026-10-25
- **Severity**: Critical (Next.js SVG optimization) / High (Zod memory exhaustion)
- **Tool**: `npm audit`
- **Component**: `next@16.3.8`, `zod@<4.6.6`
- **Advisories**:
  - `GHSA-2464-fhr4-w9xw`: Next.js Unauthenticated Remote Code Execution in Image Optimization API when SVG files are used.
  - `GHSA-mrhx-c7xc-m3w5`: Zod memory exhaustion while validating oversized constrained collections.
  - `GHSA-27r3-jxmh-p828`: body-parser Denial of Service via trailing bytes.
- **Mitigation & Plan**:
  - WACRM does not expose external SVG image optimization to unauthenticated arbitrary users directly.
  - Fix requires upgrading Next.js to 16.4.3+ and updating shadcn/zod dependencies.
  - Status: Tracked for upstream minor/patch upgrade.
