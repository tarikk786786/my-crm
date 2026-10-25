# Incident Response Plan: WACRM (WhatsApp CRM)

> **Antigravity Operational Security & Recovery Guide**  

---

## 1. Incident Classification & Severity

| Level | Impact | Examples | Response Target |
| :--- | :--- | :--- | :--- |
| **SEV-1 (Critical)** | Active token compromise, database breach, unauthorized message broadcast. | Leaked `ENCRYPTION_KEY`, leaked Supabase service role key, hijacked Meta System User token. | Immediate containment (< 1 hour). |
| **SEV-2 (High)** | Webhook forgery, RLS bypass, denial of service. | Invalid webhook signatures accepted, cross-tenant contact access. | Within 4 hours. |
| **SEV-3 (Medium)** | Flaw in rate limiting, suspicious failure spikes. | Repeated failed login attempts, unusual webhook volume. | Within 24 hours. |

---

## 2. Containment & Remediation Playbooks

### Playbook A: WhatsApp Business API Token Compromise
1. **Immediate Revocation**:
   - Access **Meta Business Manager** → **System Users**.
   - Revoke the compromised system user access token immediately.
   - Generate a fresh permanent System User Token with `whatsapp_business_messaging` and `whatsapp_business_management` permissions.
2. **Re-key Application**:
   - Update `whatsapp_config` in WACRM Dashboard (Settings → WhatsApp) with the newly generated token.
3. **Audit Outbound Dispatches**:
   - Query `messages` table for messages dispatched during the incident window to detect unauthorized broadcasts.

### Playbook B: Compromised `ENCRYPTION_KEY`
1. **Containment**:
   - Generate a new 64-character hex key:
     ```bash
     node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
     ```
2. **Key Rotation Protocol**:
   - Deploy the new key to hosting environment (`ENCRYPTION_KEY`).
   - Note: Rotating `ENCRYPTION_KEY` invalidates previously encrypted tokens in `whatsapp_config`.
   - Prompt all connected accounts/WABAs to re-save their WhatsApp connection settings in the dashboard.

### Playbook C: Compromised Supabase Service Role Key
1. **Rotate in Supabase**:
   - Go to **Supabase Dashboard** → **Project Settings** → **API**.
   - Click **Generate New Secret** for the `service_role` key.
2. **Update Environment**:
   - Replace `SUPABASE_SERVICE_ROLE_KEY` in environment variables.
   - Restart the Next.js runtime.

---

## 3. Post-Incident Review
1. Document the incident timeline, root cause, and blast radius.
2. Update `docs/security/REMEDIATION_LOG.md`.
3. Add regression test cases to prevent recurrence.
