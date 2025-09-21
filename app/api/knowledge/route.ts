import { NextRequest, NextResponse } from 'next/server';
import { getRAGService } from '@/app/api/chat/route';

export async function GET(request: NextRequest) {
  try {
    const ragService = await getRAGService();
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get('q');

    if (query) {
      // Search knowledge base using the query method
      const response = await ragService.query(query);

      // Convert chunks to results format
      const results = response.chunks.map((chunk: any) => ({
        content: chunk.content,
        score: chunk.similarity || 0,
        metadata: chunk.metadata || {},
      }));

      return NextResponse.json({
        success: true,
        query,
        results,
        count: results.length,
        confidence: response.confidence,
      });
    } else {
      // Get all documents using the new getAllDocuments method
      const documents = await ragService.getAllDocuments();

      // Group by source URL
      const groupedByUrl = documents.reduce((acc: any, doc: any) => {
        const url = doc.metadata?.url || 'unknown://source';
        const isInternal = url.startsWith('internal://');

        if (!acc[url]) {
          acc[url] = {
            url,
            title: isInternal ? 'Project Documentation' : doc.metadata?.title || 'Untitled',
            documentCount: 0,
            totalSize: 0,
            lastUpdated:
              doc.metadata?.crawledAt || doc.metadata?.scrapedAt || doc.metadata?.timestamp,
            source: doc.metadata?.source || (isInternal ? 'Internal' : 'External'),
          };
        }
        acc[url].documentCount++;
        acc[url].totalSize += (doc.content || '').length;
        return acc;
      }, {});

      return NextResponse.json({
        success: true,
        sources: Object.values(groupedByUrl),
        totalDocuments: documents.length,
      });
    }
  } catch (error) {
    console.error('Knowledge base error:', error);
    return NextResponse.json({ error: 'Failed to access knowledge base' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { documentId, clearAll } = await request.json();
    const ragService = await getRAGService();

    if (clearAll) {
      // Clear entire knowledge base using the clearDocuments method
      await ragService.clearDocuments();

      return NextResponse.json({
        success: true,
        message: 'Knowledge base cleared successfully',
      });
    } else if (documentId) {
      // Delete specific document - not implemented since we don't have individual delete
      // The storage doesn't support individual document deletion properly
      return NextResponse.json(
        { error: 'Individual document deletion not supported. Use Clear All instead.' },
        { status: 400 }
      );
    } else {
      return NextResponse.json({ error: 'Missing documentId or clearAll flag' }, { status: 400 });
    }
  } catch (error) {
    console.error('Knowledge base deletion error:', error);
    return NextResponse.json({ error: 'Failed to delete from knowledge base' }, { status: 500 });
  }
}
