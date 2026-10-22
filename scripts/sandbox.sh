#!/bin/sh
# magpie sandbox: throwaway HOME under .sandbox/ (modelled on magpie-community scripts/try.sh)
# usage: sh scripts/sandbox.sh [login | providers | test | json | quota] [args...]
set -e
SB="$(pwd)/.sandbox"
mkdir -p "$SB/.config" "$SB/.cache"
m() { env HOME="$SB" XDG_CONFIG_HOME="$SB/.config" XDG_CACHE_HOME="$SB/.cache" \
      MAGPIE_ADDR=127.0.0.1:3499 magpie "$@"; }
case "${1:-providers}" in
  login) m plugin add "$PWD" && m plugin login cloudflare-workers-ai ;;
  providers) m providers ;;
  test) shift; m provider test cloudflare-workers-ai "$@" ;;
  json) m plugin --json ;;
  quota) m quota ;;
  *) m "$@" ;;
esac
