'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Database,
  Search,
  Trash2,
  FileText,
  Globe,
  Calendar,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';

interface KnowledgeSource {
  url: string;
  title: string;
  documentCount: number;
  totalSize: number;
  lastUpdated: string;
}

interface KnowledgeSearchResult {
  content: string;
  score: number;
  metadata: any;
}

interface KnowledgeBaseViewerProps {
  isOpen: boolean;
  onClose: () => void;
  onClear?: () => void;
}

export function KnowledgeBaseViewer({ isOpen, onClose, onClear }: KnowledgeBaseViewerProps) {
  const [sources, setSources] = useState<KnowledgeSource[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<KnowledgeSearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [showClearDialog, setShowClearDialog] = useState(false);
  const [totalDocuments, setTotalDocuments] = useState(0);

  useEffect(() => {
    if (isOpen) {
      loadKnowledgeBase();
    }
  }, [isOpen]);

  const loadKnowledgeBase = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/knowledge');
      const data = await response.json();

      if (data.success) {
        setSources(data.sources || []);
        setTotalDocuments(data.totalDocuments || 0);
      }
    } catch (error) {
      console.error('Failed to load knowledge base:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    try {
      const response = await fetch(`/api/knowledge?q=${encodeURIComponent(searchQuery)}&limit=10`);
      const data = await response.json();

      if (data.success) {
        setSearchResults(data.results || []);
      }
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setIsSearching(false);
    }
  };

  const handleClearKnowledgeBase = async () => {
    try {
      const response = await fetch('/api/knowledge', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clearAll: true }),
      });

      const data = await response.json();

      if (data.success) {
        setSources([]);
        setTotalDocuments(0);
        setSearchResults([]);
        setShowClearDialog(false);
        if (onClear) onClear();
      }
    } catch (error) {
      console.error('Failed to clear knowledge base:', error);
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'Unknown';
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50">
      <div className="fixed inset-x-4 inset-y-4 md:inset-x-auto md:inset-y-auto md:left-1/2 md:top-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:max-w-4xl md:w-full md:max-h-[80vh]">
        <Card className="h-full flex flex-col">
          <CardHeader className="flex-shrink-0">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Database className="w-5 h-5" />
                Knowledge Base Manager
              </CardTitle>
              <div className="flex items-center gap-2">
                <Badge variant="secondary">{totalDocuments} documents</Badge>
                <Button variant="ghost" size="sm" onClick={loadKnowledgeBase}>
                  <RefreshCw className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="sm" onClick={onClose}>
                  ✕
                </Button>
              </div>
            </div>
          </CardHeader>

          <CardContent className="flex-1 overflow-hidden flex flex-col gap-4">
            {/* Search Section */}
            <div className="flex gap-2">
              <Input
                placeholder="Search knowledge base..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') handleSearch();
                }}
                className="flex-1"
              />
              <Button onClick={handleSearch} disabled={isSearching || !searchQuery.trim()}>
                <Search className="w-4 h-4 mr-2" />
                Search
              </Button>
              <Button
                variant="destructive"
                onClick={() => setShowClearDialog(true)}
                disabled={totalDocuments === 0}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Clear All
              </Button>
            </div>

            {/* Content Area */}
            <ScrollArea className="flex-1 border rounded-md p-4">
              {isLoading ? (
                <div className="text-center py-8 text-muted-foreground">
                  Loading knowledge base...
                </div>
              ) : searchResults.length > 0 ? (
                <div className="space-y-4">
                  <h3 className="font-semibold text-sm text-muted-foreground">
                    Search Results ({searchResults.length})
                  </h3>
                  {searchResults.map((result, i) => (
                    <Card key={i} className="p-3">
                      <div className="space-y-2">
                        <div className="flex items-start justify-between">
                          <Badge variant="outline" className="text-xs">
                            Score: {(result.score * 100).toFixed(1)}%
                          </Badge>
                          {result.metadata?.url && (
                            <a
                              href={result.metadata.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-blue-600 hover:underline flex items-center gap-1"
                            >
                              <Globe className="w-3 h-3" />
                              Source
                            </a>
                          )}
                        </div>
                        <p className="text-sm line-clamp-3">{result.content}</p>
                        <div className="flex gap-2 text-xs text-muted-foreground">
                          {result.metadata?.title && <span>{result.metadata.title}</span>}
                          {result.metadata?.chunkIndex !== undefined && (
                            <span>Chunk {result.metadata.chunkIndex + 1}</span>
                          )}
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              ) : sources.length > 0 ? (
                <div className="space-y-4">
                  <h3 className="font-semibold text-sm text-muted-foreground">
                    Indexed Sources ({sources.length})
                  </h3>
                  {sources.map((source, i) => (
                    <Card key={i} className="p-3">
                      <div className="space-y-2">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h4 className="font-medium text-sm flex items-center gap-2">
                              {source.url?.startsWith('internal://') ? (
                                <FileText className="w-4 h-4" />
                              ) : (
                                <Globe className="w-4 h-4" />
                              )}
                              {source.title}
                            </h4>
                            {source.url?.startsWith('internal://') ? (
                              <span className="text-xs text-muted-foreground">
                                Internal Documentation
                              </span>
                            ) : (
                              <a
                                href={source.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-muted-foreground hover:underline truncate block"
                              >
                                {source.url}
                              </a>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-4 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <FileText className="w-3 h-3" />
                            {source.documentCount} chunks
                          </span>
                          <span>{formatBytes(source.totalSize)}</span>
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {formatDate(source.lastUpdated)}
                          </span>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <AlertCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Knowledge base is empty</p>
                  <p className="text-xs mt-2">Add content using the scrape or crawl tools</p>
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      {/* Clear Confirmation Dialog */}
      <AlertDialog open={showClearDialog} onOpenChange={setShowClearDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Clear Knowledge Base?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete all {totalDocuments} documents from your knowledge base.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleClearKnowledgeBase}
              className="bg-destructive text-destructive-foreground"
            >
              Clear All
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
