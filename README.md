Welcome to the CSV Viewer (TanStack Start) app — a small React + TanStack Router project scaffolded with Vite+.

**Quick Install (Docker — one command)**

```bash
curl -fsSL https://raw.githubusercontent.com/muzazu/ah-that-csv-viewer/main/setup.sh | bash
```

This clones the repo, installs Docker if needed, generates `.env`, and starts the app. Requires `git` and a Linux or WSL2 shell.

> **Windows:** Open WSL2 or Git Bash and run the command above.  
> Or install Docker Desktop first (`winget install Docker.DockerDesktop`), then clone and run `./setup.sh` manually.

---

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

**Deployment with Docker**

This project includes a production-ready Docker setup with secure, minimal images and persistent SQLite storage.

**Quick Start (Docker)**

1. **Run setup script** (Linux only - installs Docker if needed and initializes `.env`):

   ```bash
   chmod +x setup.sh
   ./setup.sh
   ```

2. **Build and run with Docker Compose:**

   ```bash
   docker-compose up -d
   ```

   This will:
   - Build the image with Node 25 builder and distroless runtime
   - Create a named volume (`csv-viewer-data`) for SQLite persistence
   - Start the server on `http://localhost:3000`
   - Run migrations automatically on startup

3. **Access the application:**
   - Open http://localhost:3000 in your browser
   - Complete the setup wizard to create an admin account
   - Your app name, settings, and all subscriber data persist across container restarts

**Manual Docker Run** (without Docker Compose):

```bash
# Build the image
docker build -t csv-viewer .

# Create a named volume for data persistence
docker volume create csv-viewer-data

# Run the container
docker run -it --rm \
  -v csv-viewer-data:/data \
  --env-file .env \
  -p 3000:3000 \
  csv-viewer
```

**Environment Configuration**

The setup script creates a `.env` file with secure defaults:

- `DATABASE_URL` - Path to SQLite database (set to `/data/csv-viewer.db` for persistence)
- `BETTER_AUTH_SECRET` - Auto-generated 32-byte secret for authentication
- `BETTER_AUTH_URL` - Base URL for auth callbacks (default: `http://localhost:3000`)
- `NODE_ENV` - Set to `production` in Docker (default: `development` for local dev)

To override values, edit `.env` before `docker-compose up`.

**Database & Persistence**

- **SQLite Storage:** The database file is stored in a mounted volume at `/data/csv-viewer.db`
- **Migrations:** Automatically applied at container startup via `drizzle-kit migrate`
- **Data Persistence:** All user data (subscribers, settings, auth sessions) persist across container restarts
- **No Data Loss:** Rebuilding or restarting the container with the same volume preserves all data
- **Backup:** Copy the contents of the `csv-viewer-data` volume to back up your database:
  ```bash
  docker run --rm -v csv-viewer-data:/data -v $(pwd):/backup \
    alpine cp -r /data /backup/csv-viewer-backup
  ```

**Migration Behavior**

- Migrations run automatically when the container starts
- New schema changes are applied without truncating tables
- Existing data is preserved during schema updates
- Migration logs are printed to container stderr during startup

**Security Considerations**

- **Non-root execution:** The container runs as a non-root user (`nonroot`) for minimal privilege
- **Minimal image:** Distroless base image has no shell, package manager, or development tools
- **Secrets:** Keep `.env` and `BETTER_AUTH_SECRET` safe; never commit these to version control
- **Permissions:** Database files are readable/writable only by the container process

**Health Checks**

The container includes a health check that verifies the server is running:

```bash
docker ps  # Check STATUS column for "healthy"
```

To manually test:

```bash
curl http://localhost:3000
```

**Updating**

To pull the latest release and rebuild without needing git:

```bash
./setup.sh update
```

This will:

1. Download the latest source archive from GitHub
2. Back up your `docker-compose.yml` → `docker-compose.yml.bak` (preserves any custom port/resource changes)
3. Stop the running container
4. Apply updated source files (`.env` and `data/` are never touched)
5. Rebuild the image and restart the container

> Your database, settings, and `.env` are fully preserved during updates.

**Troubleshooting**

- **Container exits immediately:** Check logs with `docker compose logs csv-viewer` and verify `.env` is present and has `BETTER_AUTH_SECRET` set
- **Port 3000 already in use:** Change port in `docker-compose.yml` (e.g., `"3001:3000"`)
- **Permission denied on data volume:** The container needs `--chown=nonroot:nonroot` on mounted files
- **Migrations fail:** Ensure `DATABASE_URL` points to a valid path (e.g., `/data/csv-viewer.db`)

**Learn more**
Visit the TanStack Start docs and TanStack Router docs for routing and server-function examples:

- https://tanstack.com/start
- https://tanstack.com/router
