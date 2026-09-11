import { z } from "zod";

export const sourceAssistantProposalSchema = z.object({
  proposalVersion: z.literal(1),
  requestSummary: z.string().trim().min(1).max(2_000),
  recommendations: z.array(z.object({
    action: z.enum(["use_builtin", "configure_builtin", "import_manifest", "propose_custom_manifest", "external_search_only"]),
    sourceId: z.string().max(100).optional(),
    reason: z.string().trim().min(1).max(2_000),
    missingInputs: z.array(z.string().max(200)).max(20),
  }).strict()).max(20),
  warnings: z.array(z.string().max(1_000)).max(20),
}).strict();

export type SourceAssistantProposal = z.infer<typeof sourceAssistantProposalSchema>;
