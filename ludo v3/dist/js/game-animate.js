/* game-animate.js
 * ---------------------------------------------------------------------------
 * Makes the 4-player tokens glide between cells, the way the 5-player ones do.
 *
 * The 5-player board gets this for free: a token there is one SVG group placed
 * by `transform`, so a move is an attribute change and CSS interpolates it.
 * Here a move is `removeChild` + `appendChild` into a different cell div, and a
 * CSS transition cannot cross that - the element lands in a new containing
 * block and its position jumps. Hence FLIP:
 *
 *   First   measure where the token is now
 *   Last    let the move happen, measure where it ended up
 *   Invert  put it back visually with a transform, transition switched off
 *   Play    switch the transition on and clear the transform
 *
 * Two details that matter here:
 *
 *   - Centres, not corners. updateCellClasses() also changes a token's scale
 *     when it joins or leaves a stack, and a scaled box's left/top move even
 *     when its middle does not. Measuring centres keeps the glide honest and
 *     lets the scale change ride along in the same transition.
 *
 *   - The delta is PREPENDED to whatever transform the token is resting at
 *     (`translate(-50%, -50%) scale(k)`, written inline by game-ui.js). CSS
 *     applies transforms left to right, so an outer translate in px stays in
 *     screen space and is not multiplied by the scale that follows it.
 * ---------------------------------------------------------------------------
 */

/** One cell of travel. The 5-player board uses 170ms; this matches it. */
export const STEP_MS = 170;

/** Long enough to cover the CSS transition, used only as a safety net. */
const CLEANUP_MS = 400;

const reduced =
  typeof window.matchMedia === "function"
    ? window.matchMedia("(prefers-reduced-motion: reduce)")
    : { matches: false };

export const prefersReducedMotion = () => reduced.matches;

function centre(element) {
  const box = element.getBoundingClientRect();
  return { x: box.left + box.width / 2, y: box.top + box.height / 2 };
}

/**
 * Run `apply` - which may reparent the token, restyle it, or both - and animate
 * the token from wherever it was to wherever `apply` left it.
 *
 * Always calls `apply` exactly once, so it is safe to wrap any move in this
 * without changing what the move does.
 */
export function flip(tokenId, apply) {
  const token = document.getElementById(tokenId);

  if (!token || reduced.matches) {
    apply();
    return;
  }

  // Measured mid-flight this returns the current visual position, not the
  // pending one, so a token told to move again while still travelling carries
  // on from where it actually is instead of snapping.
  const from = centre(token);
  apply();
  const to = centre(token);

  const dx = from.x - to.x;
  const dy = from.y - to.y;

  // A re-layout that did not actually move anything needs no animation.
  if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5) return;

  const resting = token.style.transform || "";
  const host = token.parentElement;

  // .cell has overflow:hidden, which would clip the token to its destination
  // square for the whole flight. Opened up only while something is in the air.
  if (host) host.classList.add("animating");
  token.classList.add("moving");

  token.style.transition = "none";
  token.style.transform = `translate(${dx}px, ${dy}px) ${resting}`;

  // Force the browser to accept the inverted position as a starting point
  // before the transition is handed back, or the two writes coalesce into one
  // and nothing animates.
  void token.offsetWidth;

  token.style.transition = "";
  token.style.transform = resting;

  let settled = false;
  const settle = () => {
    if (settled) return;
    settled = true;
    token.classList.remove("moving");
    if (host) host.classList.remove("animating");
    token.removeEventListener("transitionend", settle);
    clearTimeout(timer);
  };

  // transitionend does not fire for a token that gets hidden mid-flight
  // (a yard being cleared for a result image), so the timer is the backstop.
  const timer = setTimeout(settle, CLEANUP_MS);
  token.addEventListener("transitionend", settle);
}
