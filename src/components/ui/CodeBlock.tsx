import { useEffect, useState } from "react";
import { codeToHtml } from "shiki";

interface CodeBlockProps {
  code: string;
  language: "powershell" | "batch" | "bash" | "shell" | "text";
}

const languageMap: Record<string, string> = {
  bash: "bash",
  batch: "bat",
  powershell: "powershell",
  shell: "bash",
  text: "text",
};

export function CodeBlock({ code, language }: CodeBlockProps) {
  const [highlightedHtml, setHighlightedHtml] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function highlight() {
      try {
        const html = await codeToHtml(code, {
          defaultColor: false,
          lang: languageMap[language] || "text",
          themes: {
            dark: "vesper",
            light: "github-light",
          },
        });
        if (mounted) {
          setHighlightedHtml(html);
          setIsLoading(false);
        }
      } catch (error) {
        console.error("Shiki highlighting error:", error);
        if (mounted) {
          setIsLoading(false);
        }
      }
    }

    highlight();

    return () => {
      mounted = false;
    };
  }, [code, language]);

  if (isLoading) {
    return (
      <pre className="overflow-x-auto rounded-lg border border-console-line bg-console p-4 text-xs">
        <code className="whitespace-pre-wrap font-mono text-console-foreground">
          {code}
        </code>
      </pre>
    );
  }

  return (
    <div className="shiki-wrapper">
      <div
        className="shiki-content"
        dangerouslySetInnerHTML={{ __html: highlightedHtml }}
      />
      <style>{`
				.shiki-wrapper .shiki,
				.shiki-wrapper pre {
					margin: 0;
					padding: 1rem;
					border-radius: 0.5rem;
					overflow-x: auto;
					max-height: 24rem;
					font-size: 0.75rem;
					line-height: 1.6;
					background: var(--console) !important;
					border: 1px solid var(--console-line);
				}
				.shiki-wrapper .shiki code,
				.shiki-wrapper pre code {
					font-family: var(--font-mono);
					white-space: pre-wrap;
					word-break: break-word;
					background: transparent !important;
				}
			`}</style>
    </div>
  );
}
