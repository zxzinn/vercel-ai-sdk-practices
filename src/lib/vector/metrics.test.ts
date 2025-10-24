import { describe, expect, it } from "vitest";
import { type MilvusMetricType, normalizeMetricScore } from "./metrics";

describe("normalizeMetricScore", () => {
  describe("COSINE metric", () => {
    it("should normalize cosine similarity from [-1, 1] to [0, 1]", () => {
      const { score, distance } = normalizeMetricScore(1, "COSINE");
      expect(score).toBe(1); // (1 + 1) / 2 = 1
      expect(distance).toBe(0); // 1 - 1 = 0
    });

    it("should handle cosine score of 0", () => {
      const { score, distance } = normalizeMetricScore(0, "COSINE");
      expect(score).toBe(0.5); // (0 + 1) / 2 = 0.5
      expect(distance).toBe(0.5); // 1 - 0.5 = 0.5
    });

    it("should handle negative cosine scores", () => {
      const { score, distance } = normalizeMetricScore(-1, "COSINE");
      expect(score).toBe(0); // (-1 + 1) / 2 = 0
      expect(distance).toBe(1); // 1 - 0 = 1
    });

    it("should be default metric when not specified", () => {
      const withDefault = normalizeMetricScore(0.5);
      const withExplicit = normalizeMetricScore(0.5, "COSINE");
      expect(withDefault).toEqual(withExplicit);
    });
  });

  describe("IP (Inner Product) metric", () => {
    it("should treat score as similarity", () => {
      const { score, distance } = normalizeMetricScore(0.8, "IP");
      expect(score).toBe(0.8);
      expect(distance).toBeCloseTo(0.2, 10); // 1 - 0.8 = 0.2
    });

    it("should handle normalized vectors [0, 1]", () => {
      const { score, distance } = normalizeMetricScore(1, "IP");
      expect(score).toBe(1);
      expect(distance).toBe(0);
    });

    it("should handle zero inner product", () => {
      const { score, distance } = normalizeMetricScore(0, "IP");
      expect(score).toBe(0);
      expect(distance).toBe(1);
    });
  });

  describe("L2 (Euclidean Distance) metric", () => {
    it("should convert distance to similarity using formula: score = 1/(1+distance)", () => {
      const { score, distance } = normalizeMetricScore(1, "L2");
      expect(score).toBe(0.5); // 1 / (1 + 1) = 0.5
      expect(distance).toBe(1);
    });

    it("should give high score for small distances", () => {
      const { score } = normalizeMetricScore(0.1, "L2");
      expect(score).toBeCloseTo(0.909, 2); // 1 / (1 + 0.1) ≈ 0.909
    });

    it("should give low score for large distances", () => {
      const { score } = normalizeMetricScore(10, "L2");
      expect(score).toBeCloseTo(0.091, 2); // 1 / (1 + 10) ≈ 0.091
    });

    it("should handle zero distance (identical vectors)", () => {
      const { score, distance } = normalizeMetricScore(0, "L2");
      expect(score).toBe(1); // 1 / (1 + 0) = 1
      expect(distance).toBe(0);
    });
  });

  describe("JACCARD metric", () => {
    it("should convert jaccard distance to similarity: score = 1 - distance", () => {
      const { score, distance } = normalizeMetricScore(0.2, "JACCARD");
      expect(score).toBe(0.8); // 1 - 0.2 = 0.8
      expect(distance).toBe(0.2);
    });

    it("should handle perfect similarity (distance = 0)", () => {
      const { score, distance } = normalizeMetricScore(0, "JACCARD");
      expect(score).toBe(1);
      expect(distance).toBe(0);
    });

    it("should handle no similarity (distance = 1)", () => {
      const { score, distance } = normalizeMetricScore(1, "JACCARD");
      expect(score).toBe(0);
      expect(distance).toBe(1);
    });
  });

  describe("HAMMING metric", () => {
    it("should convert hamming distance to similarity using formula: score = 1/(1+distance)", () => {
      const { score, distance } = normalizeMetricScore(2, "HAMMING");
      expect(score).toBeCloseTo(1 / 3, 10); // 1 / (1 + 2) ≈ 0.333
      expect(distance).toBe(2);
    });

    it("should give high score for identical vectors (distance = 0)", () => {
      const { score, distance } = normalizeMetricScore(0, "HAMMING");
      expect(score).toBe(1); // 1 / (1 + 0) = 1
      expect(distance).toBe(0);
    });

    it("should give lower scores for larger hamming distances", () => {
      const score1 = normalizeMetricScore(1, "HAMMING").score;
      const score5 = normalizeMetricScore(5, "HAMMING").score;
      expect(score1).toBeGreaterThan(score5);
    });
  });

  describe("Type safety with MilvusMetricType", () => {
    it("should accept all valid metric types", () => {
      const metrics: MilvusMetricType[] = [
        "IP",
        "L2",
        "COSINE",
        "HAMMING",
        "JACCARD",
      ];

      metrics.forEach((metric) => {
        const result = normalizeMetricScore(0.5, metric);
        expect(result).toHaveProperty("score");
        expect(result).toHaveProperty("distance");
        expect(typeof result.score).toBe("number");
        expect(typeof result.distance).toBe("number");
      });
    });

    it("should return consistent properties for all metrics", () => {
      const result = normalizeMetricScore(0.5, "COSINE");
      expect(Object.keys(result).sort()).toEqual(["distance", "score"]);
      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.distance).toBeGreaterThanOrEqual(0);
    });
  });

  describe("Edge cases", () => {
    it("should handle very small positive values", () => {
      const { score, distance } = normalizeMetricScore(0.001, "COSINE");
      expect(score).toBeCloseTo(0.5005, 4);
      expect(distance).toBeCloseTo(0.4995, 4);
    });

    it("should handle very large values for L2 metric", () => {
      const { score } = normalizeMetricScore(1000, "L2");
      expect(score).toBeCloseTo(0.001, 3); // 1 / (1 + 1000) ≈ 0.001
      expect(score).toBeGreaterThan(0);
      expect(score).toBeLessThan(1);
    });

    it("should maintain consistent normalization across metrics", () => {
      const cosine = normalizeMetricScore(1, "COSINE");
      const l2 = normalizeMetricScore(0, "L2");
      const jaccard = normalizeMetricScore(0, "JACCARD");
      const hamming = normalizeMetricScore(0, "HAMMING");

      // All maximum similarity cases should return score = 1
      expect(cosine.score).toBe(1);
      expect(l2.score).toBe(1);
      expect(jaccard.score).toBe(1);
      expect(hamming.score).toBe(1);
    });
  });

  describe("Default metric behavior", () => {
    it("should use COSINE as default when metric type is omitted", () => {
      const defaultResult = normalizeMetricScore(0.5);
      const cosineResult = normalizeMetricScore(0.5, "COSINE");
      expect(defaultResult).toEqual(cosineResult);
    });

    it("should fallback to default normalization for unknown metric type", () => {
      // @ts-expect-error - Testing unknown metric type fallback
      const result = normalizeMetricScore(0.5, "UNKNOWN");
      // Should treat as similarity metric
      expect(result.score).toBe(0.5);
      expect(result.distance).toBe(0.5); // 1 - 0.5
    });
  });
});
