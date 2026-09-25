#!/bin/sh

set -eu

# Xcode Cloud runs this script from ios/ci_scripts. Resolve the repository
# root from the script location so the commands also work outside the cloud.
SCRIPT_DIR="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"
REPOSITORY_ROOT="$(CDPATH= cd -- "$SCRIPT_DIR/../.." && pwd)"

cd "$REPOSITORY_ROOT"

# Expo reads public client configuration while Metro creates the production
# bundle. Xcode Cloud variables are not files, so materialize only the values
# explicitly provided by the workflow. This file remains local to the build.
if [ -n "${EXPO_PUBLIC_SUPABASE_URL:-}" ] && [ -n "${EXPO_PUBLIC_SUPABASE_ANON_KEY:-}" ]; then
  printf '%s\n' \
    "EXPO_PUBLIC_SUPABASE_URL=$EXPO_PUBLIC_SUPABASE_URL" \
    "EXPO_PUBLIC_SUPABASE_ANON_KEY=$EXPO_PUBLIC_SUPABASE_ANON_KEY" \
    > "$REPOSITORY_ROOT/.env.local"
else
  echo "warning: Supabase variables are missing from the Xcode Cloud workflow"
fi

if ! command -v node >/dev/null 2>&1; then
  brew install node
fi

if ! command -v pod >/dev/null 2>&1; then
  brew install cocoapods
fi

npm ci

cd "$REPOSITORY_ROOT/ios"
pod install
