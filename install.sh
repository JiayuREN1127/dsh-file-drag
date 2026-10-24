#!/usr/bin/env bash
# Install dsh-file-drag into the DeepSeek Harness desktop profile.
# Idempotent: re-running only refreshes the package files.
set -euo pipefail

SRC="$(cd "$(dirname "$0")" && pwd)"
PROFILE="${DSH_PROFILE_DIR:-$HOME/.dsh/profiles/desktop}"
DEST="$PROFILE/node_modules/dsh-file-drag"
PATCH="$PROFILE/cordis.patch.yml"

if [ ! -d "$PROFILE" ]; then
  echo "profile not found: $PROFILE" >&2
  echo "set DSH_PROFILE_DIR to point at your profile directory" >&2
  exit 1
fi

mkdir -p "$DEST"
rm -rf "$DEST/lib"
cp -R "$SRC/lib" "$DEST/lib"
cp "$SRC/package.json" "$DEST/package.json"
echo "installed package -> $DEST"

if grep -qF 'name: dsh-file-drag' "$PATCH" 2>/dev/null; then
  echo "loader row already present in $PATCH"
else
  cp "$PATCH" "$PATCH.bak-$(date +%Y%m%d%H%M%S)"
  cat >> "$PATCH" <<'YAML'
- insert:
    - id: dsh-file-drag
      name: dsh-file-drag
YAML
  echo "appended loader row to $PATCH (backup kept next to it)"
fi

echo
echo "Restart DeepSeek Harness completely (Cmd-Q, then reopen) to load the plugin."
