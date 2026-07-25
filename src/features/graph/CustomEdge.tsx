import React, { memo } from "react";
import { getBezierPath, EdgeLabelRenderer, BaseEdge, Position } from "@xyflow/react";
import { Relationship } from "../../types";
import { useArchitectureStore } from "../../store/architectureStore";

interface CustomEdgeProps {
  id: string;
  sourceX: number;
  sourceY: number;
  targetX: number;
  targetY: number;
  sourcePosition: Position;
  targetPosition: Position;
  markerEnd?: string;
  style?: React.CSSProperties;
  data?: { relationship: Relationship };
}

export const CustomEdge = memo(
  ({ id, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, markerEnd, style = {}, data }: CustomEdgeProps) => {
    const [edgePath, labelX, labelY] = getBezierPath({ sourceX, sourceY, sourcePosition, targetX, targetY, targetPosition });

    // Read selection state live — never stale from layout snapshots
    const selectedNodeId = useArchitectureStore((state) => state.selectedNodeId);

    if (!data) return <BaseEdge id={id} path={edgePath} />;

    const { relationship } = data;
    const isSelected = selectedNodeId !== null &&
      (relationship.sourceId === selectedNodeId || relationship.targetId === selectedNodeId);
    const isDimmed = selectedNodeId !== null && !isSelected;

    let strokeColor = "stroke-slate-500";
    if (relationship.type === "publishes" || relationship.type === "consumes") strokeColor = "stroke-indigo-500";
    else if (relationship.type === "reads" || relationship.type === "writes") strokeColor = "stroke-amber-500";
    else if (relationship.type === "owns" || relationship.type === "hosts") strokeColor = "stroke-emerald-500";
    else if (relationship.type === "uses" || relationship.type === "communicates_with") strokeColor = "stroke-sky-500";
    if (isSelected) strokeColor = "stroke-white";

    const animationClass = !isDimmed ? "animate-[dash_1.5s_linear_infinite]" : "";
    const opacityClass = isDimmed ? "opacity-15" : "opacity-75";

    return (
      <>
        {isSelected && (
          <path id={`${id}-glow`} className="fill-none stroke-blue-500/30 stroke-[6px] blur-sm pointer-events-none" d={edgePath} />
        )}
        <path
          id={id}
          className={`fill-none stroke-[2px] transition-all duration-300 pointer-events-auto cursor-pointer ${strokeColor} ${opacityClass} ${animationClass}`}
          style={{ strokeDasharray: isSelected ? "4,4" : relationship.type === "owns" || relationship.type === "hosts" ? undefined : "5,5", ...style }}
          d={edgePath}
          markerEnd={markerEnd}
        />
        {(relationship.description || relationship.technology) && (
          <EdgeLabelRenderer>
            <div
              style={{ position: "absolute", transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`, pointerEvents: "all" }}
              className={`flex flex-col items-center justify-center p-1.5 px-2.5 rounded-lg border border-slate-700/60 bg-slate-900/90 backdrop-blur-md text-[9px] font-medium leading-none select-none max-w-[150px] transition-all duration-300 shadow-md ${opacityClass} ${isSelected ? "border-slate-400 bg-slate-800" : "hover:border-slate-400 hover:scale-105"}`}
            >
              {relationship.description && (
                <span className="text-white text-center font-sans tracking-wide truncate max-w-[130px]">{relationship.description}</span>
              )}
              {relationship.technology && (
                <span className="text-slate-400 font-mono mt-0.5 text-[8px] truncate max-w-[130px]">[{relationship.technology}]</span>
              )}
            </div>
          </EdgeLabelRenderer>
        )}
      </>
    );
  }
);

CustomEdge.displayName = "CustomEdge";
export default CustomEdge;
