// Two screens down is deep enough that the way back is worth offering, and
// half a screen from the top the guest has all but arrived. Keeping the two
// apart means scrolling around either one never blinks the button.
const SHOW_SCREENS = 2;
const HIDE_SCREENS = 0.5;

// Whether the back-to-top button belongs on screen, given whether it is there
// now: how far down the gallery the guest has come, in screenfuls.
export function backToTopShown(
  shown: boolean,
  scrollY: number,
  viewportHeight: number,
): boolean {
  if (viewportHeight <= 0) return false;
  return shown
    ? scrollY > viewportHeight * HIDE_SCREENS
    : scrollY >= viewportHeight * SHOW_SCREENS;
}
