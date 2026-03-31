# Contributing to XCASPER MANAGER

Thank you for your interest in contributing. XCASPER MANAGER is an open-source project by [TRABY CASPER](https://github.com/Casper-Tech-ke) and community contributions are welcome.

---

## Before You Start

- Check the [open issues](https://github.com/Casper-Tech-ke/vps-manager/issues) to see if your idea or bug is already tracked.
- For large changes, open an issue first to discuss the approach before writing code.
- For questions or informal discussion, reach out on [Telegram](https://t.me/casper_tech_ke).

---

## Fork & Branch Workflow

### 1. Fork the repository

Click **Fork** on GitHub, or visit [github.com/Casper-Tech-ke/vps-manager/fork](https://github.com/Casper-Tech-ke/vps-manager/fork).

### 2. Clone your fork

```bash
git clone https://github.com/<your-username>/vps-manager.git
cd vps-manager
```

### 3. Add the upstream remote

```bash
git remote add upstream https://github.com/Casper-Tech-ke/vps-manager.git
```

### 4. Create a feature branch

Branch naming conventions:

| Type | Pattern | Example |
|---|---|---|
| Feature | `feat/<short-description>` | `feat/file-permissions` |
| Bug fix | `fix/<short-description>` | `fix/terminal-cd-state` |
| Documentation | `docs/<short-description>` | `docs/api-reference` |
| Chore | `chore/<short-description>` | `chore/update-deps` |

```bash
git checkout -b feat/my-feature
```

### 5. Make your changes

Install dependencies:

```bash
pnpm install
```

Start the dev servers:

```bash
pnpm --filter @workspace/api-server run dev &
pnpm --filter @workspace/vps-manager run dev
```

### 6. Keep your branch up to date

```bash
git fetch upstream
git rebase upstream/main
```

### 7. Commit your changes

Use clear, imperative commit messages:

```
feat: add file permissions editor
fix: resolve terminal cwd reset on page refresh
docs: add API reference table to README
```

### 8. Push and open a Pull Request

```bash
git push origin feat/my-feature
```

Then open a PR on GitHub against `Casper-Tech-ke/vps-manager:main`.

---

## Pull Request Checklist

Before submitting your PR, please verify:

- [ ] The code compiles without TypeScript errors (`pnpm run typecheck`)
- [ ] The dev servers start and the feature works as expected in the browser
- [ ] No new `console.log` debug statements left in production code
- [ ] New API endpoints follow the existing pattern in `artifacts/api-server/src/routes/`
- [ ] New frontend pages are protected with `ProtectedLayout` in `App.tsx`
- [ ] Any new environment variables are documented in `README.md`
- [ ] The PR description clearly explains what was changed and why

---

## Code Style

- **TypeScript**: strict mode; avoid `any`; prefer explicit return types on exported functions
- **React**: functional components only; hooks at the top level; no class components
- **Naming**: `camelCase` for variables and functions; `PascalCase` for components and types; `kebab-case` for filenames
- **CSS / Tailwind**: follow the existing xcasper.space theme — use the CSS variables and inline style pattern already in the codebase; do not introduce new colour palettes
- **API routes**: add new routes in a dedicated `routes/<name>.ts` file and register them in `routes/index.ts`; always apply `requireApiKey` middleware for protected endpoints

---

## Monorepo Structure

The project uses pnpm workspaces. Key packages:

| Package | Path | Purpose |
|---|---|---|
| `@workspace/api-server` | `artifacts/api-server` | Express 5 REST API |
| `@workspace/vps-manager` | `artifacts/vps-manager` | React + Vite frontend |
| `@workspace/api-spec` | `lib/api-spec` | OpenAPI 3.1 spec |
| `@workspace/api-client-react` | `lib/api-client-react` | Generated React Query hooks |
| `@workspace/api-zod` | `lib/api-zod` | Generated Zod schemas |

When you add or change an API endpoint, update the OpenAPI spec and regenerate the client:

```bash
pnpm --filter @workspace/api-spec run codegen
```

---

## License

By contributing, you agree that your contributions will be licensed under the [MIT License](LICENSE).
