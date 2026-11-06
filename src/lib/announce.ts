export const LIVE_ANNOUNCER_ID = "live-announcer";
const ANNOUNCEMENT_LIFETIME_MS = 1000;

let clearTimer: ReturnType<typeof setTimeout> | undefined;

export function announce(message: string): void {
  const announcer = document.getElementById(LIVE_ANNOUNCER_ID);
  if (!announcer) {
    return;
  }
  announcer.textContent = message;
  clearTimeout(clearTimer);
  clearTimer = setTimeout(() => {
    announcer.textContent = "";
  }, ANNOUNCEMENT_LIFETIME_MS);
}
