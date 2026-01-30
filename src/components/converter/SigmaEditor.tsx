import Editor from "@monaco-editor/react";
import { useCallback, useRef } from "react";

interface SigmaEditorProps {
  value: string;
  onChange: (value: string) => void;
  onConvert?: () => void;
}

export function SigmaEditor({ value, onChange, onConvert }: SigmaEditorProps) {
  const onConvertRef = useRef(onConvert);
  onConvertRef.current = onConvert;

  const handleEditorMount = useCallback((editor: any) => {
    editor.addAction({
      id: "convert-sigma-rule",
      label: "Convert Sigma Rule",
      // biome-ignore lint/suspicious/noBitwiseOperators: Monaco keybinding API requires bitwise OR
      keybindings: [2048 | 3],
      run: () => {
        onConvertRef.current?.();
      },
    });
  }, []);

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-white/[0.06] border-b px-4 py-2">
        <span className="font-medium text-muted-foreground text-xs uppercase tracking-wider">
          Sigma Rule (YAML)
        </span>
        <kbd className="rounded border border-white/[0.08] bg-white/[0.04] px-1.5 py-0.5 text-[10px] text-muted-foreground/50">
          ⌘↵ convert
        </kbd>
      </div>
      <div className="flex-1">
        <Editor
          defaultLanguage="yaml"
          height="100%"
          onChange={(val) => onChange(val ?? "")}
          onMount={handleEditorMount}
          options={{
            automaticLayout: true,
            fontSize: 13,
            fontFamily: "'Berkeley Mono', monospace",
            lineNumbers: "on",
            minimap: { enabled: false },
            padding: { top: 12, bottom: 12 },
            renderLineHighlight: "none",
            scrollBeyondLastLine: false,
            wordWrap: "on",
            tabSize: 2,
          }}
          theme="vs-dark"
          value={value}
        />
      </div>
    </div>
  );
}
