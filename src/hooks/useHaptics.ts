import type { Vibration } from "web-haptics";

import { useCallback, useMemo } from "react";
import { useWebHaptics } from "web-haptics/react";

/**
 * Custom presets for interactions not covered by built-in presets.
 * Built-in presets used directly: "success", "error", "selection"
 */
const TOGGLE_PATTERN: Vibration[] = [
  { duration: 30, intensity: 0.5 },
  { delay: 30, duration: 30, intensity: 0.3 },
];

const DIALOG_PATTERN: Vibration[] = [{ duration: 50, intensity: 0.6 }];

/**
 * Centralized haptic feedback hook wrapping web-haptics.
 * All methods are no-ops on unsupported devices (desktop, older iOS).
 */
export function useHaptics() {
  const { trigger, cancel, isSupported } = useWebHaptics();

  /** Subtle tap for buttons, tabs, filter pills */
  const tapHaptic = useCallback(() => {
    trigger("light");
  }, [trigger]);

  /** Two-tap confirmation for clipboard copy */
  const successHaptic = useCallback(() => {
    trigger("success");
  }, [trigger]);

  /** Three sharp taps for errors */
  const errorHaptic = useCallback(() => {
    trigger("error");
  }, [trigger]);

  /** Two-beat feedback for checkboxes and toggles */
  const toggleHaptic = useCallback(() => {
    trigger(TOGGLE_PATTERN);
  }, [trigger]);

  /** Medium tap for dialog open */
  const dialogHaptic = useCallback(() => {
    trigger(DIALOG_PATTERN);
  }, [trigger]);

  return useMemo(
    () => ({
      tapHaptic,
      successHaptic,
      errorHaptic,
      toggleHaptic,
      dialogHaptic,
      cancel,
      isSupported,
    }),
    [
      tapHaptic,
      successHaptic,
      errorHaptic,
      toggleHaptic,
      dialogHaptic,
      cancel,
      isSupported,
    ]
  );
}
