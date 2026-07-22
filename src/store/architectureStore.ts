import { create } from "zustand";
import {
  ArchitectureNode,
  Relationship,
  NodeType,
  LayoutType,
  Filters,
  SearchResult,
} from "../types";
import { ArchitectureNodeSchema } from "../lib/schema";

interface ArchitectureState {
  // Data State
  rootNode: ArchitectureNode | null;
  flatNodes: Map<string, { node: ArchitectureNode; path: string[] }>;
  allRelationships: Relationship[];

  // Filter Options (derived from data)
  allTechnologies: string[];
  allTags: string[];
  allOwnerships: string[];
  allStatuses: string[];
  allEnvironments: string[];
  allTypes: NodeType[];

  // UI State
  currentPath: string[]; // Node IDs from root down to active group
  selectedNodeId: string | null;
  layoutPreference: LayoutType;
  filters: Filters;
  searchQuery: string;
  expandedNodes: Set<string>;

  // Actions
  importData: (data: unknown) => { success: boolean; error?: string };
  setPath: (path: string[]) => void;
  drillDown: (nodeId: string) => void;
  navigateUp: () => void;
  selectNode: (nodeId: string | null) => void;
  setLayoutPreference: (layout: LayoutType) => void;
  toggleNodeExpanded: (nodeId: string) => void;
  expandAll: () => void;
  collapseAll: () => void;
  setFilters: (filters: Partial<Filters>) => void;
  resetFilters: () => void;
  setSearchQuery: (query: string) => void;

  // Selectors/Computed values
  getVisibleElements: () => {
    nodes: ArchitectureNode[];
    relationships: Relationship[];
  };
  getNodeById: (id: string) => ArchitectureNode | null;
  getAncestors: (id: string) => ArchitectureNode[];
  getSearchResults: () => SearchResult[];
}

// Trace ancestors helper
const findAncestors = (
  nodeId: string,
  flatNodes: Map<string, { node: ArchitectureNode; path: string[] }>
): ArchitectureNode[] => {
  const entry = flatNodes.get(nodeId);
  if (!entry) return [];
  return entry.path
    .map((pId) => flatNodes.get(pId)?.node)
    .filter((n): n is ArchitectureNode => !!n);
};

export const useArchitectureStore = create<ArchitectureState>((set, get) => {
  // Initial empty filter state
  const initialFilters: Filters = {
    technologies: [],
    tags: [],
    types: [],
    statuses: [],
    ownerships: [],
    environments: [],
  };

  return {
    rootNode: null,
    flatNodes: new Map(),
    allRelationships: [],
    allTechnologies: [],
    allTags: [],
    allOwnerships: [],
    allStatuses: [],
    allEnvironments: [],
    allTypes: [],

    currentPath: [],
    selectedNodeId: null,
    layoutPreference: "layered", // Default layout
    filters: initialFilters,
    searchQuery: "",
    expandedNodes: new Set(),

    importData: (data: unknown) => {
      const parsed = ArchitectureNodeSchema.safeParse(data);
      if (!parsed.success) {
        return { success: false, error: parsed.error.message };
      }

      const validatedData = parsed.data as ArchitectureNode;

      const flatNodes = new Map<string, { node: ArchitectureNode; path: string[] }>();
      const allRelationships: Relationship[] = [];
      const techSet = new Set<string>();
      const tagSet = new Set<string>();
      const ownershipSet = new Set<string>();
      const statusSet = new Set<string>();
      const envSet = new Set<string>();
      const typeSet = new Set<NodeType>();

      const traverse = (node: ArchitectureNode, path: string[]) => {
        flatNodes.set(node.id, { node, path });
        typeSet.add(node.type);

        if (node.technology) techSet.add(node.technology);
        if (node.tags) node.tags.forEach((t) => tagSet.add(t));
        if (node.ownership) ownershipSet.add(node.ownership);
        if (node.status) statusSet.add(node.status);
        if (node.environment) envSet.add(node.environment);

        if (node.relationships) {
          allRelationships.push(...node.relationships);
        }

        if (node.children) {
          node.children.forEach((child) => traverse(child, [...path, node.id]));
        }
      };

      traverse(validatedData, []);

      // Load layout preference from localStorage if client side
      let storedLayout: LayoutType = "layered";
      if (typeof window !== "undefined") {
        const saved = localStorage.getItem("c4-layout-preference");
        if (saved && ["layered", "force", "radial", "tree"].includes(saved)) {
          storedLayout = saved as LayoutType;
        }
      }

      set({
        rootNode: validatedData,
        flatNodes,
        allRelationships,
        allTechnologies: Array.from(techSet).sort(),
        allTags: Array.from(tagSet).sort(),
        allOwnerships: Array.from(ownershipSet).sort(),
        allStatuses: Array.from(statusSet).sort(),
        allEnvironments: Array.from(envSet).sort(),
        allTypes: Array.from(typeSet).sort(),
        currentPath: [], // start at root children
        selectedNodeId: null,
        layoutPreference: storedLayout,
        expandedNodes: new Set(),
        filters: initialFilters,
      });

      return { success: true };
    },

    setPath: (path: string[]) => {
      set({ currentPath: path, selectedNodeId: null });
    },

    drillDown: (nodeId: string) => {
      const { flatNodes } = get();
      const nodeEntry = flatNodes.get(nodeId);
      if (!nodeEntry) return;

      // The new path should be the node's full path + its own ID
      const newPath = [...nodeEntry.path, nodeId];
      set({ currentPath: newPath, selectedNodeId: null });
    },

    navigateUp: () => {
      const { currentPath } = get();
      if (currentPath.length === 0) return;
      set({ currentPath: currentPath.slice(0, -1), selectedNodeId: null });
    },

    selectNode: (nodeId: string | null) => {
      set({ selectedNodeId: nodeId });
    },

    setLayoutPreference: (layout: LayoutType) => {
      if (typeof window !== "undefined") {
        localStorage.setItem("c4-layout-preference", layout);
      }
      set({ layoutPreference: layout });
    },

    toggleNodeExpanded: (nodeId: string) => {
      const expanded = new Set(get().expandedNodes);
      if (expanded.has(nodeId)) {
        expanded.delete(nodeId);
      } else {
        expanded.add(nodeId);
      }
      set({ expandedNodes: expanded });
    },

    expandAll: () => {
      const { getVisibleElements } = get();
      const { nodes } = getVisibleElements();
      const expanded = new Set(get().expandedNodes);
      nodes.forEach((n) => {
        if (n.children && n.children.length > 0) {
          expanded.add(n.id);
        }
      });
      set({ expandedNodes: expanded });
    },

    collapseAll: () => {
      set({ expandedNodes: new Set() });
    },

    setFilters: (newFilters: Partial<Filters>) => {
      set((state) => ({
        filters: { ...state.filters, ...newFilters },
      }));
    },

    resetFilters: () => {
      set({ filters: initialFilters });
    },

    setSearchQuery: (query: string) => {
      set({ searchQuery: query });
    },

    getNodeById: (id: string) => {
      return get().flatNodes.get(id)?.node || null;
    },

    getAncestors: (id: string) => {
      return findAncestors(id, get().flatNodes);
    },

    // Gets elements that are active at the current path depth
    getVisibleElements: () => {
      const { rootNode, currentPath, flatNodes, expandedNodes, allRelationships } = get();
      if (!rootNode) return { nodes: [], relationships: [] };

      // Step 1: Find the parent node for the current level
      let activeParent: ArchitectureNode | null = rootNode;
      if (currentPath.length > 0) {
        const lastId = currentPath[currentPath.length - 1];
        activeParent = flatNodes.get(lastId)?.node || null;
      }

      if (!activeParent) return { nodes: [], relationships: [] };

      // Step 2: Extract active nodes at this level (including expanded children recursively)
      const nodesToRender: ArchitectureNode[] = [];
      const visibleNodeIds = new Set<string>();

      const addNodes = (node: ArchitectureNode, isRootLevel: boolean = false) => {
        const children = node.children || [];
        if (isRootLevel) {
          children.forEach((child) => {
            nodesToRender.push(child);
            visibleNodeIds.add(child.id);
            if (expandedNodes.has(child.id)) {
              addNodes(child, false);
            }
          });
        } else {
          children.forEach((child) => {
            nodesToRender.push(child);
            visibleNodeIds.add(child.id);
            if (expandedNodes.has(child.id)) {
              addNodes(child, false);
            }
          });
        }
      };

      // If currentPath is empty, we are looking at root children
      if (currentPath.length === 0) {
        // Render rootNode's children
        addNodes(rootNode, true);
      } else {
        // Render activeParent's children
        addNodes(activeParent, false);
      }

      // Step 3: Apply filter criteria to visible nodes
      // If a node matches the filters, we show it normally. 
      // If a node does NOT match, we either hide it or grey it out.
      // We will let the rendering component handle the "disabled" visual state,
      // but let's filter out nodes that fail the filters if we want to hide them entirely,
      // or flag them as "filteredOut".
      // Let's pass the nodes list and let the canvas handle the styling (dimming).
      // Here, we just return the full active tree set.

      // Step 4: Resolve and aggregate relationships at this active level
      // Trace source/target nodes to their visible ancestors in the rendered set.
      const getVisibleAncestor = (id: string): string | null => {
        if (visibleNodeIds.has(id)) return id;
        const entry = flatNodes.get(id);
        if (!entry) return null;
        for (let i = entry.path.length - 1; i >= 0; i--) {
          const ancestorId = entry.path[i];
          if (visibleNodeIds.has(ancestorId)) return ancestorId;
        }
        return null;
      };

      const relMap = new Map<string, Relationship[]>();
      allRelationships.forEach((rel) => {
        const visSrc = getVisibleAncestor(rel.sourceId);
        const visTar = getVisibleAncestor(rel.targetId);

        if (visSrc && visTar && visSrc !== visTar) {
          const key = `${visSrc}->${visTar}`;
          const list = relMap.get(key) || [];
          list.push(rel);
          relMap.set(key, list);
        }
      });

      const aggregatedRelationships: Relationship[] = [];
      relMap.forEach((rels, key) => {
        const [sourceId, targetId] = key.split("->");
        // Aggregate descriptions and technologies
        const descList = rels.map((r) => r.description).filter(Boolean);
        const techList = Array.from(new Set(rels.map((r) => r.technology).filter(Boolean)));
        
        aggregatedRelationships.push({
          id: `agg-${sourceId}-${targetId}`,
          sourceId,
          targetId,
          type: rels[0].type, // Take primary type
          description: descList.join(", "),
          technology: techList.join(", "),
        });
      });

      return {
        nodes: nodesToRender,
        relationships: aggregatedRelationships,
      };
    },

    getSearchResults: () => {
      const { flatNodes, searchQuery } = get();
      if (!searchQuery.trim()) return [];

      const query = searchQuery.toLowerCase();
      const results: SearchResult[] = [];

      flatNodes.forEach((entry, id) => {
        const { node, path } = entry;
        const matchesName = node.name.toLowerCase().includes(query);
        const matchesDesc = node.description?.toLowerCase().includes(query);
        const matchesTech = node.technology?.toLowerCase().includes(query);
        const matchesTags = node.tags?.some((t) => t.toLowerCase().includes(query));

        if (matchesName || matchesDesc || matchesTech || matchesTags) {
          results.push({
            id: node.id,
            name: node.name,
            type: node.type,
            description: node.description,
            technology: node.technology,
            tags: node.tags,
            path: [...path, id],
          });
        }
      });

      return results.slice(0, 50); // limit to 50 results
    },
  };
});
