#!/usr/bin/env bash
set -euo pipefail

: "${FTP_HOST:?Missing FTP_HOST}"
: "${FTP_USER:?Missing FTP_USER}"
: "${FTP_PASS:?Missing FTP_PASS}"

VERSION_NAME="${VERSION_NAME:-v0.92-beta}"
RELEASE_ID="$(date +%Y-%m-%d_%H%M)_${VERSION_NAME}"

echo "Building…"
VERSION_NAME="$VERSION_NAME" npm run build-version

echo "Uploading release: $RELEASE_ID"
lftp -u "$FTP_USER","$FTP_PASS" "$FTP_HOST" <<EOF
set ftp:ssl-allow true
set ssl:verify-certificate no
set net:timeout 30
set net:max-retries 10
set net:reconnect-interval-base 5
set ftp:passive-mode true
set xfer:clobber true
mkdir -p _releases/$RELEASE_ID
mirror -R --verbose dist/ _releases/$RELEASE_ID
quit
EOF

echo "OK. Release uploaded:"
echo "$RELEASE_ID"
echo ""
echo "NEXT:"
echo "  ./deploy/activate.sh"
