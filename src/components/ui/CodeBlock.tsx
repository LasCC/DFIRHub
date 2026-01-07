import { useEffect, useState } from "react";
import { codeToHtml } from "shiki";

interface CodeBlockProps {
	code: string;
	language: "powershell" | "batch" | "bash" | "shell" | "text";
}

// Map our formats to Shiki language identifiers
const languageMap: Record<string, string> = {
	powershell: "powershell",
	batch: "bat",
	bash: "bash",
	shell: "bash",
	text: "text",
};

export function CodeBlock({
	code,
	language,
}: CodeBlockProps) {
	const [highlightedHtml, setHighlightedHtml] = useState<string>("");
	const [isLoading, setIsLoading] = useState(true);

	useEffect(() => {
		let mounted = true;

		async function highlight() {
			try {
				const html = await codeToHtml(code, {
					lang: languageMap[language] || "text",
					theme: "github-dark-default",
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

	// Loading state - show plain code
	if (isLoading) {
		return (
			<pre className="code-block-pre">
				<code className="text-[#7ee787] whitespace-pre-wrap font-mono">
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
				.code-block-pre {
					padding: 1rem;
					background: rgba(0, 0, 0, 0.4);
					border-radius: 0.5rem;
					border: 1px solid rgba(255, 255, 255, 0.06);
					font-size: 0.75rem;
					overflow-x: auto;
					max-height: 24rem;
				}
				.shiki-wrapper .shiki,
				.shiki-wrapper pre {
					margin: 0;
					padding: 1rem;
					border-radius: 0.5rem;
					overflow-x: auto;
					max-height: 24rem;
					font-size: 0.75rem;
					line-height: 1.6;
					background: rgba(0, 0, 0, 0.4) !important;
					border: 1px solid rgba(255, 255, 255, 0.06);
				}
				.shiki-wrapper .shiki code,
				.shiki-wrapper pre code {
					font-family: ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace;
					white-space: pre-wrap;
					word-break: break-word;
					background: transparent !important;
				}
			`}</style>
		</div>
	);
}
