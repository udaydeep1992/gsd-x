/**
 * GSD-X Embedding Engine Abstraction
 *
 * Local-first, zero-dependency high-dimensional feature hashing embedder
 * with pluggable external provider support.
 */

import * as crypto from 'crypto';

export interface EmbeddingProvider {
  readonly id: string;
  readonly dimensions: number;
  embed(text: string): Promise<number[]>;
  embedBatch(texts: string[]): Promise<number[][]>;
}

/**
 * Computes cosine similarity between two unit-normalized or arbitrary vectors.
 */
export function cosineSimilarity(vecA: readonly number[], vecB: readonly number[]): number {
  if (vecA.length !== vecB.length || vecA.length === 0) {
    return 0;
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < vecA.length; i++) {
    const a = vecA[i];
    const b = vecB[i];
    dotProduct += a * b;
    normA += a * a;
    normB += b * b;
  }

  if (normA === 0 || normB === 0) return 0;
  const similarity = dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  return Math.max(-1, Math.min(1, similarity));
}

/**
 * Local Deterministic Feature Hashing Embedding Provider (TF-IDF + N-gram Hashing).
 * Zero-dependency, ultra-fast, local-first embedder.
 * Creates an L2-normalized dense embedding vector.
 */
export class LocalHashEmbeddingProvider implements EmbeddingProvider {
  public readonly id = 'local-hash-v1';
  public readonly dimensions: number;

  constructor(dimensions = 128) {
    this.dimensions = dimensions;
  }

  public async embed(text: string): Promise<number[]> {
    const vector = new Array<number>(this.dimensions).fill(0);
    const tokens = this.tokenize(text);

    if (tokens.length === 0) {
      return vector;
    }

    // Unigrams and bigrams
    for (let i = 0; i < tokens.length; i++) {
      const unigram = tokens[i];
      this.hashAndAccumulate(unigram, 1.0, vector);

      if (i < tokens.length - 1) {
        const bigram = `${unigram}_${tokens[i + 1]}`;
        this.hashAndAccumulate(bigram, 1.5, vector);
      }
    }

    // L2 normalize vector
    let sumSq = 0;
    for (let i = 0; i < this.dimensions; i++) {
      sumSq += vector[i] * vector[i];
    }

    if (sumSq > 0) {
      const norm = Math.sqrt(sumSq);
      for (let i = 0; i < this.dimensions; i++) {
        vector[i] = vector[i] / norm;
      }
    }

    return vector;
  }

  public async embedBatch(texts: string[]): Promise<number[][]> {
    return Promise.all(texts.map((t) => this.embed(t)));
  }

  private tokenize(text: string): string[] {
    return text
      .toLowerCase()
      .replace(/[^\w\s-]/g, ' ')
      .split(/\s+/)
      .filter((t) => t.length > 1);
  }

  private hashAndAccumulate(token: string, weight: number, vector: number[]): void {
    const hash = crypto.createHash('sha256').update(token).digest();
    const bucket = hash.readUInt32BE(0) % this.dimensions;
    const sign = (hash.readUInt8(4) & 1) === 1 ? 1 : -1;
    vector[bucket] += sign * weight;
  }
}

/**
 * Custom / API Embedding Provider wrapper.
 */
export class CustomEmbeddingProvider implements EmbeddingProvider {
  public readonly id: string;
  public readonly dimensions: number;
  private readonly embedFn: (text: string) => Promise<number[]>;

  constructor(id: string, dimensions: number, embedFn: (text: string) => Promise<number[]>) {
    this.id = id;
    this.dimensions = dimensions;
    this.embedFn = embedFn;
  }

  public async embed(text: string): Promise<number[]> {
    return this.embedFn(text);
  }

  public async embedBatch(texts: string[]): Promise<number[][]> {
    return Promise.all(texts.map((t) => this.embed(t)));
  }
}
