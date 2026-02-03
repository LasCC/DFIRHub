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

  const handleBeforeMount = useCallback((monaco: any) => {
    monaco.editor.defineTheme("vesper", {
      base: "vs-dark",
      inherit: true,
      rules: [
        { token: "", foreground: "b0b0b0", background: "101010" },
        { token: "string", foreground: "99FFE4" },
        { token: "string.yaml", foreground: "99FFE4" },
        { token: "keyword", foreground: "FFC799" },
        { token: "number", foreground: "FFC799" },
        { token: "comment", foreground: "505050" },
        { token: "type", foreground: "FFC799" },
        { token: "tag", foreground: "FFC799" },
      ],
      colors: {
        "editor.background": "#101010",
        "editor.foreground": "#b0b0b0",
        "editor.lineHighlightBackground": "#101010",
        "editor.selectionBackground": "#ffffff15",
        "editorCursor.foreground": "#b0b0b0",
        "editorLineNumber.foreground": "#505050",
        "editorLineNumber.activeForeground": "#b0b0b0",
      },
    });
  }, []);

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
    <div className="flex h-full flex-col bg-[#101010]">
      <div className="flex items-center justify-between border-white/[0.06] border-b px-4 py-2">
        <span className="font-medium text-muted-foreground text-xs uppercase tracking-wider">
          Sigma Rule (YAML)
        </span>
        <kbd className="flex items-center gap-1.5 rounded-md border border-white/[0.06] bg-white/[0.04] px-2 py-1 text-muted-foreground text-xs">
          ⌘↵ convert
        </kbd>
      </div>
      <div className="flex-1">
        <Editor
          beforeMount={handleBeforeMount}
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
          theme="vesper"
          value={value}
        />
      </div>
    </div>
  );
}
