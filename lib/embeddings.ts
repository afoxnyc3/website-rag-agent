import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export type EmbeddingVector = number[];

export interface EmbeddingResult {
  embedding: EmbeddingVector;
  dimensions: number;
}

export async function generateEmbedding(text: string): Promise<EmbeddingResult> {
  if (!text?.trim()) {
    throw new Error('Text cannot be empty');
  }

  const response = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: text.trim(),
  });

  const embedding = response.data[0].embedding;

  return {
    embedding,
    dimensions: embedding.length,
  };
}

export async function generateEmbeddings(texts: string[]): Promise<EmbeddingResult[]> {
  if (!texts.length) {
    throw new Error('No texts provided');
  }

  const validTexts = texts.filter((t) => t?.trim());
  if (!validTexts.length) {
    throw new Error('All texts are empty');
  }

  const response = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: validTexts,
  });

  return response.data.map((item) => ({
    embedding: item.embedding,
    dimensions: item.embedding.length,
  }));
}

export function cosineSimilarity(vecA: EmbeddingVector, vecB: EmbeddingVector): number {
  if (vecA.length !== vecB.length) {
    throw new Error('Vectors must have same dimensions');
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }

  const denominator = Math.sqrt(normA) * Math.sqrt(normB);
  return denominator === 0 ? 0 : dotProduct / denominator;
}
