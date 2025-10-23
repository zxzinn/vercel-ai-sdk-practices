import type { VectorProvider as VectorProviderType } from "@/generated/prisma";

// ============================================================================
// Type Definitions
// ============================================================================

export interface MetricTypeDefinition {
  id: string;
  name: string;
  description: string;
  range: string;
  interpretation: string;
  formula?: string;
}

export interface IndexTypeDefinition {
  id: string;
  name: string;
  description: string;
  storageOverhead: string;
  querySpeed: string;
  accuracy: string;
  useCases: string[];
  keyParameters?: Record<string, string>;
}

export interface VectorProviderDefinition {
  id: VectorProviderType;
  name: string;
  description: string;
  implemented: boolean;
  documentationUrl?: string;

  metricTypes: MetricTypeDefinition[];
  indexTypes: IndexTypeDefinition[];

  defaultConfig: Record<string, unknown>;
  requiredFields: string[];

  features?: {
    filtering?: boolean;
    dynamicSchema?: boolean;
    multiTenancy?: boolean;
    hybridSearch?: boolean;
  };
}

// ============================================================================
// Milvus Provider
// ============================================================================

export const milvusProvider: VectorProviderDefinition = {
  id: "MILVUS",
  name: "Milvus / Zilliz Cloud",
  description:
    "Open-source vector database built for scalable similarity search",
  implemented: true,
  documentationUrl: "https://milvus.io/docs",

  metricTypes: [
    {
      id: "COSINE",
      name: "Cosine Similarity",
      description: "Measures the angle between vectors (angular similarity)",
      range: "[-1, 1]",
      interpretation: "Higher values indicate greater similarity",
      formula: "cos(θ) = (A·B) / (||A|| ||B||)",
    },
    {
      id: "IP",
      name: "Inner Product",
      description: "Dot product of two vectors",
      range: "[-1, 1]",
      interpretation: "Higher values indicate greater similarity",
      formula: "∑(aᵢ × bᵢ)",
    },
    {
      id: "L2",
      name: "Euclidean Distance",
      description: "Straight-line distance between vectors",
      range: "[0, ∞)",
      interpretation: "Lower values indicate greater similarity",
      formula: "√∑(aᵢ - bᵢ)²",
    },
    {
      id: "HAMMING",
      name: "Hamming Distance",
      description: "Count of differing bits (for binary vectors)",
      range: "[0, dimension]",
      interpretation: "Lower values indicate greater similarity",
    },
    {
      id: "JACCARD",
      name: "Jaccard Distance",
      description: "Set similarity for binary vectors",
      range: "[0, 1]",
      interpretation: "Lower values indicate greater similarity",
    },
  ],

  indexTypes: [
    {
      id: "FLAT",
      name: "Flat (Brute Force)",
      description: "No compression, guarantees exact search results",
      storageOverhead: "100%",
      querySpeed: "Slow",
      accuracy: "100% (Exact)",
      useCases: ["Small datasets (<10K vectors)", "Perfect accuracy required"],
    },
    {
      id: "HNSW",
      name: "Hierarchical Navigable Small World",
      description: "Graph-based index with multi-layer navigation",
      storageOverhead: "150-200%",
      querySpeed: "Very Fast",
      accuracy: ">95%",
      useCases: [
        "Real-time search applications",
        "High accuracy with speed",
        "Sufficient memory available",
      ],
      keyParameters: {
        M: "Max connections per node (default: 16)",
        efConstruction: "Build-time search depth (default: 200)",
      },
    },
    {
      id: "IVF_FLAT",
      name: "Inverted File with Flat",
      description:
        "Partitions data into clusters, exact search within clusters",
      storageOverhead: "~100%",
      querySpeed: "Fast",
      accuracy: ">90%",
      useCases: [
        "Balanced speed and accuracy",
        "Large datasets (>100K vectors)",
        "Moderate memory available",
      ],
      keyParameters: {
        nlist: "Number of clusters (default: 128)",
        nprobe: "Clusters to search (default: 8)",
      },
    },
    {
      id: "IVF_SQ8",
      name: "IVF with Scalar Quantization",
      description: "8-bit quantization for 70-75% memory reduction",
      storageOverhead: "25-30%",
      querySpeed: "Fast",
      accuracy: ">85%",
      useCases: [
        "Memory-constrained environments",
        "Large datasets with acceptable precision loss",
        "Cost optimization",
      ],
      keyParameters: {
        nlist: "Number of clusters (default: 128)",
        nprobe: "Clusters to search (default: 8)",
      },
    },
    {
      id: "IVF_PQ",
      name: "IVF with Product Quantization",
      description: "Aggressive compression using product quantization",
      storageOverhead: "10-20%",
      querySpeed: "Fast",
      accuracy: ">80%",
      useCases: [
        "Very large datasets (millions of vectors)",
        "Extreme memory constraints",
        "Acceptable accuracy trade-off",
      ],
      keyParameters: {
        nlist: "Number of clusters",
        m: "Number of sub-vectors",
        nbits: "Bits per sub-vector",
      },
    },
    {
      id: "SCANN",
      name: "SCANN (Google)",
      description: "IVF_PQ optimized with SIMD instructions",
      storageOverhead: "10-20%",
      querySpeed: "Very Fast",
      accuracy: ">90%",
      useCases: [
        "High-performance requirements",
        "Large-scale production systems",
        "Modern CPU architectures",
      ],
    },
  ],

  defaultConfig: {
    database: "default",
    indexType: "HNSW",
    metricType: "COSINE",
    M: 16,
    efConstruction: 200,
  },

  requiredFields: ["url", "token"],

  features: {
    filtering: true,
    dynamicSchema: true,
    multiTenancy: true,
    hybridSearch: true,
  },
};

// ============================================================================
// Other Providers (Placeholders)
// ============================================================================

export const pineconeProvider: VectorProviderDefinition = {
  id: "PINECONE",
  name: "Pinecone",
  description: "Fully managed vector database with automatic scaling",
  implemented: false,
  documentationUrl: "https://docs.pinecone.io",

  metricTypes: [
    {
      id: "COSINE",
      name: "Cosine Similarity",
      description: "Measures angular similarity between vectors",
      range: "[-1, 1]",
      interpretation: "Higher values indicate greater similarity",
    },
    {
      id: "EUCLIDEAN",
      name: "Euclidean Distance",
      description: "Straight-line distance between vectors",
      range: "[0, ∞)",
      interpretation: "Lower values indicate greater similarity",
    },
    {
      id: "DOTPRODUCT",
      name: "Dot Product",
      description: "Inner product of vectors",
      range: "(-∞, ∞)",
      interpretation: "Higher values indicate greater similarity",
    },
  ],

  indexTypes: [
    {
      id: "POD",
      name: "Pod-based Index",
      description: "Traditional performance-optimized deployment",
      storageOverhead: "N/A (Managed)",
      querySpeed: "Fast",
      accuracy: "High",
      useCases: ["Production workloads", "Predictable performance"],
    },
    {
      id: "SERVERLESS",
      name: "Serverless Index",
      description: "Auto-scaling serverless deployment",
      storageOverhead: "N/A (Managed)",
      querySpeed: "Fast",
      accuracy: "High",
      useCases: ["Development", "Variable workloads", "Cost optimization"],
    },
  ],

  defaultConfig: {
    metric: "cosine",
    pods: 1,
    replicas: 1,
  },

  requiredFields: ["apiKey", "environment"],

  features: {
    filtering: true,
    dynamicSchema: false,
    multiTenancy: true,
    hybridSearch: false,
  },
};

export const qdrantProvider: VectorProviderDefinition = {
  id: "QDRANT",
  name: "Qdrant",
  description: "High-performance vector search engine with extended filtering",
  implemented: false,
  documentationUrl: "https://qdrant.tech/documentation",

  metricTypes: [
    {
      id: "COSINE",
      name: "Cosine Similarity",
      description: "Angular similarity between vectors",
      range: "[-1, 1]",
      interpretation: "Higher values indicate greater similarity",
    },
    {
      id: "EUCLID",
      name: "Euclidean Distance",
      description: "L2 distance between vectors",
      range: "[0, ∞)",
      interpretation: "Lower values indicate greater similarity",
    },
    {
      id: "DOT",
      name: "Dot Product",
      description: "Inner product similarity",
      range: "(-∞, ∞)",
      interpretation: "Higher values indicate greater similarity",
    },
  ],

  indexTypes: [
    {
      id: "HNSW",
      name: "HNSW",
      description: "Default high-performance graph index",
      storageOverhead: "N/A",
      querySpeed: "Very Fast",
      accuracy: "High",
      useCases: ["General purpose", "High-speed search"],
    },
  ],

  defaultConfig: {
    metric: "Cosine",
  },

  requiredFields: ["url"],

  features: {
    filtering: true,
    dynamicSchema: true,
    multiTenancy: true,
    hybridSearch: true,
  },
};

export const weaviateProvider: VectorProviderDefinition = {
  id: "WEAVIATE",
  name: "Weaviate",
  description: "AI-native vector database with built-in ML models",
  implemented: false,
  documentationUrl: "https://weaviate.io/developers/weaviate",

  metricTypes: [
    {
      id: "COSINE",
      name: "Cosine Similarity",
      description: "Angular distance between vectors",
      range: "[0, 2]",
      interpretation: "Lower values indicate greater similarity",
    },
    {
      id: "L2_SQUARED",
      name: "Squared Euclidean",
      description: "Squared L2 distance",
      range: "[0, ∞)",
      interpretation: "Lower values indicate greater similarity",
    },
    {
      id: "DOT",
      name: "Dot Product",
      description: "Negative inner product",
      range: "(-∞, ∞)",
      interpretation: "Lower values indicate greater similarity",
    },
  ],

  indexTypes: [
    {
      id: "HNSW",
      name: "HNSW",
      description: "Default graph-based index",
      storageOverhead: "N/A",
      querySpeed: "Very Fast",
      accuracy: "High",
      useCases: ["General purpose", "Production workloads"],
    },
    {
      id: "FLAT",
      name: "Flat",
      description: "Brute force search for small datasets",
      storageOverhead: "N/A",
      querySpeed: "Slow",
      accuracy: "100%",
      useCases: ["Small datasets", "Perfect recall"],
    },
  ],

  defaultConfig: {
    metric: "cosine",
  },

  requiredFields: ["url"],

  features: {
    filtering: true,
    dynamicSchema: true,
    multiTenancy: true,
    hybridSearch: true,
  },
};

export const chromaProvider: VectorProviderDefinition = {
  id: "CHROMA",
  name: "ChromaDB",
  description: "Simple, developer-friendly embedding database",
  implemented: false,
  documentationUrl: "https://docs.trychroma.com",

  metricTypes: [
    {
      id: "COSINE",
      name: "Cosine Similarity",
      description: "Angular similarity (default)",
      range: "[-1, 1]",
      interpretation: "Higher values indicate greater similarity",
    },
    {
      id: "L2",
      name: "Euclidean Distance",
      description: "L2 distance",
      range: "[0, ∞)",
      interpretation: "Lower values indicate greater similarity",
    },
    {
      id: "IP",
      name: "Inner Product",
      description: "Dot product similarity",
      range: "(-∞, ∞)",
      interpretation: "Higher values indicate greater similarity",
    },
  ],

  indexTypes: [
    {
      id: "HNSW",
      name: "HNSW",
      description: "Default efficient graph index",
      storageOverhead: "N/A",
      querySpeed: "Fast",
      accuracy: "High",
      useCases: ["General purpose", "Development"],
    },
  ],

  defaultConfig: {
    metric: "cosine",
  },

  requiredFields: [],

  features: {
    filtering: true,
    dynamicSchema: true,
    multiTenancy: false,
    hybridSearch: false,
  },
};

// ============================================================================
// Registry
// ============================================================================

export const VECTOR_PROVIDER_REGISTRY: VectorProviderDefinition[] = [
  milvusProvider,
  pineconeProvider,
  qdrantProvider,
  weaviateProvider,
  chromaProvider,
];

// ============================================================================
// Helper Functions
// ============================================================================

export function getVectorProvider(
  id: VectorProviderType,
): VectorProviderDefinition | undefined {
  return VECTOR_PROVIDER_REGISTRY.find((p) => p.id === id);
}

export function getImplementedProviders(): VectorProviderDefinition[] {
  return VECTOR_PROVIDER_REGISTRY.filter((p) => p.implemented);
}

export function getAllProviders(): VectorProviderDefinition[] {
  return VECTOR_PROVIDER_REGISTRY;
}

export function getMetricTypes(
  providerId: VectorProviderType,
): MetricTypeDefinition[] {
  const provider = getVectorProvider(providerId);
  return provider?.metricTypes || [];
}

export function getIndexTypes(
  providerId: VectorProviderType,
): IndexTypeDefinition[] {
  const provider = getVectorProvider(providerId);
  return provider?.indexTypes || [];
}
