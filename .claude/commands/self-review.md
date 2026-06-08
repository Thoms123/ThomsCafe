Perform a structured QA review of the current branch before opening a PR.
Follows the Mothership QA methodology: scope verification → verification → code review → simplify → disposition.

---

## Phase 1 — Scope Verification

1. Run `git diff main...HEAD --stat` to list all changed/added files.
2. Check: does every file changed relate to the stated task? Flag any out-of-scope changes.
3. Check: are there obvious missing pieces (e.g., a handler exists but its route is not wired)?
4. Record findings — do NOT proceed to Phase 2 if critical scope gaps exist.

---

## Phase 2 — Verification (Build & Lint)

**Backend (Go)** — run from `backend/` directory:
- `go vet ./...` — detect suspicious constructs
- `go build ./...` — ensure code compiles cleanly
- If `golangci-lint` is installed: `golangci-lint run ./...`

**Frontend (TypeScript/React)** — run from `frontend/` directory:
- `npx tsc --noEmit` — TypeScript type check
- `npm run lint` — ESLint check

For auto-fixable issues (ESLint --fix, gofmt), apply the fix immediately and note what changed.
Record all remaining errors — do NOT proceed to Phase 3 if build or type errors exist.

---

## Phase 3 — Code Review

Read the changed files from Phase 1. Review through these four lenses and note any finding:

**Security**
- SQL queries use parameterized inputs (no string interpolation with user data)
- File uploads: extension whitelist enforced, no path traversal possible
- Auth: protected routes gated behind `AuthMiddleware`, sensitive mutations behind `RequirePermission`
- Secrets never hardcoded

**Performance**
- No N+1 query patterns (e.g., querying DB inside a loop)
- No unbounded queries (always limit/paginate where result set can grow)
- Large payloads (images) streamed, not buffered entirely in memory

**Reliability**
- All errors from DB, file I/O, and external calls are handled (not silently discarded with `_`)
- Nil pointer dereferences guarded before use
- API responses always return meaningful status codes and messages

**Complexity**
- No dead code (unused functions, imports, variables)
- No premature abstractions — code does only what the task requires
- Functions are focused; no giant handlers doing 5 unrelated things

Record every finding with file path and line number.

---

## Phase 4 — Disposition

Based on Phases 1–3, deliver one of three verdicts:

### ✅ Approved
All of the following must be true:
- No scope gaps or out-of-scope changes
- Build and lint pass clean
- No blocking findings from Security, Performance, or Reliability lenses
- Complexity review finds nothing unnecessary

State: "**Approved** — ready to open PR."

### 🔧 Changes Requested
One or more blocking findings exist. List each one as:
```
[BLOCKING] <file>:<line> — <what is wrong and what must be done>
```
Do NOT approve. Fix blocking findings and re-run self-review.
Non-blocking observations (style suggestions, minor improvements) can be noted separately and left to the author's discretion.

### ⬆️ Escalate
Use this when:
- Correctness cannot be verified without running the app end-to-end
- A security finding requires human judgment on risk acceptance
- A scope question requires clarification on the original requirement

State what specifically needs human input before approval can be given.

---

## Phase 5 — Commit Auto-fixes (if any)

If any auto-fixes were applied in Phase 2, stage and commit them:
```
git add <fixed files>
git commit -m "chore: lint auto-fix"
```
