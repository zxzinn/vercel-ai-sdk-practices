import { describe, expect, it } from "vitest";
import { getL2Norm, isL2Normalized, normalizeL2 } from "./normalize";

describe("L2 Normalization", () => {
  describe("normalizeL2", () => {
    it("should normalize a simple 2D vector", () => {
      const vector = [3, 4];
      const normalized = normalizeL2(vector);

      // 3² + 4² = 25, so norm = 5
      // Normalized: [3/5, 4/5] = [0.6, 0.8]
      expect(normalized[0]).toBeCloseTo(0.6, 10);
      expect(normalized[1]).toBeCloseTo(0.8, 10);

      // Verify unit length
      const norm = getL2Norm(normalized);
      expect(norm).toBeCloseTo(1, 10);
    });

    it("should normalize a 3D vector", () => {
      const vector = [1, 1, 1];
      const normalized = normalizeL2(vector);

      // norm = sqrt(3) ≈ 1.732
      const expectedVal = 1 / Math.sqrt(3);
      expect(normalized[0]).toBeCloseTo(expectedVal, 10);
      expect(normalized[1]).toBeCloseTo(expectedVal, 10);
      expect(normalized[2]).toBeCloseTo(expectedVal, 10);

      // Verify unit length
      const norm = getL2Norm(normalized);
      expect(norm).toBeCloseTo(1, 10);
    });

    it("should handle high-dimensional vectors (like embeddings)", () => {
      // Simulate a 384-dimensional embedding
      const vector = Array(384).fill(0.1);
      const normalized = normalizeL2(vector);

      // All values should be equal after normalization
      const expectedVal = normalized[0];
      for (let i = 1; i < normalized.length; i++) {
        expect(normalized[i]).toBeCloseTo(expectedVal, 10);
      }

      // Verify unit length
      const norm = getL2Norm(normalized);
      expect(norm).toBeCloseTo(1, 10);
    });

    it("should handle zero vector", () => {
      const vector = [0, 0, 0];
      const normalized = normalizeL2(vector);

      // Zero vector should remain zero (avoid division by zero)
      expect(normalized).toEqual([0, 0, 0]);
    });

    it("should handle vectors with very small values", () => {
      const vector = [1e-10, 1e-10, 1e-10];
      const normalized = normalizeL2(vector);

      // Should still normalize correctly
      const norm = getL2Norm(normalized);
      expect(norm).toBeCloseTo(1, 9);
    });

    it("should handle vectors with large values", () => {
      const vector = [1e10, 1e10, 1e10];
      const normalized = normalizeL2(vector);

      // Should normalize correctly despite large values
      const norm = getL2Norm(normalized);
      expect(norm).toBeCloseTo(1, 9);
    });

    it("should handle negative values", () => {
      const vector = [-3, 4];
      const normalized = normalizeL2(vector);

      // norm = 5
      expect(normalized[0]).toBeCloseTo(-0.6, 10);
      expect(normalized[1]).toBeCloseTo(0.8, 10);

      const norm = getL2Norm(normalized);
      expect(norm).toBeCloseTo(1, 10);
    });

    it("should be idempotent (normalizing twice gives same result)", () => {
      const vector = [1, 2, 3, 4, 5];
      const normalized1 = normalizeL2(vector);
      const normalized2 = normalizeL2(normalized1);

      for (let i = 0; i < normalized1.length; i++) {
        expect(normalized2[i]).toBeCloseTo(normalized1[i], 10);
      }
    });
  });

  describe("getL2Norm", () => {
    it("should calculate correct L2 norm for 3-4-5 triangle", () => {
      const vector = [3, 4];
      const norm = getL2Norm(vector);
      expect(norm).toBeCloseTo(5, 10);
    });

    it("should return 1 for unit vector", () => {
      const vector = [1, 0, 0];
      const norm = getL2Norm(vector);
      expect(norm).toBeCloseTo(1, 10);
    });

    it("should return 0 for zero vector", () => {
      const vector = [0, 0, 0];
      const norm = getL2Norm(vector);
      expect(norm).toBe(0);
    });

    it("should handle high-dimensional vector norms", () => {
      // Vector where each component is 1
      const dim = 100;
      const vector = Array(dim).fill(1);
      const norm = getL2Norm(vector);
      // norm = sqrt(100) = 10
      expect(norm).toBeCloseTo(Math.sqrt(dim), 10);
    });
  });

  describe("isL2Normalized", () => {
    it("should identify normalized vectors", () => {
      const normalized = normalizeL2([1, 2, 3, 4, 5]);
      expect(isL2Normalized(normalized)).toBe(true);
    });

    it("should identify non-normalized vectors", () => {
      const vector = [1, 2, 3, 4, 5];
      expect(isL2Normalized(vector)).toBe(false);
    });

    it("should identify unit vector as normalized", () => {
      const vector = [1, 0, 0, 0];
      expect(isL2Normalized(vector)).toBe(true);
    });

    it("should respect custom tolerance", () => {
      // Create a vector with norm approximately 1.001
      // Vector [0.7071, 0.7071] has norm ≈ 1
      // Vector [0.707107, 0.707114] has norm ≈ 1.00001
      const vector = [0.707107, 0.707114];
      const norm = getL2Norm(vector);
      // norm ≈ 1.000009...

      // Should be normalized with relaxed tolerance
      expect(isL2Normalized(vector, 0.0001)).toBe(true);

      // Should not be normalized with strict tolerance
      expect(isL2Normalized(vector, 1e-8)).toBe(false);
    });

    it("should handle zero vector", () => {
      const vector = [0, 0, 0];
      // Zero vector has norm 0, not normalized
      expect(isL2Normalized(vector)).toBe(false);
    });
  });

  describe("IP equals COSINE for normalized vectors", () => {
    it("should produce identical vectors for orthogonal case", () => {
      const v1 = normalizeL2([1, 0, 0]);
      const v2 = normalizeL2([0, 1, 0]);

      // Dot product (IP) should be 0
      const ip = v1.reduce((sum, val, i) => sum + val * v2[i], 0);
      expect(ip).toBeCloseTo(0, 10);

      // Cosine should also be 0
      const norm1 = getL2Norm(v1);
      const norm2 = getL2Norm(v2);
      const cosine = ip / (norm1 * norm2);
      expect(cosine).toBeCloseTo(0, 10);

      // They should be equal
      expect(ip).toBeCloseTo(cosine, 10);
    });

    it("should produce identical values for identical vectors", () => {
      const vector = normalizeL2([1, 2, 3, 4, 5]);

      // Dot product with itself
      const ip = vector.reduce((sum, val) => sum + val * val, 0);
      expect(ip).toBeCloseTo(1, 10); // Should be 1 for unit vector

      // Cosine similarity with itself
      const norm1 = getL2Norm(vector);
      const norm2 = getL2Norm(vector);
      const cosine = ip / (norm1 * norm2);
      expect(cosine).toBeCloseTo(1, 10);

      expect(ip).toBeCloseTo(cosine, 10);
    });

    it("should show mathematical equivalence with various vectors", () => {
      const vectors = [
        [1, 0, 0, 0, 0],
        [1, 1, 0, 0, 0],
        [1, 1, 1, 0, 0],
        [1, 1, 1, 1, 0],
        [1, 1, 1, 1, 1],
        [-1, 0.5, -0.5, 0.2, 0.1],
      ];

      // For each pair of vectors
      for (let i = 0; i < vectors.length; i++) {
        for (let j = 0; j < vectors.length; j++) {
          const v1 = normalizeL2(vectors[i]);
          const v2 = normalizeL2(vectors[j]);

          // Calculate IP (dot product)
          const ip = v1.reduce((sum, val, k) => sum + val * v2[k], 0);

          // Calculate Cosine
          const norm1 = getL2Norm(v1);
          const norm2 = getL2Norm(v2);
          const cosine = ip / (norm1 * norm2);

          // For normalized vectors, IP should equal cosine
          expect(ip).toBeCloseTo(cosine, 8);
        }
      }
    });
  });
});
