export type NodeType =
  | "enterprise"
  | "domain"
  | "system"
  | "container"
  | "component"
  | "module"
  | "service";

export type RelationshipType =
  | "uses"
  | "publishes"
  | "consumes"
  | "reads"
  | "writes"
  | "owns"
  | "depends_on"
  | "hosts"
  | "communicates_with";

export interface Relationship {
  id: string;
  sourceId: string;
  targetId: string;
  type: RelationshipType;
  description?: string;
  technology?: string;
}

export interface ArchitectureNode {
  id: string;
  name: string;
  type: NodeType;
  description?: string;
  technology?: string;
  tags?: string[];
  documentation?: string; // Markdown content or reference
  status?: string; // e.g. "active", "deprecated", "proposed"
  ownership?: string; // e.g. "Core Team", "Billing Team", "Third Party"
  environment?: string; // e.g. "production", "staging", "development"
  children?: ArchitectureNode[];
  relationships?: Relationship[];
}

export type LayoutType = "layered" | "force" | "radial" | "tree";

export interface Filters {
  technologies: string[];
  tags: string[];
  types: NodeType[];
  statuses: string[];
  ownerships: string[];
  environments: string[];
}

export interface SearchResult {
  id: string;
  name: string;
  type: NodeType;
  description?: string;
  tags?: string[];
  technology?: string;
  path: string[]; // Path of ancestors up to this node, e.g. ['root', 'parent', 'node']
}
