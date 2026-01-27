"use client";

import { useCallback, useEffect, useState } from "react";
import CodeMirror from "@uiw/react-codemirror";
import { markdown, markdownLanguage } from "@codemirror/lang-markdown";
import { languages } from "@codemirror/language-data";
import { vscodeDark } from "@uiw/codemirror-theme-vscode";
import { Save } from "lucide-react";
import { useToast } from "./toast";

interface EditorProps {
  content: string;
  onSave?: (content: string) => Promise<void>;
}

export function Editor({ content, onSave }: EditorProps) {
  const { showToast } = useToast();
  const [value, setValue] = useState(content);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Sync content when it changes externally
  useEffect(() => {
    setValue(content);
    setHasChanges(false);
  }, [content]);

  const handleChange = useCallback((val: string) => {
    setValue(val);
    setHasChanges(val !== content);
  }, [content]);

  const handleSave = useCallback(async () => {
    if (!onSave || !hasChanges) return;

    setSaving(true);
    try {
      await onSave(value);
      setHasChanges(false);
      showToast("File saved");
    } catch (error) {
      console.error("Save failed:", error);
      showToast("Failed to save file", "error");
    } finally {
      setSaving(false);
    }
  }, [onSave, value, hasChanges, showToast]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault();
        handleSave();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleSave]);

  return (
    <div className="border border-zinc-800 rounded-lg overflow-hidden bg-zinc-900">
      {/* Toolbar */}
      <div className="flex items-center justify-between p-2 border-b border-zinc-800 bg-zinc-950/50">
        <span className="text-[11px] text-zinc-500 uppercase tracking-wider">
          Markdown
        </span>
        {onSave && (
          <button
            onClick={handleSave}
            disabled={saving || !hasChanges}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-[12px] font-medium transition-colors ${
              hasChanges
                ? "bg-blue-600 text-white hover:bg-blue-500"
                : "bg-zinc-800 text-zinc-500"
            }`}
          >
            <Save className="h-3.5 w-3.5" />
            {saving ? "Saving..." : hasChanges ? "Save (⌘S)" : "Saved"}
          </button>
        )}
      </div>

      {/* Editor */}
      <CodeMirror
        value={value}
        onChange={handleChange}
        theme={vscodeDark}
        extensions={[
          markdown({ base: markdownLanguage, codeLanguages: languages }),
        ]}
        basicSetup={{
          lineNumbers: true,
          foldGutter: true,
          highlightActiveLine: true,
          highlightSelectionMatches: true,
          bracketMatching: true,
        }}
        style={{
          fontSize: "13px",
        }}
        minHeight="400px"
      />
    </div>
  );
}
