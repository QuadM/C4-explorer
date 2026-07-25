import ELK, { ElkNode, ElkExtendedEdge } from "elkjs/lib/elk.bundled.js";
import { ArchitectureNode, Relationship, LayoutType } from "../types";
import { Node, Edge } from "@xyflow/react";

const elk = new ELK();

const DEFAULT_WIDTH = 260;
const DEFAULT_HEIGHT = 120;
const GROUP_HEADER_HEIGHT = 56;
const GROUP_PADDING = 36;
const ROOT_SPACING = 72;

interface LayoutResult {
  nodes: Node[];
  edges: Edge[];
}

function buildElkNode(node: ArchitectureNode, expandedNodes: Set<string>): ElkNode {
  const isExpanded = expandedNodes.has(node.id) && (node.children?.length ?? 0) > 0;

  if (!isExpanded) {
    return { id: node.id, width: DEFAULT_WIDTH, height: DEFAULT_HEIGHT };
  }

  const childElkNodes = (node.children ?? []).map((child) => buildElkNode(child, expandedNodes));

  return {
    id: node.id,
    children: childElkNodes,
    layoutOptions: {
      "elk.algorithm": "layered",
      "elk.direction": "RIGHT",
      "org.eclipse.elk.spacing.nodeNode": "40",
      "elk.padding": `[top=${GROUP_HEADER_HEIGHT},left=${GROUP_PADDING},bottom=72,right=${GROUP_PADDING}]`,
    },
  };
}

function flattenElkToRFNodes(
  elkNode: ElkNode,
  archNode: ArchitectureNode,
  expandedNodes: Set<string>,
  parentId: string | undefined,
  rfNodes: Node[],
  depth: number = 0
): void {
  const isExpanded = expandedNodes.has(elkNode.id) && (archNode.children?.length ?? 0) > 0;

  const rfNode: Node = {
    id: elkNode.id,
    type: "c4Node",
    position: { x: elkNode.x ?? 0, y: elkNode.y ?? 0 },
    ...(parentId ? { parentId, extent: "parent" as const } : {}),
    style: isExpanded
      ? { width: elkNode.width ?? DEFAULT_WIDTH, height: elkNode.height ?? DEFAULT_HEIGHT }
      : undefined,
    zIndex: depth,
    data: {
      node: archNode,
      isExpanded,
      isFiltered: true,
    },
  };

  rfNodes.push(rfNode);

  if (isExpanded && elkNode.children && archNode.children) {
    for (const childElk of elkNode.children) {
      const childArch = archNode.children.find((c) => c.id === childElk.id);
      if (childArch) {
        flattenElkToRFNodes(childElk, childArch, expandedNodes, elkNode.id, rfNodes, depth + 1);
      }
    }
  }
}

export async function computeGraphLayout(
  nodes: ArchitectureNode[],
  relationships: Relationship[],
  layoutType: LayoutType,
  expandedNodes: Set<string>,
  filters: { technologies: string[]; tags: string[]; types: string[]; statuses: string[]; ownerships: string[]; environments: string[] }
): Promise<LayoutResult> {
  const isFiltered = (node: ArchitectureNode): boolean => {
    const f = filters;
    const anyActive = f.types.length > 0 || f.technologies.length > 0 || f.tags.length > 0 ||
      f.statuses.length > 0 || f.ownerships.length > 0 || f.environments.length > 0;
    if (!anyActive) return true;
    if (f.types.length > 0 && !f.types.includes(node.type)) return false;
    if (f.technologies.length > 0 && (!node.technology || !f.technologies.includes(node.technology))) return false;
    if (f.tags.length > 0 && (!node.tags || !node.tags.some((t) => f.tags.includes(t)))) return false;
    if (f.statuses.length > 0 && (!node.status || !f.statuses.includes(node.status))) return false;
    if (f.ownerships.length > 0 && (!node.ownership || !f.ownerships.includes(node.ownership))) return false;
    if (f.environments.length > 0 && (!node.environment || !f.environments.includes(node.environment))) return false;
    return true;
  };

  // --- KEY FIX: filter flat node list to root-level only ---
  // getVisibleElements returns a FLAT list (parent + all expanded descendants).
  // buildElkNode already recurses into node.children, so we must only call it
  // for nodes that are NOT already a direct child of an expanded node in the list.
  const childIdsOfExpandedNodes = new Set<string>();
  nodes.forEach((n) => {
    if (expandedNodes.has(n.id) && n.children) {
      n.children.forEach((c) => childIdsOfExpandedNodes.add(c.id));
    }
  });
  const rootLevelNodes = nodes.filter((n) => !childIdsOfExpandedNodes.has(n.id));

  let algorithm = "layered";
  if (layoutType === "force") algorithm = "stress";
  if (layoutType === "radial") algorithm = "radial";
  if (layoutType === "tree") algorithm = "mrvTree";

  const rootChildren: ElkNode[] = rootLevelNodes.map((n) => buildElkNode(n, expandedNodes));

  // Collect all visible node ids (including nested expanded children)
  const collectAllIds = (elkNode: ElkNode, acc: Set<string>) => {
    acc.add(elkNode.id);
    if (elkNode.children) elkNode.children.forEach((c) => collectAllIds(c, acc));
  };
  const allVisibleIds = new Set<string>();
  rootChildren.forEach((c) => collectAllIds(c, allVisibleIds));

  const elkEdges: ElkExtendedEdge[] = relationships
    .filter((rel) => allVisibleIds.has(rel.sourceId) && allVisibleIds.has(rel.targetId))
    .map((rel) => ({ id: rel.id, sources: [rel.sourceId], targets: [rel.targetId] }));

  const rootElkNode: ElkNode = {
    id: "root",
    children: rootChildren,
    edges: elkEdges,
    layoutOptions: {
      "elk.algorithm": algorithm,
      "elk.direction": "DOWN",
      "org.eclipse.elk.spacing.nodeNode": `${ROOT_SPACING}`,
      "org.eclipse.elk.layered.spacing.nodeNode": `${ROOT_SPACING}`,
      "org.eclipse.elk.layered.spacing.edgeNode": "40",
      "org.eclipse.elk.layered.spacing.edgeEdge": "30",
      "org.eclipse.elk.stress.desiredEdgeLength": "200",
      "org.eclipse.elk.radial.radius": "220",
      "elk.padding": `[top=${GROUP_PADDING},left=${GROUP_PADDING},bottom=${GROUP_PADDING},right=${GROUP_PADDING}]`,
    },
  };

  try {
    const layout = await elk.layout(rootElkNode);
    const rfNodes: Node[] = [];

    for (const elkChild of layout.children ?? []) {
      const archNode = rootLevelNodes.find((n) => n.id === elkChild.id);
      if (archNode) {
        flattenElkToRFNodes(elkChild, archNode, expandedNodes, undefined, rfNodes);
      }
    }

    // Apply filter state
    rfNodes.forEach((rfN) => {
      const archNode = (rfN.data as { node: ArchitectureNode }).node;
      (rfN.data as { isFiltered: boolean }).isFiltered = isFiltered(archNode);
    });

    // React Flow requires parents before children in the node array
    // Since we set zIndex = depth during flattening, sorting by zIndex ensures correct ordering
    rfNodes.sort((a, b) => {
      const depthA = typeof a.zIndex === 'number' ? a.zIndex : 0;
      const depthB = typeof b.zIndex === 'number' ? b.zIndex : 0;
      return depthA - depthB;
    });

    const rfEdges: Edge[] = relationships
      .filter((rel) => allVisibleIds.has(rel.sourceId) && allVisibleIds.has(rel.targetId))
      .map((rel) => ({
        id: rel.id,
        source: rel.sourceId,
        target: rel.targetId,
        type: "c4Edge",
        animated: true,
        data: { relationship: rel },
      }));

    return { nodes: rfNodes, edges: rfEdges };
  } catch (error) {
    console.error("ELK layout failed, falling back to simple grid layout", error);

    const rfNodes: Node[] = rootLevelNodes.map((n, idx) => {
      const col = idx % 4;
      const row = Math.floor(idx / 4);
      return {
        id: n.id,
        type: "c4Node",
        position: { x: col * (DEFAULT_WIDTH + 80), y: row * (DEFAULT_HEIGHT + 80) },
        data: { node: n, isExpanded: false, isFiltered: isFiltered(n) },
      };
    });

    const rfEdges: Edge[] = relationships.map((rel) => ({
      id: rel.id,
      source: rel.sourceId,
      target: rel.targetId,
      type: "c4Edge",
      animated: true,
      data: { relationship: rel },
    }));

    return { nodes: rfNodes, edges: rfEdges };
  }
}
