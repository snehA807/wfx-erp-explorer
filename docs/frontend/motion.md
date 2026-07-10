# Motion & Animation

Status: LOCKED. Philosophy: motion is state-change feedback, never theater.
Compositor-cheap properties only — `transform`, `opacity`, `box-shadow`,
`color/background/border-color`. Nothing moves more than 2px except image zoom.
Nothing animates without user cause except the one load cascade and the
stitching line (which is caused by the stream).

## 1. Tokens
| Token | Value |
|---|---|
| `--dur-fast` | 100ms |
| `--dur-base` | 150ms |
| `--dur-slow` | 200ms |
| `--dur-zoom` | 300ms |
| `--ease-out` | cubic-bezier(0.2, 0, 0, 1) |
| `--ease-press` | cubic-bezier(0.3, 0, 0.6, 1) |
All transitions default to `--dur-base --ease-out` unless listed below.

## 2. Micro-interaction inventory (exhaustive — nothing off-list ships)
| Trigger | Response | Duration |
|---|---|---|
| Card hover | translateY(−2px) + shadow `0 1px 2px/.05 → 0 6px 16px/.08` + border → `--border-strong` | 150ms |
| Product image hover | inner image scale 1.00 → 1.04; frame static | 300ms |
| Table row hover | background tint | 100ms |
| Nav item hover | icon translateX(1px) + label color brighten | 100ms |
| Chip/pill hover | border → accent-tint, text brighten | 150ms |
| Button press | scale(0.98) | 80ms, `--ease-press` |
| Ask composer focus | lime glow ring blooms (box-shadow, inset palette) | 200ms |
| Stat cards initial load | staggered fade + rise 8px, 30ms stagger, once per mount | 200ms each |
| DetailPanel open/close | slide from right (transform), backdrop fade | 200ms |
| Palette open | fade + scale 0.98 → 1 | 150ms |
| Hero → thread collapse (Ask first submit) | hero block translates up + fades as composer docks bottom | 250ms, one-time |
| Toast enter/exit | fade + rise 4px | 150ms |
| Streaming caret | opacity blink | 1s steps, loop |
| Status dot pulse | opacity 1 → .5 → 1 | 2.4s loop |

## 3. Signature moments (the only two "designed" animations)
1. **Hero collapse** on Ask first submit — 250ms, once per session; establishes
   home → workspace transformation.
2. **Light↔inset route transition** (entering/leaving Ask): 150ms background
   crossfade on the main column only; the light sidebar never animates — it is
   the constant frame.

## 4. Running Stitch animation (SeamProgress)
The kinetic identity. An SVG line spanning the AI card's top edge; dash 6,
gap 4, cap round, stroke 2px, color `--accent` while stitching over a base seam
in `--seam-inset`.

States:
- **idle** — base seam only, no accent.
- **stitching** — accent dashes draw left→right via stroke-dashoffset animation,
  a continuous run of ~1.2s per full width, looping; each SSE stage transition
  (status→sql→rows→answer) lets the drawn portion *hold* its progress anchor —
  the seam visibly advances with the pipeline rather than spinning abstractly.
  Implementation contract: progress anchor = stage index / 4 of width; the
  looping draw animates only the remaining segment.
- **complete** — full-width stitch settles from accent to `--seam-inset` over
  300ms; the seam is whole. (Reading: the answer has been sewn.)
- **error** — draw halts at current anchor; the drawn portion recolors to
  `--warning` (SQL_BLOCKED) or `--danger` (failure), 150ms. No shaking, no flash.

Never used outside AICard. The static Seam primitive never animates.

## 5. Loading choreography
Skeletons appear immediately (no delay — perceived speed beats flicker
avoidance at our latencies), shimmer via subtle opacity oscillation, and are
geometry-identical to final content (zero CLS). The AI card has no skeleton —
its loading *is* the SeamProgress + status line narration ("Generating SQL… →
Running query… → Writing answer…" from SSE status events).

## 6. Reduced motion (`prefers-reduced-motion: reduce`)
- All transforms/durations collapse to 0ms; hover states become instant
  color/border changes only (no lift, no zoom, no press scale).
- Load cascade, hero collapse, panel slide → instant state swaps (fade 0ms).
- Streaming caret → static block character.
- Status dot → static.
- SeamProgress → no draw loop; the line jumps to the stage anchor per SSE event
  and to complete/error terminal states. Progress information is preserved;
  only the animation is removed. The status narration line carries the same
  information in text at all times, so no meaning is motion-only.
