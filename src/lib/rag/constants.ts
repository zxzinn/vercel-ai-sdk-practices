/**
 * RAG (Retrieval Augmented Generation) configuration constants
 * Centralized to ensure consistency across UI, API, and tool layers
 */

export const RAG_CONSTANTS = {
  /**
   * Number of document chunks to retrieve
   */
  TOP_K: {
    MIN: 1,
    MAX: 20,
    DEFAULT: 5,
  },

  /**
   * Minimum relevance score threshold for filtering results
   * 0 = no filtering, 1 = only perfect matches
   */
  SCORE_THRESHOLD: {
    MIN: 0,
    MAX: 1,
    DEFAULT: 0.3,
    STEP: 0.05,
  },
} as const;
