'use client';

import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { CheckCircle2, Circle, Clock, AlertCircle } from 'lucide-react';

export interface ProgressUpdate {
  type: 'scrape' | 'crawl';
  status: 'starting' | 'in-progress' | 'completed' | 'error';
  currentPage?: string;
  pagesProcessed?: number;
  totalPages?: number;
  currentDepth?: number;
  maxDepth?: number;
  message?: string;
  errors?: string[];
  startTime?: number;
  estimatedTime?: number;
}

interface ProgressTrackerProps {
  update: ProgressUpdate | null;
  onClose?: () => void;
}

export function ProgressTracker({ update, onClose }: ProgressTrackerProps) {
  if (!update) return null;

  const getProgressPercentage = () => {
    if (update.totalPages && update.pagesProcessed) {
      return (update.pagesProcessed / update.totalPages) * 100;
    }
    return 0;
  };

  const getStatusIcon = () => {
    switch (update.status) {
      case 'completed':
        return <CheckCircle2 className="w-4 h-4 text-green-500" />;
      case 'error':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      case 'in-progress':
        return <Circle className="w-4 h-4 text-blue-500 animate-pulse" />;
      default:
        return <Clock className="w-4 h-4 text-gray-500" />;
    }
  };

  const getElapsedTime = () => {
    if (!update.startTime) return '';
    const elapsed = Date.now() - update.startTime;
    const seconds = Math.floor(elapsed / 1000);
    const minutes = Math.floor(seconds / 60);
    if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    }
    return `${seconds}s`;
  };

  return (
    <Card className="p-4 space-y-3 animate-in slide-in-from-top-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {getStatusIcon()}
          <span className="font-medium text-sm">
            {update.type === 'crawl' ? 'Crawling Website' : 'Scraping Page'}
          </span>
          {update.status === 'in-progress' && (
            <Badge variant="secondary" className="text-xs">
              {getElapsedTime()}
            </Badge>
          )}
        </div>
        {update.status === 'completed' && onClose && (
          <button onClick={onClose} className="text-xs text-muted-foreground hover:text-foreground">
            ✕
          </button>
        )}
      </div>

      {update.status === 'in-progress' && (
        <>
          <Progress value={getProgressPercentage()} className="h-2" />

          <div className="space-y-1 text-xs text-muted-foreground">
            {update.currentPage && <div className="truncate">Processing: {update.currentPage}</div>}

            <div className="flex justify-between">
              {update.pagesProcessed !== undefined && update.totalPages && (
                <span>
                  Pages: {update.pagesProcessed}/{update.totalPages}
                </span>
              )}
              {update.currentDepth !== undefined && update.maxDepth && (
                <span>
                  Depth: {update.currentDepth}/{update.maxDepth}
                </span>
              )}
            </div>
          </div>
        </>
      )}

      {update.message && <div className="text-sm">{update.message}</div>}

      {update.errors && update.errors.length > 0 && (
        <div className="text-xs text-red-600 space-y-1">
          {update.errors.map((error, i) => (
            <div key={i}>• {error}</div>
          ))}
        </div>
      )}
    </Card>
  );
}
