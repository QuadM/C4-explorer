import React, { memo } from "react";
import { Handle, Position } from "@xyflow/react";
import {
  Building2,
  Layers,
  Cpu,
  Database,
  Blocks,
  FolderGit2,
  CloudLightning,
  ChevronDown,
  ChevronUp,
  ExternalLink,
} from "lucide-react";
import { useArchitectureStore } from "../../store/architectureStore";
import { ArchitectureNode, NodeType } from "../../types";

const nodeConfig: Record<
  NodeType,
  {
    icon: React.ComponentType<{ className?: string }>;
    colorClass: string;
    borderClass: string;
    bgClass: string;
    textClass: string;
    badgeBg: string;
    label: string;
  }
> = {
  enterprise: {
    icon: Building2,
    colorClass: "from-blue-600 to-indigo-700",
    borderClass: "border-blue-500",
    bgClass: "bg-blue-950/40 backdrop-blur-md",
    textClass: "text-blue-100",
    badgeBg: "bg-blue-900/60 text-blue-200 border-blue-700",
    label: "Enterprise",
  },
  domain: {
    icon: Layers,
    colorClass: "from-purple-600 to-indigo-700",
    borderClass: "border-purple-500",
    bgClass: "bg-purple-950/40 backdrop-blur-md",
    textClass: "text-purple-100",
    badgeBg: "bg-purple-900/60 text-purple-200 border-purple-700",
    label: "Domain",
  },
  system: {
    icon: Cpu,
    colorClass: "from-emerald-600 to-teal-700",
    borderClass: "border-emerald-500",
    bgClass: "bg-emerald-950/40 backdrop-blur-md",
    textClass: "text-emerald-100",
    badgeBg: "bg-emerald-900/60 text-emerald-200 border-emerald-700",
    label: "System",
  },
  container: {
    icon: Database,
    colorClass: "from-amber-600 to-orange-700",
    borderClass: "border-amber-500",
    bgClass: "bg-amber-950/40 backdrop-blur-md",
    textClass: "text-amber-100",
    badgeBg: "bg-amber-900/60 text-amber-200 border-amber-700",
    label: "Container",
  },
  component: {
    icon: Blocks,
    colorClass: "from-cyan-600 to-teal-700",
    borderClass: "border-cyan-500",
    bgClass: "bg-cyan-950/40 backdrop-blur-md",
    textClass: "text-cyan-100",
    badgeBg: "bg-cyan-900/60 text-cyan-200 border-cyan-700",
    label: "Component",
  },
  module: {
    icon: FolderGit2,
    colorClass: "from-slate-500 to-slate-700",
    borderClass: "border-slate-400",
    bgClass: "bg-slate-900/40 backdrop-blur-md",
    textClass: "text-slate-100",
    badgeBg: "bg-slate-800/60 text-slate-200 border-slate-600",
    label: "Module",
  },
  service: {
    icon: CloudLightning,
    colorClass: "from-rose-600 to-red-700",
    borderClass: "border-rose-500",
    bgClass: "bg-rose-950/40 backdrop-blur-md",
    textClass: "text-rose-100",
    badgeBg: "bg-rose-900/60 text-rose-200 border-rose-700",
    label: "Service",
  },
};

interface CustomNodeProps {
  id: string;
  data: {
    node: ArchitectureNode;
    isExpanded: boolean;
    isSelected: boolean;
    isFiltered: boolean;
    isConnected: boolean;
    hasSelectedNode: boolean;
  };
}

export const CustomNode = memo(({ data }: CustomNodeProps) => {
  const { node, isExpanded, isSelected, isFiltered, isConnected, hasSelectedNode } = data;
  const drillDown = useArchitectureStore((state) => state.drillDown);
  const selectNode = useArchitectureStore((state) => state.selectNode);
  const toggleNodeExpanded = useArchitectureStore((state) => state.toggleNodeExpanded);

  const config = nodeConfig[node.type] || nodeConfig.module;
  const Icon = config.icon;

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (node.children && node.children.length > 0) {
      drillDown(node.id);
    }
  };

  const handleSingleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    selectNode(node.id);
  };

  const handleExpandToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggleNodeExpanded(node.id);
  };

  // Determine dimming effect if a node is filtered out or if another node is selected
  const isDimmed = !isFiltered || (hasSelectedNode && !isSelected && !isConnected);
  const opacityClass = isDimmed ? "opacity-30 blur-[0.5px]" : "opacity-100";
  const ringClass = isSelected
    ? `ring-2 ring-offset-2 ring-offset-slate-950 ring-white shadow-lg`
    : "";

  // Dynamic borders for expanded groups
  if (isExpanded) {
    return (
      <div
        className={`w-full h-full rounded-2xl border-2 border-dashed ${config.borderClass} ${config.bgClass} p-4 transition-all duration-300 relative group flex flex-col`}
        onClick={handleSingleClick}
      >
        {/* Handles for connections */}
        <Handle type="target" position={Position.Top} className="!bg-slate-400 opacity-20" />
        <Handle type="source" position={Position.Bottom} className="!bg-slate-400 opacity-20" />
        <Handle type="target" position={Position.Left} className="!bg-slate-400 opacity-20" />
        <Handle type="source" position={Position.Right} className="!bg-slate-400 opacity-20" />

        <div className="flex items-center justify-between border-b border-white/10 pb-2 mb-2 select-none">
          <div className="flex items-center gap-2">
            <Icon className={`w-5 h-5 ${config.textClass}`} />
            <div>
              <div className="text-[10px] uppercase tracking-wider font-semibold opacity-60">
                {config.label}
              </div>
              <div className="text-sm font-bold text-white leading-tight">
                {node.name}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {node.technology && (
              <span className={`text-[10px] px-2 py-0.5 rounded border font-mono ${config.badgeBg}`}>
                {node.technology}
              </span>
            )}
            <button
              onClick={handleExpandToggle}
              className="p-1 rounded bg-white/5 hover:bg-white/10 text-white transition-colors"
              title="Collapse Node"
            >
              <ChevronUp className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Children Rendered Inside (Controlled by React Flow Layout parentId) */}
        <div className="flex-1 min-h-0 pointer-events-none" />
      </div>
    );
  }

  return (
    <div
      onDoubleClick={handleDoubleClick}
      onClick={handleSingleClick}
      className={`w-[260px] h-[120px] rounded-xl border ${config.borderClass} ${config.bgClass} ${ringClass} ${opacityClass} p-3.5 flex flex-col justify-between cursor-pointer hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 relative shadow-xl hover:shadow-2xl overflow-hidden`}
    >
      {/* Glow highlight background */}
      <div className={`absolute -right-16 -top-16 w-32 h-32 bg-gradient-to-br ${config.colorClass} opacity-10 rounded-full blur-xl`} />

      {/* Handles */}
      <Handle type="target" position={Position.Top} className="!bg-slate-400 opacity-0" />
      <Handle type="source" position={Position.Bottom} className="!bg-slate-400 opacity-0" />
      <Handle type="target" position={Position.Left} className="!bg-slate-400 opacity-0" />
      <Handle type="source" position={Position.Right} className="!bg-slate-400 opacity-0" />

      {/* Header Info */}
      <div className="flex items-start justify-between select-none">
        <div className="flex items-center gap-2 min-w-0">
          <div className={`p-1.5 rounded-lg bg-white/5 ${config.textClass}`}>
            <Icon className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <span className="text-[9px] uppercase tracking-widest font-semibold opacity-50 block">
              {config.label}
            </span>
            <h3 className="text-xs font-bold text-white truncate max-w-[140px] leading-snug">
              {node.name}
            </h3>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {node.children && node.children.length > 0 && (
            <button
              onClick={handleExpandToggle}
              className="p-1 rounded bg-white/5 hover:bg-white/10 text-white transition-colors"
              title="Expand Node"
            >
              <ChevronDown className="w-3 h-3" />
            </button>
          )}
          {node.children && node.children.length > 0 && (
            <div className="p-1 rounded bg-white/5 text-white/50" title="Double click to drill down">
              <ExternalLink className="w-3 h-3" />
            </div>
          )}
        </div>
      </div>

      {/* Description Body */}
      <p className="text-[10px] text-slate-300 line-clamp-2 my-1 leading-normal select-none">
        {node.description || "No description provided."}
      </p>

      {/* Footer technology info */}
      <div className="flex items-center justify-between mt-0.5 select-none">
        {node.technology ? (
          <span className={`text-[9px] px-1.5 py-0.5 rounded border font-mono truncate max-w-[180px] ${config.badgeBg}`}>
            {node.technology}
          </span>
        ) : (
          <span />
        )}
        
        {node.tags && node.tags.length > 0 && (
          <span className="text-[8px] text-slate-400 font-mono">
            #{node.tags[0]}
          </span>
        )}
      </div>
    </div>
  );
});

CustomNode.displayName = "CustomNode";
