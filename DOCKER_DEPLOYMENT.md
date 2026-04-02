# CSV Viewer Docker Deployment Guide

## Quick Start (5 minutes)

### Prerequisites

- Linux system (Ubuntu, Debian, RHEL, CentOS, Fedora, Rocky, AlmaLinux)
- Git (to clone the repo)
- Internet connection

### Step 1: Clone and Setup

```bash
# Clone the repository
git clone <repo-url>
cd csv-viewer

# Make setup script executable and run it
chmod +x setup.sh
./setup.sh
```

The `setup.sh` script will:

- ✓ Check if Docker is installed
- ✓ Install Docker if needed (supports apt and dnf package managers)
- ✓ Enable and start Docker service
- ✓ Add your user to the docker group
- ✓ Generate `.env` file with secure defaults

**Note:** After setup.sh completes, you may need to log out and back in for docker group membership to take effect. Or run: `newgrp docker`

### Step 2: Build and Run

```bash
# Build the Docker image and start the container
docker-compose up -d

# OR manually:
docker build -t csv-viewer .
docker volume create csv-viewer-data
docker run -it --rm \
  -v csv-viewer-data:/data \
  --env-file .env \
  -p 3000:3000 \
  csv-viewer
```

### Step 3: Access the Application

1. Open http://localhost:3000 in your browser
2. You'll be redirected to the setup page
3. Create your admin account:
   - Username (min 3 chars)
   - Email (optional)
   - Password (min 8 chars, confirmed)
   - App name
   - Logo upload (optional)
4. Click "Complete Setup"
5. You're now logged in and ready to manage subscriber data!

## Key Features

### ✓ Data Persistence

- All data (subscribers, locations, app settings) is stored in SQLite
- Database file is saved in a Docker named volume (`csv-viewer-data`)
- **Data survives** container restarts, rebuilds, and compose restarts
- Volume persists until explicitly deleted with `docker volume rm csv-viewer-data`

### ✓ Automatic Migrations

- Database schema is automatically updated when the container starts
- Drizzle migrations apply silently in the background
- No manual migration steps required
- Existing data is never lost or truncated

### ✓ Security

- Container runs as non-root user
- Minimal distroless base image (no shell, no package manager)
- Secret keys are auto-generated and kept in `.env` (not in image)
- Production-ready security hardening

### ✓ Health Checks

- Container includes health check endpoint
- Automatically restarts if server becomes unresponsive
- Status visible with `docker ps` (check STATUS column)

## Common Commands

### Container Management

```bash
# Check container status
docker-compose ps

# View container logs
docker-compose logs -f csv-viewer

# Stop the container
docker-compose stop

# Stop and remove (data persists in volume)
docker-compose down

# Stop and remove everything including volumes (⚠️ DELETES DATA)
docker-compose down -v

# Restart the container
docker-compose restart
```

### Database Access

```bash
# View database files in volume
docker run --rm -v csv-viewer-data:/data alpine ls -lh /data

# Backup your database
docker run --rm -v csv-viewer-data:/data -v $(pwd):/backup \
  alpine cp -r /data/csv-viewer.db /backup/csv-viewer-backup.db

# Restore from backup
docker run --rm -v csv-viewer-data:/data -v $(pwd):/backup \
  alpine cp /backup/csv-viewer-backup.db /data/csv-viewer.db
```

## Environment Configuration

### Default .env Settings

The `setup.sh` script generates:

```env
DATABASE_URL="/data/csv-viewer.db"        # SQLite location in container
BETTER_AUTH_SECRET="[auto-generated]"      # Authentication secret (32 chars)
BETTER_AUTH_URL="http://localhost:3000"    # App URL for auth callbacks
NODE_ENV="development"                     # Can change to "production"
```

### Customizing Configuration

Edit `.env` before running `docker-compose up`:

```bash
# Example: Change to production and use a different port
# Edit .env
NODE_ENV=production
BETTER_AUTH_URL=https://yourdomain.com

# Edit docker-compose.yml
ports:
  - "8080:3000"  # Listen on host port 8080

# Then restart:
docker-compose down
docker-compose up -d
```

## Troubleshooting

### Container exits immediately

```bash
docker-compose logs csv-viewer
# Check for missing .env or BETTER_AUTH_SECRET
```

### Port 3000 already in use

Edit `docker-compose.yml`:

```yaml
ports:
  - "3001:3000" # Use 3001 instead
```

### Can't log after restart

- Click the login button and use your admin credentials
- Session cookies work across container restarts
- If login fails, check that the database volume is still attached

### Permission denied errors

```bash
# Fix volume permissions
docker run --rm -v csv-viewer-data:/data alpine chmod 700 /data
```

## Production Deployment

For production, consider:

1. **Use a reverse proxy** (nginx/caddy) for TLS/SSL termination
2. **Set NODE_ENV=production** in `.env`
3. **Consider PostgreSQL** instead of SQLite for multi-instance deployment (beyond scope of this guide)
4. **Regular backups** - automate volume backups to offsite storage
5. **Resource limits** - uncomment the `deploy` section in `docker-compose.yml`
6. **Logging** - forward container logs to a centralized logging service

Example docker-compose.yml additions for production:

```yaml
services:
  csv-viewer:
    deploy:
      resources:
        limits:
          cpus: "1.0"
          memory: 512M
        reservations:
          cpus: "0.5"
          memory: 256M
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
```

## Getting Help

- Check logs: `docker-compose logs csv-viewer`
- Review [README.md](../README.md) for development setup
- Verify .env has all required variables: `cat .env`
- Test connectivity: `curl http://localhost:3000`
