# Candidate Comparison & Foundation Selection Report

> **Project**: Open-Source AI WhatsApp CRM & Super Agent Platform  
> **Status**: Completed & Selected  
> **Architectural Selection**: `apps/wacrm` (Modular Monolith)

---

## 1. Candidate Evaluation Matrix

Each candidate was rigorously assessed against the 10 criteria specified in **MASTER PRD Section 2**:

| Criteria | 1. WACRM (Selected) | 2. Chatwoot | 3. Evolution API | 4. Twenty CRM | 5. n8n / Dify |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **1. Feature Completeness** | Shared inbox, contacts, tags, pipelines, deals, broadcasts, visual flows, BYOK AI | Multi-channel inbox, team live chat, bots, reporting | API-only gateway for WhatsApp Web & Cloud API | Core CRM objects, custom fields, pipeline views | Visual workflow builder, LLM pipelines, prompt engineering |
| **2. Official WhatsApp API** | **Direct native Meta Cloud API** (Webhooks, templates, statuses, media) | Through partner gateways or Meta app configuration | Supported, but primarily tuned for Baileys web client | No native WhatsApp protocol support | Supported via HTTP nodes / community modules |
| **3. AI / LLM Integrations** | Native BYOK (OpenAI, Anthropic, Ollama, LiteLLM) + Super Agent Tool Registry | Basic OpenAI bot integrations | Third-party webhook triggers | Basic AI summaries in development | Advanced agent orchestration & vector RAG |
| **4. Ease of Self-Hosting** | **Very High** (Next.js 16 + React 19 + Supabase PostgreSQL) | Moderate (Ruby on Rails + Sidekiq + Redis + PostgreSQL + Webpack) | High (Single Node.js microservice) | Moderate (NestJS + PostgreSQL + Worker) | High (Single Docker container) |
| **5. Database & Storage** | PostgreSQL with Row-Level Security (RLS) + S3/Supabase Storage | PostgreSQL + Redis + S3-compatible storage | MongoDB or SQLite or PostgreSQL | PostgreSQL + Redis | PostgreSQL or SQLite |
| **6. Security Posture** | AES-256-GCM encrypted keys, tenant isolation, zero Gitleaks/Semgrep findings | Robust security record, active CVE maintenance | Vulnerable to WhatsApp account bans via unofficial web protocol | Clean codebase, active security maintenance | Sustainable security, active community |
| **7. Licensing Freedom** | **MIT License** (100% Permissive, unlimited commercial use and re-branding) | AGPLv3 + Enterprise Edition restrictions | Apache-2.0 / LGPL | AGPLv3 (Copyleft requirement) | Fair-code / Sustainable Use (Non-permissive commercial restrictions) |
| **8. Operating Costs** | **Zero fixed license cost**; runs on minimal server resources (<512MB RAM idle) | Higher memory footprint (>2GB RAM idle); hosting overhead | Low server cost, high operational risk of phone bans | Medium server footprint (>1.5GB RAM) | Low to medium depending on container scale |
| **9. API & Extensibility** | Clean Next.js 16 REST APIs, modular TypeScript libraries | Full REST API, webhooks | Comprehensive REST API | Modern GraphQL & REST APIs | Node-based API webhooks |
| **10. Windows & Portability** | **Native Windows & Linux support**; 1,510 passing automated tests | Ruby on Windows requires WSL2; complex build toolchains | Native Node.js | Native Node.js | Native Node.js / Docker |

---

## 2. Definitive Selection Rationale

### Why `apps/wacrm` is the Optimal Foundation:
1. **Permissive MIT Licensing**: Zero copyleft constraints. Enables complete white-labeling, commercial customization, and self-hosted distribution without legal liability.
2. **Official Meta WhatsApp Compliance**: Bypasses the high risk of WhatsApp Business account bans caused by reverse-engineered browser automation libraries (Baileys/Puppeteer).
3. **Architectural Cohesion**: Combines frontend (Next.js 16 App Router, React 19, Tailwind CSS) and backend in a unified, type-safe TypeScript codebase with 1,510 passing Vitest tests.
4. **Local AI & Multilingual Readiness**: Supports offline local inference via Ollama, LiteLLM routing, and native Hindi/Hinglish/English understanding out of the box.
5. **Integrated Tool Registry**: Extends naturally to provide governed Super Agent tools for contacts, knowledge retrieval, and Shopify e-commerce operations.
