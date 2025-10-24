/**
 * Milvus Vector Metrics Utilities
 *
 * Handles normalization of Milvus distance/similarity metrics to a standard [0, 1] scale
 * where 1 represents most similar and 0 represents least similar.
 */

export type MilvusMetricType = "IP" | "L2" | "COSINE" | "HAMMING" | "JACCARD";

/**
 * Normalize Milvus metric score to standard [0, 1] similarity scale
 */
export function normalizeMetricScore(
  rawScore: number,
  metricType: MilvusMetricType = "COSINE",
): { score: number; distance: number } {
  let score: number;
  let distance: number;

  switch (metricType) {
    case "COSINE":
      // Cosine: Milvus returns similarity in [-1, 1], higher is better
      // Normalize to [0, 1] where 1 is most similar
      score = (rawScore + 1) / 2;
      distance = 1 - score;
      break;

    case "IP":
      // Inner Product: higher is better (already similarity)
      score = rawScore;
      distance = 1 - rawScore;
      break;

    case "L2":
      // Euclidean Distance: lower is better (already distance)
      // Convert to similarity: score = 1 / (1 + distance)
      distance = rawScore;
      score = 1 / (1 + distance);
      break;

    case "HAMMING":
    case "JACCARD":
      // Distance metrics: lower is better
      distance = rawScore;
      score = 1 / (1 + distance);
      break;

    default:
      // Fallback: assume similarity metric
      score = rawScore;
      distance = 1 - rawScore;
  }

  return { score, distance };
}
