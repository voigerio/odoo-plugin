#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
mkdir -p dist
rm -f dist/voiger.zip
python3 - <<'PY'
import os, zipfile
with zipfile.ZipFile("dist/voiger.zip", "w", zipfile.ZIP_DEFLATED) as z:
    for root, dirs, files in os.walk("voiger"):
        dirs[:] = [d for d in dirs if d != "__pycache__"]
        for f in sorted(files):
            z.write(os.path.join(root, f))
PY
echo "dist/voiger.zip"
