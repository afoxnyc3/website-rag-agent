export interface UrlAnalysis {
  suggestedMode: 'single' | 'crawl';
  confidence: number;
  reason: string;
  estimatedPages?: number;
}

export function analyzeUrl(url: string): UrlAnalysis {
  try {
    const parsed = new URL(url);
    const path = parsed.pathname.toLowerCase();
    const host = parsed.hostname.toLowerCase();

    // Documentation sites - usually benefit from crawling
    if (host.includes('docs.') || host.includes('documentation.') ||
        path.includes('/docs/') || path.includes('/documentation/')) {
      return {
        suggestedMode: 'crawl',
        confidence: 0.9,
        reason: 'Documentation site detected - multiple related pages likely available',
        estimatedPages: 20
      };
    }

    // Blog posts or articles - usually single page
    if (path.includes('/blog/') || path.includes('/article/') ||
        path.includes('/post/') || path.includes('/news/')) {
      return {
        suggestedMode: 'single',
        confidence: 0.8,
        reason: 'Blog/article page detected - single page content',
        estimatedPages: 1
      };
    }

    // API references - benefit from crawling
    if (path.includes('/api/') || path.includes('/reference/')) {
      return {
        suggestedMode: 'crawl',
        confidence: 0.85,
        reason: 'API reference detected - multiple endpoints to document',
        estimatedPages: 30
      };
    }

    // GitHub repos - could benefit from crawling README and docs
    if (host === 'github.com' && path.split('/').length >= 3) {
      return {
        suggestedMode: 'crawl',
        confidence: 0.7,
        reason: 'GitHub repository - may contain multiple documentation files',
        estimatedPages: 10
      };
    }

    // Direct file links - always single
    if (path.endsWith('.pdf') || path.endsWith('.md') ||
        path.endsWith('.txt') || path.endsWith('.json')) {
      return {
        suggestedMode: 'single',
        confidence: 1.0,
        reason: 'Direct file link - single document',
        estimatedPages: 1
      };
    }

    // Landing pages or home pages - might have subpages
    if (path === '/' || path === '' || path.endsWith('/index.html')) {
      return {
        suggestedMode: 'crawl',
        confidence: 0.6,
        reason: 'Homepage/landing page - may have multiple subpages',
        estimatedPages: 15
      };
    }

    // Tutorial or guide pages - often multi-page
    if (path.includes('/tutorial') || path.includes('/guide') ||
        path.includes('/getting-started')) {
      return {
        suggestedMode: 'crawl',
        confidence: 0.8,
        reason: 'Tutorial/guide detected - likely multi-page content',
        estimatedPages: 10
      };
    }

    // Default - single page for specific paths, crawl for general
    if (path.split('/').filter(p => p).length > 2) {
      return {
        suggestedMode: 'single',
        confidence: 0.5,
        reason: 'Specific page path - treating as single page',
        estimatedPages: 1
      };
    }

    return {
      suggestedMode: 'single',
      confidence: 0.4,
      reason: 'Unable to determine page type - defaulting to single page',
      estimatedPages: 1
    };

  } catch (error) {
    return {
      suggestedMode: 'single',
      confidence: 0.1,
      reason: 'Invalid URL format',
      estimatedPages: 1
    };
  }
}