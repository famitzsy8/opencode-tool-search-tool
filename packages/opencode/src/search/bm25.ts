/**
 * BM25 (Best Matching 25) - A probabilistic ranking function for information retrieval.
 *
 * BM25 scores documents based on query term frequency, document length normalization,
 * and inverse document frequency weighting.
 */

export namespace BM25 {
  /**
   * BM25 tuning parameters
   */
  export interface Config {
    /** Term frequency saturation parameter (default: 0.9, typical range: 0.5-2.0) */
    k1: number
    /** Document length normalization parameter (default: 0.4, range: 0-1) */
    b: number
  }

  /**
   * A document in the index
   */
  export interface Document {
    id: string
    /** Pre-tokenized terms for this document */
    terms: string[]
    /** Term frequency map: term -> count */
    termFrequency: Map<string, number>
    /** Document length (number of terms) */
    length: number
  }

  /**
   * Search result with score
   */
  export interface SearchResult<T> {
    item: T
    score: number
  }

  /**
   * The BM25 index containing all precomputed statistics
   */
  export interface Index<T> {
    documents: Document[]
    items: T[]
    /** Document frequency: term -> number of documents containing the term */
    documentFrequency: Map<string, number>
    /** Average document length */
    averageDocumentLength: number
    /** Total number of documents */
    documentCount: number
    /** Configuration parameters */
    config: Config
  }

  const DEFAULT_CONFIG: Config = {
    k1: 0.9,
    b: 0.4,
  }

  /**
   * Tokenize text into normalized terms
   */
  export function tokenize(text: string): string[] {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((term) => term.length > 0)
  }

  /**
   * Build term frequency map from a list of terms
   */
  function buildTermFrequency(terms: string[]): Map<string, number> {
    const tf = new Map<string, number>()
    for (const term of terms) {
      tf.set(term, (tf.get(term) ?? 0) + 1)
    }
    return tf
  }

  /**
   * Create a new BM25 index from items
   *
   * @param items - Array of items to index
   * @param getFields - Function that extracts searchable text fields from an item
   * @param config - Optional BM25 configuration parameters
   */
  export function createIndex<T>(
    items: T[],
    getFields: (item: T) => string[],
    config: Partial<Config> = {},
  ): Index<T> {
    const finalConfig: Config = { ...DEFAULT_CONFIG, ...config }
    const documents: Document[] = []
    const documentFrequency = new Map<string, number>()

    // Build documents and collect term statistics
    for (let i = 0; i < items.length; i++) {
      const item = items[i]
      const fields = getFields(item)
      const terms = fields.flatMap((field) => tokenize(field))
      const termFrequency = buildTermFrequency(terms)

      // Update document frequency for each unique term in this document
      for (const term of termFrequency.keys()) {
        documentFrequency.set(term, (documentFrequency.get(term) ?? 0) + 1)
      }

      documents.push({
        id: String(i),
        terms,
        termFrequency,
        length: terms.length,
      })
    }

    // Calculate average document length
    const totalLength = documents.reduce((sum, doc) => sum + doc.length, 0)
    const averageDocumentLength = documents.length > 0 ? totalLength / documents.length : 0

    return {
      documents,
      items,
      documentFrequency,
      averageDocumentLength,
      documentCount: documents.length,
      config: finalConfig,
    }
  }

  /**
   * Calculate IDF (Inverse Document Frequency) for a term
   *
   * Uses the BM25 IDF formula: log((N - df + 0.5) / (df + 0.5) + 1)
   * where N is the total number of documents and df is the document frequency
   */
  function calculateIDF(documentCount: number, documentFrequency: number): number {
    const numerator = documentCount - documentFrequency + 0.5
    const denominator = documentFrequency + 0.5
    return Math.log(numerator / denominator + 1)
  }

  /**
   * Calculate BM25 score for a single document against query terms
   */
  function scoreDocument(
    document: Document,
    queryTerms: string[],
    index: Index<unknown>,
  ): number {
    const { k1, b } = index.config
    let score = 0

    for (const term of queryTerms) {
      const df = index.documentFrequency.get(term) ?? 0
      if (df === 0) continue // Term not in corpus

      const idf = calculateIDF(index.documentCount, df)
      const tf = document.termFrequency.get(term) ?? 0

      if (tf === 0) continue // Term not in this document

      // BM25 term score formula
      const numerator = tf * (k1 + 1)
      const denominator = tf + k1 * (1 - b + b * (document.length / index.averageDocumentLength))
      score += idf * (numerator / denominator)
    }

    return score
  }

  /**
   * Search the index with a query string
   *
   * @param index - The BM25 index to search
   * @param query - The search query
   * @param limit - Maximum number of results to return (default: 10)
   * @returns Array of search results sorted by score (highest first)
   */
  export function search<T>(index: Index<T>, query: string, limit = 10): SearchResult<T>[] {
    if (index.documentCount === 0) return []

    const queryTerms = tokenize(query)
    if (queryTerms.length === 0) return []

    const results: SearchResult<T>[] = []

    for (let i = 0; i < index.documents.length; i++) {
      const document = index.documents[i]
      const score = scoreDocument(document, queryTerms, index)

      if (score > 0) {
        results.push({
          item: index.items[i],
          score,
        })
      }
    }

    // Sort by score descending
    results.sort((a, b) => b.score - a.score)

    return results.slice(0, limit)
  }

  /**
   * Add a new item to an existing index
   * Note: This is less efficient than rebuilding for bulk additions
   */
  export function addItem<T>(index: Index<T>, item: T, getFields: (item: T) => string[]): void {
    const fields = getFields(item)
    const terms = fields.flatMap((field) => tokenize(field))
    const termFrequency = buildTermFrequency(terms)

    // Update document frequency
    for (const term of termFrequency.keys()) {
      index.documentFrequency.set(term, (index.documentFrequency.get(term) ?? 0) + 1)
    }

    const document: Document = {
      id: String(index.documents.length),
      terms,
      termFrequency,
      length: terms.length,
    }

    index.documents.push(document)
    index.items.push(item)

    // Recalculate average document length
    const totalLength = index.documents.reduce((sum, doc) => sum + doc.length, 0)
    index.averageDocumentLength = totalLength / index.documents.length
    index.documentCount = index.documents.length
  }

  /**
   * Get index statistics for debugging/tuning
   */
  export function getStats<T>(index: Index<T>): {
    documentCount: number
    uniqueTerms: number
    averageDocumentLength: number
    config: Config
  } {
    return {
      documentCount: index.documentCount,
      uniqueTerms: index.documentFrequency.size,
      averageDocumentLength: index.averageDocumentLength,
      config: index.config,
    }
  }
}
