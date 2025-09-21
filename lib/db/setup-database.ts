import { sql } from '@vercel/postgres';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config({ path: path.resolve(process.cwd(), '.env.development.local') });

/**
 * Set up the database schema for the RAG application
 * Enables pgvector and creates necessary tables
 */
export async function setupDatabase() {
  console.log('🚀 Setting up database schema...');

  try {
    // Enable pgvector extension
    console.log('📦 Enabling pgvector extension...');
    await sql`CREATE EXTENSION IF NOT EXISTS vector`;
    console.log('✅ pgvector extension enabled');

    // Create documents table
    console.log('📄 Creating documents table...');
    await sql`
      CREATE TABLE IF NOT EXISTS documents (
        id VARCHAR(255) PRIMARY KEY,
        content TEXT NOT NULL,
        metadata JSONB DEFAULT '{}',
        version INTEGER DEFAULT 1,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `;
    console.log('✅ Documents table created');

    // Create embeddings table
    console.log('🔢 Creating embeddings table...');
    await sql`
      CREATE TABLE IF NOT EXISTS embeddings (
        id SERIAL PRIMARY KEY,
        document_id VARCHAR(255) REFERENCES documents(id) ON DELETE CASCADE,
        embedding vector(1536),
        created_at TIMESTAMP DEFAULT NOW()
      )
    `;
    console.log('✅ Embeddings table created');

    // Create document_versions table for history
    console.log('📚 Creating document versions table...');
    await sql`
      CREATE TABLE IF NOT EXISTS document_versions (
        id SERIAL PRIMARY KEY,
        document_id VARCHAR(255),
        version INTEGER,
        content TEXT,
        metadata JSONB DEFAULT '{}',
        created_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(document_id, version)
      )
    `;
    console.log('✅ Document versions table created');

    // Create index for similarity search
    console.log('🔍 Creating vector similarity index...');
    await sql`
      CREATE INDEX IF NOT EXISTS embeddings_embedding_idx
      ON embeddings
      USING ivfflat (embedding vector_cosine_ops)
      WITH (lists = 100)
    `;
    console.log('✅ Vector similarity index created');

    // Create index for document lookups
    console.log('📑 Creating document indexes...');
    await sql`
      CREATE INDEX IF NOT EXISTS documents_updated_at_idx
      ON documents(updated_at DESC)
    `;
    await sql`
      CREATE INDEX IF NOT EXISTS embeddings_document_id_idx
      ON embeddings(document_id)
    `;
    console.log('✅ Document indexes created');

    console.log('🎉 Database setup complete!');
    return { success: true };
  } catch (error) {
    console.error('❌ Database setup failed:', error);
    throw error;
  }
}

// Run if executed directly
if (require.main === module) {
  setupDatabase()
    .then(() => {
      console.log('✨ Database is ready for vector operations!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}
