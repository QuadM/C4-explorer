import { z } from "zod";

export const NodeTypeSchema = z.enum([
  "enterprise",
  "domain",
  "system",
  "container",
  "component",
  "module",
  "service",
]);

export const RelationshipTypeSchema = z.enum([
  "uses",
  "publishes",
  "consumes",
  "reads",
  "writes",
  "owns",
  "depends_on",
  "hosts",
  "communicates_with",
]);

export const RelationshipSchema = z.object({
  id: z.string(),
  sourceId: z.string(),
  targetId: z.string(),
  type: RelationshipTypeSchema,
  description: z.string().optional(),
  technology: z.string().optional(),
});

const baseNodeSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: NodeTypeSchema,
  description: z.string().optional(),
  technology: z.string().optional(),
  tags: z.array(z.string()).optional(),
  documentation: z.string().optional(),
  status: z.string().optional(),
  ownership: z.string().optional(),
  environment: z.string().optional(),
  relationships: z.array(RelationshipSchema).optional(),
});

// Define type for recursive children schema
type SchemaType = z.infer<typeof baseNodeSchema> & {
  children?: SchemaType[];
};

export const ArchitectureNodeSchema: z.ZodType<SchemaType> = baseNodeSchema.extend({
  children: z.lazy(() => z.array(ArchitectureNodeSchema).optional()),
});
