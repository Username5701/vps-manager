# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)
- **SSH**: ssh2 (for VPS connections)

## Structure

```text
artifacts-monorepo/
├── artifacts/              # Deployable applications
│   ├── api-server/         # Express API server
│   └── vps-manager/        # React + Vite VPS Manager frontend (at /)
├── lib/                    # Shared libraries
│   ├── api-spec/           # OpenAPI spec + Orval codegen config
│   ├── api-client-react/   # Generated React Query hooks
│   ├── api-zod/            # Generated Zod schemas from OpenAPI
│   └── db/                 # Drizzle ORM schema + DB connection
├── scripts/                # Utility scripts (single workspace package)
│   └── src/                # Individual .ts scripts, run via `pnpm --filter @workspace/scripts run <script>`
├── pnpm-workspace.yaml     # pnpm workspace (artifacts/*, lib/*, lib/integrations/*, scripts)
├── tsconfig.base.json      # Shared TS options (composite, bundler resolution, es2022)
├── tsconfig.json           # Root TS project references
└── package.json            # Root package with hoisted devDeps
```

## VPS Manager App

### Features
- **Dashboard**: List of all registered VPS servers with status indicators
- **File Manager**: Browse, view, edit, create, delete files and directories over SFTP
- **Terminal**: Execute commands on remote servers, view output with history
- **Process Manager**: View and kill running processes (auto-refreshes every 5s)
- **Server Stats**: CPU, memory, disk usage, uptime, kernel info (auto-refreshes every 10s)
- **Add/Edit Servers**: Support for both password and SSH private key authentication

### Auth
Credentials (passwords, private keys) are stored in the PostgreSQL database and never returned to the frontend.

### API Endpoints
All endpoints are under `/api`:
- `GET /servers` — list all servers
- `POST /servers` — add a server
- `GET /servers/:id` — get server details
- `PATCH /servers/:id` — update server
- `DELETE /servers/:id` — delete server
- `POST /servers/:id/connect` — test SSH connection
- `GET /servers/:id/files?path=` — list directory contents
- `GET /servers/:id/files/read?path=` — read file content
- `POST /servers/:id/files/write` — write file
- `DELETE /servers/:id/files/delete?path=` — delete file/dir
- `POST /servers/:id/files/mkdir` — create directory
- `POST /servers/:id/files/rename` — rename/move file
- `POST /servers/:id/exec` — execute command
- `GET /servers/:id/processes` — list processes
- `POST /servers/:id/processes/:pid/kill` — kill process
- `GET /servers/:id/stats` — get system stats

## TypeScript & Composite Projects

Every package extends `tsconfig.base.json` which sets `composite: true`. The root `tsconfig.json` lists all packages as project references. This means:

- **Always typecheck from the root** — run `pnpm run typecheck` (which runs `tsc --build --emitDeclarationOnly`). This builds the full dependency graph so that cross-package imports resolve correctly. Running `tsc` inside a single package will fail if its dependencies haven't been built yet.
- **`emitDeclarationOnly`** — we only emit `.d.ts` files during typecheck; actual JS bundling is handled by esbuild/tsx/vite...etc, not `tsc`.
- **Project references** — when package A depends on package B, A's `tsconfig.json` must list B in its `references` array. `tsc --build` uses this to determine build order and skip up-to-date packages.

## Root Scripts

- `pnpm run build` — runs `typecheck` first, then recursively runs `build` in all packages that define it
- `pnpm run typecheck` — runs `tsc --build --emitDeclarationOnly` using project references

## Packages

### `artifacts/api-server` (`@workspace/api-server`)

Express 5 API server. Routes live in `src/routes/` and use `@workspace/api-zod` for request and response validation and `@workspace/db` for persistence.

- Entry: `src/index.ts` — reads `PORT`, starts Express
- App setup: `src/app.ts` — mounts CORS, JSON/urlencoded parsing, routes at `/api`
- Routes: `src/routes/index.ts` mounts sub-routers
- Lib: `src/lib/ssh.ts` — SSH helper functions (ssh2 based)
- Depends on: `@workspace/db`, `@workspace/api-zod`, `ssh2`
- `pnpm --filter @workspace/api-server run dev` — run the dev server
- `pnpm --filter @workspace/api-server run build` — production esbuild bundle

### `artifacts/vps-manager` (`@workspace/vps-manager`)

React + Vite frontend for the VPS Manager. Dark terminal-themed UI.

- Pages: Dashboard, Add Server, Server Detail (Stats), File Manager, Terminal, Processes
- Uses `@workspace/api-client-react` for all API calls via React Query hooks

### `lib/db` (`@workspace/db`)

Database layer using Drizzle ORM with PostgreSQL.

- `src/schema/servers.ts` — servers table with SSH credentials
- `drizzle.config.ts` — Drizzle Kit config (requires `DATABASE_URL`)

### `lib/api-spec` (`@workspace/api-spec`)

Owns the OpenAPI 3.1 spec (`openapi.yaml`) and the Orval config.

Run codegen: `pnpm --filter @workspace/api-spec run codegen`

### `lib/api-zod` (`@workspace/api-zod`)

Generated Zod schemas from the OpenAPI spec. Used by `api-server` for validation.

### `lib/api-client-react` (`@workspace/api-client-react`)

Generated React Query hooks and fetch client from the OpenAPI spec.

### `scripts` (`@workspace/scripts`)

Utility scripts package.
