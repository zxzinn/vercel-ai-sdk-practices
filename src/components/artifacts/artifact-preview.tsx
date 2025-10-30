"use client";

import { useEffect, useRef, useState } from "react";
import type { ArtifactSchema } from "@/lib/artifacts/schema";

interface ArtifactPreviewProps {
  artifact: ArtifactSchema;
}

export function ArtifactPreview({ artifact }: ArtifactPreviewProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!iframeRef.current) return;

    try {
      const iframe = iframeRef.current;
      const iframeDoc =
        iframe.contentDocument || iframe.contentWindow?.document;

      if (!iframeDoc) {
        setError("Unable to access iframe document");
        return;
      }

      let content = "";

      switch (artifact.type) {
        case "code/html":
          content = artifact.code;
          break;

        case "code/react": {
          content = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <script crossorigin src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
  <script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>
  <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    body { margin: 0; padding: 16px; font-family: system-ui, -apple-system, sans-serif; }
    * { box-sizing: border-box; }
  </style>
</head>
<body>
  <div id="root"></div>
  <script type="text/babel">
    ${artifact.code}

    const root = ReactDOM.createRoot(document.getElementById('root'));
    root.render(<Component />);
  </script>
</body>
</html>`;
          break;
        }

        case "code/svg":
          content = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { margin: 0; padding: 16px; display: flex; justify-content: center; align-items: center; min-height: 100vh; background: #f5f5f5; }
    svg { max-width: 100%; height: auto; }
  </style>
</head>
<body>
  ${artifact.code}
</body>
</html>`;
          break;

        case "text/markdown":
        case "text/plain":
          content = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body {
      margin: 0;
      padding: 24px;
      font-family: system-ui, -apple-system, sans-serif;
      line-height: 1.6;
      max-width: 800px;
      margin: 0 auto;
    }
    pre {
      background: #f5f5f5;
      padding: 12px;
      border-radius: 6px;
      overflow-x: auto;
    }
    code {
      background: #f5f5f5;
      padding: 2px 6px;
      border-radius: 3px;
      font-size: 0.9em;
    }
  </style>
</head>
<body>
  <pre>${artifact.code.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</pre>
</body>
</html>`;
          break;

        case "code/javascript":
        case "code/typescript":
        case "code/python":
          content = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body {
      margin: 0;
      padding: 24px;
      font-family: 'Monaco', 'Menlo', 'Courier New', monospace;
      background: #1e1e1e;
      color: #d4d4d4;
    }
    pre {
      margin: 0;
      white-space: pre-wrap;
      word-wrap: break-word;
    }
  </style>
</head>
<body>
  <pre>${artifact.code.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</pre>
</body>
</html>`;
          break;

        default:
          setError(`Unsupported artifact type: ${artifact.type}`);
          return;
      }

      iframeDoc.open();
      iframeDoc.write(content);
      iframeDoc.close();
      setError(null);
    } catch (err) {
      console.error("Error rendering artifact:", err);
      setError(err instanceof Error ? err.message : "Rendering error");
    }
  }, [artifact]);

  if (error) {
    return (
      <div className="flex items-center justify-center h-full p-6 bg-destructive/10">
        <div className="text-center">
          <p className="text-sm font-medium text-destructive mb-2">
            Preview Error
          </p>
          <p className="text-xs text-muted-foreground">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <iframe
      ref={iframeRef}
      title={artifact.title}
      className="w-full h-full border-0"
      sandbox="allow-scripts allow-same-origin"
    />
  );
}
