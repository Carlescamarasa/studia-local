#!/usr/bin/env bash
set -euo pipefail

VER="${1:?Uso: ./deploy/run.sh v0.92-beta}"

VERSION_NAME="$VER" ./deploy/release.sh
./deploy/activate.sh

echo ""
echo "VERIFY:"
curl -s "https://studia.latrompetasonara.com/version.json?ts=$(date +%s)"
echo ""
