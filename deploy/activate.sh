#!/usr/bin/env bash
set -euo pipefail

: "${FTP_HOST:?Missing FTP_HOST}"
: "${FTP_USER:?Missing FTP_USER}"
: "${FTP_PASS:?Missing FTP_PASS}"

echo "Activating: local dist/ -> _current (with delete)"
lftp -u "$FTP_USER","$FTP_PASS" "$FTP_HOST" <<EOF
set ftp:ssl-allow true
set ssl:verify-certificate no
set net:timeout 30
set net:max-retries 10
set net:reconnect-interval-base 5
set ftp:passive-mode true
set xfer:clobber true
mkdir -p _current
mirror -R --delete --verbose dist/ _current
quit
EOF

echo "OK. Active version updated from local dist/"
