# Claude Code Plugin & Skill Directory
**Compiled:** August 25, 2026 · **Updated:** with direct category-level verification
**Sources cross-checked:** claude.com/plugins (Anthropic official), claudeskills.info (scans GitHub `.claude-plugin` manifests directly — most rigorous, category-filterable methodology found), skillsllm.com, claudemarketplaces.com, buildwithclaude.com, skillselion.com, aitmpl.com, mcpmarket.com, plus direct GitHub verification.

> **Type key:** `Official` = Anthropic-reviewed, in `claude.com/plugins`. `Vendor OSS` = open source, published by the company itself. `Community OSS` = open source, independent maintainer — review the code before installing.
>
> **On star counts:** Verified directly against claudeskills.info category pages where possible (marked ✓). These move fast and are attention signals, not quality/safety signals. **Cross-source variance is real, not just a hedge:** the same repo (`leonxlnx/taste-skill`) shows 65.8K★ on claudeskills.info vs. 80.2K★ on skillsllm.com — a ~14K-star gap between two trackers scanning the same GitHub repo at roughly the same time. Treat every number in this file as directional, not exact.
>
> **All five sources supplied by the user were checked directly.** Of those five, only `claudemarketplaces.com` (main site) and `skillsllm.com` provided usable ranking/security-scan data; `claudemarketplaces.com/advertise` is an ad-rate page, `mcpmarket.com/server` indexes MCP *servers* (a different category from plugins/skills), and `buildwithclaude.com` / `aitmpl.com` are large but not star-sorted, so they weren't usable for "best/top" claims without opening each entry individually.

---

## UNIVERSAL / Cross-Category (not tied to one stack)

| Rank | Name | Type | Stars ✓ | What it does | URL |
|---|---|---|---|---|---|
| 1 | **Superpowers** | Community OSS | 258.7K★ | Core methodology: TDD, debugging, collaboration patterns, subagent workflows | https://github.com/obra/superpowers |
| 2 | **ECC** | Community OSS | 231.7K★ | Full agent-harness OS — 67 agents, 278 skills, hooks, memory, security scanning | https://github.com/affaan-m/ECC |
| 3 | **andrej-karpathy-skills** | Community OSS | 194.9K★ | Single CLAUDE.md file, 4 behavioral rules. Lowest-risk option here — no code | https://github.com/multica-ai/andrej-karpathy-skills |
| 4 | **Matt Pocock's Skills** | Community OSS | 179.5K★ | Grilling/spec flows, TDD, code review, domain modelling | https://github.com/mattpocock/skills |
| 5 | **prompts.chat** | Community OSS | 166.1K★ | Search thousands of prompts + skills from inside Claude Code via MCP | https://github.com/f/prompts.chat |
| 6 | **anthropics/skills** | Official | 163K★ | Anthropic's own example/document-processing skills (Excel, Word, PPT, PDF, artifacts) | https://github.com/anthropics/skills |
| 7 | **claude-mem** | Community OSS | 88.1K★ | Persistent memory — compresses and re-injects context across sessions | https://github.com/thedotmack/claude-mem |

---

## 1. Full-Stack Development

| Name | Type | Stars/Installs | Description | URL |
|---|---|---|---|---|
| Feature Dev | Official | 138.5K★ (via anthropics/claude-code) | Explore → design → implement → review workflow | https://claude.com/plugins/feature-dev |
| Context7 | Official | — | Live, version-specific library docs pulled into context | https://claude.com/plugins/context7 |
| Supabase | Official | 32.4K★ ✓ | Postgres, auth, storage, real-time from chat | https://claude.com/plugins/supabase |
| Vercel | Official | — | Deployments, builds, logs, domains | https://claude.com/plugins/vercel |
| GitHub | Official | — | Issues, PRs, code review, repo search | https://claude.com/plugins/github |
| alirezarezvani/claude-skills | Community OSS | ~5.2K★ | 345 skills across engineering, product, business — 13 agent platforms | https://github.com/alirezarezvani/claude-skills |

---

## 2. Mobile Development

| Name | Type | Stars ✓ | Description | URL |
|---|---|---|---|---|
| sickn33 mobile bundles (4x) | Community OSS | 43.7K★ | Editorial skill bundles: Mobile App Builder, Expo & React Native, Apple Platform Design, Mobile Developer | https://github.com/sickn33/agentic-awesome-skills |
| Expo (official) | Official | 32.4K★ | React Native build/deploy/upgrade/debug, Expo Router, SwiftUI/Jetpack Compose | https://claude.com/plugins/expo |
| Swift LSP | Official | — | iOS code intelligence (SourceKit-LSP) | https://claude.com/plugins/swift-lsp |
| Kotlin LSP | Official | — | Android code intelligence | https://claude.com/plugins/kotlin-lsp |
| **flutter/agent-plugins** | **Vendor OSS (official Flutter team!)** | 2.7K★ | Official Dart/Flutter plugin + Dart MCP server | https://github.com/flutter/agent-plugins |
| expo/skills | Vendor OSS | 2.3K★ | Expo's own team-maintained skill repo | https://github.com/expo/skills |
| AvdLee/SwiftUI-Agent-Skill | Community OSS | 3.3K★ | SwiftUI state management, view composition, performance, Instruments tracing | https://github.com/AvdLee/SwiftUI-Agent-Skill |
| callstackincubator/agent-skills | Community OSS | 1.6K★ | React Native perf, migration, brownfield adoption (Callstack consultancy) | https://github.com/callstackincubator/agent-skills |
| dpearson2699/swift-ios-skills | Community OSS | 909★ | All 86 iOS/Swift development skills in one plugin | https://github.com/dpearson2699/swift-ios-skills |
| chrisbanes/skills | Community OSS | 854★ | Kotlin, Android, JVM, Jetpack Compose (by well-known Android dev) | https://github.com/chrisbanes/skills |
| Arcturus91/claude-flutter-skill | Community OSS | — | Flutter/Dart: BLoC, Firebase, Material 3, testing | https://github.com/Arcturus91/claude-flutter-skill |

---

## 3. Frontend Development

| Name | Type | Stars ✓ | Description | URL |
|---|---|---|---|---|
| **Frontend Design** | Official | 138.5K★ / 1.13M installs | Non-generic, production-grade code generation | https://claude.com/plugins/frontend-design |
| **UI/UX Pro Max** | Community OSS | 108.3K★ / 320K+ installs | Full design-system reasoning engine — 84 styles, 192 palettes, 74 fonts, 98 UX rules | https://github.com/nextlevelbuilder/ui-ux-pro-max-skill |
| leonxlnx/taste-skill | Community OSS | 65.8K★ | Brutalist, minimalist, soft, redesign design-taste variants | https://github.com/leonxlnx/taste-skill |
| sickn33 frontend bundles | Community OSS | 43.7K★ | Web App Builder, Web Designer editorial skill bundles | https://github.com/sickn33/agentic-awesome-skills |
| saadeghi/daisyui | Community OSS | 41.7K★ | daisyUI component library skill | https://github.com/saadeghi/daisyui |
| wshobson/agents (brand-landingpage) | Community OSS | 38.1K★ | Brand discovery through iterative design to deployment-ready HTML | https://github.com/wshobson/agents |
| TypeScript LSP | Official | — | Type-aware TS/JS editing | https://claude.com/plugins/typescript-lsp |
| Playwright | Official | — | Real browser end-to-end testing | https://claude.com/plugins/playwright |
| greensock/gsap-skills | Vendor OSS (official GSAP) | 12.1K★ | Official GSAP animation skills — tweens, timelines, ScrollTrigger, React hooks | https://github.com/greensock/gsap-skills |

---

## 4. Backend Development

| Name | Type | Stars ✓ | Description | URL |
|---|---|---|---|---|
| payloadcms/payload | Vendor OSS (official Payload) | 43.7K★ | Payload CMS: collections, fields, hooks, access control, DB adapters | https://github.com/payloadcms/payload |
| sickn33 API bundle | Community OSS | 43.7K★ | "AAS API Platform Builder" editorial skill bundle | https://github.com/sickn33/agentic-awesome-skills |
| wshobson/agents (backend-development) | Community OSS | 38.1K★ | Backend API design, GraphQL architecture, Temporal orchestration, TDD | https://github.com/wshobson/agents |
| wshobson/agents (api-scaffolding) | Community OSS | 38.1K★ | REST/GraphQL API scaffolding, framework selection | https://github.com/wshobson/agents |
| Prisma | Official | — | Postgres via Prisma — migrations, queries, schema | https://claude.com/plugins/prisma |
| Postman | Official | — | Full API lifecycle — collections, mocks, OWASP security audits | https://claude.com/plugins/postman |
| MongoDB | Official | — | Query building, schema inspection, aggregation pipelines | https://claude.com/plugins/mongodb |
| Apollo GraphQL (official) | Official | 32.4K★ | Apollo Client/Server/Federation/Router, schema design | https://claude.com/plugins/apollo-skills |
| **supabase/agent-skills** | Vendor OSS (official Supabase) | 2.3K★ | DB, Auth, Storage, Edge Functions, RLS traps | https://github.com/supabase/agent-skills |

*Note: backend has no single mega-viral skill like frontend's UI/UX Pro Max — it's fragmented across many mid-size, framework-specific repos.*

---

## 5. Cloud Platforms (AWS, Azure, GCP)

| Name | Type | Stars/Installs | Description | URL |
|---|---|---|---|---|
| Deploy on AWS | Official | — | Architecture recs, cost estimates, IaC deployment | https://claude.com/plugins/deploy-on-aws |
| aws-core | Official | — | Core AWS services + IaC authoring | https://claude.com/plugins/aws-core |
| AWS Serverless | Official | 32.4K★ ✓ | Lambda/serverless design, deploy, debug | https://claude.com/plugins/aws-serverless |
| azure | Official | — | Azure MCP server + Azure-specific skills | https://claude.com/plugins/azure |
| terraform | Official | — | Multi-cloud IaC (AWS/Azure/GCP) | https://claude.com/plugins/terraform |
| shamis6ali/claude-gcp | Community OSS | — | Fills the GCP gap — Cloud Run, Cloud Build, IAM, safety-hooked | https://github.com/shamis6ali/claude-gcp |

*Note: no Anthropic-verified GCP plugin exists yet — `claude-gcp` and `terraform` are the two practical paths.*

---

## 6. Salesforce

| Name | Type | Stars/Installs | Description | URL |
|---|---|---|---|---|
| agentforce-adlc | Official (Salesforce-built) | — | Author/deploy/test/optimize Agentforce `.agent` files | https://claude.com/plugins/agentforce-adlc |
| forcedotcom/afv-library | Vendor OSS | — | Salesforce's own official skills — Apex, Flow, LWC, SOQL | https://github.com/forcedotcom/afv-library |
| PranavNagrecha/AwesomeSalesforceSkills | Community OSS | Low (early) | 1,000+ skills, 75 agents, live-org MCP — comprehensive but unproven, vet carefully | https://github.com/PranavNagrecha/AwesomeSalesforceSkills |
| Salesforce Hosted MCP Servers | Official (Salesforce) | — | OAuth-secured live CRM read/write, respects org field-level security | https://developer.salesforce.com/docs/platform/hosted-mcp-servers/guide/claude.html |

---

## Quick install reference

```bash
# Anthropic official marketplace (claude.com/plugins entries)
/plugin marketplace add anthropics/claude-plugins-official
/plugin install <plugin-name>@claude-plugins-official

# Any GitHub-hosted community/vendor repo
/plugin marketplace add <owner>/<repo>
/plugin install <plugin-name>@<repo>

# Karpathy CLAUDE.md (no plugin system — just drop the file in)
curl -o CLAUDE.md https://raw.githubusercontent.com/multica-ai/andrej-karpathy-skills/main/CLAUDE.md
```

## Trust hierarchy (roughly, safest → riskiest)
1. `claude.com/plugins` (Anthropic-reviewed)
2. Vendor's own GitHub repo (Salesforce, Supabase, Expo, Flutter, MongoDB, Postman, GSAP, Payload)
3. Well-known team/individual repos (Callstack, Matt Pocock, Chris Banes, AvdLee)
4. Viral solo-maintainer repos (ECC, claude-mem, UI/UX Pro Max, Superpowers, sickn33 bundles)
5. Tiny/unproven repos (AwesomeSalesforceSkills)

Star count does not track this hierarchy. Before installing anything outside `claude.com/plugins`, skim the `hooks/`, `scripts/`, and `.mcp.json` — that's where a plugin gets the ability to run commands or reach the network on your machine. Frontend and Mobile categories install hooks especially often (~1 in 5-7 plugins) — check what triggers them before installing.
