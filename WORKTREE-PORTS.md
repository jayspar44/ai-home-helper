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
| feature-planner-redesign | 3010 | 3011 | Active | Meal planner redesign with progressive disclosure |

## Setup Helper Script

To automatically configure a new worktree with custom ports:

```bash
# For existing worktree:
./scripts/setup-worktree.sh <worktree-name> <port-offset>

# To create and setup new worktree:
./scripts/setup-worktree.sh <worktree-name> <port-offset> --create
```

**Examples:**
```bash
# Setup existing worktree with ports 3010/3011
./scripts/setup-worktree.sh feature-planner-redesign 10

# Create new worktree with ports 3020/3021
./scripts/setup-worktree.sh feature-new-feature 20 --create
```

## Quick Reference

| Port Offset | Frontend | Backend | Status |
|-------------|----------|---------|--------|
| 0 | 3000 | 3001 | Main (in use) |
| 10 | 3010 | 3011 | Planner redesign (in use) |
| 20 | 3020 | 3021 | Available |
| 30 | 3030 | 3031 | Available |
| 40 | 3040 | 3041 | Available |
| 50 | 3050 | 3051 | Available |

**Start dev server on custom ports:**
```bash
cd ai-home-helper.worktrees/<worktree-name>
npm run dev:local
# Frontend: http://localhost:30X0
# Backend: http://localhost:30X1
```
