import React from "react";
import { useArchitectureStore } from "../store/architectureStore";
import { ChevronRight, Home } from "lucide-react";

export function Breadcrumbs() {
  const currentPath = useArchitectureStore((state) => state.currentPath);
  const setPath = useArchitectureStore((state) => state.setPath);
  const flatNodes = useArchitectureStore((state) => state.flatNodes);
  const rootNode = useArchitectureStore((state) => state.rootNode);

  // Navigate to root (path = [])
  const handleHomeClick = () => {
    setPath([]);
  };

  // Navigate to a specific level in the path
  const handleSegmentClick = (index: number) => {
    const newPath = currentPath.slice(0, index + 1);
    setPath(newPath);
  };

  return (
    <nav className="flex items-center gap-1.5 px-4 py-2 bg-slate-950 border-b border-slate-900 text-xs font-medium select-none text-slate-400 shrink-0">
      <button
        onClick={handleHomeClick}
        className="flex items-center gap-1 hover:text-white transition-colors py-1 px-1.5 rounded hover:bg-slate-900"
      >
        <Home className="w-3.5 h-3.5 text-slate-500" />
        <span className="font-semibold text-slate-300">
          {rootNode?.name || "Architecture"}
        </span>
      </button>

      {currentPath.map((nodeId, idx) => {
        const nodeEntry = flatNodes.get(nodeId);
        const name = nodeEntry?.node?.name || nodeId;

        return (
          <React.Fragment key={nodeId}>
            <ChevronRight className="w-3 h-3 text-slate-600 shrink-0" />
            <button
              onClick={() => handleSegmentClick(idx)}
              disabled={idx === currentPath.length - 1}
              className={`hover:text-white transition-colors py-1 px-1.5 rounded hover:bg-slate-900 truncate max-w-[150px] ${
                idx === currentPath.length - 1
                  ? "text-sky-400 pointer-events-none font-semibold"
                  : "text-slate-300"
              }`}
            >
              {name}
            </button>
          </React.Fragment>
        );
      })}
    </nav>
  );
}
export default Breadcrumbs;
