#!/bin/sh

set -eu

# Xcode Cloud runs this script from ios/ci_scripts. Resolve the repository
# root from the script location so the commands also work outside the cloud.
SCRIPT_DIR="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"
REPOSITORY_ROOT="$(CDPATH= cd -- "$SCRIPT_DIR/../.." && pwd)"

cd "$REPOSITORY_ROOT"

if ! command -v node >/dev/null 2>&1; then
  brew install node
fi

if ! command -v pod >/dev/null 2>&1; then
  brew install cocoapods
fi

npm ci

cd "$REPOSITORY_ROOT/ios"
pod install
