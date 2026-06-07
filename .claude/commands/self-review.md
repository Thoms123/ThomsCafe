Run lint checks on both backend and frontend, report all findings, and fix any auto-fixable issues.

## Steps

1. **Backend (Go)** — run from `backend/` directory:
   - `go vet ./...` — detect suspicious constructs
   - `go build ./...` — ensure code compiles cleanly
   - If `golangci-lint` is installed: `golangci-lint run ./...`
   - Report all warnings and errors found

2. **Frontend (TypeScript/React)** — run from `frontend/` directory:
   - `npm run lint` — ESLint check
   - `npx tsc --noEmit` — TypeScript type check without building
   - Report all warnings and errors found

3. **Summary** — after running all checks:
   - List every error and warning grouped by backend / frontend
   - For auto-fixable issues (ESLint --fix, gofmt), apply the fix and show what changed
   - For issues that require manual fix, describe what needs to be done and where

4. **Commit** (optional) — if any auto-fixes were applied, stage and commit them with message: `chore: lint auto-fix`
