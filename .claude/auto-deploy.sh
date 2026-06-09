#!/bin/bash
# Auto-called by Claude Code Stop hook after each session.
# Commits any changes, pushes to GitHub, then deploys a Vercel preview.

set -e
cd "$(dirname "$0")/.."

# ── 1. Commit if there are changes ──────────────────────────────────────────
if ! git diff --quiet || ! git diff --cached --quiet || [ -n "$(git ls-files --others --exclude-standard)" ]; then
  git add -A
  # Build a short summary from changed files
  SUMMARY=$(git diff --cached --name-only | head -5 | tr '\n' ' ')
  git commit -m "chore: auto-save — ${SUMMARY% }

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
  echo "✅ Committed changes"
else
  echo "ℹ️  Nothing to commit"
fi

# ── 2. Push to GitHub ────────────────────────────────────────────────────────
git push origin HEAD
echo "✅ Pushed to GitHub"

# ── 3. Deploy to Vercel (preview) ───────────────────────────────────────────
vercel deploy --yes 2>&1 | tail -5
echo "✅ Vercel preview deployed"
