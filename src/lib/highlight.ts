import { codeToHtml } from "shiki";

export const SHIKI_THEMES = {
  dark: "vesper",
  light: "github-light",
} as const;

export async function highlightCodeToHtml(
  code: string,
  language: string
): Promise<string> {
  return await codeToHtml(code, {
    defaultColor: false,
    lang: language,
    themes: SHIKI_THEMES,
    transformers: [
      {
        pre(node) {
          node.properties.tabindex = undefined;
        },
      },
    ],
  });
}
