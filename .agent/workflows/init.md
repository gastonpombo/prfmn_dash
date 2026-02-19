---
description: Initialize project context for a new session — read PRD, explore structure, and set up task tracking
---

# /init Workflow — PerfuMan Dash

Run this at the start of every new session to bring yourself up to speed.

## Steps

1. Read the PRD and todo list:
   - `PRD.md` — full project description, tech stack, DB schema, routes
   - `todo.md` — outstanding tasks

2. List the app directory to confirm current route structure:
   `ls app/`

3. Check recent git history for context on what changed last:
   `git log --oneline -10`

4. Check if the dev server is running. If not, start it in the background:
   `pnpm dev`
   (runs on http://localhost:3000)

5. Summarize to the user:
   - Current project status
   - Any open tasks from `todo.md`
   - A concise description of the codebase ready for new work

## Key Facts

- **Project**: `PerfuMan Dash` — Next.js 16 admin dashboard for a boutique perfume store
- **Supabase project ID**: `rhnibdmzbavjbqgnxhry`
- **Main routes**: `/login`, `/dashboard`, `/dashboard/products`, `/dashboard/categories`, `/dashboard/orders`, `/dashboard/settings`
- **Package manager**: `pnpm`
- **Dev command**: `pnpm dev`
