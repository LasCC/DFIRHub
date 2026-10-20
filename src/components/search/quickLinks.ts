import { FileSearch, Hammer, Home, KeyRound, Layers } from "lucide-react";
import type { ComponentType } from "react";

import { ConverterIcon } from "@/components/ui/ConverterIcon";

export interface QuickLink {
  href: string;
  icon: ComponentType<{ className?: string }>;
  label: string;
  shortcut: string;
}

export const QUICK_LINKS: QuickLink[] = [
  { href: "/", icon: Home, label: "Home", shortcut: "h" },
  {
    href: "/artifacts",
    icon: FileSearch,
    label: "All artifacts",
    shortcut: "a",
  },
  { href: "/collections", icon: Layers, label: "Collections", shortcut: "c" },
  {
    href: "/registry",
    icon: KeyRound,
    label: "Registry artifacts",
    shortcut: "r",
  },
  { href: "/builder", icon: Hammer, label: "Builder", shortcut: "b" },
  {
    href: "/converter",
    icon: ConverterIcon,
    label: "Converter",
    shortcut: "s",
  },
];
