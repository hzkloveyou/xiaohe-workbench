# Project Lessons Ledger Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build and install one centralized personal Skill that captures a validated, secret-free project experience record at the end of every software project and keeps an identical project backup.

**Architecture:** `project-lessons-ledger` keeps a concise workflow in `SKILL.md`, a flat catalog plus one reference file per project, and a deterministic PowerShell validator. The personal Skills directory is canonical for discovery; the current project backup under `C:\Users\Tom\Desktop\project\ai-skills` must match it byte-for-byte.

**Tech Stack:** Codex Skills, Markdown/YAML, Windows PowerShell, SHA-256, skill-creator `init_skill.py` and `quick_validate.py`.

## Global Constraints

- Skill name is exactly `project-lessons-ledger`.
- Personal copy is `C:\Users\Tom\.codex\skills\project-lessons-ledger`.
- Current project copy is `C:\Users\Tom\Desktop\project\ai-skills\project-lessons-ledger`.
- Project records use the concrete naming form `references\YYYY-MM-DD-project-slug.md` and remain one level below `SKILL.md`.
- The Skill runs after fresh project verification and before the final completion handoff.
- Existing project records receive dated revision sections; duplicate slugs are invalid.
- No password, password proof, recovery code, cookie, OAuth credential, API token, private key, or provider credential file may enter the ledger.
- Current execution policy prohibits subagents; use `superpowers:executing-plans` inline.

---

### Task 1: Baseline ledger contract test

**Files:**
- Create: `work/test-project-lessons-ledger.ps1`
- Test target: `C:\Users\Tom\Desktop\project\ai-skills\project-lessons-ledger`

**Interfaces:**
- Consumes: the storage and record contracts in the approved design.
- Produces: an executable structural test that returns exit 1 with explicit missing requirements or prints `Project lessons ledger checks passed.`.

- [ ] **Step 1: Write the failing structural test**

Create an ASCII-only PowerShell script with:

```powershell
param([string]$LedgerRoot = "C:\Users\Tom\Desktop\project\ai-skills\project-lessons-ledger")
$ErrorActionPreference = "Stop"
$failures = [System.Collections.Generic.List[string]]::new()

function Require-Text([string]$RelativePath, [string[]]$Patterns) {
  $path = Join-Path $LedgerRoot $RelativePath
  if (-not (Test-Path -LiteralPath $path -PathType Leaf)) {
    $failures.Add("missing file: $RelativePath")
    return
  }
  $content = Get-Content -LiteralPath $path -Raw -Encoding utf8
  foreach ($pattern in $Patterns) {
    if ($content -notmatch $pattern) { $failures.Add("$RelativePath missing: $pattern") }
  }
}

Require-Text "SKILL.md" @(
  "name: project-lessons-ledger",
  "description: Use when",
  "references/catalog.md",
  "scripts/validate-ledger.ps1"
)
Require-Text "agents/openai.yaml" @("display_name:", "short_description:", '\$project-lessons-ledger')
Require-Text "references/catalog.md" @("xiaohe-workbench", "2026-07-15-xiaohe-workbench.md")
Require-Text "references/2026-07-15-xiaohe-workbench.md" @(
  "## Project identity",
  "## Delivered outcome",
  "## Architecture and decisions",
  "## Failures, root causes, and prevention",
  "## Verified commands and evidence",
  "## Security boundaries",
  "## Deployment, rollback, and recovery",
  "## Reusable lessons",
  "## Remaining risks and next action",
  "## Revision history",
  "PBKDF2",
  "wrangler tail",
  "public/CNAME",
  "52 tests"
)
Require-Text "scripts/validate-ledger.ps1" @("CompareRoot", "sha256", "duplicate", "Potential secret")

if ($failures.Count) {
  $failures | ForEach-Object { Write-Output "FAIL: $_" }
  exit 1
}
Write-Output "Project lessons ledger checks passed."
```

- [ ] **Step 2: Run the test and verify RED**

Run:

```powershell
& .\work\test-project-lessons-ledger.ps1
```

Expected: exit 1 with `missing file: SKILL.md` and other missing-file messages because the ledger does not exist.

- [ ] **Step 3: Record the observed baseline**

Create `work/project-lessons-ledger-baseline.md` recording that, without the meta-skill, project completion does not automatically create a reusable Skill, catalog entry, secret scan, or synchronized project copy. Include the Xiaohe project's real late-stage lesson packaging as evidence.

### Task 2: Skill workflow and deterministic validator

**Files:**
- Create: `C:\Users\Tom\Desktop\project\ai-skills\project-lessons-ledger\SKILL.md`
- Create: `C:\Users\Tom\Desktop\project\ai-skills\project-lessons-ledger\agents\openai.yaml`
- Create: `C:\Users\Tom\Desktop\project\ai-skills\project-lessons-ledger\scripts\validate-ledger.ps1`
- Test: `work/test-project-lessons-ledger.ps1`

**Interfaces:**
- Consumes: `references/catalog.md` and flat dated project records.
- Produces: `validate-ledger.ps1 -LedgerRoot 'C:\Users\Tom\Desktop\project\ai-skills\project-lessons-ledger' [-CompareRoot 'C:\Users\Tom\.codex\skills\project-lessons-ledger']`, exiting nonzero on missing sections, broken catalog references, duplicate slugs, secret patterns, or copy divergence.

- [ ] **Step 1: Initialize the Skill**

Run `init_skill.py` with resources `scripts,references` and these exact interface values:

```text
display_name=项目经验总账
short_description=在每个软件项目完成时沉淀、验证并同步可复用的项目经验
default_prompt=使用 $project-lessons-ledger 完成项目收尾并更新集中式经验总账。
```

- [ ] **Step 2: Write `SKILL.md`**

Use this frontmatter:

```yaml
---
name: project-lessons-ledger
description: Use when a software project is about to be declared complete, delivered, deployed, recovered, or handed off, especially after implementation, infrastructure work, production debugging, verification, or retrospective review.
---
```

The body must require: fresh verification first; catalog lookup; create/update one dated project record; secret scan; standard Skill validation; synchronize both copies; compare relative paths and SHA-256; mention the ledger update in the final response. Keep `SKILL.md` under 500 words and route details to `references/catalog.md` and the relevant project file.

- [ ] **Step 3: Write `agents/openai.yaml`**

```yaml
interface:
  display_name: "项目经验总账"
  short_description: "在每个软件项目完成时沉淀、验证并同步可复用的项目经验"
  default_prompt: "使用 $project-lessons-ledger 完成项目收尾并更新集中式经验总账。"
```

- [ ] **Step 4: Write the validator**

Implement these exact behaviors:

```powershell
param(
  [Parameter(Mandatory = $true)][string]$LedgerRoot,
  [string]$CompareRoot = ""
)

$requiredHeadings = @(
  "## Project identity",
  "## Delivered outcome",
  "## Architecture and decisions",
  "## Failures, root causes, and prevention",
  "## Verified commands and evidence",
  "## Security boundaries",
  "## Deployment, rollback, and recovery",
  "## Reusable lessons",
  "## Remaining risks and next action",
  "## Revision history"
)
$secretPatterns = @(
  'gh[pousr]_[A-Za-z0-9]{20,}',
  'github_pat_[A-Za-z0-9_]{20,}',
  'Bearer\s+[A-Za-z0-9._-]{20,}',
  'xiaohe_session\s*=',
  'CLOUDFLARE_API_TOKEN\s*[:=]\s*[A-Za-z0-9_-]{20,}',
  '-----BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY-----'
)
```

Enumerate `references\????-??-??-*.md`, extract each slug after the date, reject duplicate slugs, require every heading, require the catalog to contain the relative path, scan every text file for secret patterns, and optionally compare both roots by relative file list, length, and SHA-256. Print compact JSON on success.

- [ ] **Step 5: Run the structural test**

Expected: still fails only because `catalog.md` and the Xiaohe project record do not yet exist. Validator code and Skill metadata checks must pass.

### Task 3: Catalog and Xiaohe Workbench experience record

**Files:**
- Create: `C:\Users\Tom\Desktop\project\ai-skills\project-lessons-ledger\references\catalog.md`
- Create: `C:\Users\Tom\Desktop\project\ai-skills\project-lessons-ledger\references\2026-07-15-xiaohe-workbench.md`
- Test: `work/test-project-lessons-ledger.ps1`

**Interfaces:**
- Consumes: verified source, deployment configuration, existing handoff package, and design facts.
- Produces: one searchable catalog row and one complete project record matching the validator headings.

- [ ] **Step 1: Create the catalog**

Use a Markdown table with columns Date, Project, Slug, Stack/providers, Main lessons/error signatures, and Record. The Xiaohe row must include keywords React, Vite, GitHub Pages, Cloudflare Workers, D1, PBKDF2, `ETIMEDOUT`, `Connection was reset`, and `Resource not accessible by integration`; link to `references/2026-07-15-xiaohe-workbench.md`.

- [ ] **Step 2: Create the project record**

Populate every required heading with verified facts from the approved design and existing handoff package. Include:

- Repository `hzkloveyou/xiaohe-workbench`, release commit `f05776f09d9261dd80954aaab394f775a3b654ed`, production URLs, Workers, D1 identity, and local paths.
- GitHub Pages plus Worker Route proxy architecture and intentional absence of `public/CNAME`.
- Browser-side 310,000-iteration PBKDF2 proof and Free Worker 10 ms CPU failure.
- Custom-domain/DNS scope conflict, `wrangler tail` `ETIMEDOUT`, Git transport reset, GitHub App permission failure, PWA `ignoreVary`, `.wrangler` ESLint exclusion, and GET-vs-HEAD health behavior.
- Verified evidence: 18 test files / 52 tests, Playwright 8 passed / 2 skipped, desktop/mobile no console errors, and complete temporary account lifecycle.
- Future-project golden path and systematic debugging loop.
- Manual Worker CI token requirement and other remaining risks.

Do not copy any credential, password, password proof, recovery code, cookie, or token value.

- [ ] **Step 3: Run GREEN checks**

```powershell
& .\work\test-project-lessons-ledger.ps1
& 'C:\Users\Tom\Desktop\project\ai-skills\project-lessons-ledger\scripts\validate-ledger.ps1' `
  -LedgerRoot 'C:\Users\Tom\Desktop\project\ai-skills\project-lessons-ledger'
```

Expected: structural test passes; validator prints JSON with one project and zero secrets.

- [ ] **Step 4: Run negative validator tests**

Copy the ledger into unique temporary fixtures under `work` and verify nonzero exit for:

1. Missing required heading.
2. Catalog path pointing to a missing file.
3. A second dated file with the same `xiaohe-workbench` slug.
4. A text fixture containing `github_pat_` plus 20 alphanumeric characters.

Each failure must contain the relevant reason; remove no real ledger files.

### Task 4: Validate, install, and synchronize

**Files:**
- Validate: `C:\Users\Tom\Desktop\project\ai-skills\project-lessons-ledger`
- Create/update: `C:\Users\Tom\.codex\skills\project-lessons-ledger`

**Interfaces:**
- Consumes: validated project copy.
- Produces: identical personal and project copies and a discoverable handoff reference.

- [ ] **Step 1: Run official Skill validation**

Run `quick_validate.py` with an isolated PyYAML path if the default interpreter lacks `yaml`. Expected: `Skill is valid!`.

- [ ] **Step 2: Scan for secrets**

Run the validator's secret scan across the ledger and manually search for common token prefixes, private-key headers, session-cookie assignments, and credential file paths. Expected: zero matches.

- [ ] **Step 3: Install the personal copy**

Use non-destructive `robocopy /E` from the project copy to `C:\Users\Tom\.codex\skills\project-lessons-ledger`. Do not use `/MIR` and do not delete any other personal Skill.

- [ ] **Step 4: Compare copies**

```powershell
& 'C:\Users\Tom\Desktop\project\ai-skills\project-lessons-ledger\scripts\validate-ledger.ps1' `
  -LedgerRoot 'C:\Users\Tom\Desktop\project\ai-skills\project-lessons-ledger' `
  -CompareRoot 'C:\Users\Tom\.codex\skills\project-lessons-ledger'
```

Expected: compact JSON with `projects: 1`, `secrets: 0`, and `copiesMatch: true`.

### Task 5: Final verification and source handoff

**Files:**
- Verify: all files above
- Update: `docs/superpowers/plans/2026-07-15-project-lessons-ledger.md` checkboxes as executed

**Interfaces:**
- Consumes: both installed copies and all tests.
- Produces: fresh evidence suitable for the final user-facing completion claim.

- [ ] **Step 1: Run complete ledger verification**

Run the structural test, positive validator, four negative cases, official Skill validator, secret scan, and copy comparison. All positive checks pass and every negative fixture fails for the intended reason.

- [ ] **Step 2: Verify existing project assets remain intact**

Confirm `C:\Users\Tom\Desktop\project\package.json`, `dist\index.html`, the prior handoff folder/ZIP, and the user's DOCX still exist.

- [ ] **Step 3: Inspect repository status**

Confirm only the design/plan documentation intended for Git is committed. The personal Skill and Desktop project backup stay outside Git unless the user later requests otherwise.

- [ ] **Step 4: Commit the implementation-plan progress**

```powershell
git add docs/superpowers/plans/2026-07-15-project-lessons-ledger.md
git commit -m "docs: plan project lessons ledger implementation"
```

- [ ] **Step 5: Report completion**

Report both ledger paths, the first project record, validator results, and the exact invocation `$project-lessons-ledger`. Do not claim automatic future use without confirming the personal Skill copy exists and validates.
