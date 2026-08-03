# Melbourne Counter Field Clock

A lightweight real-time clock designed for the 3840 × 804 gallery screen.

## Live URLs

- Production: `https://creative-innovation-labs-bmc.github.io/Melbl8-Clock03-Split-flap/counter-field/`
- Mobile preview: `https://creative-innovation-labs-bmc.github.io/Melbl8-Clock03-Split-flap/counter-field/?preview=1`
- Accelerated transition test: `https://creative-innovation-labs-bmc.github.io/Melbl8-Clock03-Split-flap/counter-field/?preview=1&demo=1`

## Concept

The time is formed from hundreds of small independent numerical counters. Each large numeral is drawn on a 15 × 17 matrix traced from the supplied Meta Serif Bold numeral reference. The larger matrix preserves the reference's bold bowls, open `4`, slab terminals and shared baseline without turning the clock into a conventional text display.

At a clock change, the large silhouette switches immediately. The tiny numbers inside that silhouette then resolve to the new digit from left to right and top to bottom.

The internal sweep takes half of the natural interval for each position:

- Seconds ones: 0.5 seconds
- Seconds tens: 5 seconds
- Minutes ones: 30 seconds
- Minutes tens: 5 minutes
- Hours ones: 30 minutes
- Hours tens: half of the time until that position changes again

Each colon dot is a 3 × 3 counter matrix. Its tiny numbers advance once per second and resolve left to right, top to bottom over approximately 520 milliseconds. The colon shape does not move. Reduced-motion mode changes all nine counters instantly.

Inactive counters continue changing quietly in the field. A full-width green synchronisation scan marks each new minute.

## Production constraints

- Fixed artwork canvas: 3840 × 804
- Default render buffer: 1920 × 402, CSS-scaled to the native display
- Pure Canvas 2D and vanilla JavaScript
- 18 fps cap
- No WebGL
- No external libraries, APIs or CDN dependencies
- Australia/Melbourne time zone
- Resynchronises from the system clock on every frame
- Pauses rendering when the browser tab is hidden
- Designed for Chromium on NVIDIA Shield signage playback

## Search protection

The project is deliberately excluded from normal search discovery:

- Page metadata: `noindex`, `nofollow`, `noarchive`, `nosnippet`, `noimageindex`
- Separate directives for Googlebot and Bingbot
- Root `robots.txt`: `User-agent: *` and `Disallow: /`
- Referrer policy: `no-referrer`

This prevents ordinary search indexing but is not password protection. Anyone with the direct URL or access to the public GitHub repository can still open it.

## URL options

- `?preview=1` top-aligns the artwork and adds a mobile viewing note
- `?demo=1` runs time at 8× speed for transition review
- `?quality=high` uses a native 3840 × 804 render buffer
- `?quality=low` uses a 1440 × 302 render buffer
- `?motion=0` removes micro-motion and changes the colon counters instantly
- `?time=12:34:56` locks the clock for layout testing

## Font

The hosted subfolder references the existing `MP-B.ttf` file one directory above for the small counters and supporting typography. The large numeral silhouettes are custom matrix drawings based on the supplied Meta Serif Bold reference image.

## Digit geometry

- Every numeral uses the same 15 × 17 matrix and shared baseline
- The masks were traced from the supplied 0–9 reference rather than inferred from a seven-segment system
- Bold bowls and stems occupy roughly the same visual proportion as the reference
- The `4` uses a continuous diagonal, heavy crossbar and right stem
- Colon dots use a 3 × 3 counter matrix to match the heavier numeral weight
- Two grid spaces separate the two digits in each HH, MM and SS pair
- Top and bottom whitespace around the time field is balanced
- The minute progress line spans the full 3840-pixel screen width

## Final build

- Build identifier: `20260804a`
- Repository path: `counter-field/`
- Production entry point: `counter-field/index.html`
- Final numeral and colon transform: `counter-field/counter-field-meta-loader.js`
