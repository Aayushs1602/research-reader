import { useState, useEffect, useCallback, useMemo } from 'react';
import type { PDFDocumentProxy } from 'pdfjs-dist';
import type {
  DocumentMeta,
  ParsedAnnotation,
  ReadingTheme,
  TOCItem,
  NormalizedRect,
} from './types';
import {
  getDocuments,
  uploadDocument,
  deleteDocument,
  fetchDocumentFileBlob,
  updateProgress,
  getAnnotations,
  createAnnotation,
  deleteAnnotation,
  getDocumentNotes,
  updateDocumentNotes,
} from './api/client';

import { useAuth } from './context/AuthContext';
import { AuthModal } from './components/Auth/AuthModal';
import { Header } from './components/Header';
import { PdfViewer } from './components/PdfViewer/PdfViewer';
import { SearchBar } from './components/PdfViewer/SearchBar';
import { SidebarTabs, type SidebarTab } from './components/Sidebar/SidebarTabs';
import { DocumentLibraryModal } from './components/DocumentLibraryModal';
import { BookOpen, UploadCloud, Loader2 } from 'lucide-react';

export function App() {
  const { user, isLoading: authLoading } = useAuth();
  const [authModalOpen, setAuthModalOpen] = useState(false);

  const [documents, setDocuments] = useState<DocumentMeta[]>([]);
  const [currentDocId, setCurrentDocId] = useState<string | null>(null);
  const [pdfBlobUrl, setPdfBlobUrl] = useState<string | null>(null);
  const [loadingDocs, setLoadingDocs] = useState(false);

  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [zoom, setZoom] = useState(1.15);
  const [theme, setTheme] = useState<ReadingTheme>('light');

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeSidebarTab, setActiveSidebarTab] = useState<SidebarTab>('notes');
  const [isSearching, setIsSearching] = useState(false);
  const [libraryOpen, setLibraryOpen] = useState(false);

  const [annotations, setAnnotations] = useState<ParsedAnnotation[]>([]);
  const [activeAnnotationId, setActiveAnnotationId] = useState<string | null>(null);
  const [notesContent, setNotesContent] = useState('');
  const [outline, setOutline] = useState<TOCItem[]>([]);
  const [aiQuery, setAiQuery] = useState('');
  const [targetPageJump, setTargetPageJump] = useState<number | null>(null);
  const [activePdfDoc, setActivePdfDoc] = useState<PDFDocumentProxy | null>(null);

  const currentDoc = useMemo(
    () => documents.find((d) => d.id === currentDocId) || null,
    [documents, currentDocId]
  );

  // Load user's private documents when logged in
  useEffect(() => {
    if (!user) {
      setDocuments([]);
      setCurrentDocId(null);
      setAnnotations([]);
      setNotesContent('');
      setPdfBlobUrl(null);
      return;
    }

    async function loadDocs() {
      setLoadingDocs(true);
      try {
        const docs = await getDocuments();
        setDocuments(docs);
        if (docs.length > 0) {
          setCurrentDocId(docs[0].id);
          setCurrentPage(docs[0].last_page || 1);
        } else {
          setCurrentDocId(null);
          setLibraryOpen(true);
        }
      } catch (err) {
        console.error('Error fetching documents:', err);
      } finally {
        setLoadingDocs(false);
      }
    }

    loadDocs();
  }, [user]);

  // When active document changes, fetch its file blob with auth header
  useEffect(() => {
    if (!currentDocId || !user) {
      setPdfBlobUrl(null);
      return;
    }

    let isCancelled = false;
    let createdUrl: string | null = null;

    async function loadPdfBlob() {
      try {
        const blob = await fetchDocumentFileBlob(currentDocId!);
        if (isCancelled) return;
        createdUrl = URL.createObjectURL(blob);
        setPdfBlobUrl(createdUrl);
      } catch (err) {
        console.error('Error fetching PDF file blob:', err);
      }
    }

    loadPdfBlob();

    return () => {
      isCancelled = true;
      if (createdUrl) {
        URL.revokeObjectURL(createdUrl);
      }
    };
  }, [currentDocId, user]);

  // When active document changes, fetch its annotations and notes
  useEffect(() => {
    if (!currentDocId || !user) {
      setAnnotations([]);
      setNotesContent('');
      return;
    }

    async function loadDocDetails() {
      try {
        const [anns, notes] = await Promise.all([
          getAnnotations(currentDocId!),
          getDocumentNotes(currentDocId!),
        ]);

        const parsed: ParsedAnnotation[] = anns.map((a) => {
          let rects: NormalizedRect[] = [];
          try {
            rects = JSON.parse(a.rects_json);
          } catch {
            rects = [];
          }
          return {
            id: a.id,
            document_id: a.document_id,
            page_number: a.page_number,
            color: a.color,
            selected_text: a.selected_text,
            comment_text: a.comment_text,
            created_at: a.created_at,
            rects,
          };
        });

        setAnnotations(parsed);
        setNotesContent(notes.content || '');
      } catch (e) {
        console.error('Failed to load document annotations/notes:', e);
      }
    }

    loadDocDetails();
  }, [currentDocId, user]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'f') {
        e.preventDefault();
        setIsSearching((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Handle page visibility change and update reading progress
  const handlePageChange = useCallback(
    async (pageNum: number) => {
      setCurrentPage(pageNum);
      if (currentDocId && user) {
        try {
          const updated = await updateProgress(currentDocId, pageNum);
          setDocuments((prev) =>
            prev.map((d) => (d.id === currentDocId ? { ...d, last_page: updated.last_page, progress_percent: updated.progress_percent } : d))
          );
        } catch (e) {
          console.warn('Could not sync reading progress:', e);
        }
      }
    },
    [currentDocId, user]
  );

  // Jump to specific page
  const handleJumpToPage = (pageNum: number) => {
    setTargetPageJump(pageNum);
    setCurrentPage(pageNum);
  };

  // Jump to highlight (bi-directional link)
  const handleJumpToAnnotation = (pageNum: number, annotationId: string) => {
    handleJumpToPage(pageNum);
    setActiveAnnotationId(annotationId);
    setTimeout(() => {
      setActiveAnnotationId(null);
    }, 1500);
  };

  // When clicking a highlight directly on the PDF
  const handleSelectAnnotationOnPdf = (annotationId: string) => {
    setActiveAnnotationId(annotationId);
    setSidebarOpen(true);
    setActiveSidebarTab('annotations');
    setTimeout(() => {
      const el = document.getElementById(`sidebar-annotation-${annotationId}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }, 100);
  };

  // Add Annotation
  const handleAddAnnotation = async (data: {
    pageNumber: number;
    color: string;
    selectedText: string;
    rects: NormalizedRect[];
    commentText?: string;
  }) => {
    if (!currentDocId) return;

    try {
      const created = await createAnnotation(currentDocId, {
        page_number: data.pageNumber,
        color: data.color,
        selected_text: data.selectedText,
        rects_json: JSON.stringify(data.rects),
        comment_text: data.commentText,
      });

      const parsed: ParsedAnnotation = {
        ...created,
        rects: data.rects,
      };

      setAnnotations((prev) => [...prev, parsed]);

      if (data.commentText) {
        setSidebarOpen(true);
        setActiveSidebarTab('annotations');
      }
    } catch (e) {
      console.error('Failed to create annotation:', e);
    }
  };

  // Delete Annotation
  const handleDeleteAnnotation = async (id: string) => {
    try {
      await deleteAnnotation(id);
      setAnnotations((prev) => prev.filter((a) => a.id !== id));
    } catch (e) {
      console.error('Failed to delete annotation:', e);
    }
  };

  // Save Markdown Notes
  const handleSaveNotes = async (content: string) => {
    if (!currentDocId) return;
    try {
      const updated = await updateDocumentNotes(currentDocId, content);
      setNotesContent(updated.content);
    } catch (e) {
      console.error('Failed to save notes:', e);
    }
  };

  // AI Deep Dive Trigger (USP)
  const handleAIDeepDive = (text: string) => {
    setAiQuery(text);
    setSidebarOpen(true);
    setActiveSidebarTab('ai');
  };

  // Upload New PDF
  const handleUploadDocument = async (file: File) => {
    const newDoc = await uploadDocument(file);
    setDocuments((prev) => [newDoc, ...prev]);
    setCurrentDocId(newDoc.id);
    setCurrentPage(1);
    setTotalPages(newDoc.page_count);
  };

  // Delete Document
  const handleDeleteDocument = async (id: string) => {
    await deleteDocument(id);
    setDocuments((prev) => prev.filter((d) => d.id !== id));
    if (currentDocId === id) {
      const remaining = documents.filter((d) => d.id !== id);
      if (remaining.length > 0) {
        setCurrentDocId(remaining[0].id);
      } else {
        setCurrentDocId(null);
        setLibraryOpen(true);
      }
    }
  };

  if (authLoading) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center gap-3 bg-gray-50 dark:bg-gray-950 text-indigo-600">
        <Loader2 className="w-8 h-8 animate-spin" />
        <span className="text-xs font-semibold text-gray-500">Checking authentication...</span>
      </div>
    );
  }

  return (
    <div className={`h-screen w-screen flex flex-col overflow-hidden theme-${theme} ${theme === 'dark' ? 'dark' : ''}`}>
      {/* Top Navbar */}
      <Header
        currentDoc={currentDoc}
        currentPage={currentPage}
        totalPages={totalPages}
        zoom={zoom}
        theme={theme}
        sidebarOpen={sidebarOpen}
        isSearching={isSearching}
        onZoomIn={() => setZoom((z) => Math.min(2.5, +(z + 0.15).toFixed(2)))}
        onZoomOut={() => setZoom((z) => Math.max(0.6, +(z - 0.15).toFixed(2)))}
        onZoomReset={() => setZoom(1.15)}
        onPageChange={handleJumpToPage}
        onThemeChange={setTheme}
        onToggleSidebar={() => setSidebarOpen((prev) => !prev)}
        onToggleSearch={() => setIsSearching((prev) => !prev)}
        onOpenLibrary={() => setLibraryOpen(true)}
        onOpenAuth={() => setAuthModalOpen(true)}
      />

      {/* Main Reading Canvas & Split Sidebar */}
      <div className="flex-1 flex overflow-hidden relative">
        {loadingDocs ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 text-gray-400">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
            <span className="text-xs font-medium">Loading your documents...</span>
          </div>
        ) : pdfBlobUrl ? (
          <>
            {/* PDF Viewer */}
            <PdfViewer
              pdfUrl={pdfBlobUrl}
              zoom={zoom}
              theme={theme}
              annotations={annotations}
              activeAnnotationId={activeAnnotationId}
              onSelectAnnotation={handleSelectAnnotationOnPdf}
              onAddAnnotation={handleAddAnnotation}
              onAIDeepDive={handleAIDeepDive}
              onPageChange={handlePageChange}
              onOutlineLoaded={setOutline}
              onTotalPagesLoaded={setTotalPages}
              onDocLoaded={setActivePdfDoc}
              targetPageJump={targetPageJump}
              onClearPageJump={() => setTargetPageJump(null)}
            />

            {/* Split Screen Sidebar */}
            {sidebarOpen && (
              <SidebarTabs
                activeTab={activeSidebarTab}
                onChangeTab={setActiveSidebarTab}
                notesContent={notesContent}
                annotations={annotations}
                activeAnnotationId={activeAnnotationId}
                outline={outline}
                aiQuery={aiQuery}
                onSaveNotes={handleSaveNotes}
                onJumpToPage={handleJumpToPage}
                onJumpToAnnotation={handleJumpToAnnotation}
                onDeleteAnnotation={handleDeleteAnnotation}
                onAppendToNotes={(snippet) => {
                  setNotesContent((prev) => prev + snippet);
                  handleSaveNotes(notesContent + snippet);
                }}
              />
            )}
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-gray-500">
            <BookOpen className="w-12 h-12 text-indigo-500 mb-3" />
            <h2 className="text-base font-bold text-gray-800 dark:text-gray-200">
              {user ? `Welcome, ${user.username}!` : 'Welcome to Research Reader'}
            </h2>
            <p className="text-xs text-gray-500 max-w-sm mt-1 mb-4">
              {user
                ? 'Upload a scientific publication, pre-print, or book to start reading and taking notes.'
                : 'Sign in to access your private library, highlights, and annotations.'}
            </p>
            {user ? (
              <button
                onClick={() => setLibraryOpen(true)}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-2 shadow-md transition"
              >
                <UploadCloud className="w-4 h-4" />
                <span>Upload a PDF Paper</span>
              </button>
            ) : (
              <button
                onClick={() => setAuthModalOpen(true)}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-2 shadow-md transition"
              >
                <span>Sign In or Sign Up</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* In-document Search Overlay */}
      <SearchBar
        pdfDoc={activePdfDoc}
        isOpen={isSearching}
        onClose={() => setIsSearching(false)}
        onJumpToPage={handleJumpToPage}
      />

      {/* Library & Upload Modal */}
      <DocumentLibraryModal
        isOpen={libraryOpen && Boolean(user)}
        documents={documents}
        currentDocId={currentDocId}
        onSelectDocument={(id) => {
          setCurrentDocId(id);
          const selected = documents.find((d) => d.id === id);
          if (selected) {
            setCurrentPage(selected.last_page || 1);
            setTotalPages(selected.page_count);
          }
        }}
        onUploadDocument={handleUploadDocument}
        onDeleteDocument={handleDeleteDocument}
        onClose={() => setLibraryOpen(false)}
      />

      {/* Authentication Modal */}
      <AuthModal
        isOpen={!user || authModalOpen}
        canClose={Boolean(user)}
        onClose={() => setAuthModalOpen(false)}
      />
    </div>
  );
}

export default App;
