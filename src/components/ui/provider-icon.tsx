import type { ComponentPropsWithoutRef } from "react";

interface ProviderIconProps extends Omit<ComponentPropsWithoutRef<"img">, "src"> {
  provider: string;
  size?: number;
}

const PROVIDER_LOGO_MAP: Record<string, string> = {
  // Vector Databases - Icon-only versions
  milvus:
    "https://raw.githubusercontent.com/milvus-io/artwork/master/icon/color/milvus-icon-color.svg",
  pinecone: "https://cdn.brandfetch.io/pinecone.io/w/400/h/400/",
  qdrant: "https://qdrant.tech/img/brand-resources-logos/logomark.svg",
  weaviate:
    "https://upload.wikimedia.org/wikipedia/commons/0/01/Weaviate_logo_%28no_text%29.svg",
  chroma:
    "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/svg/chroma.svg",
  // Embedding Providers - LobeHub CDN
  openai:
    "https://unpkg.com/@lobehub/icons-static-svg@latest/icons/openai.svg",
  cohere:
    "https://unpkg.com/@lobehub/icons-static-svg@latest/icons/cohere-color.svg",
  voyage:
    "https://unpkg.com/@lobehub/icons-static-svg@latest/icons/voyage-color.svg",
  google:
    "https://unpkg.com/@lobehub/icons-static-svg@latest/icons/google-color.svg",
  mistral:
    "https://unpkg.com/@lobehub/icons-static-svg@latest/icons/mistral-color.svg",
  // LLM Providers - LobeHub CDN
  alibaba:
    "https://unpkg.com/@lobehub/icons-static-svg@latest/icons/alibaba-color.svg",
  amazon:
    "https://unpkg.com/@lobehub/icons-static-svg@latest/icons/bedrock-color.svg",
  anthropic:
    "https://unpkg.com/@lobehub/icons-static-svg@latest/icons/claude-color.svg",
  deepseek:
    "https://unpkg.com/@lobehub/icons-static-svg@latest/icons/deepseek-color.svg",
  meta: "https://unpkg.com/@lobehub/icons-static-svg@latest/icons/meta-color.svg",
  perplexity:
    "https://unpkg.com/@lobehub/icons-static-svg@latest/icons/perplexity-color.svg",
  xai: "https://unpkg.com/@lobehub/icons-static-svg@latest/icons/xai.svg",
};

export function ProviderIcon({
  provider,
  size = 16,
  className,
  style,
  ...props
}: ProviderIconProps) {
  const normalizedProvider = provider.toLowerCase();
  const logoUrl = PROVIDER_LOGO_MAP[normalizedProvider];

  if (!logoUrl) {
    return null;
  }

  return (
    <img
      src={logoUrl}
      alt={`${provider} logo`}
      width={size}
      height={size}
      className={className}
      style={{ objectFit: "contain", ...style }}
      {...props}
    />
  );
}
