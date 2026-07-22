import ELK, { ElkNode, ElkExtendedEdge } from "elkjs/lib/elk.bundled.js";
import { ArchitectureNode, Relationship, LayoutType } from "../types";
import { Node, Edge } from "@xyflow/react";

const elk = new ELK();

const DEFAULT_WIDTH = 260;
const DEFAULT_HEIGHT = 120;
const PADDING = 40;

interface LayoutResult {
  nodes: Node[];
  edges: Edge[];
}

export async function computeGraphLayout(
  nodes: ArchitectureNode[],
  relationships: Relationship[],
  layoutType: LayoutType,
  expandedNodes: Set<string>,
  selectedNodeId: string | null,
  filters: { technologies: string[]; tags: string[]; types: string[]; statuses: string[]; ownerships: string[]; environments: string[] }
): Promise<LayoutResult> {
  // Determine if a node matches the filters (if filters are active)
  const isFiltered = (node: ArchitectureNode): boolean => {
    // Check if any filter is active
    const hasTypeFilter = filters.types.length > 0;
    const hasTechFilter = filters.technologies.length > 0;
    const hasTagFilter = filters.tags.length > 0;
    const hasStatusFilter = filters.statuses.length > 0;
    const hasOwnershipFilter = filters.ownerships.length > 0;
    const hasEnvFilter = filters.environments.length > 0;

    const anyFilterActive =
      hasTypeFilter ||
      hasTechFilter ||
      hasTagFilter ||
      hasStatusFilter ||
      hasOwnershipFilter ||
      hasEnvFilter;

    if (!anyFilterActive) return true;

    if (hasTypeFilter && !filters.types.includes(node.type)) return false;
    if (hasTechFilter && (!node.technology || !filters.technologies.includes(node.technology))) return false;
    if (hasTagFilter && (!node.tags || !node.tags.some((t) => filters.tags.includes(t)))) return false;
    if (hasStatusFilter && (!node.status || !filters.statuses.includes(node.status))) return false;
    if (hasOwnershipFilter && (!node.ownership || !filters.ownerships.includes(node.ownership))) return false;
    if (hasEnvFilter && (!node.environment || !filters.environments.includes(node.environment))) return false;

    return true;
  };

  // Find parent ID for a node in the current visible list
  const getParentId = (nodeId: string): string | undefined => {
    // We look up if any ancestor of this node is in the visible list and expanded
    // Let's do this by checking the parent relations.
    // In our nodes list, we can find if there is an expanded node that has this node as a child.
    const parentNode = nodes.find((n) => n.children?.some((c) => c.id === nodeId));
    if (parentNode && expandedNodes.has(parentNode.id)) {
      return parentNode.id;
    }
    return undefined;
  };

  // 1. Build nodes for ELK
  // We represent nodes as a dictionary to attach children hierarchical layout.
  const elkNodesMap = new Map<string, ElkNode>();

  nodes.forEach((n) => {
    const isExpanded = expandedNodes.has(n.id);
    const elkNode: ElkNode = {
      id: n.id,
      width: isExpanded ? undefined : DEFAULT_WIDTH,
      height: isExpanded ? undefined : DEFAULT_HEIGHT,
      children: [],
      layoutOptions: {
        // Set layout options for individual nodes if needed
        "elk.padding": `[top=${PADDING},left=${PADDING},bottom=${PADDING},right=${PADDING}]`,
      },
    };
    elkNodesMap.set(n.id, elkNode);
  });

  // Assemble the hierarchy for ELK
  const elkRootChildren: ElkNode[] = [];
  nodes.forEach((n) => {
    const elkNode = elkNodesMap.get(n.id)!;
    const parentId = getParentId(n.id);
    if (parentId && elkNodesMap.has(parentId)) {
      const parentElkNode = elkNodesMap.get(parentId)!;
      parentElkNode.children = parentElkNode.children || [];
      parentElkNode.children.push(elkNode);
    } else {
      elkRootChildren.push(elkNode);
    }
  });

  // 2. Build edges for ELK
  const elkEdges: ElkExtendedEdge[] = relationships.map((rel) => ({
    id: rel.id,
    sources: [rel.sourceId],
    targets: [rel.targetId],
  }));

  // Define layout algorithm and spacing properties
  let algorithm = "layered";
  if (layoutType === "force") algorithm = "stress";
  if (layoutType === "radial") algorithm = "radial";
  if (layoutType === "tree") algorithm = "mrvTree";

  const rootElkNode: ElkNode = {
    id: "root",
    children: elkRootChildren,
    edges: elkEdges,
    layoutOptions: {
      "elk.algorithm": algorithm,
      "elk.direction": "DOWN",
      "org.eclipse.elk.spacing.nodeNode": "60",
      "org.eclipse.elk.layered.spacing.nodeNode": "60",
      "org.eclipse.elk.layered.spacing.edgeNode": "40",
      "org.eclipse.elk.layered.spacing.edgeEdge": "30",
      "org.eclipse.elk.stress.desiredEdgeLength": "180",
      "org.eclipse.elk.radial.radius": "200",
      "elk.padding": `[top=${PADDING},left=${PADDING},bottom=${PADDING},right=${PADDING}]`,
    },
  };

  try {
    // Run layout
    const layout = await elk.layout(rootElkNode);

    // Flatten ELK tree back into React Flow nodes
    const rfNodes: Node[] = [];
    const flattenedElkNodes: { id: string; x: number; y: number; width?: number; height?: number }[] = [];

    const flatten = (node: ElkNode) => {
      if (node.id !== "root") {
        flattenedElkNodes.push({
          id: node.id,
          x: node.x || 0,
          y: node.y || 0,
          width: node.width,
          height: node.height,
        });
      }
      if (node.children) {
        node.children.forEach(flatten);
      }
    };

    flatten(layout);

    // Convert to React Flow Nodes
    flattenedElkNodes.forEach((elkN) => {
      const originalNode = nodes.find((n) => n.id === elkN.id)!;
      const isExpanded = expandedNodes.has(elkN.id);
      const parentId = getParentId(elkN.id);

      // Determine visual highlight/dim states
      const isNodeSelected = selectedNodeId === elkN.id;
      const isNodeFiltered = isFiltered(originalNode);

      // Check if this node is connected to the selected node
      let isConnected = false;
      if (selectedNodeId && selectedNodeId !== elkN.id) {
        isConnected = relationships.some(
          (rel) =>
            (rel.sourceId === selectedNodeId && rel.targetId === elkN.id) ||
            (rel.targetId === selectedNodeId && rel.sourceId === elkN.id)
        );
      }

      rfNodes.push({
        id: elkN.id,
        type: "c4Node",
        position: { x: elkN.x, y: elkN.y },
        parentId,
        // React Flow group node configurations
        style: isExpanded
          ? {
              width: elkN.width || DEFAULT_WIDTH,
              height: elkN.height || DEFAULT_HEIGHT,
            }
          : undefined,
        data: {
          node: originalNode,
          isExpanded,
          isSelected: isNodeSelected,
          isFiltered: isNodeFiltered,
          isConnected,
          hasSelectedNode: selectedNodeId !== null,
        },
      });
    });

    // Convert to React Flow Edges
    const rfEdges: Edge[] = relationships.map((rel) => {
      const isSelectedEdge = selectedNodeId !== null && (rel.sourceId === selectedNodeId || rel.targetId === selectedNodeId);
      const isDimmed = selectedNodeId !== null && !isSelectedEdge;

      return {
        id: rel.id,
        source: rel.sourceId,
        target: rel.targetId,
        type: "c4Edge",
        animated: true,
        data: {
          relationship: rel,
          isSelected: isSelectedEdge,
          isDimmed,
        },
      };
    });

    return { nodes: rfNodes, edges: rfEdges };
  } catch (error) {
    console.error("ELK layout failed, falling back to simple layout", error);
    
    // Simple fallback grid layout if ELK throws an error
    const rfNodes: Node[] = nodes.map((n, idx) => {
      const col = idx % 4;
      const row = Math.floor(idx / 4);
      const isNodeSelected = selectedNodeId === n.id;
      const isNodeFiltered = isFiltered(n);
      
      let isConnected = false;
      if (selectedNodeId && selectedNodeId !== n.id) {
        isConnected = relationships.some(
          (rel) =>
            (rel.sourceId === selectedNodeId && rel.targetId === n.id) ||
            (rel.targetId === selectedNodeId && rel.sourceId === n.id)
        );
      }

      return {
        id: n.id,
        type: "c4Node",
        position: { x: col * (DEFAULT_WIDTH + 80), y: row * (DEFAULT_HEIGHT + 80) },
        data: {
          node: n,
          isExpanded: false,
          isSelected: isNodeSelected,
          isFiltered: isNodeFiltered,
          isConnected,
          hasSelectedNode: selectedNodeId !== null,
        },
      };
    });

    const rfEdges: Edge[] = relationships.map((rel) => {
      const isSelectedEdge = selectedNodeId !== null && (rel.sourceId === selectedNodeId || rel.targetId === selectedNodeId);
      return {
        id: rel.id,
        source: rel.sourceId,
        target: rel.targetId,
        type: "c4Edge",
        animated: true,
        data: {
          relationship: rel,
          isSelected: isSelectedEdge,
          isDimmed: selectedNodeId !== null && !isSelectedEdge,
        },
      };
    });

    return { nodes: rfNodes, edges: rfEdges };
  }
}
