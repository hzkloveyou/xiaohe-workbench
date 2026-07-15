# Project Lessons Ledger Skill Design

Date: 2026-07-15
Status: approved direction, pending written-spec review

## Objective

Create one personal Codex Skill that runs whenever a software project is about to be declared complete, deployed, or handed off. It must capture reusable lessons from that project, add them to a centralized catalog, and keep identical copies in the personal Skills directory and the completed project.

The first record will summarize the Xiaohe Workbench project completed on 2026-07-15.

## Selected approach

Use one centralized Skill named `project-lessons-ledger`.

The Skill body remains concise and contains only the mandatory closing workflow, safety rules, indexing rules, and resource routing. Each completed project receives one flat reference file under `references/`. A catalog lets future agents select only relevant records instead of loading all history.

This preserves the convenience of one global knowledge base without allowing `SKILL.md` to grow without bound.

## Storage

Canonical installed copy:

`C:\Users\Tom\.codex\skills\project-lessons-ledger`

Project copy:

`<project-root>\ai-skills\project-lessons-ledger`

For the current project, the project copy is:

`C:\Users\Tom\Desktop\project\ai-skills\project-lessons-ledger`

Both copies must have identical file hashes after every update. The personal copy is used for automatic discovery; the project copy is the portable backup and local handoff.

## Skill structure

```text
project-lessons-ledger/
├── SKILL.md
├── agents/
│   └── openai.yaml
├── references/
│   ├── catalog.md
│   └── 2026-07-15-xiaohe-workbench.md
└── scripts/
    └── validate-ledger.ps1
```

Future project records use `YYYY-MM-DD-<project-slug>.md`. All references remain one level below `SKILL.md`.

## Trigger and timing

The Skill triggers when a software project is about to be described as complete, delivered, deployed, or handed off, including after major maintenance or production recovery work.

It runs after fresh project verification and before the final user-facing completion message. It does not replace tests, deployment checks, incident review, or project documentation.

## Closing workflow

1. Confirm the project has fresh verification evidence.
2. Identify the project root, repository, release commit, deployment targets, and backup location.
3. Collect reusable evidence from source, tests, commands, deployment output, and incidents.
4. Redact secrets and omit credentials before writing any record.
5. Create or update the project's reference file.
6. Update `references/catalog.md` without duplicating the project.
7. Run the ledger validator and Skill validator.
8. Synchronize the personal and project copies.
9. Compare file lists and SHA-256 hashes.
10. Mention the experience Skill in the final handoff.

If a project record already exists, update that file with a dated revision section instead of creating a duplicate.

## Project record contract

Every project record contains:

- Project identity, date, repository, release commit, local path, and deployment targets.
- User goal, delivered scope, architecture, and important resource relationships.
- Key decisions, alternatives rejected, and tradeoffs.
- Failure signatures, evidence, root causes, regression tests, minimal fixes, and prevention rules.
- Commands that were actually verified, with expected success signals.
- Security and privacy boundaries, including forbidden destructive actions.
- Deployment, rollback, recovery, and backup procedures.
- Reusable methods for future projects.
- Remaining risks, deferred work, and the next AI's first action.
- Verification evidence from the completed project.

No record may contain passwords, password proofs, recovery codes, cookies, OAuth credentials, API tokens, private keys, or copied provider credential files.

## Catalog contract

`references/catalog.md` contains one row per project:

- Project name and slug.
- Completion or latest revision date.
- Technology and provider keywords.
- Main reusable lessons and known failure signatures.
- Relative reference path.

Future agents search the catalog first and load only relevant project records.

## Validation

`scripts/validate-ledger.ps1` performs deterministic checks:

- Required Skill and metadata files exist.
- Catalog rows reference existing project files.
- Every project record contains all required sections.
- Duplicate project slugs are rejected.
- Common secret formats and credential material are rejected.
- Personal and project copies can be compared by relative path and SHA-256.

The Skill also runs the standard `quick_validate.py` validator.

## Failure handling

- If project verification is incomplete, do not create a success record; finish verification first.
- If the personal directory cannot be written, preserve the project copy and report the installation failure.
- If the project directory cannot be written, preserve the personal copy and report that the portable backup is missing.
- If the copies differ, do not silently choose one. Determine which contains the newest intentional revision, reconcile, then revalidate.
- If sensitive material is detected, stop before copying or packaging anything.
- Never delete previous project records to make validation pass.

## Testing strategy

Use a RED–GREEN–REFACTOR workflow for the Skill:

1. A baseline structural test fails because the Skill and first project record do not exist.
2. The minimal Skill, catalog, validator, and Xiaohe Workbench record make the test pass.
3. Add tests for duplicate catalog entries, missing sections, secret detection, broken references, and copy divergence.
4. Run the official Skill validator.
5. Copy to both destinations and verify file hashes.

Current policy does not permit spawning validation subagents, so forward-testing uses observed completion failures from this project plus deterministic retrieval and validation scenarios.

## Completion criteria

- `project-lessons-ledger` is valid and installed in the personal Skills directory.
- An identical copy exists under the current project's `ai-skills` directory.
- The Xiaohe Workbench record captures the 2026-07-15 architecture, deployment, failures, fixes, guardrails, and verification evidence.
- Catalog retrieval tests pass.
- Secret scanning passes.
- Both copies have identical paths and SHA-256 hashes.
- The Skill is discoverable from completion, deployment, handoff, incident-review, and project-retrospective prompts.
