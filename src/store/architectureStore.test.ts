import { describe, it, expect, beforeEach } from "vitest";
import { useArchitectureStore } from "../store/architectureStore";
import { sampleArchitecture } from "../data/sampleData";

// Helper: reset store state between tests
function resetStore() {
  useArchitectureStore.setState({
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
    layoutPreference: "layered",
    filters: { technologies: [], tags: [], types: [], statuses: [], ownerships: [], environments: [] },
    searchQuery: "",
    expandedNodes: new Set(),
  });
}

describe("Architecture Store", () => {
  beforeEach(() => {
    resetStore();
  });

  describe("importData", () => {
    it("loads the sample data and indexes all nodes", () => {
      const { importData } = useArchitectureStore.getState();
      const result = importData(sampleArchitecture);
      expect(result.success).toBe(true);

      const { flatNodes, rootNode } = useArchitectureStore.getState();
      expect(rootNode).not.toBeNull();
      expect(rootNode?.name).toBe("GlobalCorp Enterprise");
      // All nodes from the tree should be in flatNodes
      expect(flatNodes.size).toBeGreaterThan(10);
    });

    it("rejects invalid data", () => {
      const { importData } = useArchitectureStore.getState();
      const result = importData({ id: "bad", name: "Bad", type: "not-a-valid-type" });
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it("indexes technologies from all nodes", () => {
      const { importData } = useArchitectureStore.getState();
      importData(sampleArchitecture);
      const { allTechnologies } = useArchitectureStore.getState();
      expect(allTechnologies.length).toBeGreaterThan(0);
      expect(allTechnologies).toContain("PostgreSQL 15");
    });

    it("collects all relationships from the tree", () => {
      const { importData } = useArchitectureStore.getState();
      importData(sampleArchitecture);
      const { allRelationships } = useArchitectureStore.getState();
      expect(allRelationships.length).toBeGreaterThan(0);
    });

    it("records correct ancestor paths for nested nodes", () => {
      const { importData } = useArchitectureStore.getState();
      importData(sampleArchitecture);
      const { flatNodes } = useArchitectureStore.getState();

      // "cnt-ledger-api" is nested: enterprise > domain-banking > sys-ledger > cnt-ledger-api
      const entry = flatNodes.get("cnt-ledger-api");
      expect(entry).toBeDefined();
      expect(entry?.path).toContain("enterprise-root");
      expect(entry?.path).toContain("domain-banking");
      expect(entry?.path).toContain("sys-ledger");
    });
  });

  describe("navigation", () => {
    beforeEach(() => {
      const { importData } = useArchitectureStore.getState();
      importData(sampleArchitecture);
    });

    it("starts at the root level (empty path)", () => {
      const { currentPath } = useArchitectureStore.getState();
      expect(currentPath).toEqual([]);
    });

    it("drillDown sets the correct currentPath", () => {
      const { drillDown } = useArchitectureStore.getState();
      drillDown("domain-banking");
      const { currentPath } = useArchitectureStore.getState();
      expect(currentPath).toContain("domain-banking");
    });

    it("navigateUp removes the last segment", () => {
      const { drillDown, navigateUp } = useArchitectureStore.getState();
      drillDown("domain-banking");
      drillDown("sys-ledger");
      navigateUp();
      const { currentPath } = useArchitectureStore.getState();
      // Should still contain domain-banking, but not sys-ledger as leaf
      expect(currentPath[currentPath.length - 1]).not.toBe("sys-ledger");
    });

    it("setPath replaces path entirely", () => {
      const { setPath } = useArchitectureStore.getState();
      setPath(["enterprise-root", "domain-banking"]);
      const { currentPath } = useArchitectureStore.getState();
      expect(currentPath).toEqual(["enterprise-root", "domain-banking"]);
    });

    it("navigateUp does nothing when already at root", () => {
      const { navigateUp } = useArchitectureStore.getState();
      navigateUp();
      const { currentPath } = useArchitectureStore.getState();
      expect(currentPath).toEqual([]);
    });
  });

  describe("node selection", () => {
    beforeEach(() => {
      const { importData } = useArchitectureStore.getState();
      importData(sampleArchitecture);
    });

    it("selectNode sets the selectedNodeId", () => {
      const { selectNode } = useArchitectureStore.getState();
      selectNode("sys-ledger");
      expect(useArchitectureStore.getState().selectedNodeId).toBe("sys-ledger");
    });

    it("selectNode(null) clears selection", () => {
      const { selectNode } = useArchitectureStore.getState();
      selectNode("sys-ledger");
      selectNode(null);
      expect(useArchitectureStore.getState().selectedNodeId).toBeNull();
    });

    it("getNodeById returns the correct node", () => {
      const { getNodeById } = useArchitectureStore.getState();
      const node = getNodeById("sys-ledger");
      expect(node?.name).toBe("Core Ledger System");
    });

    it("getNodeById returns null for unknown id", () => {
      const { getNodeById } = useArchitectureStore.getState();
      expect(getNodeById("does-not-exist")).toBeNull();
    });
  });

  describe("search", () => {
    beforeEach(() => {
      const { importData } = useArchitectureStore.getState();
      importData(sampleArchitecture);
    });

    it("returns empty array for blank query", () => {
      useArchitectureStore.getState().setSearchQuery("");
      const results = useArchitectureStore.getState().getSearchResults();
      expect(results).toHaveLength(0);
    });

    it("finds nodes by name", () => {
      useArchitectureStore.getState().setSearchQuery("Ledger");
      const results = useArchitectureStore.getState().getSearchResults();
      expect(results.length).toBeGreaterThan(0);
      expect(results.some((r) => r.name.includes("Ledger"))).toBe(true);
    });

    it("finds nodes by technology", () => {
      useArchitectureStore.getState().setSearchQuery("Kafka");
      const results = useArchitectureStore.getState().getSearchResults();
      expect(results.length).toBeGreaterThan(0);
    });

    it("finds nodes by tag", () => {
      useArchitectureStore.getState().setSearchQuery("aml");
      const results = useArchitectureStore.getState().getSearchResults();
      expect(results.length).toBeGreaterThan(0);
    });

    it("returns path array for each result", () => {
      useArchitectureStore.getState().setSearchQuery("AML");
      const results = useArchitectureStore.getState().getSearchResults();
      expect(results[0]?.path).toBeDefined();
      expect(Array.isArray(results[0]?.path)).toBe(true);
    });
  });

  describe("expand/collapse", () => {
    beforeEach(() => {
      const { importData } = useArchitectureStore.getState();
      importData(sampleArchitecture);
    });

    it("toggleNodeExpanded adds node to expandedNodes", () => {
      const { toggleNodeExpanded } = useArchitectureStore.getState();
      toggleNodeExpanded("sys-ledger");
      expect(useArchitectureStore.getState().expandedNodes.has("sys-ledger")).toBe(true);
    });

    it("toggleNodeExpanded removes already-expanded node", () => {
      const { toggleNodeExpanded } = useArchitectureStore.getState();
      toggleNodeExpanded("sys-ledger");
      toggleNodeExpanded("sys-ledger");
      expect(useArchitectureStore.getState().expandedNodes.has("sys-ledger")).toBe(false);
    });

    it("collapseAll clears all expanded nodes", () => {
      const { toggleNodeExpanded, collapseAll } = useArchitectureStore.getState();
      toggleNodeExpanded("sys-ledger");
      toggleNodeExpanded("domain-banking");
      collapseAll();
      expect(useArchitectureStore.getState().expandedNodes.size).toBe(0);
    });
  });

  describe("filters", () => {
    beforeEach(() => {
      const { importData } = useArchitectureStore.getState();
      importData(sampleArchitecture);
    });

    it("setFilters merges with existing filters", () => {
      const { setFilters } = useArchitectureStore.getState();
      setFilters({ technologies: ["PostgreSQL 15"] });
      const { filters } = useArchitectureStore.getState();
      expect(filters.technologies).toContain("PostgreSQL 15");
      expect(filters.tags).toEqual([]);
    });

    it("resetFilters clears all filters", () => {
      const { setFilters, resetFilters } = useArchitectureStore.getState();
      setFilters({ technologies: ["Kafka"], types: ["container"] });
      resetFilters();
      const { filters } = useArchitectureStore.getState();
      expect(filters.technologies).toHaveLength(0);
      expect(filters.types).toHaveLength(0);
    });
  });
});
