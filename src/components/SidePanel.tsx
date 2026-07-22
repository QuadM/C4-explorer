"use client";

import React, { useMemo } from "react";
import { useArchitectureStore } from "../store/architectureStore";
import {
  X,
  Info,
  Layers,
  ArrowRightLeft,
  ChevronRight,
  TrendingUp,
  Cpu,
  Building2,
  Database,
  Blocks,
  FolderGit2,
  CloudLightning,
  GitBranch,
  FileCode,
  Link,
} from "lucide-react";
import { NodeType, Relationship, ArchitectureNode } from "../types";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import rehypeSanitize from "rehype-sanitize";
import Mermaid from "./Mermaid";

const iconMap: Record<NodeType, React.ComponentType<{ className?: string }>> = {
  enterprise: Building2,
  domain: Layers,
  system: Cpu,
  container: Database,
  component: Blocks,
  module: FolderGit2,
  service: CloudLightning,
};

const colorMap: Record<NodeType, string> = {
  enterprise: "text-blue-400 border-blue-500 bg-blue-950/20",
  domain: "text-purple-400 border-purple-500 bg-purple-950/20",
  system: "text-emerald-400 border-emerald-500 bg-emerald-950/20",
  container: "text-amber-400 border-amber-500 bg-amber-950/20",
  component: "text-cyan-400 border-cyan-500 bg-cyan-950/20",
  module: "text-slate-400 border-slate-500 bg-slate-900/20",
  service: "text-rose-400 border-rose-500 bg-rose-950/20",
};

export function SidePanel() {
  const selectedNodeId = useArchitectureStore((state) => state.selectedNodeId);
  const selectNode = useArchitectureStore((state) => state.selectNode);
  const drillDown = useArchitectureStore((state) => state.drillDown);
  const getNodeById = useArchitectureStore((state) => state.getNodeById);
  const allRelationships = useArchitectureStore((state) => state.allRelationships);

  const selectedNode = useMemo(() => {
    return selectedNodeId ? getNodeById(selectedNodeId) : null;
  }, [selectedNodeId, getNodeById]);

  // Compute relationships connected to this node and its descendants
  const nodeConnections = useMemo(() => {
    if (!selectedNodeId || !selectedNode) return { inbound: [], outbound: [] };

    // Get all descendant IDs
    const descendantIds = new Set<string>([selectedNodeId]);
    const collectChildrenIds = (node: ArchitectureNode) => {
      if (node.children) {
        node.children.forEach((c: ArchitectureNode) => {
          descendantIds.add(c.id);
          collectChildrenIds(c);
        });
      }
    };
    collectChildrenIds(selectedNode);

    const inbound: Relationship[] = [];
    const outbound: Relationship[] = [];

    allRelationships.forEach((rel) => {
      const isSrcDesc = descendantIds.has(rel.sourceId);
      const isTarDesc = descendantIds.has(rel.targetId);

      if (isSrcDesc && !isTarDesc) {
        outbound.push(rel);
      } else if (isTarDesc && !isSrcDesc) {
        inbound.push(rel);
      }
    });

    return { inbound, outbound };
  }, [selectedNodeId, selectedNode, allRelationships]);

  if (!selectedNode) {
    return (
      <div className="w-[380px] h-full bg-slate-950 border-l border-slate-900 flex flex-col items-center justify-center p-6 text-slate-500 select-none shrink-0 shadow-2xl relative z-10">
        <Info className="w-8 h-8 text-slate-700 mb-3" />
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">
          No Node Selected
        </h3>
        <p className="text-[10px] text-slate-600 text-center max-w-[200px] leading-normal">
          Click any card in the diagram to inspect its metadata, relationships, and technical documentation.
        </p>
      </div>
    );
  }

  const Icon = iconMap[selectedNode.type] || Info;
  const colorClass = colorMap[selectedNode.type] || "text-slate-400 border-slate-500 bg-slate-900/20";

  // Renderers for Markdown components
  const markdownComponents = {
    code({ inline, className, children, ...props }: React.HTMLAttributes<HTMLElement> & { inline?: boolean }) {
      const match = /language-(\w+)/.exec(className || "");
      const lang = match ? match[1] : "";
      const codeContent = String(children).replace(/\n$/, "");
      
      if (!inline && lang === "mermaid") {
        return <Mermaid chart={codeContent} />;
      }
      
      return inline ? (
        <code className="bg-slate-900 text-cyan-400 px-1 py-0.5 rounded font-mono text-[10px]" {...props}>
          {children}
        </code>
      ) : (
        <pre className="bg-slate-900 border border-slate-800 p-2.5 rounded-lg max-w-full overflow-x-auto font-mono text-[10px] text-slate-300 my-2">
          <code className={className} {...props}>
            {children}
          </code>
        </pre>
      );
    },
  };

  return (
    <div className="w-[420px] h-full bg-slate-950 border-l border-slate-900 flex flex-col text-slate-200 shrink-0 shadow-2xl relative z-10">
      {/* SidePanel Header */}
      <div className="p-4 border-b border-slate-900 flex items-center justify-between shrink-0 select-none">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className={`w-8 h-8 rounded-lg border flex items-center justify-center shrink-0 ${colorClass}`}>
            <Icon className="w-4.5 h-4.5" />
          </div>
          <div className="min-w-0">
            <span className="text-[9px] uppercase tracking-wider font-semibold text-slate-500 block leading-none mb-1">
              {selectedNode.type}
            </span>
            <h2 className="text-sm font-bold text-white leading-tight truncate max-w-[280px]">
              {selectedNode.name}
            </h2>
          </div>
        </div>
        <button
          onClick={() => selectNode(null)}
          className="p-1 rounded bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* SidePanel Content scroll container */}
      <div className="flex-1 overflow-y-auto p-5 space-y-6 min-h-0">
        {/* Core Metadata */}
        <div className="space-y-3">
          <div className="text-[10px] uppercase font-bold text-slate-500 tracking-wider select-none">Properties</div>
          <p className="text-xs text-slate-300 leading-normal font-sans">
            {selectedNode.description || "No description provided."}
          </p>

          <div className="grid grid-cols-2 gap-2 text-[10px] bg-slate-900/40 p-3 rounded-lg border border-slate-900">
            <div>
              <span className="text-slate-500 block font-medium">Technology:</span>
              <span className="font-mono text-slate-300 font-semibold">{selectedNode.technology || "N/A"}</span>
            </div>
            <div>
              <span className="text-slate-500 block font-medium">Status:</span>
              <span className={`capitalize font-semibold ${selectedNode.status === "active" ? "text-emerald-400" : "text-amber-400"}`}>
                {selectedNode.status || "active"}
              </span>
            </div>
            <div className="mt-1">
              <span className="text-slate-500 block font-medium">Ownership:</span>
              <span className="text-slate-300 font-semibold">{selectedNode.ownership || "N/A"}</span>
            </div>
            <div className="mt-1">
              <span className="text-slate-500 block font-medium">Environment:</span>
              <span className="text-slate-300 font-semibold capitalize">{selectedNode.environment || "production"}</span>
            </div>
          </div>

          {selectedNode.tags && selectedNode.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2 select-none">
              {selectedNode.tags.map((tag) => (
                <span key={tag} className="text-[9px] px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-400 font-mono">
                  #{tag}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Direct Children List */}
        {selectedNode.children && selectedNode.children.length > 0 && (
          <div className="space-y-2">
            <div className="text-[10px] uppercase font-bold text-slate-500 tracking-wider select-none">Children Elements</div>
            <div className="grid grid-cols-1 gap-1.5">
              {selectedNode.children.map((child) => {
                const ChildIcon = iconMap[child.type] || Info;
                const childColor = colorMap[child.type] || "text-slate-400 border-slate-500";
                
                return (
                  <div
                    key={child.id}
                    onClick={() => selectNode(child.id)}
                    className="flex items-center justify-between p-2 rounded-lg border border-slate-900 bg-slate-900/10 hover:bg-slate-900/40 hover:border-slate-800 text-xs cursor-pointer group transition-all duration-150"
                  >
                    <div className="flex items-center gap-2">
                      <div className={`p-1 rounded border ${childColor.split(" ")[0]} ${childColor.split(" ")[2]}`}>
                        <ChildIcon className="w-3.5 h-3.5" />
                      </div>
                      <span className="font-semibold text-slate-300 group-hover:text-white transition-colors">{child.name}</span>
                    </div>
                    {child.children && child.children.length > 0 && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          drillDown(child.id);
                        }}
                        className="p-1 rounded bg-slate-900/80 hover:bg-slate-800 text-slate-500 hover:text-slate-300 text-[10px] font-medium flex items-center gap-0.5 select-none"
                      >
                        Drill Down
                        <ChevronRight className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Relationships Panel */}
        <div className="space-y-4">
          <div className="text-[10px] uppercase font-bold text-slate-500 tracking-wider flex items-center gap-1 border-b border-slate-900 pb-1.5 select-none">
            <ArrowRightLeft className="w-3.5 h-3.5 text-sky-400" /> System Connections
          </div>

          {/* Outbound Connections */}
          <div className="space-y-2">
            <h4 className="text-[10px] font-bold text-slate-400 select-none uppercase">Outbound ({nodeConnections.outbound.length})</h4>
            {nodeConnections.outbound.length > 0 ? (
              <div className="space-y-2">
                {nodeConnections.outbound.map((rel) => {
                  const targetNode = getNodeById(rel.targetId);
                  const sourceNode = getNodeById(rel.sourceId);
                  return (
                    <div key={rel.id} className="text-xs bg-slate-900/20 border border-slate-900 p-2.5 rounded-lg space-y-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span onClick={() => selectNode(rel.sourceId)} className="font-semibold text-sky-400 hover:underline cursor-pointer">
                          {sourceNode?.name || rel.sourceId}
                        </span>
                        <span className="text-[10px] text-slate-500 font-mono">→</span>
                        <span onClick={() => selectNode(rel.targetId)} className="font-semibold text-sky-400 hover:underline cursor-pointer">
                          {targetNode?.name || rel.targetId}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-300 italic">{rel.description}</p>
                      {rel.technology && (
                        <span className="inline-block text-[8px] font-mono px-1 rounded bg-slate-900 border border-slate-800 text-slate-400">
                          {rel.technology}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-[10px] text-slate-600 italic select-none">No outbound relationships.</p>
            )}
          </div>

          {/* Inbound Connections */}
          <div className="space-y-2">
            <h4 className="text-[10px] font-bold text-slate-400 select-none uppercase">Inbound ({nodeConnections.inbound.length})</h4>
            {nodeConnections.inbound.length > 0 ? (
              <div className="space-y-2">
                {nodeConnections.inbound.map((rel) => {
                  const sourceNode = getNodeById(rel.sourceId);
                  const targetNode = getNodeById(rel.targetId);
                  return (
                    <div key={rel.id} className="text-xs bg-slate-900/20 border border-slate-900 p-2.5 rounded-lg space-y-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span onClick={() => selectNode(rel.sourceId)} className="font-semibold text-sky-400 hover:underline cursor-pointer">
                          {sourceNode?.name || rel.sourceId}
                        </span>
                        <span className="text-[10px] text-slate-500 font-mono">→</span>
                        <span onClick={() => selectNode(rel.targetId)} className="font-semibold text-sky-400 hover:underline cursor-pointer">
                          {targetNode?.name || rel.targetId}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-300 italic">{rel.description}</p>
                      {rel.technology && (
                        <span className="inline-block text-[8px] font-mono px-1 rounded bg-slate-900 border border-slate-800 text-slate-400">
                          {rel.technology}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-[10px] text-slate-600 italic select-none">No inbound relationships.</p>
            )}
          </div>
        </div>

        {/* Documentation Section */}
        {selectedNode.documentation && (
          <div className="space-y-2 border-t border-slate-900 pt-5">
            <div className="text-[10px] uppercase font-bold text-slate-500 tracking-wider flex items-center gap-1 select-none">
              <FileCode className="w-3.5 h-3.5 text-sky-400" /> Technical Documentation
            </div>
            <div className="text-xs text-slate-300 leading-relaxed max-w-full overflow-x-hidden font-sans
              [&_h1]:text-sm [&_h1]:font-bold [&_h1]:text-white [&_h1]:mt-4 [&_h1]:mb-2 [&_h1]:border-b [&_h1]:border-slate-900 [&_h1]:pb-1
              [&_h2]:text-xs [&_h2]:font-bold [&_h2]:text-slate-100 [&_h2]:mt-3 [&_h2]:mb-1.5
              [&_h3]:text-[11px] [&_h3]:font-bold [&_h3]:text-slate-200 [&_h3]:mt-2.5 [&_h3]:mb-1
              [&_p]:mb-3 [&_p]:text-slate-300
              [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:mb-3 [&_li]:mb-1
              [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:mb-3 [&_li]:mb-1
              [&_table]:w-full [&_table]:border-collapse [&_table]:my-3 [&_table]:text-[10px]
              [&_th]:border [&_th]:border-slate-800 [&_th]:bg-slate-900/60 [&_th]:p-1.5 [&_th]:text-left [&_th]:font-bold [&_th]:text-slate-200
              [&_td]:border [&_td]:border-slate-800 [&_td]:p-1.5 [&_td]:text-slate-300
              [&_a]:text-sky-400 [&_a]:hover:underline
            ">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                rehypePlugins={[rehypeRaw, rehypeSanitize]}
                components={markdownComponents}
              >
                {selectedNode.documentation}
              </ReactMarkdown>
            </div>
          </div>
        )}

        {/* Live Metrics Panel */}
        <div className="space-y-3 border-t border-slate-900 pt-5">
          <div className="text-[10px] uppercase font-bold text-slate-500 tracking-wider flex items-center gap-1 select-none">
            <TrendingUp className="w-3.5 h-3.5 text-sky-400" /> Diagnostics & Metrics
          </div>
          <div className="bg-slate-900/40 border border-slate-900 p-3.5 rounded-lg space-y-2.5 select-none">
            <div className="flex items-center justify-between text-[10px]">
              <span className="text-slate-400">Response SLA:</span>
              <span className="font-semibold text-emerald-400 font-mono">99.98% uptime (24ms p95)</span>
            </div>
            <div className="w-full bg-slate-950 h-1.5 rounded-full overflow-hidden">
              <div className="bg-emerald-500 h-full w-[94%]" />
            </div>
            <div className="flex items-center justify-between text-[9px] text-slate-500 font-mono">
              <span>Load: 420 req/s</span>
              <span>Memory: 1.2 GB</span>
            </div>
          </div>
        </div>

        {/* Plugins / DevOps Integrations */}
        <div className="space-y-3 border-t border-slate-900 pt-5">
          <div className="text-[10px] uppercase font-bold text-slate-500 tracking-wider flex items-center gap-1 select-none">
            <GitBranch className="w-3.5 h-3.5 text-sky-400" /> Devops Integrations
          </div>
          <div className="grid grid-cols-2 gap-2 text-[9px] select-none">
            <a href="#github" className="flex items-center gap-1.5 p-2 rounded bg-slate-900/40 border border-slate-900 hover:border-slate-800 text-slate-400 hover:text-slate-200 transition-colors">
              <GitBranch className="w-3 h-3 text-indigo-400" />
              <span>GitHub Repo</span>
            </a>
            <a href="#terraform" className="flex items-center gap-1.5 p-2 rounded bg-slate-900/40 border border-slate-900 hover:border-slate-800 text-slate-400 hover:text-slate-200 transition-colors">
              <Link className="w-3 h-3 text-purple-400" />
              <span>Terraform Resource</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
export default SidePanel;
