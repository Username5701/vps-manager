# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Validation**: Zod (`zod/v4`)
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## Structure

```text
artifacts-monorepo/
├── artifacts/              # Deployable applications
│   ├── api-server/         # Express API server
│   └── vps-manager/        # React + Vite frontend (XCASPER MANAGER UI)
├── lib/                    # Shared libraries
│   ├── api-spec/           # OpenAPI spec + Orval codegen config
│   ├── api-client-react/   # Generated React Query hooks
│   ├── api-zod/            # Generated Zod schemas from OpenAPI
│   └── db/                 # Drizzle ORM (currently unused)
├── pnpm-workspace.yaml     # pnpm workspace (artifacts/*, lib/*, scripts)
├── tsconfig.base.json      # Shared TS options (composite, bundler resolution, es2022)
├── tsconfig.json           # Root TS project references
└── package.json            # Root package with hoisted devDeps
```

## XCASPER MANAGER App

A **branded local VPS file manager** for the xcasper.space brand family. Browser-based UI to manage files on the server it's deployed on. Secured by API key authentication.

### Brand / Theme
- **App name**: XCASPER MANAGER
- **Brand**: xcasper.space by TRABY CASPER
- **Colors**: bg `#08090d`, purple `#6e5cff`, cyan `#0ff4c6`, surface `#0f1117`
- **Gradient**: `linear-gradient(135deg, #6e5cff, #0ff4c6)`
- **Fonts**: Inter (UI), Fira Code (mono)

### Authentication
- `API_KEY` environment secret — set via Replit Secrets
- Login page at `/login` — API key stored in `sessionStorage` as `xcm_api_key`
- Auth context at `src/contexts/auth-context.tsx`
- Backend: `GET /api/auth/verify` (Bearer token), `POST /api/auth/logout`

### Frontend Structure
```text
src/
├── App.tsx                   # Router + AuthProvider + layout
├── contexts/
│   └── auth-context.tsx      # Auth state, login/logout, welcomeShown
├── pages/
│   ├── login.tsx             # Login screen (unauthenticated entry point)
│   ├── home.tsx              # System dashboard (default protected page)
│   ├── file-manager.tsx      # File manager + terminal (accepts initialPanel prop)
│   └── not-found.tsx         # 404 page
└── components/
    ├── navbar.tsx             # Fixed top navbar with nav links + social links + logout
    ├── footer.tsx             # Bottom footer with links
    └── welcome-modal.tsx      # First-login T&C modal (dismissed once per session)
```

### Routes
- `/login` — Login page (redirects to `/` if already authenticated)
- `/` — Home: System dashboard with CPU/memory/disk stats
- `/files` — File manager
- `/terminal` — File manager with terminal panel open
- `/dev` — Dev page (developer bio, GitHub repo card, fork walkthrough, support links)

### Features
- **Browse**: Navigate the full filesystem including root (`/`)
- **View**: File type auto-detection from extension; appropriate viewer per type
  - **Images** (png, jpg, gif, webp, svg, etc.): inline `<img>` viewer
  - **Video** (mp4, webm, mkv, mov, etc.): native `<video controls>` player
  - **Audio** (mp3, wav, ogg, flac, m4a, etc.): native `<audio controls>` player
  - **Code files**: syntax highlighted with `react-syntax-highlighter` (atomOneDark theme)
  - **Text/logs**: plain preformatted view
  - **Binary**: "cannot display" notice
- **Edit**: In-browser text editor with save (text/code files only)
- **Create**: New files and new directories
- **Delete**: With confirmation dialog; recursive delete for directories
- **Rename**: Rename a file/folder within its parent directory
- **Move**: Move a file or folder to any absolute destination path
- **Terminal**: Run shell commands on the server; `cd` persists working directory
- **System Info**: Real-time CPU, memory, disk, network, uptime on home page
- **Search**: Search bar on home page that navigates to `/files?search=...`
- **Clear Cache**: `POST /api/system/clear-cache` — runs `sync` + drops page cache

### API Endpoints
All endpoints are under `/api`:
- `GET /auth/verify` — validate API key (Bearer token)
- `POST /auth/logout` — stub logout
- `GET /system/info` — system info (hostname, OS, CPU, memory, disk, network, uptime)
- `POST /system/clear-cache` — sync + drop_caches
- `GET /files/list?path=` — list directory contents (sorted dirs-first)
- `GET /files/read?path=` — read file content as JSON (detects binary; max 5MB text)
- `GET /files/raw?path=` — stream raw file bytes with correct Content-Type (for media)
- `POST /files/write` — write/create file `{ path, content }`
- `DELETE /files/delete?path=&recursive=` — delete file or directory
- `POST /files/mkdir` — create directory (recursive) `{ path }`
- `POST /files/rename` — rename or move `{ oldPath, newPath }`
- `POST /terminal/exec` — execute a shell command `{ command, cwd? }`

## TypeScript & Composite Projects

Every package extends `tsconfig.base.json` which sets `composite: true`. The root `tsconfig.json` lists all packages as project references.

- **Always typecheck from the root** — run `pnpm run typecheck`
- **`emitDeclarationOnly`** — only emit `.d.ts` files during typecheck
- **Project references** — cross-package dependencies are declared in `tsconfig.json`

## Root Scripts

- `pnpm run build` — runs `typecheck` then `build` recursively
- `pnpm run typecheck` — runs `tsc --build --emitDeclarationOnly`

## Packages

### `artifacts/api-server` (`@workspace/api-server`)

Express 5 API server. Routes: `files.ts`, `terminal.ts`, `health.ts`, `auth.ts`, `system.ts`.
Uses `@workspace/api-zod` for validation, Node.js `fs` for filesystem ops.

### `artifacts/vps-manager` (`@workspace/vps-manager`)

React + Vite frontend. XCASPER MANAGER brand. Auth-protected routing with navbar/footer/welcome modal.
Uses `@workspace/api-client-react` for React Query hooks.

### `lib/api-spec` (`@workspace/api-spec`)

OpenAPI 3.1 spec (`openapi.yaml`) + Orval config.
Run codegen: `pnpm --filter @workspace/api-spec run codegen`

### `lib/api-zod` (`@workspace/api-zod`)

Generated Zod schemas from the OpenAPI spec. Used by `api-server` for validation.

### `lib/api-client-react` (`@workspace/api-client-react`)

Generated React Query hooks and fetch client from the OpenAPI spec.

## Environment Variables / Secrets

- `API_KEY` — (Replit Secret) The API key required to log in to XCASPER MANAGER
- `SESSION_SECRET` — (Replit Secret) Session secret (available but not currently used for session middleware)
- `DATABASE_URL` — PostgreSQL connection string (managed by Replit)
