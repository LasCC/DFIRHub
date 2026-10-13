const REGEX_SPECIAL_CHARACTERS = /[.*+?^${}()|[\]\\]/gu;

export const escapeRegExp = (value: string): string =>
  value.replace(REGEX_SPECIAL_CHARACTERS, "\\$&");
