import Editor from "@monaco-editor/react";
import { useCallback, useRef, useState } from "react";

import type { SigmaDiagnostic } from "@/lib/sigma/validate";

import { validateSigmaRule } from "@/lib/sigma/validate";

const EDITOR_OPTIONS = {
  automaticLayout: true,
  fontFamily: "'Berkeley Mono', monospace",
  fontSize: 13,
  lineNumbers: "on" as const,
  minimap: { enabled: false },
  padding: { bottom: 12, top: 12 },
  renderLineHighlight: "none" as const,
  scrollBeyondLastLine: false,
  tabSize: 2,
  wordWrap: "on" as const,
};

interface SigmaEditorProps {
  value: string;
  onChange: (value: string) => void;
  onConvert?: () => void;
}

export function SigmaEditor({ value, onChange, onConvert }: SigmaEditorProps) {
  const onConvertRef = useRef(onConvert);
  onConvertRef.current = onConvert;

  const [isDragging, setIsDragging] = useState(false);
  const dragCounter = useRef(0);
  // biome-ignore lint/suspicious/noExplicitAny: Monaco types are complex
  const monacoRef = useRef<any>(null);
  // biome-ignore lint/suspicious/noExplicitAny: Monaco types are complex
  const editorRef = useRef<any>(null);
  // biome-ignore lint/suspicious/noExplicitAny: setTimeout type varies between Node/browser
  const validationTimer = useRef<any>(null);

  const runValidation = useCallback((content: string) => {
    const monaco = monacoRef.current;
    const editor = editorRef.current;
    if (!(monaco && editor)) {
      return;
    }

    const model = editor.getModel();
    if (!model) {
      return;
    }

    const diagnostics = validateSigmaRule(content);
    const markers = diagnostics.map((d: SigmaDiagnostic) => ({
      endColumn: d.endCol,
      endLineNumber: d.endLine,
      message: d.message,
      severity:
        d.severity === "error"
          ? monaco.MarkerSeverity.Error
          : d.severity === "warning"
            ? monaco.MarkerSeverity.Warning
            : monaco.MarkerSeverity.Info,
      startColumn: d.startCol,
      startLineNumber: d.startLine,
    }));

    monaco.editor.setModelMarkers(model, "sigma-validation", markers);
  }, []);

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    dragCounter.current++;
    if (e.dataTransfer.types.includes("Files")) {
      setIsDragging(true);
    }
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    dragCounter.current--;
    if (dragCounter.current === 0) {
      setIsDragging(false);
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      dragCounter.current = 0;
      setIsDragging(false);

      const file = [...e.dataTransfer.files].find((f) =>
        /\.ya?ml$/i.test(f.name)
      );
      if (!file) {
        return;
      }

      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === "string") {
          onChange(reader.result);
        }
      };
      reader.readAsText(file);
    },
    [onChange]
  );

  const handleBeforeMount = useCallback((monaco: any) => {
    monacoRef.current = monaco;
    monaco.editor.defineTheme("vesper", {
      base: "vs-dark",
      colors: {
        "editor.background": "#101010",
        "editor.foreground": "#b0b0b0",
        "editor.lineHighlightBackground": "#101010",
        "editor.selectionBackground": "#ffffff15",
        "editorCursor.foreground": "#b0b0b0",
        "editorLineNumber.activeForeground": "#b0b0b0",
        "editorLineNumber.foreground": "#505050",
      },
      inherit: true,
      rules: [
        { background: "101010", foreground: "b0b0b0", token: "" },
        { foreground: "99FFE4", token: "string" },
        { foreground: "99FFE4", token: "string.yaml" },
        { foreground: "FFC799", token: "keyword" },
        { foreground: "FFC799", token: "number" },
        { foreground: "505050", token: "comment" },
        { foreground: "FFC799", token: "type" },
        { foreground: "FFC799", token: "tag" },
      ],
    });
  }, []);

  const handleEditorMount = useCallback(
    (editor: any) => {
      editorRef.current = editor;

      editor.addAction({
        id: "convert-sigma-rule",
        label: "Convert Sigma Rule",
        keybindings: [2048 | 3],
        run: () => {
          onConvertRef.current?.();
        },
      });

      // Initial validation
      runValidation(editor.getValue());

      // Validate on content change with debounce
      editor.onDidChangeModelContent(() => {
        clearTimeout(validationTimer.current);
        validationTimer.current = setTimeout(() => {
          runValidation(editor.getValue());
        }, 300);
      });
    },
    [runValidation]
  );

  return (
    <div
      className="relative flex h-full flex-col bg-[#101010]"
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleDrop}
      role="region"
      aria-label="Sigma rule editor with file drop support"
    >
      {isDragging && (
        <div className="absolute inset-0 z-20 flex items-center justify-center rounded-lg border-2 border-dashed border-primary/50 bg-primary/5 backdrop-blur-sm">
          <span className="text-sm text-primary">Drop .yml file here</span>
        </div>
      )}
      <div className="flex items-center justify-between border-white/[0.06] border-b px-4 py-2">
        <span className="font-medium text-muted-foreground text-xs uppercase tracking-wider">
          Sigma Rule (YAML)
        </span>
        <span className="rounded-md border border-white/[0.06] bg-white/[0.04] px-2 py-1 text-muted-foreground text-xs">
          ⌘↵ convert
        </span>
      </div>
      <div className="flex-1">
        <Editor
          beforeMount={handleBeforeMount}
          defaultLanguage="yaml"
          height="100%"
          onChange={(val) => onChange(val ?? "")}
          onMount={handleEditorMount}
          options={EDITOR_OPTIONS}
          theme="vesper"
          value={value}
        />
      </div>
    </div>
  );
}
