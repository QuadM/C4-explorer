import React, { useEffect, useState, useTransition } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  ReactFlowProvider,
  useReactFlow,
  Panel,
  BackgroundVariant,
  Node,
  Edge,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { motion, AnimatePresence } from "framer-motion";
import { useArchitectureStore } from "../../store/architectureStore";
import { computeGraphLayout } from "../../lib/layout";
import { CustomNode } from "./CustomNode";
import { CustomEdge } from "./CustomEdge";
import { Maximize, Loader2 } from "lucide-react";

// Node and Edge types configuration
const nodeTypes = {
  c4Node: CustomNode,
};

const edgeTypes = {
  c4Edge: CustomEdge,
};

function GraphCanvasInner() {
  const { fitView } = useReactFlow();
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [isPending, setIsPending] = useState(false);

  const getVisibleElements = useArchitectureStore((state) => state.getVisibleElements);
  const currentPath = useArchitectureStore((state) => state.currentPath);
  const layoutPreference = useArchitectureStore((state) => state.layoutPreference);
  const expandedNodes = useArchitectureStore((state) => state.expandedNodes);
  const selectedNodeId = useArchitectureStore((state) => state.selectedNodeId);
  const filters = useArchitectureStore((state) => state.filters);
  const selectNode = useArchitectureStore((state) => state.selectNode);

  const rootNode = useArchitectureStore((state) => state.rootNode);

  // Compute graph layout asynchronously using ELK.js
  useEffect(() => {
    let isMounted = true;
    
    const runLayout = async () => {
      setIsPending(true);
      try {
        const visible = getVisibleElements();
        const layout = await computeGraphLayout(
          visible.nodes,
          visible.relationships,
          layoutPreference,
          expandedNodes,
          selectedNodeId,
          filters
        );
        
        if (!isMounted) return;
        
        setNodes(layout.nodes);
        setEdges(layout.edges);

        // Fit to screen with slight delay to allow rendering
        setTimeout(() => {
          if (isMounted) {
            fitView({ padding: 0.25, duration: 800 });
          }
        }, 50);
      } catch (error) {
        console.error("Layout error:", error);
      } finally {
        if (isMounted) {
          setIsPending(false);
        }
      }
    };
    
    runLayout();
    
    return () => {
      isMounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [getVisibleElements, rootNode, currentPath, layoutPreference, expandedNodes, selectedNodeId, filters]);

  // Click on background deselects node
  const handlePaneClick = () => {
    selectNode(null);
  };

  const handleFitView = () => {
    fitView({ padding: 0.25, duration: 600 });
  };

  const pathKey = currentPath.join("/");

  return (
    <div className="w-full h-full relative overflow-hidden bg-slate-950">
      {/* Loading Overlay */}
      {isPending && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-slate-950/40 backdrop-blur-[1px] pointer-events-none">
          <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900/80 border border-slate-800 shadow-2xl text-slate-200">
            <Loader2 className="w-4 h-4 animate-spin text-sky-400" />
            <span className="text-xs font-medium">Laying out...</span>
          </div>
        </div>
      )}

      {/* Animation wrapper for zoom/drill transitions */}
      <AnimatePresence mode="wait">
        <motion.div
          key={pathKey}
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 1.04 }}
          transition={{ duration: 0.35, ease: [0.25, 1, 0.5, 1] }}
          className="w-full h-full"
        >
          <ReactFlow
            nodes={nodes}
            edges={edges}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            onPaneClick={handlePaneClick}
            fitView
            minZoom={0.05}
            maxZoom={2}
            className="w-full h-full"
          >
            {/* Custom Grid */}
            <Background
              variant={BackgroundVariant.Dots}
              gap={16}
              size={1}
              color="rgba(148, 163, 184, 0.08)"
            />

            {/* Custom controls aligned bottom right */}
            <Controls
              showInteractive={false}
              className="!bg-slate-900/90 !border-slate-800 !shadow-lg [&>button]:!bg-transparent [&>button]:!border-slate-800 [&>button]:!text-slate-400 hover:[&>button]:!bg-slate-800 hover:[&>button]:!text-slate-200"
            />

            {/* Premium MiniMap aligned bottom left */}
            <MiniMap
              zoomable
              pannable
              className="!bg-slate-900/80 !border-slate-800/80 !shadow-xl !m-4 rounded-xl overflow-hidden [&_.react-flow__minimap-mask]:!fill-slate-950/60"
              nodeColor={(node: Node) => {
                const nodeData = node.data as { node?: { type?: string } };
                const type = nodeData?.node?.type;
                if (type === "enterprise") return "#3b82f6";
                if (type === "domain") return "#a855f7";
                if (type === "system") return "#10b981";
                if (type === "container") return "#f59e0b";
                if (type === "component") return "#06b6d4";
                if (type === "service") return "#f43f5e";
                return "#64748b";
              }}
              maskStrokeColor="#334155"
              maskStrokeWidth={1.5}
            />

            {/* Fit to View Quick Action */}
            <Panel position="top-right" className="flex items-center gap-2">
              <button
                onClick={handleFitView}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-800 bg-slate-900/90 text-xs text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-all shadow-md select-none font-medium"
                title="Fit to Screen"
              >
                <Maximize className="w-3.5 h-3.5" />
                <span>Fit View</span>
              </button>
            </Panel>

            {/* Interactive shortcuts info panel */}
            <Panel position="bottom-center" className="hidden lg:block select-none pointer-events-none">
              <div className="flex items-center gap-5 px-4 py-1.5 rounded-full border border-slate-900/60 bg-slate-950/80 backdrop-blur-md text-[10px] text-slate-500 font-medium">
                <span className="flex items-center gap-1"><kbd className="px-1 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-400 text-[9px]">Double-Click</kbd> Drill Down</span>
                <span className="flex items-center gap-1"><kbd className="px-1 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-400 text-[9px]">Single-Click</kbd> Inspect</span>
                <span className="flex items-center gap-1"><kbd className="px-1 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-400 text-[9px]">Backspace</kbd> Level Up</span>
                <span className="flex items-center gap-1"><kbd className="px-1 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-400 text-[9px]">/</kbd> Search</span>
              </div>
            </Panel>
          </ReactFlow>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

export function GraphCanvas() {
  return (
    <ReactFlowProvider>
      <GraphCanvasInner />
    </ReactFlowProvider>
  );
}
export default GraphCanvas;
