#!/bin/bash
# ============================================
# Worktree Setup Helper Script
# ============================================
# Automates the setup of new git worktrees with:
# - Custom port configuration to avoid conflicts
# - Environment file copying
# - Node modules installation
# - Port registry tracking
#
# Usage:
#   ./scripts/setup-worktree.sh <worktree-name> <port-offset> [--create]
#
# Examples:
#   # Setup existing worktree:
#   ./scripts/setup-worktree.sh feature-planner-redesign 10
#
#   # Create and setup new worktree:
#   ./scripts/setup-worktree.sh feature-new-feature 20 --create
#
# Port Pattern:
#   - Main: 3000 (frontend), 3001 (backend)
#   - Offset 10: 3010 (frontend), 3011 (backend)
#   - Offset 20: 3020 (frontend), 3021 (backend)
# ============================================

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Parse arguments
WORKTREE_NAME=$1
PORT_OFFSET=$2
CREATE_FLAG=$3

if [ -z "$WORKTREE_NAME" ] || [ -z "$PORT_OFFSET" ]; then
    echo -e "${RED}Error: Missing required arguments${NC}"
    echo ""
    echo "Usage: $0 <worktree-name> <port-offset> [--create]"
    echo ""
    echo "Examples:"
    echo "  $0 feature-planner-redesign 10"
    echo "  $0 feature-new-feature 20 --create"
    exit 1
fi

# Calculate ports
FRONTEND_PORT=$((3000 + PORT_OFFSET))
BACKEND_PORT=$((3001 + PORT_OFFSET))

# Determine paths
ROOT_DIR="$(pwd)"
WORKTREE_PATH="$ROOT_DIR.worktrees/$WORKTREE_NAME"

echo -e "${BLUE}============================================${NC}"
echo -e "${BLUE}Worktree Setup: $WORKTREE_NAME${NC}"
echo -e "${BLUE}============================================${NC}"
echo ""

# Create worktree if --create flag is provided
if [ "$CREATE_FLAG" == "--create" ]; then
    echo -e "${YELLOW}Creating new worktree...${NC}"
    if [ -d "$WORKTREE_PATH" ]; then
        echo -e "${RED}Error: Worktree already exists at $WORKTREE_PATH${NC}"
        exit 1
    fi

    # Create branch and worktree
    git worktree add "$WORKTREE_PATH" -b "$WORKTREE_NAME"
    echo -e "${GREEN}✓ Worktree created${NC}"
    echo ""
fi

# Check if worktree exists
if [ ! -d "$WORKTREE_PATH" ]; then
    echo -e "${RED}Error: Worktree does not exist at $WORKTREE_PATH${NC}"
    echo -e "${YELLOW}Tip: Use --create flag to create a new worktree${NC}"
    exit 1
fi

echo -e "${YELLOW}Configuring worktree...${NC}"
echo "  Frontend port: $FRONTEND_PORT"
echo "  Backend port: $BACKEND_PORT"
echo ""

# Step 1: Copy environment files
echo -e "${YELLOW}[1/5] Copying environment files...${NC}"

# Backend .env
if [ -f "$ROOT_DIR/backend/.env" ]; then
    cp "$ROOT_DIR/backend/.env" "$WORKTREE_PATH/backend/.env"
    echo "  ✓ Copied backend/.env"
else
    echo -e "  ${RED}✗ Warning: backend/.env not found in main directory${NC}"
fi

# Frontend .env.local
if [ -f "$ROOT_DIR/frontend/.env.local" ]; then
    cp "$ROOT_DIR/frontend/.env.local" "$WORKTREE_PATH/frontend/.env.local"
    echo "  ✓ Copied frontend/.env.local"
else
    echo -e "  ${RED}✗ Warning: frontend/.env.local not found in main directory${NC}"
fi

echo ""

# Step 2: Configure custom ports
echo -e "${YELLOW}[2/5] Configuring custom ports...${NC}"

# Update backend port
if [ -f "$WORKTREE_PATH/backend/.env" ]; then
    # Remove existing PORT line if present
    sed -i '/^PORT=/d' "$WORKTREE_PATH/backend/.env"
    # Update FRONTEND_URL
    sed -i "s|FRONTEND_URL=http://localhost:[0-9]*|FRONTEND_URL=http://localhost:$FRONTEND_PORT|g" "$WORKTREE_PATH/backend/.env"
    # Add new PORT at the end
    echo "" >> "$WORKTREE_PATH/backend/.env"
    echo "# Worktree custom port (added by setup-worktree.sh)" >> "$WORKTREE_PATH/backend/.env"
    echo "PORT=$BACKEND_PORT" >> "$WORKTREE_PATH/backend/.env"
    echo "  ✓ Backend configured for port $BACKEND_PORT"
else
    echo -e "  ${RED}✗ backend/.env not found${NC}"
fi

# Update frontend port
if [ -f "$WORKTREE_PATH/frontend/.env.local" ]; then
    # Remove existing PORT line if present
    sed -i '/^PORT=/d' "$WORKTREE_PATH/frontend/.env.local"
    # Add new PORT at the end
    echo "" >> "$WORKTREE_PATH/frontend/.env.local"
    echo "# Worktree custom port (added by setup-worktree.sh)" >> "$WORKTREE_PATH/frontend/.env.local"
    echo "PORT=$FRONTEND_PORT" >> "$WORKTREE_PATH/frontend/.env.local"
    echo "  ✓ Frontend configured for port $FRONTEND_PORT"
else
    echo -e "  ${RED}✗ frontend/.env.local not found${NC}"
fi

echo ""

# Step 3: Clean node_modules
echo -e "${YELLOW}[3/5] Cleaning node_modules...${NC}"
cd "$WORKTREE_PATH/frontend"
if [ -d "node_modules" ]; then
    rm -rf node_modules package-lock.json
    echo "  ✓ Cleaned frontend node_modules"
else
    echo "  ℹ Frontend node_modules not present"
fi
cd "$ROOT_DIR"
echo ""

# Step 4: Install dependencies
echo -e "${YELLOW}[4/5] Installing dependencies...${NC}"
echo "  (This may take a few minutes)"
cd "$WORKTREE_PATH/frontend"
npm install > /dev/null 2>&1
echo "  ✓ Frontend dependencies installed"
cd "$ROOT_DIR"
echo ""

# Step 5: Update port registry
echo -e "${YELLOW}[5/5] Updating port registry...${NC}"
REGISTRY_FILE="$ROOT_DIR/WORKTREE-PORTS.md"

# Create registry if it doesn't exist
if [ ! -f "$REGISTRY_FILE" ]; then
    cat > "$REGISTRY_FILE" << 'EOF'
# Worktree Port Assignments

Track port assignments for all worktrees to avoid conflicts.

## Port Pattern
- Main directory: `3000` (frontend), `3001` (backend)
- Each worktree: Increment by 10
  - Worktree 1: `3010` + `3011`
  - Worktree 2: `3020` + `3021`
  - Worktree 3: `3030` + `3031`
  - etc.

## Active Worktrees

| Worktree Name | Frontend Port | Backend Port | Status | Notes |
|---------------|---------------|--------------|--------|-------|
| main | 3000 | 3001 | Active | Main development branch |
EOF
    echo "  ✓ Created WORKTREE-PORTS.md"
fi

# Check if worktree already in registry
if grep -q "$WORKTREE_NAME" "$REGISTRY_FILE"; then
    # Update existing entry
    sed -i "s/| $WORKTREE_NAME .*/| $WORKTREE_NAME | $FRONTEND_PORT | $BACKEND_PORT | Active | Updated $(date +%Y-%m-%d) |/" "$REGISTRY_FILE"
    echo "  ✓ Updated entry in port registry"
else
    # Add new entry
    echo "| $WORKTREE_NAME | $FRONTEND_PORT | $BACKEND_PORT | Active | Created $(date +%Y-%m-%d) |" >> "$REGISTRY_FILE"
    echo "  ✓ Added to port registry"
fi

echo ""
echo -e "${GREEN}============================================${NC}"
echo -e "${GREEN}✓ Worktree setup complete!${NC}"
echo -e "${GREEN}============================================${NC}"
echo ""
echo -e "${BLUE}Quick Start:${NC}"
echo "  cd $WORKTREE_PATH"
echo "  npm run dev:local"
echo ""
echo -e "${BLUE}URLs:${NC}"
echo "  Frontend: ${GREEN}http://localhost:$FRONTEND_PORT${NC}"
echo "  Backend:  ${GREEN}http://localhost:$BACKEND_PORT${NC}"
echo ""
echo -e "${BLUE}Port Registry:${NC}"
echo "  View: cat WORKTREE-PORTS.md"
echo ""
