# Branding sources

Banner and social preview reuse the approved iSSU template geometry. Titles use
Exo 2 Bold and subtitles Inter Semibold, outlined in typography.json.

Run `python3 outline-text.py /path/to/official/fonts > typography.json` with
fontTools, then `node build-assets.cjs` with sharp. Publish PNGs from assets/.
The iSSU wordmark and footer are unchanged approved assets.
