# Changelog

All notable changes to XCASPER MANAGER are documented in this file.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.0.0] — 2025-12-01

Initial public release of XCASPER MANAGER — a self-hosted, browser-based VPS file manager and control panel for the xcasper.space brand family.

### Added

#### Authentication
- API-key login page (`/login`) with show/hide password toggle
- `sessionStorage`-based token (`xcm_api_key`) auto-injected as `Bearer` header on all API requests via `setAuthTokenGetter`
- `GET /api/auth/verify` — validates the supplied API key
- `POST /api/auth/logout` — clears the client session
- `requireApiKey` middleware applied to all protected routes (`/files`, `/system`, `/terminal`)
- First-login welcome modal with Terms & Conditions and Buy-a-Coffee link

#### Navigation & Layout
- Fixed top navbar with logo, route links (Home, Files, Terminal, Dev), social icon links (GitHub, Telegram, Support), user avatar, and logout button
- Responsive mobile drawer menu
- Sticky footer with brand info and external links
- All unknown routes redirect unauthenticated users to `/login`

#### System Dashboard (`/`)
- Real-time system info card grid: CPU load with model name, memory (used / free / total), root disk usage, uptime
- Load-average display (1 m / 5 m / 15 m)
- Disk usage table listing all mounted filesystems
- Network interface list (IP addresses, MAC)
- OS and kernel details
- Search bar that navigates to `/files?search=<query>`
- "Clear Cache" button — runs `sync`; drops Linux page cache when root privileges are available; returns `cacheDropped: true/false` with accurate status message

#### File Manager (`/files`)
- Full filesystem browsing starting from any absolute path
- Directory entries sorted: directories first, then files, both alphabetically
- Filename search filter via `?search=` URL parameter
- Breadcrumb navigation
- File type auto-detection by extension:
  - **Images** (png, jpg, gif, webp, svg, ico, bmp, tiff): inline `<img>` viewer
  - **Video** (mp4, webm, mkv, mov, avi, wmv): native `<video controls>` with streaming via `/api/files/raw`
  - **Audio** (mp3, wav, ogg, flac, m4a, aac, opus): native `<audio controls>` with streaming via `/api/files/raw`
  - **Code files**: syntax-highlighted with `react-syntax-highlighter` (Atom One Dark theme)
  - **Text / logs / config**: plain preformatted view
  - **Binary**: "cannot display binary file" notice with raw download link
- In-browser text editor with save (text and code files)
- Create new file
- Create new directory (recursive)
- Delete with confirmation dialog (recursive for directories)
- Rename file or folder
- Move file or folder to any absolute destination path
- `GET /api/files/list?path=` — list directory (sorted, dirs first)
- `GET /api/files/read?path=` — read file as JSON (binary detection, 5 MB text limit)
- `GET /api/files/raw?path=` — stream raw bytes with correct `Content-Type` (media playback)
- `POST /api/files/write` — write or create file
- `DELETE /api/files/delete?path=&recursive=` — delete
- `POST /api/files/mkdir` — create directory
- `POST /api/files/rename` — rename or move

#### Terminal (`/terminal`)
- In-browser shell panel
- `POST /api/terminal/exec` — execute shell commands server-side
- `cd` command updates persistent working directory across requests
- Command history display with timestamped output

#### Dev Page (`/dev`)
- Developer bio: TRABY CASPER, avatar, tagline, GitHub and Telegram links
- Live GitHub repo card: fetches name, description, stars, forks, watchers, open issues, language, and license from the GitHub public API
- Graceful loading skeletons and error state with fallback direct link
- "Fork on GitHub" CTA button linking to the GitHub web fork page
- Collapsible 6-step fork-and-self-host walkthrough with copy-to-clipboard code blocks (clipboard API with `execCommand` fallback)
- Support section: Technical Support (support.xcasper.space), Buy Me a Coffee (payments.xcasper.space), community links grid

#### Branding & Theme
- xcasper.space colour palette: bg `#08090d`, surface `#0f1117`, purple `#6e5cff`, cyan `#0ff4c6`
- Brand gradient: `linear-gradient(135deg, #6e5cff, #0ff4c6)`
- Fonts: Inter (UI), Fira Code (monospace)
- Favicon: SVG + PNG 16px / 32px generated via `@resvg/resvg-js`

#### Documentation
- `README.md` — overview, feature table, quick-start, tech stack, API reference, links
- `LICENSE` — MIT licence, copyright 2025 TRABY CASPER / Casper-Tech-ke
- `SECURITY.md` — responsible disclosure policy, scope, response timeline
- `CONTRIBUTING.md` — fork workflow, branch naming, PR checklist, code style guide
- `CHANGELOG.md` — this file

### Tech Stack

- **Frontend**: React 18, Vite, TypeScript 5.9, TanStack Query, Wouter, Tailwind CSS, shadcn/ui
- **Backend**: Express 5, TypeScript, esbuild (CJS bundle)
- **Validation**: Zod v4 (generated from OpenAPI 3.1 spec via Orval)
- **Monorepo**: pnpm workspaces, Node.js 24

---

[1.0.0]: https://github.com/Casper-Tech-ke/vps-manager/releases/tag/v1.0.0
