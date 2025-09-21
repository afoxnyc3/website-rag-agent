# API Documentation

Complete API reference for the AI RAG Agent application.

## Base URL

- Development: `http://localhost:3000`
- Production: `https://your-app.vercel.app`

## Authentication

Currently, the API is unauthenticated. Future versions will include API key authentication.

## Endpoints

### 1. Chat Endpoint

**POST** `/api/chat`

Main endpoint for interacting with the BaseAgent. Handles both URL ingestion and question answering.

#### Request

```json
{
  "message": "string", // Required: User query or URL
  "useRAG": true // Optional: Enable RAG mode (default: true)
}
```

#### Response

**Success (200 OK)**

```json
{
  "response": "string", // AI-generated response
  "confidence": 0.85, // Confidence score (0.0 to 1.0)
  "sources": [
    // Source document IDs
    "doc-id-1",
    "doc-id-2"
  ],
  "mode": "agent" // Response mode: "agent" or "direct"
}
```

**Error (400/500)**

```json
{
  "error": "string", // Error message
  "details": "string" // Optional: Detailed error information
}
```

#### Examples

**URL Ingestion:**

```bash
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "https://example.com/documentation"
  }'
```

**Question Answering:**

```bash
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "How do I configure authentication?"
  }'
```

### 2. Scrape Endpoint

**POST** `/api/scrape`

Scrapes a single web page and adds content to the knowledge base.

#### Request

```json
{
  "url": "string" // Required: URL to scrape
}
```

#### Response

**Success (200 OK)**

```json
{
  "success": true,
  "message": "string", // Success message
  "documentsAdded": 5, // Number of chunks created
  "metadata": {
    "url": "string",
    "title": "string",
    "contentLength": 12345,
    "scrapedAt": "ISO 8601 timestamp"
  }
}
```

**Error (400/500)**

```json
{
  "error": "string", // Error message
  "details": "string" // Optional: Error details
}
```

### 3. Crawl Endpoint

**POST** `/api/crawl`

Crawls multiple pages from a website and adds to knowledge base.

#### Request

```json
{
  "url": "string", // Required: Starting URL
  "maxDepth": 2, // Optional: Maximum crawl depth (default: 2)
  "maxPages": 10 // Optional: Maximum pages to crawl (default: 10)
}
```

#### Response

**Success (200 OK)**

```json
{
  "success": true,
  "message": "string",
  "stats": {
    "pagesVisited": 8,
    "documentsAdded": 24,
    "totalContentSize": 98765,
    "timeElapsed": 15.3
  },
  "metadata": {
    "startUrl": "string",
    "crawledAt": "ISO 8601 timestamp",
    "depth": 2,
    "maxPages": 10
  }
}
```

**Error (400/500)**

```json
{
  "error": "string",
  "details": "string"
}
```

### 4. Knowledge Base Endpoint

**GET** `/api/knowledge`

Retrieves knowledge base contents or searches for documents.

#### Query Parameters

- `q` (optional): Search query string

#### Response

**Without search query:**

```json
{
  "success": true,
  "sources": [
    {
      "url": "string",
      "title": "string",
      "documentCount": 5,
      "totalSize": 12345,
      "lastUpdated": "ISO 8601 timestamp",
      "source": "Internal" | "External"
    }
  ],
  "totalDocuments": 42
}
```

**With search query:**

```json
{
  "success": true,
  "query": "string",
  "results": [
    {
      "content": "string",
      "score": 0.92,
      "metadata": {
        "url": "string",
        "title": "string",
        "source": "string"
      }
    }
  ],
  "count": 3,
  "confidence": 0.85
}
```

#### Example

```bash
# Get all documents
curl http://localhost:3000/api/knowledge

# Search documents
curl "http://localhost:3000/api/knowledge?q=authentication"
```

### 5. Delete Knowledge Base

**DELETE** `/api/knowledge`

Clears documents from the knowledge base.

#### Request

```json
{
  "clearAll": true, // Required for clearing all
  "documentId": "string" // Not currently supported
}
```

#### Response

**Success (200 OK)**

```json
{
  "success": true,
  "message": "Knowledge base cleared successfully"
}
```

**Error (400)**

```json
{
  "error": "Individual document deletion not supported. Use Clear All instead."
}
```

## WebSocket Events (Future)

Future versions will support WebSocket connections for real-time updates:

- `scraping:progress` - Progress updates during scraping
- `crawling:progress` - Progress updates during crawling
- `knowledge:updated` - Knowledge base changes
- `chat:streaming` - Streaming chat responses

## Rate Limiting

Currently not implemented. Future versions will include:

- 10 requests/minute for scraping endpoints
- 100 requests/minute for chat endpoint
- 1000 requests/minute for knowledge queries

## Error Codes

| Code | Description                                |
| ---- | ------------------------------------------ |
| 400  | Bad Request - Invalid parameters           |
| 404  | Not Found - Endpoint doesn't exist         |
| 429  | Too Many Requests - Rate limit exceeded    |
| 500  | Internal Server Error - Server-side error  |
| 503  | Service Unavailable - API temporarily down |

## Response Headers

All responses include:

```
Content-Type: application/json
X-Response-Time: <milliseconds>
X-Request-ID: <unique-id>
```

## Data Formats

### Document ID Format

```
<source>-<hash>-<timestamp>
Example: https://example.com-abc123-1234567890
```

### Timestamp Format

All timestamps use ISO 8601 format:

```
2024-01-20T15:30:45.123Z
```

### Confidence Score

Floating point between 0.0 and 1.0:

- 0.9+ : Very high confidence
- 0.7-0.9: High confidence
- 0.5-0.7: Medium confidence
- 0.3-0.5: Low confidence
- <0.3: Very low confidence

## SDK Examples

### JavaScript/TypeScript

```typescript
class RAGClient {
  constructor(private baseUrl: string) {}

  async chat(message: string) {
    const response = await fetch(`${this.baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message }),
    });
    return response.json();
  }

  async scrape(url: string) {
    const response = await fetch(`${this.baseUrl}/api/scrape`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url }),
    });
    return response.json();
  }

  async searchKnowledge(query: string) {
    const response = await fetch(`${this.baseUrl}/api/knowledge?q=${encodeURIComponent(query)}`);
    return response.json();
  }
}

// Usage
const client = new RAGClient('http://localhost:3000');
const response = await client.chat('What is Next.js?');
console.log(response);
```

### Python

```python
import requests

class RAGClient:
    def __init__(self, base_url):
        self.base_url = base_url

    def chat(self, message):
        response = requests.post(
            f"{self.base_url}/api/chat",
            json={"message": message}
        )
        return response.json()

    def scrape(self, url):
        response = requests.post(
            f"{self.base_url}/api/scrape",
            json={"url": url}
        )
        return response.json()

    def search_knowledge(self, query):
        response = requests.get(
            f"{self.base_url}/api/knowledge",
            params={"q": query}
        )
        return response.json()

# Usage
client = RAGClient("http://localhost:3000")
response = client.chat("What is Next.js?")
print(response)
```

## Testing Endpoints

You can test the API using the provided test scripts:

```bash
# Test RAG functionality
node test-rag.mjs

# Test UI interactions
node test-ui-sources.mjs

# Run all tests
pnpm test
```

## Performance Benchmarks

Expected response times under normal load:

- Chat endpoint: < 200ms (cached), < 2s (RAG)
- Scrape endpoint: < 5s per page
- Crawl endpoint: < 30s for 10 pages
- Knowledge search: < 50ms
- Knowledge list: < 100ms

## Changelog

### v1.0.0 (Current)

- Initial API implementation
- BaseAgent orchestration
- ScrapeTool and CrawlTool integration
- Knowledge base management
- Confidence scoring

### v1.1.0 (Planned)

- API authentication
- Rate limiting
- WebSocket support
- Batch operations
- Export/import functionality
