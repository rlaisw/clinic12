#!/bin/bash
# fix_xframe.sh – Update X-Frame-Options and reload nginx

if [ $# -ne 1 ]; then
  echo "Usage: $0 <nginx-config-file>"
  exit 1
fi

CFG="$1"
BACKUP="${CFG}.bak"

# Backup original file
cp "$CFG" "$BACKUP"

# Change X-Frame-Options from deny to SAMEORIGIN (or ALLOW-FROM if preferred)
sed -i 's/add_header\s\+X-Frame-Options\s\+"[^"]*"/add_header X-Frame-Options "SAMEORIGIN";/g' "$CFG"

# Verify syntax and reload
nginx -t && systemctl reload nginx
echo "Updated X-Frame-Options in $CFG → SAMEORIGIN and reloaded nginx."