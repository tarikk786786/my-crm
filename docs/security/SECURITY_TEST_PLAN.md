# Security Test Plan: WACRM (WhatsApp CRM)

> **Antigravity Continuous Security Testing & Regression Gate**  

---

## 1. Test Objectives
Ensure that all security-critical boundaries in WACRM remain resilient against regressions after every meaningful code, dependency, or configuration modification.

---

## 2. Test Execution Matrix

| Test Suite | Frequency | Target Command | Scope & Pass Criteria |
| :--- | :--- | :--- | :--- |
| **Static Code Analysis** | Pre-commit & CI | `semgrep scan --config "p/security-audit" --config "p/secrets" --config "p/owasp-top-ten" src` | 0 blocking security findings. |
| **Secret Scanning** | Pre-commit & CI | `gitleaks detect --source .` | 0 live secrets in codebase or git commits. |
| **Automated Unit & Integration** | On every change | `npm test` (`vitest run`) | All 1,509+ tests pass without regressions. |
| **Type Integrity Check** | On every change | `npm run typecheck` (`tsc --noEmit`) | 0 type errors. |
| **Dependency CVE Scan** | Weekly / On bump | `npm audit` | No unaddressed Critical or High CVEs in production dependencies. |
| **Encryption Integrity** | On crypto change | `npx vitest run src/lib/whatsapp/encryption.test.ts` | Complete round-trip and tamper rejection with AES-256-GCM. |
| **Webhook Signature Verification** | On webhook change | `npx vitest run src/lib/whatsapp/webhook-signature.test.ts` | HMAC-SHA256 signature enforcement passes all edge cases. |

---

## 3. Mandatory Security Verification Checklist
Before presenting any feature or patch as complete:
- [ ] Run `gitleaks detect` across the workspace.
- [ ] Run `semgrep scan` with OWASP and security-audit rule packs.
- [ ] Run `npm run typecheck` and verify 0 errors.
- [ ] Run `npm test` and verify all tests pass.
- [ ] Verify that no unredacted API keys, credentials, or personal tokens appear in terminal logs.
