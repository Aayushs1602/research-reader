import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  Save,
  Download,
  Eye,
  Edit3,
  Bold,
  Italic,
  List,
  Heading,
  Code,
  Quote,
  Check,
  Sparkles
} from 'lucide-react';
import type { ParsedAnnotation } from '../../types';

interface MarkdownNotepadProps {
  initialContent: string;
  annotations: ParsedAnnotation[];
  onSaveNotes: (content: string) => Promise<void>;
  onJumpToAnnotation?: (pageNumber: number, annotationId: string) => void;
}

export const MarkdownNotepad: React.FC<MarkdownNotepadProps> = ({
  initialContent,
  annotations,
  onSaveNotes,
}) => {
  const [content, setContent] = useState(initialContent);
  const [isPreview, setIsPreview] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [savedStatus, setSavedStatus] = useState(false);

  useEffect(() => {
    setContent(initialContent);
  }, [initialContent]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSaveNotes(content);
      setSavedStatus(true);
      setTimeout(() => setSavedStatus(false), 2000);
    } catch (e) {
      console.error('Failed to save notes:', e);
    } finally {
      setIsSaving(false);
    }
  };

  const handleExportMarkdown = () => {
    let exportText = content + '\n\n---\n\n## Extracted Highlights & Annotations\n\n';

    if (annotations.length === 0) {
      exportText += '_No highlights added yet._\n';
    } else {
      annotations.forEach((ann, i) => {
        exportText += `### Highlight ${i + 1} (Page ${ann.page_number})\n`;
        exportText += `> "${ann.selected_text.trim()}"\n\n`;
        if (ann.comment_text) {
          exportText += `**Note**: ${ann.comment_text}\n\n`;
        }
      });
    }

    const blob = new Blob([exportText], { type: 'text/markdown;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `research_notes_${new Date().toISOString().slice(0, 10)}.md`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const insertFormatting = (prefix: string, suffix: string = '') => {
    const textarea = document.getElementById('notes-editor') as HTMLTextAreaElement;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = content.substring(start, end);
    const replacement = `${prefix}${selected || 'text'}${suffix}`;
    const newContent = content.substring(0, start) + replacement + content.substring(end);

    setContent(newContent);
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + prefix.length, start + prefix.length + (selected.length || 4));
    }, 50);
  };

  const importHighlightsIntoNotes = () => {
    if (annotations.length === 0) return;
    let snippet = '\n\n### Highlights Summary\n';
    annotations.forEach((a) => {
      snippet += `- **[p.${a.page_number}]** "${a.selected_text.slice(0, 100)}${a.selected_text.length > 100 ? '...' : ''}"`;
      if (a.comment_text) snippet += ` — *${a.comment_text}*`;
      snippet += '\n';
    });
    setContent((prev) => prev + snippet);
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-gray-800">
      {/* Editor Toolbar */}
      <div className="p-2 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between gap-1 flex-wrap bg-gray-50/50 dark:bg-gray-900/50">
        <div className="flex items-center gap-1">
          <button
            onClick={() => setIsPreview(!isPreview)}
            className={`p-1.5 rounded-lg text-xs font-medium flex items-center gap-1 transition ${
              isPreview
                ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400'
                : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
            }`}
            title={isPreview ? 'Switch to Edit' : 'Preview Markdown'}
          >
            {isPreview ? <Edit3 className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            <span>{isPreview ? 'Edit' : 'Preview'}</span>
          </button>

          {!isPreview && (
            <div className="flex items-center gap-0.5 border-l border-gray-200 dark:border-gray-700 pl-1">
              <button
                onClick={() => insertFormatting('### ')}
                className="p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300"
                title="Heading"
              >
                <Heading className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => insertFormatting('**', '**')}
                className="p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300"
                title="Bold"
              >
                <Bold className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => insertFormatting('*', '*')}
                className="p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300"
                title="Italic"
              >
                <Italic className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => insertFormatting('- ')}
                className="p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300"
                title="Bullet List"
              >
                <List className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => insertFormatting('> ')}
                className="p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300"
                title="Quote"
              >
                <Quote className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => insertFormatting('`', '`')}
                className="p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300"
                title="Code"
              >
                <Code className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-1">
          {annotations.length > 0 && !isPreview && (
            <button
              onClick={importHighlightsIntoNotes}
              className="p-1.5 rounded-lg text-xs font-medium text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-950 transition flex items-center gap-1"
              title="Append highlights into notes"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span className="hidden xl:inline">Sync Highlights</span>
            </button>
          )}

          <button
            onClick={handleExportMarkdown}
            className="p-1.5 rounded-lg text-xs font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition flex items-center gap-1"
            title="Export as Markdown for Notion or Obsidian"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Export</span>
          </button>

          <button
            onClick={handleSave}
            disabled={isSaving}
            className="px-2.5 py-1.5 rounded-lg text-xs font-medium bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-1 transition shadow-sm disabled:opacity-50"
            title="Save notes"
          >
            {savedStatus ? <Check className="w-3.5 h-3.5 text-green-300" /> : <Save className="w-3.5 h-3.5" />}
            <span>{savedStatus ? 'Saved!' : 'Save'}</span>
          </button>
        </div>
      </div>

      {/* Editor Content Area */}
      <div className="flex-1 overflow-y-auto p-4">
        {isPreview ? (
          <div className="prose prose-sm dark:prose-invert max-w-none text-gray-800 dark:text-gray-200">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{content || '_No notes yet. Click Edit to write._'}</ReactMarkdown>
          </div>
        ) : (
          <textarea
            id="notes-editor"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Write your research notes, critique, synthesis, and takeaways in Markdown..."
            className="w-full h-full min-h-[400px] resize-none bg-transparent border-none focus:outline-none font-mono text-sm leading-relaxed text-gray-900 dark:text-gray-100"
          />
        )}
      </div>

      {/* Footer info */}
      <div className="px-4 py-2 border-t border-gray-100 dark:border-gray-800 flex justify-between items-center text-[11px] text-gray-400">
        <span>{content.split(/\s+/).filter(Boolean).length} words</span>
        <span>Markdown supported (GFM)</span>
      </div>
    </div>
  );
};
