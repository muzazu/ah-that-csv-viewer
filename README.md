Welcome to the CSV Viewer (TanStack Start) app — a small React + TanStack Router project scaffolded with Vite+.

**Prerequisites**

- **Node.js**: lts (v24+) recommended (install via your platform package manager or nvm).
- **Vite+ CLI (`vp`)**: this repo uses Vite+ to wrap the package manager and tooling. Install or follow your organization's instructions for `vp`.

**Quick Start (developer)**

1. Clone the repo and change into it:

```bash
git clone <repo-url>
cd csv-viewer
```

2. Install dependencies and start the dev server:

```bash
vp install
vp dev
```

3. Open http://localhost:3000 (or the port printed by `vp dev`) in your browser.

**Environment & Better Auth**

- Create a `.env.local` file at the project root and add project secrets (example keys below). Do NOT commit this file.

```
BETTER_AUTH_SECRET=your-secret
BETTER_AUTH_URL=http://localhost:3000
```

- To generate a Better Auth secret and run migrations (wrapped by Vite+):

```bash
vpx @better-auth/cli secret    # prints a secret you can paste into .env.local
vpx @better-auth/cli migrate
```

**Common commands**

- Install: `vp install`
- Dev server: `vp dev`
- Build (production): `vp build`
- Run tests: `vp test`
- Run checks (format/lint/type): `vp check`
- Use one-off binaries (like `shadcn`): `vpx <pkg>` (example below)

```bash
vpx shadcn@latest add button
```

**Styling**

- This project uses Tailwind CSS. See `src/styles.css` for the Tailwind import.

**Where to look in the code**

- Root layout: [src/routes/\_\_root.tsx](src/routes/__root.tsx)
- Auth setup: [src/lib/auth.ts](src/lib/auth.ts)
- Database helpers: [src/db/index.ts](src/db/index.ts)

**Notes**

- Prefer `vp` for install, dev, build, test, lint, and other common tasks. `vp` wraps the underlying package manager (pnpm in this repo) and ensures tools run with the expected configuration.
- Keep secrets in `.env.local` and out of source control.

**Learn more**
Visit the TanStack Start docs and TanStack Router docs for routing and server-function examples:

- https://tanstack.com/start
- https://tanstack.com/router
