import { MetricType } from "@zilliz/milvus2-sdk-node";

/**
 * Normalize Milvus metric score to standard [0, 1] similarity scale
 * where 1 represents most similar and 0 represents least similar.
 *
 * Different metric types have different score ranges and interpretations:
 *
 * Distance-based metrics (lower is better, converted to [0,1] similarity):
 * - L2: [0, +∞] euclidean distance -> similarity = 1 / (1 + distance)
 * - HAMMING: [0, +∞] bit difference count -> similarity = 1 / (1 + distance)
 * - JACCARD: [0, 1] distance -> similarity = 1 - distance
 * - TANIMOTO: [0, 1] distance -> similarity = 1 - distance
 * - MHJACCARD: [0, 1] distance -> similarity = 1 - distance
 * - SUBSTRUCTURE: [0, 1] distance -> similarity = 1 - distance
 * - SUPERSTRUCTURE: [0, 1] distance -> similarity = 1 - distance
 *
 * Similarity-based metrics (higher is better):
 * - COSINE: [-1, 1] similarity -> normalized to [0, 1]
 * - IP: [-1, 1] inner product (for normalized vectors) -> normalized to [0, 1]
 *
 * Text/Ranking metrics:
 * - BM25: [0, +∞] relevance score -> used as-is, typically normalized context-dependent
 */
export function normalizeMetricScore(
  rawScore: number,
  metricType: MetricType = MetricType.COSINE,
): { score: number; distance: number } {
  let score: number;
  let distance: number;

  switch (metricType) {
    // Similarity metrics: normalize similarity to [0, 1]
    case MetricType.COSINE:
      // Cosine: [-1, 1] similarity, higher is better
      // Normalize to [0, 1] where 1 is most similar
      score = (rawScore + 1) / 2;
      distance = 1 - score;
      break;

    case MetricType.IP:
      // Inner Product: [-1, 1] for L2-normalized vectors, equals cosine similarity
      // Normalize to [0, 1] to preserve full similarity range
      score = (rawScore + 1) / 2;
      distance = 1 - score;
      break;

    // Distance metrics: convert distance to [0, 1] similarity
    case MetricType.L2:
      // Euclidean Distance: [0, +∞], lower is better
      // Convert to similarity: score = 1 / (1 + distance)
      distance = rawScore;
      score = 1 / (1 + distance);
      break;

    case MetricType.HAMMING:
      // Hamming distance: [0, +∞] bit differences, lower is better
      // Use same formula as L2: score = 1 / (1 + distance)
      distance = rawScore;
      score = 1 / (1 + distance);
      break;

    case MetricType.JACCARD:
      // Jaccard distance: [0, 1], lower is better
      // Convert to similarity: score = 1 - distance
      distance = rawScore;
      score = 1 - distance;
      break;

    case MetricType.TANIMOTO:
      // Tanimoto distance: [0, 1], lower is better
      // Convert to similarity: score = 1 - distance
      distance = rawScore;
      score = 1 - distance;
      break;

    case MetricType.MHJACCARD:
      // Multi-Hash Jaccard distance: [0, 1], lower is better
      // Convert to similarity: score = 1 - distance
      distance = rawScore;
      score = 1 - distance;
      break;

    case MetricType.SUBSTRUCTURE:
      // Substructure matching: [0, 1] distance, lower is better
      // Convert to similarity: score = 1 - distance
      distance = rawScore;
      score = 1 - distance;
      break;

    case MetricType.SUPERSTRUCTURE:
      // Superstructure matching: [0, 1] distance, lower is better
      // Convert to similarity: score = 1 - distance
      distance = rawScore;
      score = 1 - distance;
      break;

    case MetricType.BM25:
      // BM25: [0, +∞] relevance score, higher is better
      // Used for full-text search, value depends on document and query characteristics
      // Keep as-is and let caller normalize based on context
      score = Math.max(0, rawScore); // Ensure non-negative
      distance = 0; // BM25 doesn't have a meaningful "distance"
      break;

    // Fallback for any unknown metrics
    default:
      // Assume similarity metric (score as-is)
      score = rawScore;
      distance = 1 - rawScore;
  }

  return { score, distance };
}

// Export MetricType for re-use in other modules
export { MetricType };
