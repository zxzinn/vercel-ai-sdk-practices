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
      id: "BIN_FLAT",
      name: "Binary Flat",
      description: "Flat index for binary vectors",
      storageOverhead: "100%",
      querySpeed: "Slow",
      accuracy: "100% (Exact)",
      useCases: ["Binary vectors", "Small datasets"],
    },
    {
      id: "BIN_IVF_FLAT",
      name: "Binary IVF Flat",
      description: "IVF index for binary vectors",
      storageOverhead: "~100%",
      querySpeed: "Fast",
      accuracy: ">90%",
      useCases: ["Binary vectors", "Large datasets"],
    },
    {
      id: "DISKANN",
      name: "DiskANN",
      description: "Disk-based approximate nearest neighbor search",
      storageOverhead: "Low",
      querySpeed: "Fast",
      accuracy: ">90%",
      useCases: ["Very large datasets", "Limited memory"],
    },
    {
      id: "AUTOINDEX",
      name: "Auto Index",
      description: "Automatically selects the best index type",
      storageOverhead: "Varies",
      querySpeed: "Varies",
      accuracy: "High",
      useCases: ["General purpose", "Automatic optimization"],
    },
    {
      id: "ANNOY",
      name: "ANNOY",
      description: "Approximate nearest neighbors optimized for speed",
      storageOverhead: "Low",
      querySpeed: "Very Fast",
      accuracy: ">85%",
      useCases: ["Speed-critical applications", "Moderate accuracy needs"],
    },
    {
      id: "SPARSE_INVERTED_INDEX",
      name: "Sparse Inverted Index",
      description: "Inverted index for sparse vectors",
      storageOverhead: "Low",
      querySpeed: "Fast",
      accuracy: "High",
      useCases: ["Sparse vectors", "Text embeddings"],
    },
    {
      id: "SPARSE_WAND",
      name: "Sparse WAND",
      description: "Weak AND algorithm for sparse vectors",
      storageOverhead: "Low",
      querySpeed: "Very Fast",
      accuracy: "High",
      useCases: ["Sparse vectors", "Fast retrieval"],
    },
    {
      id: "GPU_FLAT",
      name: "GPU Flat",
      description: "GPU-accelerated brute force search",
      storageOverhead: "100%",
      querySpeed: "Very Fast",
      accuracy: "100% (Exact)",
      useCases: ["GPU available", "High-speed exact search"],
    },
    {
      id: "GPU_IVF_FLAT",
      name: "GPU IVF Flat",
      description: "GPU-accelerated IVF with flat compression",
      storageOverhead: "~100%",
      querySpeed: "Very Fast",
      accuracy: ">90%",
      useCases: ["GPU available", "Large datasets"],
    },
    {
      id: "GPU_IVF_PQ",
      name: "GPU IVF PQ",
      description: "GPU-accelerated IVF with product quantization",
      storageOverhead: "10-20%",
      querySpeed: "Very Fast",
      accuracy: ">80%",
      useCases: ["GPU available", "Memory optimization"],
    },
    {
      id: "GPU_IVF_SQ8",
      name: "GPU IVF SQ8",
      description: "GPU-accelerated IVF with scalar quantization",
      storageOverhead: "25-30%",
      querySpeed: "Very Fast",
      accuracy: ">85%",
      useCases: ["GPU available", "Balanced performance"],
    },
    {
      id: "GPU_BRUTE_FORCE",
      name: "GPU Brute Force",
      description: "GPU-accelerated exhaustive search",
      storageOverhead: "100%",
      querySpeed: "Very Fast",
      accuracy: "100% (Exact)",
      useCases: ["GPU available", "Perfect accuracy"],
    },
    {
      id: "GPU_CAGRA",
      name: "GPU CAGRA",
      description: "GPU-accelerated graph-based index",
      storageOverhead: "Varies",
      querySpeed: "Very Fast",
      accuracy: ">95%",
      useCases: ["GPU available", "High performance"],
    },
    {
      id: "RAFT_IVF_FLAT",
      name: "RAFT IVF Flat",
      description: "RAPIDS-accelerated IVF flat",
      storageOverhead: "~100%",
      querySpeed: "Very Fast",
      accuracy: ">90%",
      useCases: ["RAPIDS ecosystem", "GPU workloads"],
    },
    {
      id: "RAFT_IVF_PQ",
      name: "RAFT IVF PQ",
      description: "RAPIDS-accelerated IVF with product quantization",
      storageOverhead: "10-20%",
      querySpeed: "Very Fast",
      accuracy: ">80%",
      useCases: ["RAPIDS ecosystem", "Memory optimization"],
    },
    {
      id: "SCANN",
      name: "ScaNN",
      description: "Scalable approximate nearest neighbors",
      storageOverhead: "Low",
      querySpeed: "Very Fast",
      accuracy: ">90%",
      useCases: ["Large-scale search", "High throughput"],
    },
    {
      id: "STL_SORT",
      name: "STL Sort",
      description: "Sorted index for scalar fields",
      storageOverhead: "Low",
      querySpeed: "Fast",
      accuracy: "100% (Exact)",
      useCases: ["Scalar field indexing", "Range queries"],
    },
    {
      id: "Trie",
      name: "Trie",
      description: "Trie index for string fields",
      storageOverhead: "Varies",
      querySpeed: "Fast",
      accuracy: "100% (Exact)",
      useCases: ["String fields", "Prefix search"],
    },
    {
      id: "INVERTED",
      name: "Inverted Index",
      description: "Inverted index for scalar fields",
      storageOverhead: "Low",
      querySpeed: "Very Fast",
      accuracy: "100% (Exact)",
      useCases: ["Scalar filtering", "Fast lookups"],
    },
    {
      id: "BITMAP",
      name: "Bitmap Index",
      description: "Bitmap index for low-cardinality fields",
      storageOverhead: "Very Low",
      querySpeed: "Very Fast",
      accuracy: "100% (Exact)",
      useCases: ["Low cardinality", "Boolean fields"],
    },
    {
      id: "IVF_RABITQ",
      name: "IVF RABITQ",
      description: "IVF with residual-aware binary quantization",
      storageOverhead: "Very Low",
      querySpeed: "Fast",
      accuracy: ">85%",
      useCases: ["Extreme memory constraints", "Large datasets"],
    },
    {
      id: "MINHASH_LSH",
      name: "MinHash LSH",
      description: "Locality-sensitive hashing with MinHash",
      storageOverhead: "Low",
      querySpeed: "Very Fast",
      accuracy: ">80%",
      useCases: ["Set similarity", "Jaccard distance"],
    },
    {
      id: "RTREE",
      name: "R-Tree",
      description: "Spatial index for geometric data",
      storageOverhead: "Varies",
      querySpeed: "Fast",
      accuracy: "100% (Exact)",
      useCases: ["Geometric data", "Spatial queries"],
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
