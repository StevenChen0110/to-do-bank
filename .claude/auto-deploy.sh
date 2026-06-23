#!/bin/bash
# DISABLED 2026-06-24 at user request.
# Workflow changed to: develop + test locally, manual version management,
# no automatic commit / GitHub push / Vercel deploy.
# (Previous behaviour: auto commit → push → vercel preview. Kept here for
#  reference in case the user wants to re-enable it later.)
echo "ℹ️  auto-deploy disabled — local testing only, no push/deploy."
exit 0
