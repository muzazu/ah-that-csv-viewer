#!/bin/bash
set -euo pipefail

# CSV Viewer Setup Script
# This script checks for Docker installation, installs Docker if needed,
# and initializes .env with secure defaults.
#
# Usage: ./setup.sh [--force]
# Options:
#   --force  Regenerate all .env values, overwriting existing ones

FORCE="${1:-}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="${SCRIPT_DIR}/.env"
ENV_EXAMPLE="${SCRIPT_DIR}/.env.example"

# Color output for readability
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log_info() {
  echo -e "${BLUE}[INFO]${NC} $*"
}

log_success() {
  echo -e "${GREEN}[OK]${NC} $*"
}

log_warn() {
  echo -e "${YELLOW}[WARN]${NC} $*"
}

log_error() {
  echo -e "${RED}[ERROR]${NC} $*"
}

# Detect if running inside WSL2
is_wsl2() {
  grep -qi microsoft /proc/version 2>/dev/null
}

# Detect if running in a Windows-like shell (Git Bash/MSYS/Cygwin)
is_windows_shell() {
  case "$(uname -s 2>/dev/null || echo unknown)" in
    MINGW*|MSYS*|CYGWIN*)
      return 0
      ;;
    *)
      return 1
      ;;
  esac
}

# Detect Linux distribution for package manager
detect_package_manager() {
  if [ -f /etc/os-release ]; then
    . /etc/os-release
    
    if [[ "$ID" =~ ^(ubuntu|debian)$ ]] || [[ "$ID_LIKE" =~ debian ]]; then
      echo "apt"
    elif [[ "$ID" =~ ^(rhel|fedora|centos|rocky|almalinux)$ ]] || [[ "$ID_LIKE" =~ rhel ]]; then
      echo "dnf"
    else
      echo "unknown"
    fi
  else
    echo "unknown"
  fi
}

# Install Docker on APT-based systems (Debian/Ubuntu)
install_docker_apt() {
  log_info "Installing Docker on Debian/Ubuntu-based system..."
  
  # Update package lists
  sudo apt-get update
  
  # Install dependencies
  sudo apt-get install -y \
    ca-certificates \
    curl \
    gnupg \
    lsb-release
  
  # Add Docker's official GPG key
  sudo mkdir -p /etc/apt/keyrings
  curl -fsSL https://download.docker.com/linux/$(lsb_release -is | tr '[:upper:]' '[:lower:]')/gpg | \
    sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
  
  # Set up stable repository
  echo \
    "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/$(lsb_release -is | tr '[:upper:]' '[:lower:]') \
    $(lsb_release -cs) stable" | \
    sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
  
  # Install Docker
  sudo apt-get update
  sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
}

# Install Docker on DNF-based systems (RHEL/CentOS/Fedora)
install_docker_dnf() {
  log_info "Installing Docker on RHEL/CentOS/Fedora-based system..."
  
  # Install Docker repo
  sudo dnf config-manager --add-repo https://download.docker.com/linux/fedora/docker-ce.repo
  
  # Install Docker
  sudo dnf install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
}

# Check and install Docker
# Returns 0 if Docker is available (or WSL2 where install must be handled externally)
# Returns 1 if Docker install failed on native Linux
check_and_install_docker() {
  if command -v docker &> /dev/null; then
    DOCKER_VERSION=$(docker --version)
    log_success "Docker is already installed: $DOCKER_VERSION"
    return 0
  fi

  # Windows shells: Docker should be installed through Docker Desktop
  if is_windows_shell; then
    log_warn "Running in a Windows shell environment."
    log_warn "Please install Docker Desktop for Windows and ensure the docker CLI is in PATH."
    log_warn "Download: https://docs.docker.com/desktop/setup/install/windows-install/"
    log_warn "Skipping Docker installation here and continuing to env setup..."
    return 0
  fi

  # WSL2: Docker must be enabled via Docker Desktop, not installed natively
  if is_wsl2; then
    log_warn "Running inside WSL2: Docker cannot be installed natively here."
    log_warn "To use Docker, enable WSL integration in Docker Desktop:"
    log_warn "  Docker Desktop → Settings → Resources → WSL Integration → enable this distro"
    log_warn "Then restart this terminal and re-run setup.sh"
    log_warn "Skipping Docker installation — continuing to env setup..."
    return 0
  fi

  log_info "Docker not found. Detecting package manager..."
  PKG_MANAGER=$(detect_package_manager)

  case "$PKG_MANAGER" in
    apt)
      install_docker_apt
      ;;
    dnf)
      install_docker_dnf
      ;;
    *)
      log_error "Unsupported package manager detected or distribution not recognized."
      log_error "Supported: Ubuntu/Debian (apt), RHEL/CentOS/Fedora/Rocky/AlmaLinux (dnf)"
      log_error "Please install Docker manually: https://docs.docker.com/engine/install/"
      return 1
      ;;
  esac

  # Enable and start Docker service
  if command -v systemctl &> /dev/null; then
    log_info "Enabling and starting Docker service..."
    sudo systemctl enable docker
    sudo systemctl start docker
  else
    log_warn "systemd not detected; Docker service not auto-started. Please start manually."
  fi

  # Add current user to docker group
  if grep -q "docker" /etc/group; then
    log_info "Adding current user to docker group..."
    sudo usermod -aG docker "${USER}"
    log_warn "Docker group membership will take effect after you log out and back in."
    log_warn "To avoid logging out, run: newgrp docker"
  fi

  # Verify installation
  if command -v docker &> /dev/null; then
    DOCKER_VERSION=$(docker --version)
    log_success "Docker installed successfully: $DOCKER_VERSION"
  else
    log_error "Docker installation failed or is not in PATH."
    return 1
  fi
}

# Generate a secure random string (32 bytes base64)
generate_secret() {
  if command -v openssl &> /dev/null; then
    openssl rand -base64 32
  else
    # Fallback using /dev/urandom if openssl is not available
    head -c 32 /dev/urandom | base64 | tr -d '\n'
  fi
}

is_valid_http_url() {
  local url="$1"
  [[ "$url" =~ ^https?://[^[:space:]]+$ ]]
}

prompt_better_auth_url() {
  local current_default="$1"

  # Non-interactive shells should use the provided default as-is.
  if [ ! -t 0 ] || [ ! -t 1 ]; then
    echo "$current_default"
    return 0
  fi

  local url_input
  while true; do
    echo
    log_info "Set BETTER_AUTH_URL to your public app URL for production (for example: https://app.example.com)."
    read -r -p "BETTER_AUTH_URL [${current_default}]: " url_input
    url_input="${url_input:-$current_default}"

    if is_valid_http_url "$url_input"; then
      echo "$url_input"
      return 0
    fi

    log_warn "Invalid URL. Please include http:// or https:// and avoid spaces."
  done
}

# Read or generate env variables
load_or_generate_env() {
  local key="$1"
  local default="$2"
  local generate_secret_flag="${3:-false}"
  
  # Check if already set in environment
  local current_value="${!key:-}"
  if [ -n "$current_value" ]; then
    echo "$current_value"
    return 0
  fi
  
  # Check if exists in .env file and not forcing regeneration
  if [ -f "$ENV_FILE" ] && [ "$FORCE" != "--force" ]; then
    local file_value=$(grep "^${key}=" "$ENV_FILE" 2>/dev/null | cut -d'=' -f2- | sed 's/ *#.*$//;s/^"//;s/"$//' || echo "")
    if [ -n "$file_value" ]; then
      echo "$file_value"
      return 0
    fi
  fi
  
  # Generate or use default
  if [ "$generate_secret_flag" = "true" ]; then
    generate_secret
  else
    echo "$default"
  fi
}

# Initialize .env file
initialize_env() {
  log_info "Initializing .env file..."
  
  # Use .env.example as template if it exists, otherwise create minimal .env
  if [ ! -f "$ENV_FILE" ]; then
    if [ -f "$ENV_EXAMPLE" ]; then
      cp "$ENV_EXAMPLE" "$ENV_FILE"
      log_info "Copied .env.example to .env"
    else
      log_warn ".env.example not found; creating minimal .env"
      cat > "$ENV_FILE" << 'EOF'
# Database URL for SQLite
DATABASE_URL="/data/csv-viewer.db"

# Better Auth configuration
BETTER_AUTH_URL=http://localhost:3000
BETTER_AUTH_SECRET=

# Node environment
NODE_ENV=development
CSV_VIEWER_UID=1000
CSV_VIEWER_GID=1000
EOF
    fi
  fi
  
  # Now populate/update values
  log_info "Setting environment variables..."
  
  # DATABASE_URL
  local db_url=$(load_or_generate_env "DATABASE_URL" "/data/csv-viewer.db")
  sed -i "s|^DATABASE_URL=.*|DATABASE_URL=\"${db_url}\"|" "$ENV_FILE"

  local csv_viewer_uid=$(load_or_generate_env "CSV_VIEWER_UID" "$(id -u)")
  if grep -q "^CSV_VIEWER_UID=" "$ENV_FILE"; then
    sed -i "s|^CSV_VIEWER_UID=.*|CSV_VIEWER_UID=${csv_viewer_uid}|" "$ENV_FILE"
  else
    echo "CSV_VIEWER_UID=${csv_viewer_uid}" >> "$ENV_FILE"
  fi

  local csv_viewer_gid=$(load_or_generate_env "CSV_VIEWER_GID" "$(id -g)")
  if grep -q "^CSV_VIEWER_GID=" "$ENV_FILE"; then
    sed -i "s|^CSV_VIEWER_GID=.*|CSV_VIEWER_GID=${csv_viewer_gid}|" "$ENV_FILE"
  else
    echo "CSV_VIEWER_GID=${csv_viewer_gid}" >> "$ENV_FILE"
  fi
  
  # BETTER_AUTH_URL
  local auth_url=$(load_or_generate_env "BETTER_AUTH_URL" "http://localhost:3000")
  auth_url=$(prompt_better_auth_url "$auth_url")
  sed -i "s|^BETTER_AUTH_URL=.*|BETTER_AUTH_URL=${auth_url}|" "$ENV_FILE"
  
  # BETTER_AUTH_SECRET (generate if empty or forcing)
  local auth_secret=$(load_or_generate_env "BETTER_AUTH_SECRET" "" true)
  sed -i "s|^BETTER_AUTH_SECRET=.*|BETTER_AUTH_SECRET=${auth_secret}|" "$ENV_FILE"
  
  # NODE_ENV (keep as development unless explicitly set)
  if ! grep -q "^NODE_ENV" "$ENV_FILE"; then
    echo "NODE_ENV=development" >> "$ENV_FILE"
  fi
  
  log_success ".env file initialized"
  
  # Show a summary (without exposing the secret in detail)
  log_info "Environment summary:"
  log_info "  DATABASE_URL: $db_url"
  log_info "  CSV_VIEWER_UID:GID: ${csv_viewer_uid}:${csv_viewer_gid}"
  log_info "  BETTER_AUTH_URL: $auth_url"
  log_info "  BETTER_AUTH_SECRET: [generated - 32 chars]"
}

# Main execution
main() {
  echo
  log_info "CSV Viewer Setup Script"
  echo
  
  # Step 1: Check and install Docker
  log_info "=== Step 1: Docker Check and Installation ==="
  if ! check_and_install_docker; then
    log_error "Docker setup failed. Env setup will still run but Docker commands will not work until Docker is installed."
  fi
  echo
  
  # Step 2: Initialize environment
  log_info "=== Step 2: Environment Configuration ==="
  initialize_env
  echo
  
  log_success "Setup complete!"
  log_info ""
  log_info "Next steps:"
  log_info "1. Review and update .env if needed (secrets, ports, etc.)"
  log_info "2. Build the Docker image: docker build -t csv-viewer ."
  log_info "3. Run with compose: docker-compose up -d"
  log_info "   Or run manually: docker run -it --rm -v csv-data:/data -p 3000:3000 --env-file .env csv-viewer"
  log_info "4. Open http://localhost:3000 in your browser"
  log_info ""
  log_info "For more details, see README.md"
  docker compose up --build -d
  echo
}

main "$@"
