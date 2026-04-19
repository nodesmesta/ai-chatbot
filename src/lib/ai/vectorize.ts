/**
 * Cloudflare Vectorize Service
 * Menyimpan dan mengambil hasil pencarian dari Vectorize
 */

interface VectorizeConfig {
  accountId: string;
  apiKey: string;
  indexName: string;
}

interface VectorizeVector {
  id: string;
  values: number[];
  metadata?: Record<string, unknown>;
}

export class VectorizeService {
  private config: VectorizeConfig;
  private baseUrl: string;

  constructor() {
    this.config = {
      accountId: process.env.CLOUDFLARE_ACCOUNT_ID || "",
      apiKey: process.env.CLOUDFLARE_API_TOKEN || "",
      indexName: process.env.VECTORIZE_INDEX_NAME || "chatbot-search-index",
    };
    this.baseUrl = `https://api.cloudflare.com/client/v4/accounts/${this.config.accountId}/vectorize`;
  }

  /**
   * Check apakah Vectorize sudah dikonfigurasi
   */
  isConfigured(): boolean {
    return !!(
      this.config.accountId &&
      this.config.apiKey &&
      this.config.indexName
    );
  }

  /**
   * Upsert vector ke index
   */
  async upsertVector(
    query: string,
    embedding: number[],
    metadata: Record<string, unknown>
  ): Promise<void> {
    if (!this.isConfigured()) {
      console.warn("Vectorize not configured. Skipping vector storage.");
      return;
    }

    try {
      const response = await fetch(`${this.baseUrl}/indexes/${this.config.indexName}/upsert`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.config.apiKey}`,
        },
        body: JSON.stringify({
          vectors: [
            {
              id: this.generateId(query),
              values: embedding,
              metadata: {
                ...metadata,
                timestamp: new Date().toISOString(),
              },
            },
          ],
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        console.error("Vectorize upsert error:", error);
      }
    } catch (error) {
      console.error("Vectorize upsert error:", error);
    }
  }

  /**
   * Query vector untuk mencari similar vectors
   */
  async queryVectors(
    embedding: number[],
    topK: number = 3
  ): Promise<Array<{ id: string; score: number; metadata: Record<string, unknown> }>> {
    if (!this.isConfigured()) {
      return [];
    }

    try {
      const response = await fetch(`${this.baseUrl}/indexes/${this.config.indexName}/query`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.config.apiKey}`,
        },
        body: JSON.stringify({
          vector: embedding,
          topK: topK,
          returnValues: false,
          returnMetadata: "all",
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        console.error("Vectorize query error:", error);
        return [];
      }

      const data = await response.json() as { matches?: Array<{ id: string; score: number; metadata: Record<string, unknown> }> };
      return data.matches || [];
    } catch (error) {
      console.error("Vectorize query error:", error);
      return [];
    }
  }

  /**
   * Generate simple hash id dari query
   */
  private generateId(query: string): string {
    let hash = 0;
    for (let i = 0; i < query.length; i++) {
      const char = query.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }
    return `search-${Math.abs(hash).toString(16)}-${Date.now()}`;
  }

  /**
   * Generate embedding sederhana (menggunakan NVIDIA NIM)
   */
  async generateEmbedding(text: string): Promise<number[]> {
    const apiKey = process.env.NVIDIA_NIM_API_KEY;
    const embeddingModel = process.env.NVIDIA_NIM_EMBEDDING_MODEL || "nvidia/nv-embedqa-e5-v5";

    if (!apiKey) {
      console.warn("NVIDIA_NIM_API_KEY not configured. Cannot generate embedding.");
      return [];
    }

    try {
      const response = await fetch(
        "https://integrate.api.nvidia.com/v1/embeddings",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: embeddingModel,
            input: text,
            input_type: "query",
                      }),
        }
      );

      if (!response.ok) {
        const error = await response.text();
        console.error("Embedding generation error:", error);
        return [];
      }

      const data = await response.json() as { data?: Array<{ embedding: number[] }> };
      return data.data?.[0]?.embedding || [];
    } catch (error) {
      console.error("Embedding generation error:", error);
      return [];
    }
  }
}

export const vectorizeService = new VectorizeService();
