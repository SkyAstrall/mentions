#!/usr/bin/env bash
# Consumer compile-smoke for @skyastrall/mentions-angular.
#
# Builds the workspace packages, packs them exactly as `pnpm publish` would
# (publishConfig.directory + workspace-protocol rewriting), then installs the
# tarballs into this standalone app pinned to a specific Angular major and
# AOT-compiles it. This is what proves the partial-Ivy output actually links
# inside a real consumer app of that major.
#
# usage: ./run.sh <angular-major> <typescript-range>
#   ./run.sh 21 "~5.9.0"
#   ./run.sh 22 "~6.0.0"
set -euo pipefail

NG="${1:?angular major required (e.g. 21)}"
TS="${2:?typescript range required (e.g. ~5.9.0)}"

SMOKE_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(cd "$SMOKE_DIR/../.." && pwd)"

echo "==> Building library packages"
pnpm --dir "$ROOT" --filter @skyastrall/mentions-core build
pnpm --dir "$ROOT" --filter @skyastrall/mentions-angular build

echo "==> Packing tarballs"
rm -rf "$SMOKE_DIR/.tarballs"
mkdir -p "$SMOKE_DIR/.tarballs"
(cd "$ROOT/packages/core" && pnpm pack --pack-destination "$SMOKE_DIR/.tarballs" > /dev/null)
(cd "$ROOT/packages/angular" && pnpm pack --pack-destination "$SMOKE_DIR/.tarballs" > /dev/null)
mv "$SMOKE_DIR"/.tarballs/skyastrall-mentions-core-*.tgz "$SMOKE_DIR/.tarballs/core.tgz"
mv "$SMOKE_DIR"/.tarballs/skyastrall-mentions-angular-*.tgz "$SMOKE_DIR/.tarballs/angular.tgz"

echo "==> Installing consumer app with @angular/*@$NG and typescript@$TS"
cd "$SMOKE_DIR"
rm -rf node_modules package-lock.json dist
npm install --no-audit --no-fund --loglevel=error \
	"@angular/core@^$NG" \
	"@angular/common@^$NG" \
	"@angular/forms@^$NG" \
	"@angular/compiler@^$NG" \
	"@angular/compiler-cli@^$NG" \
	"@angular/platform-browser@^$NG" \
	"@angular/build@^$NG" \
	"@angular/cli@^$NG" \
	"typescript@$TS" \
	"rxjs@^7.8.0" \
	"tslib@^2.8.0" \
	"./.tarballs/angular.tgz"

echo "==> AOT building against Angular $NG"
npx ng build

test -f dist/browser/index.html
echo "==> OK: consumer app compiled against Angular $NG"
