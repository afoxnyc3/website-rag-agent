"use client";

import { useState } from "react";
import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
} from "@/components/ai-elements/conversation";
import { Message, MessageContent } from "@/components/ai-elements/message";
import {
  PromptInput,
  PromptInputBody,
  PromptInputTextarea,
  PromptInputToolbar,
  PromptInputSubmit,
} from "@/components/ai-elements/prompt-input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Brain, Database, Sparkles, Globe, Loader2, Network, Settings, Eye, ToggleLeft, ToggleRight, ChevronDown, ChevronUp, FileText, ExternalLink } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ProgressTracker, type ProgressUpdate } from "@/components/ui/progress-tracker";
import { KnowledgeBaseViewer } from "@/components/ui/knowledge-base-viewer";
import { analyzeUrl } from "@/lib/utils/url-detector";

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  confidence?: number;
  sources?: string[];
  mode?: "rag" | "direct";
};

export default function ChatAssistant() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isScraping, setIsScraping] = useState(false);
  const [urlInput, setUrlInput] = useState("");
  const [knowledgeBaseCount, setKnowledgeBaseCount] = useState(10);
  const [crawlMode, setCrawlMode] = useState<"single" | "crawl">("single");
  const [crawlDepth, setCrawlDepth] = useState("1");
  const [maxPages, setMaxPages] = useState("10");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [progressUpdate, setProgressUpdate] = useState<ProgressUpdate | null>(null);
  const [showKnowledgeBase, setShowKnowledgeBase] = useState(false);
  const [uiMode, setUiMode] = useState<"simple" | "advanced">("simple");
  const [expandedSources, setExpandedSources] = useState<Set<string>>(new Set());

  const handleSubmit = async (
    message: { text?: string; files?: any[] },
    event: React.FormEvent
  ) => {
    if (!message.text?.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: "user",
      content: message.text,
    };
    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: message.text }),
      });

      const data = await response.json();

      if (response.ok) {
        const assistantMessage: ChatMessage = {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: data.response,
          confidence: data.confidence,
          sources: data.sources,
          mode: data.mode,
        };
        setMessages((prev) => [...prev, assistantMessage]);
      } else {
        throw new Error(data.error || "Failed to get response");
      }
    } catch (error) {
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: "Sorry, I encountered an error. Please try again.",
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }

    (event.target as HTMLFormElement).reset();
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.7) return "bg-green-500/10 text-green-700 border-green-500/20";
    if (confidence >= 0.5) return "bg-yellow-500/10 text-yellow-700 border-yellow-500/20";
    return "bg-red-500/10 text-red-700 border-red-500/20";
  };

  const formatConfidence = (confidence: number) => {
    return `${(confidence * 100).toFixed(1)}%`;
  };

  const toggleSourceExpanded = (messageId: string) => {
    setExpandedSources(prev => {
      const newSet = new Set(prev);
      if (newSet.has(messageId)) {
        newSet.delete(messageId);
      } else {
        newSet.add(messageId);
      }
      return newSet;
    });
  };

  const handleScrapeUrl = async () => {
    if (!urlInput.trim() || isScraping) return;

    setIsScraping(true);
    const startTime = Date.now();

    try {
      if (crawlMode === "single") {
        // Simple scrape without progress tracking
        setProgressUpdate({
          type: 'scrape',
          status: 'starting',
          message: 'Scraping page...',
          startTime
        });

        const response = await fetch("/api/scrape", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: urlInput }),
        });

        const data = await response.json();

        if (response.ok) {
          setProgressUpdate({
            type: 'scrape',
            status: 'completed',
            message: data.message || `Successfully added content from ${urlInput} to knowledge base`,
            startTime
          });

          const successMessage: ChatMessage = {
            id: Date.now().toString(),
            role: "assistant",
            content: data.message || `Successfully added content from ${urlInput} to knowledge base`,
          };
          setMessages((prev) => [...prev, successMessage]);
          setKnowledgeBaseCount(prev => prev + 1);
          setUrlInput("");
        } else {
          setProgressUpdate({
            type: 'scrape',
            status: 'error',
            message: data.error || "Unknown error",
            startTime
          });

          const errorMessage: ChatMessage = {
            id: Date.now().toString(),
            role: "assistant",
            content: `Failed to scrape URL: ${data.error || "Unknown error"}`,
          };
          setMessages((prev) => [...prev, errorMessage]);
        }
      } else {
        // Crawl with SSE progress tracking
        setProgressUpdate({
          type: 'crawl',
          status: 'starting',
          message: 'Initializing crawler...',
          startTime
        });

        const eventSource = new EventSource('/api/crawl/progress');

        // Send crawl request
        fetch('/api/crawl/progress', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            url: urlInput,
            options: {
              maxDepth: parseInt(crawlDepth),
              maxPages: parseInt(maxPages),
              respectRobotsTxt: true,
              crawlDelay: 1000,
            },
          }),
        }).then(async response => {
          const reader = response.body?.getReader();
          const decoder = new TextDecoder();

          if (reader) {
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;

              const text = decoder.decode(value);
              const lines = text.split('\n');

              for (const line of lines) {
                if (line.startsWith('data: ')) {
                  const data = JSON.parse(line.slice(6));

                  if (data.type === 'progress') {
                    setProgressUpdate({
                      type: 'crawl',
                      status: data.status,
                      currentPage: data.currentPage,
                      pagesProcessed: data.pagesProcessed,
                      totalPages: data.totalPages,
                      currentDepth: data.currentDepth,
                      maxDepth: data.maxDepth,
                      message: data.message,
                      startTime
                    });
                  } else if (data.type === 'complete') {
                    setProgressUpdate({
                      type: 'crawl',
                      status: 'completed',
                      pagesProcessed: data.pagesVisited,
                      totalPages: data.pagesVisited,
                      message: data.message,
                      startTime
                    });

                    const successMessage: ChatMessage = {
                      id: Date.now().toString(),
                      role: "assistant",
                      content: data.message,
                    };
                    setMessages((prev) => [...prev, successMessage]);
                    setKnowledgeBaseCount(prev => prev + (data.documentsAdded || 0));
                    setUrlInput("");
                  } else if (data.type === 'error') {
                    setProgressUpdate({
                      type: 'crawl',
                      status: 'error',
                      message: data.message,
                      startTime
                    });

                    const errorMessage: ChatMessage = {
                      id: Date.now().toString(),
                      role: "assistant",
                      content: `Failed to crawl URL: ${data.message}`,
                    };
                    setMessages((prev) => [...prev, errorMessage]);
                  }
                }
              }
            }
          }
        }).catch(error => {
          setProgressUpdate({
            type: 'crawl',
            status: 'error',
            message: 'Failed to connect to server',
            startTime
          });

          const errorMessage: ChatMessage = {
            id: Date.now().toString(),
            role: "assistant",
            content: `Failed to crawl URL. Please check the URL and try again.`,
          };
          setMessages((prev) => [...prev, errorMessage]);
        });
      }
    } catch (error) {
      setProgressUpdate({
        type: crawlMode === 'crawl' ? 'crawl' : 'scrape',
        status: 'error',
        message: 'An unexpected error occurred',
        startTime
      });

      const errorMessage: ChatMessage = {
        id: Date.now().toString(),
        role: "assistant",
        content: `Failed to ${crawlMode === "crawl" ? "crawl" : "scrape"} URL. Please check the URL and try again.`,
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsScraping(false);
      // Clear progress after 5 seconds if completed
      setTimeout(() => {
        setProgressUpdate(prev =>
          prev?.status === 'completed' ? null : prev
        );
      }, 5000);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <Conversation className="flex-1">
        <ConversationContent className="space-y-4">
          {messages.length === 0 ? (
            <ConversationEmptyState
              title="RAG-Powered Chat Assistant"
              description="Ask me anything! I use Retrieval-Augmented Generation to provide accurate, sourced responses."
            />
          ) : (
            messages.map((message) => (
              <div key={message.id} className="space-y-2">
                <Message from={message.role}>
                  <MessageContent>{message.content}</MessageContent>
                </Message>

                {message.role === "assistant" && message.confidence !== undefined && (
                  <div className="flex flex-wrap gap-2 ml-12 text-xs">
                    {/* Confidence Badge */}
                    <Badge
                      variant="outline"
                      className={`${getConfidenceColor(message.confidence)} flex items-center gap-1`}
                    >
                      <Sparkles className="w-3 h-3" />
                      Confidence: {formatConfidence(message.confidence)}
                    </Badge>

                    {/* Mode Badge */}
                    {message.mode && (
                      <Badge
                        variant="outline"
                        className="bg-blue-500/10 text-blue-700 border-blue-500/20 flex items-center gap-1"
                      >
                        {message.mode === "rag" ? (
                          <>
                            <Database className="w-3 h-3" />
                            RAG Mode
                          </>
                        ) : (
                          <>
                            <Brain className="w-3 h-3" />
                            Direct Mode
                          </>
                        )}
                      </Badge>
                    )}

                    {/* Sources Badge */}
                    {message.sources && message.sources.length > 0 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleSourceExpanded(message.id)}
                        className="h-auto py-1 px-2 bg-purple-500/10 text-purple-700 border border-purple-500/20 hover:bg-purple-500/20"
                      >
                        <FileText className="w-3 h-3 mr-1" />
                        {message.sources.length} source{message.sources.length !== 1 ? 's' : ''}
                        {expandedSources.has(message.id) ? (
                          <ChevronUp className="w-3 h-3 ml-1" />
                        ) : (
                          <ChevronDown className="w-3 h-3 ml-1" />
                        )}
                      </Button>
                    )}
                  </div>
                )}

                {/* Expanded Sources Section - moved inside message block */}
                {message.role === "assistant" && message.sources && message.sources.length > 0 && expandedSources.has(message.id) && (
                  <div className="ml-12 mt-2 p-3 bg-muted/50 rounded-lg border border-border/50">
                    <div className="text-xs font-medium text-muted-foreground mb-2">Referenced Sources:</div>
                    <div className="space-y-2">
                      {message.sources.map((source, idx) => {
                        const sourceStr = String(source);
                        const isInternal = sourceStr.includes('internal://');
                        const isUrl = sourceStr.includes('http://') || sourceStr.includes('https://');

                        return (
                          <div key={idx} className="flex items-start gap-2 text-xs">
                            <span className="text-muted-foreground">{idx + 1}.</span>
                            {isInternal ? (
                              <div className="flex items-center gap-1 text-purple-700">
                                <FileText className="w-3 h-3" />
                                <span>Project Documentation</span>
                              </div>
                            ) : isUrl ? (
                              <a
                                href={sourceStr}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1 text-blue-600 hover:underline"
                              >
                                <ExternalLink className="w-3 h-3" />
                                <span className="truncate max-w-md">{sourceStr}</span>
                              </a>
                            ) : (
                              <span className="text-muted-foreground">{sourceStr}</span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
          {isLoading && (
            <Message from="assistant">
              <MessageContent>
                <div className="flex items-center gap-2">
                  <div className="animate-pulse">🔍</div>
                  <span>Searching knowledge base and thinking...</span>
                </div>
              </MessageContent>
            </Message>
          )}
        </ConversationContent>
      </Conversation>

      <div className="p-4 border-t bg-muted/50 space-y-4">
        {progressUpdate && (
          <ProgressTracker
            update={progressUpdate}
            onClose={() => setProgressUpdate(null)}
          />
        )}

        {/* UI Mode Toggle */}
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span className="flex items-center gap-2">
            <Database className="w-3 h-3" />
            RAG System Active • {knowledgeBaseCount} documents
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setUiMode(uiMode === "simple" ? "advanced" : "simple")}
              className="h-6 px-2 text-xs"
            >
              {uiMode === "simple" ? (
                <>
                  <ToggleLeft className="w-3 h-3 mr-1" />
                  Simple
                </>
              ) : (
                <>
                  <ToggleRight className="w-3 h-3 mr-1" />
                  Advanced
                </>
              )}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowKnowledgeBase(true)}
              className="h-6 px-2 text-xs"
            >
              <Eye className="w-3 h-3 mr-1" />
              View KB
            </Button>
          </div>
        </div>

        {/* Advanced Mode Controls */}
        {uiMode === "advanced" && (
          <div className="space-y-3">
          <div className="flex gap-2">
            <Input
              placeholder="Enter URL to add to knowledge base..."
              value={urlInput}
              onChange={(e) => {
                setUrlInput(e.target.value);
                // Auto-detect crawl mode
                if (e.target.value.trim()) {
                  const analysis = analyzeUrl(e.target.value);
                  if (analysis.confidence > 0.7) {
                    setCrawlMode(analysis.suggestedMode);
                    if (analysis.suggestedMode === 'crawl' && analysis.estimatedPages) {
                      setMaxPages(Math.min(analysis.estimatedPages, 50).toString());
                    }
                  }
                }
              }}
              onKeyPress={(e) => {
                if (e.key === "Enter") {
                  handleScrapeUrl();
                }
              }}
              disabled={isScraping}
              className="flex-1"
            />
            <Select value={crawlMode} onValueChange={(v) => setCrawlMode(v as "single" | "crawl")}>
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="single">
                  <div className="flex items-center gap-2">
                    <Globe className="w-4 h-4" />
                    Single Page
                  </div>
                </SelectItem>
                <SelectItem value="crawl">
                  <div className="flex items-center gap-2">
                    <Network className="w-4 h-4" />
                    Crawl Site
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
            <Button
              onClick={() => setShowAdvanced(!showAdvanced)}
              variant="outline"
              size="sm"
              className={crawlMode === "crawl" ? "" : "hidden"}
            >
              <Settings className="w-4 h-4" />
            </Button>
            <Button
              onClick={handleScrapeUrl}
              disabled={isScraping || !urlInput.trim()}
              size="sm"
              className="flex items-center gap-2"
            >
              {isScraping ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {crawlMode === "crawl" ? "Crawling..." : "Scraping..."}
                </>
              ) : (
                <>
                  {crawlMode === "crawl" ? <Network className="w-4 h-4" /> : <Globe className="w-4 h-4" />}
                  {crawlMode === "crawl" ? "Crawl" : "Add to KB"}
                </>
              )}
            </Button>
          </div>

          {crawlMode === "crawl" && showAdvanced && (
            <div className="flex gap-2 text-sm">
              <div className="flex items-center gap-1">
                <label htmlFor="depth" className="text-muted-foreground">Depth:</label>
                <Input
                  id="depth"
                  type="number"
                  min="1"
                  max="5"
                  value={crawlDepth}
                  onChange={(e) => setCrawlDepth(e.target.value)}
                  className="w-16 h-8"
                  disabled={isScraping}
                />
              </div>
              <div className="flex items-center gap-1">
                <label htmlFor="maxPages" className="text-muted-foreground">Max Pages:</label>
                <Input
                  id="maxPages"
                  type="number"
                  min="1"
                  max="100"
                  value={maxPages}
                  onChange={(e) => setMaxPages(e.target.value)}
                  className="w-20 h-8"
                  disabled={isScraping}
                />
              </div>
            </div>
          )}
          </div>
        )}

        {/* Chat Input - Always Visible */}
        <div>
          <PromptInput onSubmit={handleSubmit}>
            <PromptInputBody>
              <PromptInputTextarea placeholder="Ask about our RAG system, embeddings, or architecture..." />
              <PromptInputToolbar>
                <div />
                <PromptInputSubmit status={isLoading ? "submitted" : undefined} />
              </PromptInputToolbar>
            </PromptInputBody>
          </PromptInput>
        </div>
      </div>

      <KnowledgeBaseViewer
        isOpen={showKnowledgeBase}
        onClose={() => setShowKnowledgeBase(false)}
        onClear={() => setKnowledgeBaseCount(0)}
      />
    </div>
  );
}