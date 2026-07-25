import React, { useState } from "react";
import { useArchitectureStore } from "../store/architectureStore";
import {
  Folder,
  ChevronRight,
  ChevronDown,
  Filter,
  Layers,
  FileDown,
  FileUp,
  RotateCcw,
  Tag,
  Monitor,
  User,
  Shield,
  Cpu,
  Building2,
  Database,
  Blocks,
  FolderGit2,
  CloudLightning,
} from "lucide-react";
import { NodeType, ArchitectureNode } from "../types";

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
  enterprise: "text-blue-400",
  domain: "text-purple-400",
  system: "text-emerald-400",
  container: "text-amber-400",
  component: "text-cyan-400",
  module: "text-slate-400",
  service: "text-rose-400",
};

// --- Recursive Tree Node Component ---
interface TreeItemProps {
  node: ArchitectureNode;
  depth: number;
}

const TreeItem = ({ node, depth }: TreeItemProps) => {
  const [isOpen, setIsOpen] = useState(depth < 2); // Auto-expand domains and systems
  const selectNode = useArchitectureStore((state) => state.selectNode);
  const toggleNodeExpanded = useArchitectureStore((state) => state.toggleNodeExpanded);
  const selectedNodeId = useArchitectureStore((state) => state.selectedNodeId);
  const currentPath = useArchitectureStore((state) => state.currentPath);

  const hasChildren = node.children && node.children.length > 0;
  const isSelected = selectedNodeId === node.id;
  const isActiveInPath = currentPath.includes(node.id);
  const Icon = iconMap[node.type as NodeType] || Folder;
  const colorClass = colorMap[node.type as NodeType] || "text-slate-400";

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsOpen(!isOpen);
  };

  const handleSelect = (e: React.MouseEvent) => {
    e.stopPropagation();
    selectNode(node.id);
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (hasChildren) {
      toggleNodeExpanded(node.id);
    }
  };

  return (
    <div className="select-none p-4">
      <div
        className={`flex items-center gap-1.5 py-1 px-2 rounded-lg text-xs cursor-pointer transition-colors duration-150 ${
          isSelected
            ? "bg-sky-500/20 text-white border border-sky-500/30"
            : isActiveInPath
            ? "bg-slate-800/60 text-slate-200"
            : "text-slate-400 hover:bg-slate-900 hover:text-slate-200"
        }`}
        style={{ paddingLeft: `${depth * 10 + 8}px` }}
        onClick={handleSelect}
        onDoubleClick={handleDoubleClick}
      >
        <span onClick={handleToggle} className="p-0.5 rounded hover:bg-white/5 transition-colors">
          {hasChildren ? (
            isOpen ? (
              <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
            ) : (
              <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
            )
          ) : (
            <span className="w-3.5 h-3.5 block" />
          )}
        </span>

        <Icon className={`w-3.5 h-3.5 ${colorClass}`} />
        <span className="truncate font-medium flex-1">{node.name}</span>
        {hasChildren && (
          <span className="text-[9px] px-1 rounded bg-slate-800 text-slate-500 font-semibold font-mono">
            {node.children?.length}
          </span>
        )}
      </div>

      {hasChildren && isOpen && (
        <div className="mt-0.5">
          {node.children?.map((child: ArchitectureNode) => (
            <TreeItem key={child.id} node={child} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
};

// --- Main Sidebar Component ---
export function Sidebar() {
  const [activeTab, setActiveTab] = useState<"explorer" | "filters" | "legend" | "sync">("explorer");

  const rootNode = useArchitectureStore((state) => state.rootNode);
  const filters = useArchitectureStore((state) => state.filters);
  const setFilters = useArchitectureStore((state) => state.setFilters);
  const resetFilters = useArchitectureStore((state) => state.resetFilters);
  const importData = useArchitectureStore((state) => state.importData);

  // Derived options
  const allTechnologies = useArchitectureStore((state) => state.allTechnologies);
  const allTags = useArchitectureStore((state) => state.allTags);
  const allOwnerships = useArchitectureStore((state) => state.allOwnerships);
  const allEnvironments = useArchitectureStore((state) => state.allEnvironments);
  const allTypes = useArchitectureStore((state) => state.allTypes);

  // Import error/success helper states
  const [importStatus, setImportStatus] = useState<{ error?: string; success?: boolean }>({});

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        const res = importData(json);
        if (res.success) {
          setImportStatus({ success: true });
        } else {
          setImportStatus({ error: res.error });
        }
      } catch {
        setImportStatus({ error: "Invalid JSON format." });
      }
    };
    reader.readAsText(file);
  };

  const handleExport = () => {
    if (!rootNode) return;
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(rootNode, null, 2));
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `architecture-${rootNode.id || "export"}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleFilterToggle = (key: keyof typeof filters, value: string | NodeType) => {
    const current = filters[key] as (string | NodeType)[];
    const updated = current.includes(value)
      ? current.filter((item) => item !== value)
      : [...current, value];
    setFilters({ [key]: updated });
  };

  return (
    <aside className="w-[340px] h-full flex flex-col bg-slate-950 border-r border-slate-900 text-slate-100 shrink-0 shadow-2xl relative z-10">
      {/* Sidebar Header */}
      <div className="p-4 border-b border-slate-900 flex items-center justify-between select-none">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-sky-500/20 flex items-center justify-center border border-sky-500/30">
            <Layers className="w-3.5 h-3.5 text-sky-400" />
          </div>
          <div>
            <h1 className="text-xs font-bold uppercase tracking-wider text-slate-200">C4 Explorer</h1>
            <span className="text-[9px] text-slate-500 font-mono">v1.0.0</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-900 text-xs font-semibold px-2 py-1 select-none">
        {(["explorer", "filters", "legend", "sync"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-1.5 capitalize rounded-lg transition-colors ${
              activeTab === tab
                ? "bg-slate-900 text-white font-medium shadow"
                : "text-slate-500 hover:text-slate-300"
            }`}
          >
            {tab === "sync" ? "Data" : tab}
          </button>
        ))}
      </div>

      {/* Tab Panels */}
      <div className="flex-1 overflow-y-auto p-4 min-h-0">
        {/* Tab 1: Explorer */}
        {activeTab === "explorer" && (
          <div className="space-y-4">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest select-none">
              Workspace Tree
            </h3>
            <div className="space-y-0.5 border-l border-slate-900 pl-1">
              {rootNode ? (
                <TreeItem node={rootNode} depth={0} />
              ) : (
                <div className="text-xs text-slate-600 italic select-none">
                  No architecture model loaded.
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 2: Filters */}
        {activeTab === "filters" && (
          <div className="space-y-5">
            <div className="flex items-center justify-between border-b border-slate-900 pb-2 select-none">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                <Filter className="w-3.5 h-3.5 text-sky-400" /> Filter View
              </h3>
              <button
                onClick={resetFilters}
                className="flex items-center gap-1 text-[10px] text-slate-500 hover:text-slate-300 transition-colors"
              >
                <RotateCcw className="w-3 h-3" /> Reset
              </button>
            </div>

            {/* Node Types filter */}
            {allTypes.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Node Types</h4>
                <div className="flex flex-wrap gap-1.5">
                  {allTypes.map((type) => {
                    const isActive = filters.types.includes(type);
                    return (
                      <button
                        key={type}
                        onClick={() => handleFilterToggle("types", type)}
                        className={`text-[9px] px-2 py-1 rounded-md border capitalize font-medium transition-all ${
                          isActive
                            ? "bg-slate-900 text-sky-400 border-sky-500/50 shadow-sm"
                            : "bg-transparent text-slate-400 border-slate-800 hover:border-slate-700"
                        }`}
                      >
                        {type}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Technologies filter */}
            {allTechnologies.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-[10px] uppercase font-bold text-slate-500 tracking-wider flex items-center gap-1">
                  <Monitor className="w-3 h-3 text-slate-600" /> Technologies
                </h4>
                <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto pr-1">
                  {allTechnologies.map((tech) => {
                    const isActive = filters.technologies.includes(tech);
                    return (
                      <button
                        key={tech}
                        onClick={() => handleFilterToggle("technologies", tech)}
                        className={`text-[9px] px-2 py-0.5 rounded-md border font-mono transition-all ${
                          isActive
                            ? "bg-slate-900 text-sky-400 border-sky-500/50"
                            : "bg-transparent text-slate-400 border-slate-800 hover:border-slate-700"
                        }`}
                      >
                        {tech}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Tags filter */}
            {allTags.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-[10px] uppercase font-bold text-slate-500 tracking-wider flex items-center gap-1">
                  <Tag className="w-3 h-3 text-slate-600" /> Tags
                </h4>
                <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto pr-1">
                  {allTags.map((tag) => {
                    const isActive = filters.tags.includes(tag);
                    return (
                      <button
                        key={tag}
                        onClick={() => handleFilterToggle("tags", tag)}
                        className={`text-[9px] px-2 py-0.5 rounded-md border font-mono transition-all ${
                          isActive
                            ? "bg-slate-900 text-sky-400 border-sky-500/50"
                            : "bg-transparent text-slate-400 border-slate-800 hover:border-slate-700"
                        }`}
                      >
                        #{tag}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Ownership filter */}
            {allOwnerships.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-[10px] uppercase font-bold text-slate-500 tracking-wider flex items-center gap-1">
                  <User className="w-3 h-3 text-slate-600" /> Ownership
                </h4>
                <div className="flex flex-wrap gap-1.5">
                  {allOwnerships.map((owner) => {
                    const isActive = filters.ownerships.includes(owner);
                    return (
                      <button
                        key={owner}
                        onClick={() => handleFilterToggle("ownerships", owner)}
                        className={`text-[9px] px-2 py-0.5 rounded-md border transition-all ${
                          isActive
                            ? "bg-slate-900 text-sky-400 border-sky-500/50"
                            : "bg-transparent text-slate-400 border-slate-800 hover:border-slate-700"
                        }`}
                      >
                        {owner}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Environments filter */}
            {allEnvironments.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-[10px] uppercase font-bold text-slate-500 tracking-wider flex items-center gap-1">
                  <Shield className="w-3 h-3 text-slate-600" /> Environment
                </h4>
                <div className="flex flex-wrap gap-1.5">
                  {allEnvironments.map((env) => {
                    const isActive = filters.environments.includes(env);
                    return (
                      <button
                        key={env}
                        onClick={() => handleFilterToggle("environments", env)}
                        className={`text-[9px] px-2 py-0.5 rounded-md border transition-all ${
                          isActive
                            ? "bg-slate-900 text-sky-400 border-sky-500/50"
                            : "bg-transparent text-slate-400 border-slate-800 hover:border-slate-700"
                        }`}
                      >
                        {env}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Legend */}
        {activeTab === "legend" && (
          <div className="space-y-5 select-none">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest border-b border-slate-900 pb-2">
              Visual Notation
            </h3>
            <div className="space-y-3.5">
              {(["enterprise", "domain", "system", "container", "component", "module", "service"] as NodeType[]).map((type) => {
                const label = type === "enterprise" ? "Enterprise" : type === "domain" ? "Domain" : type === "system" ? "Software System" : type === "container" ? "Container (e.g. DB, API)" : type === "component" ? "Component" : type === "module" ? "Module" : "Shared Service";
                const borderStyles: Record<NodeType, string> = {
                  enterprise: "border-blue-500 bg-blue-950/20",
                  domain: "border-purple-500 bg-purple-950/20",
                  system: "border-emerald-500 bg-emerald-950/20",
                  container: "border-amber-500 bg-amber-950/20",
                  component: "border-cyan-500 bg-cyan-950/20",
                  module: "border-slate-500 bg-slate-900/20",
                  service: "border-rose-500 bg-rose-950/20",
                };
                const Icon = iconMap[type];

                return (
                  <div key={type} className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg border flex items-center justify-center shrink-0 ${borderStyles[type]}`}>
                      <Icon className={`w-4 h-4 ${colorMap[type]}`} />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-300 capitalize">{type}</div>
                      <div className="text-[10px] text-slate-500">{label}</div>
                    </div>
                  </div>
                );
              })}

              <div className="border-t border-slate-900 pt-3 mt-1 space-y-2">
                <div className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Relationships</div>
                <div className="flex items-center gap-3">
                  <div className="w-8 flex flex-col gap-0.5 justify-center items-center">
                    <div className="w-6 border-t-2 border-dashed border-sky-500" />
                  </div>
                  <div className="text-[10px] text-slate-400">Uses / Communicates (Async/Sync)</div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-8 flex flex-col gap-0.5 justify-center items-center">
                    <div className="w-6 border-t-2 border-dashed border-indigo-500" />
                  </div>
                  <div className="text-[10px] text-slate-400">Publishes / Consumes Event Stream</div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-8 flex flex-col gap-0.5 justify-center items-center">
                    <div className="w-6 border-t-2 border-emerald-500 animate-pulse" />
                  </div>
                  <div className="text-[10px] text-slate-400">Owns / Hosts (Deployment Boundary)</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 4: Sync (Data IO) */}
        {activeTab === "sync" && (
          <div className="space-y-5">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest border-b border-slate-900 pb-2">
              Import & Export
            </h3>

            {/* Importer */}
            <div className="space-y-2">
              <label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider block">
                Load C4 JSON Model
              </label>
              <div className="flex flex-col items-center justify-center border-2 border-dashed border-slate-800 rounded-xl p-4 bg-slate-900/10 hover:bg-slate-900/35 hover:border-slate-700 transition-colors relative cursor-pointer group">
                <input
                  type="file"
                  accept=".json"
                  onChange={handleFileUpload}
                  className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                />
                <FileUp className="w-6 h-6 text-slate-500 group-hover:text-sky-400 transition-colors mb-1.5" />
                <span className="text-[10px] text-slate-400 font-medium">Click or Drag JSON here</span>
                <span className="text-[8px] text-slate-600 font-mono mt-0.5">Validates model schema</span>
              </div>

              {/* Status Indicator */}
              {importStatus.success && (
                <div className="text-[10px] px-3 py-1.5 rounded-lg bg-emerald-950/40 border border-emerald-800/60 text-emerald-400 font-medium">
                  Model loaded successfully!
                </div>
              )}
              {importStatus.error && (
                <div className="text-[9px] px-3 py-2 rounded-lg bg-rose-950/40 border border-rose-800/60 text-rose-400 font-mono break-words leading-tight whitespace-pre-wrap max-h-36 overflow-y-auto">
                  Import failed: {importStatus.error}
                </div>
              )}
            </div>

            {/* Exporter */}
            <div className="space-y-2 border-t border-slate-900 pt-4">
              <label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider block">
                Save & Backup
              </label>
              <button
                onClick={handleExport}
                className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg border border-slate-800 bg-slate-900/80 text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800 hover:border-slate-700 transition-colors shadow-md select-none"
              >
                <FileDown className="w-4 h-4 text-sky-400" />
                <span>Export JSON Model</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
export default Sidebar;
