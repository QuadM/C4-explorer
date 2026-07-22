"use client";

import React, { useEffect, useRef, useState } from "react";

let mermaidInitialized = false;

interface MermaidProps {
  chart: string;
}

export default function Mermaid({ chart }: MermaidProps) {
  const [svg, setSvg] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const elementRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const renderChart = async () => {
      try {
        setError(null);
        // Dynamic import to prevent SSR issues
        const { default: mermaid } = await import("mermaid");

        if (!mermaidInitialized) {
          mermaid.initialize({
            startOnLoad: false,
            theme: "dark",
            securityLevel: "loose",
            themeVariables: {
              background: "#0f172a",
              primaryColor: "#1e293b",
              primaryTextColor: "#f1f5f9",
              lineColor: "#334155",
            },
          });
          mermaidInitialized = true;
        }

        const id = `mermaid-${Math.floor(Math.random() * 1000000)}`;
        const { svg: renderedSvg } = await mermaid.render(id, chart);
        setSvg(renderedSvg);
      } catch (err: unknown) {
        console.error("Mermaid render error:", err);
        setError(err instanceof Error ? err.message : "Failed to parse Mermaid syntax");
      }
    };

    renderChart();
  }, [chart]);

  if (error) {
    return (
      <div className="my-4">
        <div className="text-[10px] text-rose-400 font-bold mb-1">Mermaid Render Error</div>
        <pre className="text-[10px] text-slate-400 bg-slate-900 border border-slate-800 p-3 rounded-lg max-w-full overflow-x-auto font-mono whitespace-pre-wrap">
          {chart}
        </pre>
      </div>
    );
  }

  if (!svg) {
    return (
      <div className="my-4 flex items-center justify-center p-6 bg-slate-900/50 rounded-xl border border-slate-800/80">
        <span className="text-[10px] text-slate-500 font-mono animate-pulse">Generating Mermaid chart...</span>
      </div>
    );
  }

  return (
    <div
      ref={elementRef}
      className="flex justify-center my-4 p-4 bg-slate-900/50 rounded-xl border border-slate-800/80 overflow-x-auto max-w-full"
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
