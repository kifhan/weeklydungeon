#!/usr/bin/env bash
# Generates /Users/darter/Workplace/grumpydarter_project/weeklydungeon/favicon.ico from an embedded SVG.
# Requirements: ImageMagick (convert)

set -euo pipefail
ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
OUT_ICON="$ROOT_DIR/favicon.ico"
TMP_SVG="$ROOT_DIR/.favicon_temp.svg"

cat > "$TMP_SVG" <<'SVG'
<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 256 256">
  <rect width="100%" height="100%" fill="#1f2937"/>
  <text x="50%" y="50%" font-size="140" font-family="Arial, Helvetica, sans-serif" fill="#fbbf24" dominant-baseline="middle" text-anchor="middle">W</text>
</svg>
SVG

# Create favicon.ico with common sizes (64,48,32,16)
if ! command -v convert >/dev/null 2>&1; then
  echo "Error: ImageMagick 'convert' not found. Install it (e.g. apt install imagemagick or brew install imagemagick) and re-run this script." >&2
  rm -f "$TMP_SVG"
  exit 1
fi

# Generate ICO (ImageMagick will rasterize SVG to requested sizes)
convert "$TMP_SVG" -background none -resize 64x64 \
  "$TMP_SVG" -background none -resize 48x48 \
  "$TMP_SVG" -background none -resize 32x32 \
  "$TMP_SVG" -background none -resize 16x16 \
  -colors 256 "$OUT_ICON"

rm -f "$TMP_SVG"
echo "Generated favicon: $OUT_ICON"
