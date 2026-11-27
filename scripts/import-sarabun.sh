#!/usr/bin/env sh
# Regenerate the Sarabun Pixel fonts from Sarabun Medium (OFL). Usage: scripts/import-sarabun.sh /path/to/Sarabun-Medium.ttf
set -e
TTF="${1:?path to Sarabun-Medium.ttf}"
for z in 14 12; do
  python3 scripts/import-ttf.py "$TTF" --size $z --spacing 2 --id sarabun-px-$z --name "Sarabun Pixel $z" --th "สารบรรณ พิกเซล $z" \
    --credit "Source: Sarabun Medium, Copyright 2018 The Sarabun Project Authors (https://github.com/cadsondemak/Sarabun)" \
    --patch scripts/ttf-patches/sarabun-px-$z.easyfont --out samples/fonts/sarabun-px-$z.easyfont
done
