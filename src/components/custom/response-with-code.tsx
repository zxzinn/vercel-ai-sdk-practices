"use client";

import { type ComponentProps, memo } from "react";
import { Streamdown } from "streamdown";
import { CodeBlock } from "@/components/ai-elements/code-block";
import { cn } from "@/lib/utils";

type ResponseWithCodeProps = ComponentProps<typeof Streamdown>;

export const ResponseWithCode = memo(
  ({ className, ...props }: ResponseWithCodeProps) => (
    <Streamdown
      className={cn(
        "size-full [&>*:first-child]:mt-0 [&>*:last-child]:mb-0",
        className,
      )}
      components={{
        code: ({ className, children, ...props }) => {
          const match = /language-(\w+)/.exec(className || "");
          const language = match ? match[1] : "";

          return language ? (
            <CodeBlock
              code={String(children).replace(/\n$/, "")}
              language={language}
              showLineNumbers={true}
            />
          ) : (
            <code className={className} {...props}>
              {children}
            </code>
          );
        },
      }}
      {...props}
    />
  ),
);

ResponseWithCode.displayName = "ResponseWithCode";
