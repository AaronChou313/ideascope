import { z } from "zod";
import { literatureSourceManifestSchema } from "../literature-source/literature-source";
import { researchProfileSchema } from "../research-profile/research-profile";

export const sourcePackSchema = z.object({
  documentType: z.literal("ideascope.pack"), packVersion: z.literal(1),
  id: z.string().min(1).max(100), name: z.string().min(1).max(100),
  description: z.string().max(2_000),
  sources: z.array(literatureSourceManifestSchema).max(100),
  profiles: z.array(researchProfileSchema).max(100),
}).strict();
export type SourcePack = z.infer<typeof sourcePackSchema>;
