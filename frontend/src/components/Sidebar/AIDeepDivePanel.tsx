import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  Sparkles,
  Globe,
  Loader2,
  FilePlus,
  HelpCircle,
  Search,
  BookOpen
} from 'lucide-react';
import type { AIDeepDiveResponse } from '../../types';
import { fetchAIDeepDive } from '../../api/client';

interface AIDeepDivePanelProps {
  initialQuery: string;
  onAppendToNotes: (markdownSnippet: string) => void;
}

export const AIDeepDivePanel: React.FC<AIDeepDivePanelProps> = ({
  initialQuery,
  onAppendToNotes,
}) => {
  const [query, setQuery] = useState(initialQuery || '');
  const [mode, setMode] = useState('explain');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AIDeepDiveResponse | null>(null);
  const [appended, setAppended] = useState(false);

  useEffect(() => {
    if (initialQuery && initialQuery.trim()) {
      setQuery(initialQuery);
      runDeepDive(initialQuery, mode);
    }
  }, [initialQuery]);

  const runDeepDive = async (textToAnalyze: string, analysisMode: string) => {
    if (!textToAnalyze.trim()) return;
    setLoading(true);
    setAppended(false);
    try {
      const data = await fetchAIDeepDive(textToAnalyze, analysisMode);
      setResult(data);
    } catch (err) {
      console.error('Deep dive error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAppendNotes = () => {
    if (!result) return;
    const snippet = `\n\n### AI Deep Dive: ${result.query.slice(0, 50)}...\n${result.explanation}\n[Google Search Reference](${result.google_search_url})\n`;
    onAppendToNotes(snippet);
    setAppended(true);
    setTimeout(() => setAppended(false), 2000);
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-y-auto p-4 bg-white dark:bg-gray-900">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-gray-200 dark:border-gray-800">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-gradient-to-tr from-purple-600 to-indigo-600 text-white">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-gray-900 dark:text-gray-100">Deep Dive & AI Insights</h3>
            <p className="text-[10px] text-gray-400">Contextual breakdown & web discovery</p>
          </div>
        </div>

        {result && (
          <a
            href={result.google_search_url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-[11px] font-medium text-blue-600 dark:text-blue-400 hover:underline bg-blue-50 dark:bg-blue-950/50 px-2 py-1 rounded-md"
            title="Open Google Search"
          >
            <Globe className="w-3 h-3" />
            <span>Search Web</span>
          </a>
        )}
      </div>

      {/* Query Input & Mode Selector */}
      <div className="my-3 space-y-2">
        <div className="relative">
          <textarea
            rows={2}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Select text on the PDF or type a query to investigate..."
            className="w-full text-xs p-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>

        {/* Modes */}
        <div className="flex items-center gap-1 flex-wrap">
          {[
            { id: 'explain', label: 'Explain', icon: BookOpen },
            { id: 'summarize', label: 'Summarize', icon: FilePlus },
            { id: 'search_queries', label: 'Keywords', icon: Search },
            { id: 'critique', label: 'Critique', icon: HelpCircle },
          ].map((m) => {
            const Icon = m.icon;
            return (
              <button
                key={m.id}
                onClick={() => {
                  setMode(m.id);
                  if (query) runDeepDive(query, m.id);
                }}
                className={`px-2 py-1 rounded-md text-[11px] font-medium flex items-center gap-1 transition ${
                  mode === m.id
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
              >
                <Icon className="w-3 h-3" />
                <span>{m.label}</span>
              </button>
            );
          })}

          <button
            onClick={() => runDeepDive(query, mode)}
            disabled={loading || !query.trim()}
            className="ml-auto px-3 py-1 rounded-md text-[11px] font-semibold bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white shadow-sm disabled:opacity-40 transition flex items-center gap-1"
          >
            {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
            <span>Analyze</span>
          </button>
        </div>
      </div>

      {/* Results Display */}
      {loading ? (
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-gray-400 gap-2">
          <Loader2 className="w-6 h-6 animate-spin text-purple-600" />
          <p className="text-xs">Analyzing concept & formulating insights...</p>
        </div>
      ) : result ? (
        <div className="flex-1 space-y-4 pt-2">
          <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700/60">
            <div className="prose prose-xs dark:prose-invert max-w-none text-gray-800 dark:text-gray-200">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{result.explanation}</ReactMarkdown>
            </div>

            <div className="mt-3 pt-2 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <button
                onClick={handleAppendNotes}
                className="text-xs text-indigo-600 dark:text-indigo-400 font-medium hover:underline flex items-center gap-1"
              >
                <FilePlus className="w-3.5 h-3.5" />
                <span>{appended ? 'Added to Notes!' : 'Append to Notes'}</span>
              </button>

              <a
                href={result.google_search_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-blue-600 dark:text-blue-400 font-medium hover:underline flex items-center gap-1"
              >
                <Globe className="w-3.5 h-3.5" />
                <span>Google Search</span>
              </a>
            </div>
          </div>

          {/* Suggested Followups */}
          {result.suggested_followups.length > 0 && (
            <div className="space-y-1.5">
              <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                Explore Follow-up Questions
              </span>
              <div className="space-y-1">
                {result.suggested_followups.map((q, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      setQuery(q);
                      runDeepDive(q, 'explain');
                    }}
                    className="w-full text-left p-2 rounded-lg text-xs bg-purple-50/50 dark:bg-purple-950/20 text-purple-900 dark:text-purple-300 hover:bg-purple-100 dark:hover:bg-purple-950/40 border border-purple-200/50 dark:border-purple-800/40 transition flex items-center justify-between group"
                  >
                    <span className="truncate">{q}</span>
                    <Sparkles className="w-3 h-3 text-purple-400 opacity-0 group-hover:opacity-100 flex-shrink-0 transition-opacity" />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-gray-400">
          <Sparkles className="w-8 h-8 text-purple-400/50 mb-2" />
          <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Deep Dive Ready</h4>
          <p className="text-xs text-gray-400 max-w-xs mt-1">
            Highlight any complex equation, jargon, or paragraph in the PDF and click "Deep Dive" to inspect it here.
          </p>
        </div>
      )}
    </div>
  );
};
