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
import { Brain, Database, Sparkles } from "lucide-react";

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
                      <Badge
                        variant="outline"
                        className="bg-purple-500/10 text-purple-700 border-purple-500/20"
                      >
                        {message.sources.length} source{message.sources.length !== 1 ? 's' : ''}
                      </Badge>
                    )}
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

      <div className="p-4 border-t bg-muted/50">
        <div className="text-xs text-muted-foreground mb-2 flex items-center gap-2">
          <Database className="w-3 h-3" />
          RAG System Active • 10 documents in knowledge base
        </div>
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
  );
}