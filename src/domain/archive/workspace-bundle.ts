import { z } from "zod";

export const workspaceBundleManifestSchema = z.object({
  documentType: z.literal("ideascope.bundle"), bundleVersion: z.literal(1),
  createdWith: z.string().min(1).max(80), exportedAt: z.iso.datetime(),
  workspaces: z.array(z.object({ workspaceId: z.string().min(1).max(200), title: z.string().min(1).max(300), path: z.string().regex(/^workspaces\/[A-Za-z0-9._-]+\.ideascope\.json$/), sha256: z.string().regex(/^[a-f0-9]{64}$/) }).strict()).min(1).max(250),
  resources: z.object({ sources: z.array(z.string().startsWith("resources/sources/")).max(100).optional(), profiles: z.array(z.string().startsWith("resources/profiles/")).max(100).optional() }).strict().optional(),
}).strict();
export type WorkspaceBundleManifest = z.infer<typeof workspaceBundleManifestSchema>;
export interface WorkspaceBundlePreviewItem { workspaceId: string; title: string; path: string; branches: number; nodes: number; papers: number; evidence: number }
