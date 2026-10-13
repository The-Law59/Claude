#!/bin/bash
# Installe les CLI graphify et omniroute dans les sessions Claude Code cloud.
set -euo pipefail
[ "${CLAUDE_CODE_REMOTE:-}" = "true" ] || exit 0

command -v graphify >/dev/null || uv tool install graphifyy >/dev/null 2>&1
command -v omniroute >/dev/null || npm install -g omniroute >/dev/null 2>&1
