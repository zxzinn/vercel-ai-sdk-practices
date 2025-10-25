/**
 * L2 normalization (Euclidean normalization)
 * Converts a vector to unit length: ‖v‖ = 1
 *
 * Formula: v_normalized = v / ‖v‖
 * Where: ‖v‖ = sqrt(v₁² + v₂² + ... + vₙ²)
 *
 * After L2 normalization:
 * - Inner Product (IP) equals Cosine Similarity
 * - All metrics have consistent [0, 1] range after normalization
 * - Enables correct metric score interpretation
 */
export function normalizeL2(vector: number[]): number[] {
  // Calculate L2 norm (Euclidean length)
  const norm = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));

  // Avoid division by zero
  if (norm === 0) {
    return vector;
  }

  // Normalize each component
  return vector.map((val) => val / norm);
}

/**
 * Verify a vector is L2-normalized (unit length)
 * Returns the actual norm for debugging purposes
 */
export function getL2Norm(vector: number[]): number {
  return Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
}

/**
 * Check if a vector is approximately L2-normalized
 * (within floating-point precision tolerance)
 */
export function isL2Normalized(
  vector: number[],
  tolerance: number = 1e-6,
): boolean {
  const norm = getL2Norm(vector);
  return Math.abs(norm - 1) < tolerance;
}
