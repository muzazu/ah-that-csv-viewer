#!/bin/bash
set -euo pipefail

# CSV Viewer — one-command installer
#
# One-liner (clones repo + installs everything):
#   curl -fsSL https://raw.githubusercontent.com/muzazu/ah-that-csv-viewer/main/setup.sh | bash
#
# Run inside the repo after cloning:
#   ./setup.sh [--force]
#
# Options:
#   --force  Regenerate all .env values, overwriting existing ones

FORCE="${1:-}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="${SCRIPT_DIR}/.env"
ENV_EXAMPLE="${SCRIPT_DIR}/.env.example"

REPO_URL="https://github.com/muzazu/ah-that-csv-viewer"

# Bootstrap mode: script is running outside the cloned repo (e.g. piped from curl)
IS_BOOTSTRAP=false
[[ ! -f "${SCRIPT_DIR}/docker-compose.yml" ]] && IS_BOOTSTRAP=true

# ---- Logging (stderr only — keeps stdout clean for value capture) ----------
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; BLUE='\033[0;34m'; NC='\033[0m'
log_info()    { echo -e "${BLUE}[INFO]${NC} $*" >&2; }
log_success() { echo -e "${GREEN}[OK]${NC} $*" >&2; }
log_warn()    { echo -e "${YELLOW}[WARN]${NC} $*" >&2; }
log_error()   { echo -e "${RED}[ERROR]${NC} $*" >&2; }

# Read from /dev/tty so interactive prompts work even when stdin is a pipe
tty_read() {
  local prompt="$1" varname="$2"
  printf "%s" "$prompt" > /dev/tty
  IFS= read -r "$varname" < /dev/tty || true
}

# ---- Bootstrap: clone repo and re-exec ------------------------------------
bootstrap_repo() {
  echo >&2
  log_info "CSV Viewer — bootstrapping installation"
  echo >&2

  command -v git &> /dev/null || { log_error "git is required. Install git and re-run."; exit 1; }

  local default_dir="$HOME/csv-viewer"
  local install_dir
  tty_read "Install directory [$default_dir]: " install_dir
  install_dir="${install_dir:-$default_dir}"
  install_dir="${install_dir/#\~/$HOME}"   # expand leading ~

  if [[ -d "$install_dir" && -f "$install_dir/docker-compose.yml" ]]; then
    local choice
    tty_read "Directory already exists. Re-use it? [Y/n]: " choice
    [[ "${choice:-Y}" =~ ^[Nn] ]] && {
      log_error "Aborted. Remove $install_dir or choose a different path."
      exit 1
    }
    log_info "Re-using existing directory: $install_dir"
  else
    log_info "Cloning $REPO_URL → $install_dir"
    git clone -q "$REPO_URL" "$install_dir"
    log_success "Repository cloned."
  fi

  exec "$install_dir/setup.sh" "$@"
}

# ---- OS detection ---------------------------------------------------------
is_wsl2()          { grep -qi microsoft /proc/version 2>/dev/null; }
is_windows_shell() {
  case "$(uname -s 2>/dev/null || echo unknown)" in MINGW*|MSYS*|CYGWIN*) return 0;; *) return 1;; esac
}

detect_package_manager() {
  [[ ! -f /etc/os-release ]] && { echo "unknown"; return; }
  . /etc/os-release
  if   [[ "$ID" =~ ^(ubuntu|debian)$ ]]                       || [[ "${ID_LIKE:-}" =~ debian ]]; then echo "apt"
  elif [[ "$ID" =~ ^(rhel|fedora|centos|rocky|almalinux)$ ]]  || [[ "${ID_LIKE:-}" =~ rhel ]];   then echo "dnf"
  else echo "unknown"; fi
}

# ---- Docker ---------------------------------------------------------------
install_docker_apt() {
  log_info "Installing Docker (Debian/Ubuntu)..."
  sudo apt-get update -qq
  sudo apt-get install -y -qq ca-certificates curl gnupg lsb-release
  sudo mkdir -p /etc/apt/keyrings
  curl -fsSL "https://download.docker.com/linux/$(lsb_release -is | tr '[:upper:]' '[:lower:]')/gpg" \
    | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
  echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
    https://download.docker.com/linux/$(lsb_release -is | tr '[:upper:]' '[:lower:]') \
    $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
  sudo apt-get update -qq
  sudo apt-get install -y -qq docker-ce docker-ce-cli containerd.io docker-compose-plugin
}

install_docker_dnf() {
  log_info "Installing Docker (RHEL/CentOS/Fedora)..."
  sudo dnf config-manager --add-repo https://download.docker.com/linux/fedora/docker-ce.repo
  sudo dnf install -y -q docker-ce docker-ce-cli containerd.io docker-compose-plugin
}

check_and_install_docker() {
  if command -v docker &> /dev/null; then
    log_success "Docker $(docker --version | cut -d' ' -f3 | tr -d ,)"
    return 0
  fi

  if is_windows_shell; then
    log_warn "Windows shell detected — Docker must be installed separately."
    if command -v winget &> /dev/null; then
      log_warn "  Run:      winget install Docker.DockerDesktop"
    else
      log_warn "  Download: https://docs.docker.com/desktop/setup/install/windows-install/"
    fi
    log_warn "Re-run this script from Git Bash once Docker Desktop is running."
    return 0
  fi

  if is_wsl2; then
    log_warn "WSL2 detected — Docker must be installed on the Windows side."
    log_warn "  1. Open a Windows terminal and run:  winget install Docker.DockerDesktop"
    log_warn "  2. Enable WSL integration: Docker Desktop → Settings → Resources → WSL Integration"
    log_warn "  3. Restart this terminal, then re-run setup.sh"
    return 0
  fi

  log_info "Installing Docker..."
  case "$(detect_package_manager)" in
    apt) install_docker_apt ;;
    dnf) install_docker_dnf ;;
    *)
      log_error "Unsupported distro — install Docker manually: https://docs.docker.com/engine/install/"
      return 1
      ;;
  esac

  if command -v systemctl &> /dev/null; then
    sudo systemctl enable docker
    sudo systemctl start docker
  else
    log_warn "systemd not found — start Docker manually."
  fi

  if grep -q "docker" /etc/group; then
    sudo usermod -aG docker "${USER}"
    log_warn "Added to the docker group. Log out and back in (or run: newgrp docker)."
  fi

  command -v docker &> /dev/null || { log_error "Docker install failed."; return 1; }
  log_success "Docker $(docker --version | cut -d' ' -f3 | tr -d ,) installed."
}

# ---- Secrets --------------------------------------------------------------
generate_secret() {
  if command -v openssl &> /dev/null; then
    openssl rand -base64 32
  else
    head -c 32 /dev/urandom | base64 | tr -d '\n'
  fi
}

# ---- Prompts & validation -------------------------------------------------
is_valid_http_url() { [[ "$1" =~ ^https?://[^[:space:]]+$ ]]; }

prompt_better_auth_url() {
  local default="$1"

  # Skip prompt when no controlling terminal (CI, Docker build, etc.)
  [[ ! -e /dev/tty ]] && { echo "$default"; return 0; }

  local input
  while true; do
    echo >&2
    log_info "App URL used for auth callbacks (e.g. https://app.example.com):"
    tty_read "  BETTER_AUTH_URL [$default]: " input
    input="${input:-$default}"

    if is_valid_http_url "$input"; then
      echo "$input"
      return 0
    fi
    log_warn "Must start with http:// or https:// — try again."
  done
}

# ---- .env management ------------------------------------------------------
load_or_generate_env() {
  local key="$1" default="$2" gen_secret="${3:-false}"

  local current="${!key:-}"
  [[ -n "$current" ]] && { echo "$current"; return 0; }

  if [[ -f "$ENV_FILE" && "$FORCE" != "--force" ]]; then
    local file_val
    file_val=$(grep "^${key}=" "$ENV_FILE" 2>/dev/null | cut -d'=' -f2- | sed 's/ *#.*$//;s/^"//;s/"$//' || true)
    [[ -n "$file_val" ]] && { echo "$file_val"; return 0; }
  fi

  [[ "$gen_secret" == "true" ]] && { generate_secret; return 0; }
  echo "$default"
}

upsert_env() {
  local key="$1" value="$2"
  if grep -q "^${key}=" "$ENV_FILE"; then
    sed -i "s|^${key}=.*|${key}=${value}|" "$ENV_FILE"
  else
    echo "${key}=${value}" >> "$ENV_FILE"
  fi
}

initialize_env() {
  if [[ ! -f "$ENV_FILE" ]]; then
    if [[ -f "$ENV_EXAMPLE" ]]; then
      cp "$ENV_EXAMPLE" "$ENV_FILE"
    else
      cat > "$ENV_FILE" << 'EOF'
DATABASE_URL="/data/csv-viewer.db"
BETTER_AUTH_URL=http://localhost:3000
BETTER_AUTH_SECRET=
NODE_ENV=development
CSV_VIEWER_UID=1000
CSV_VIEWER_GID=1000
EOF
    fi
  fi

  local db_url uid gid auth_url auth_secret
  db_url=$(load_or_generate_env "DATABASE_URL" "/data/csv-viewer.db")
  uid=$(load_or_generate_env "CSV_VIEWER_UID" "$(id -u)")
  gid=$(load_or_generate_env "CSV_VIEWER_GID" "$(id -g)")
  auth_url=$(load_or_generate_env "BETTER_AUTH_URL" "http://localhost:3000")
  auth_url=$(prompt_better_auth_url "$auth_url")
  auth_secret=$(load_or_generate_env "BETTER_AUTH_SECRET" "" true)

  sed -i "s|^DATABASE_URL=.*|DATABASE_URL=\"${db_url}\"|" "$ENV_FILE"
  upsert_env "CSV_VIEWER_UID" "$uid"
  upsert_env "CSV_VIEWER_GID" "$gid"
  sed -i "s|^BETTER_AUTH_URL=.*|BETTER_AUTH_URL=${auth_url}|" "$ENV_FILE"
  sed -i "s|^BETTER_AUTH_SECRET=.*|BETTER_AUTH_SECRET=${auth_secret}|" "$ENV_FILE"
  grep -q "^NODE_ENV" "$ENV_FILE" || echo "NODE_ENV=development" >> "$ENV_FILE"

  log_success ".env ready  (BETTER_AUTH_URL=${auth_url})"
}

# ---- Entry point ----------------------------------------------------------
main() {
  echo >&2
  log_info "CSV Viewer Setup"
  echo >&2

  if $IS_BOOTSTRAP; then
    bootstrap_repo "$@"
    # bootstrap_repo always exec's — unreachable
  fi

  if ! check_and_install_docker; then
    log_error "Docker unavailable — continuing with .env setup only."
  fi
  echo >&2

  initialize_env
  echo >&2

  log_success "Setup complete — starting app..."
  docker compose up --build -d
  echo >&2
  log_info "Open http://localhost:3000 in your browser."
  echo >&2
}

main "$@"
