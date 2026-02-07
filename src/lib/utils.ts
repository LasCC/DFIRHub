import type { ClassValue } from "clsx";

import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Utility function to merge Tailwind CSS classes with clsx
 * This is the standard ShadCN/ui helper function
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
