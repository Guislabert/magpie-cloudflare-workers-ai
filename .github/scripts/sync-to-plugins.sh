#!/usr/bin/env bash
# sync-to-plugins.sh — prepare a release for the upstream magpie-community/plugins
# delivery by copying THIS repo's slim runtime set into your plugins fork.
#
# Upstream packages/cloudflare-workers-ai ships only the files in its
# package.json files[] (index.mjs, src/, README×3, LICENSE) — see RELEASING.md.
# Misc files (llms.txt, assets/*) stay git-first only; do NOT copy them here.
#
# Usage:
#   ./.github/scripts/sync-to-plugins.sh --version <x.y.z> [--fork <path>] [--dry-run]
#
#   --version <x.y.z>   version to write into the fork's package.json (required)
#   --fork <path>       path to your plugins fork clone (default: ../plugins)
#   --dry-run           print what would be copied / changed, no writes
#
# After a real run, commit + push a branch in the fork and open the PR
# (see RELEASING.md step 3). Upstream CI rebuilds dist + npm on merge.
set -euo pipefail

VERSION=""
FORK="${FORK:-../plugins}"
DRYRUN=0
WITH_README=0   # default OFF: syncing READMEs pulls in hero <picture> refs for files
                # the upstream package doesn't carry (assets/hero-*.svg), which
                # breaks images in the dist tarball. See RELEASING.md hero caveat.

while [[ $# -gt 0 ]]; do
  case "$1" in
    --version) VERSION="$2"; shift 2 ;;
    --fork)    FORK="$2"; shift 2 ;;
    --with-readme) WITH_README=1; shift ;;
    --dry-run) DRYRUN=1; shift ;;
    *) echo "unknown arg: $1"; exit 2 ;;
  esac
done

if [[ -z "$VERSION" ]]; then
  echo "usage: $0 --version <x.y.z> [--fork <path>] [--with-readme] [--dry-run]" >&2
  exit 2
fi
if ! [[ "$VERSION" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
  echo "version '$VERSION' is not x.y.z" >&2; exit 2
fi

SRC_ROOT="$(cd "$(dirname -- "${BASH_SOURCE[0]}")/../.." && pwd)"
PKG="$FORK/packages/cloudflare-workers-ai"

# ---- resolve fork path (default ../plugins relative to this repo) ---------
if [[ "$FORK" == "../plugins" ]]; then FORK="$SRC_ROOT/../plugins"; fi
PKG="$FORK/packages/cloudflare-workers-ai"
if [[ ! -d "$PKG" ]]; then
  echo "error: fork package dir not found: $PKG" >&2
  echo "clone the fork first: git clone <your>@github.com:<you>/plugins.git  (branch main)" >&2
  exit 1
fi

say(){ echo "$*"; }
run(){ if [[ $DRYRUN == 1 ]]; then echo "  (dry-run) $*"; else "$@"; fi; }

# ---- 1. replace the slim runtime set ---------------------------------------
# Functional files always synced: index.mjs, src/, LICENSE.
# READMEs only with --with-readme (their hero <picture> refs would otherwise
# break in the upstream dist tarball, which lacks assets/hero-*.svg).
declare -A FILES=( [index.mjs]=1 [src/index.mjs]=1 [LICENSE]=1 )
if [[ $WITH_README == 1 ]]; then
  FILES[README.md]=1; FILES[README.zh-CN.md]=1; FILES[README.ja.md]=1
  echo "NOTE: --with-readme syncs the new READMEs; upstream dist has no assets/hero-*.svg"
  echo "  so hero images will be broken there. Prefer the git-first channel for docs, or"
  echo "  add assets/hero-{light,dark}.svg to upstream files[] too (see RELEASING.md)."
fi
say "Syncing to $PKG"

for rel in "${!FILES[@]}"; do
  src="$SRC_ROOT/$rel"
  if [[ ! -f "$src" ]]; then echo "  !! missing in source: $rel"; continue; fi
  mkdir -p "$PKG/$(dirname "$rel")"
  cmd=( cp "$src" "$PKG/$rel" )
  if [[ $DRYRUN == 1 ]]; then
    echo "  (dry-run) cp $src -> $PKG/$rel"
  else
    cp "$src" "$PKG/$rel"
  fi
done

# ---- 2. write the version into the fork's package.json (files[] untouched) --
if [[ $DRYRUN == 1 ]]; then
  echo "  (dry-run) set package.json version 0.0.0 -> $VERSION"
else
  python3 - "$VERSION" "$PKG/package.json" <<'PY'
import json, sys
new, path = sys.argv[1], sys.argv[2]
d = json.load(open(path))
old = d.get("version")
d["version"] = new
json.dump(d, open(path, "w"), indent=2, ensure_ascii=False)
print(f"  version {old or '(none)'} -> {new} in {path}")
PY
fi

# ---- 3. validate ------------------------------------------------------------
if [[ $DRYRUN != 1 ]]; then
  echo "  verifying version consistency (fork copy)…"
  ( cd "$PKG" && node --check index.mjs && [ -f src/index.mjs ] )
  ( cd "$PKG" && node --print "require('./package.json').version" | grep -qx "$VERSION" ) \
    && echo "  OK: fork package.json version = $VERSION"
  echo "  upstream tests: cd $PKG && node --test"
fi

say ""
say "Done${DRYRUN:+ (dry-run, nothing written)}."
say "Next: commit + push a branch under $FORK, then open the PR to magpie-community/plugins (see RELEASING.md)."