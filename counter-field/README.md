# Melbourne Counter Field Clock

A lightweight real-time clock designed for the 3840 × 804 gallery screen.

## Concept

The time is formed from hundreds of small independent numerical counters. Inactive counters continue to change quietly in the field. Only a large digit that changes is reconfigured, while a full-width green synchronisation scan marks each new minute.

## Production constraints

- Fixed artwork canvas: 3840 × 804
- Default render buffer: 1920 × 402, CSS-scaled to the native display
- Pure Canvas 2D and vanilla JavaScript
- 18 fps cap
- No external libraries, APIs or network dependencies
- Australia/Melbourne time zone
- Resynchronises from the system clock on every frame
- Pauses rendering when the browser tab is hidden
- `noindex`, `nofollow`, `noarchive`
- Designed for Chromium on NVIDIA Shield signage playback

## URL options

- `?preview=1` top-aligns the artwork and adds a mobile viewing note
- `?demo=1` runs time at 8× speed for transition review
- `?quality=high` uses a native 3840 × 804 render buffer
- `?quality=low` uses a 1440 × 302 render buffer
- `?motion=0` removes micro-motion and transition animation
- `?time=12:34:56` locks the clock for layout testing

## Font

The hosted subfolder references the existing `MP-B.ttf` file one directory above. For a standalone repository, copy `MP-B.ttf` into the repository root and change the font URL in `style.css` from `../MP-B.ttf` to `./MP-B.ttf`.
