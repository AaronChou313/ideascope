import { z } from "zod";

export const intentPlanSchema = z.object({ title: z.string().min(1).max(40), understanding: z.string().min(1), queries: z.array(z.string().min(2).max(300)).min(2).max(4) }).strict();
const kinds = ["question", "concept", "approach", "finding", "debate", "gap", "direction"] as const;
const relations = ["decomposes_into", "addressed_by", "requires", "contrasts_with", "limited_by", "motivates", "related_to"] as const;
const ref = z.string().min(1).max(160);

export const synthesisSchema = z.object({
  answer: z.string().min(1),
  nodes: z.array(z.object({
    tempId: ref,
    parentRef: ref.nullable(),
    existingNodeId: ref.optional(),
    kind: z.enum(kinds), title: z.string().min(1).max(100), summary: z.string().min(1).max(800),
    evidenceIds: z.array(z.string()).max(12), aliases: z.array(z.string().min(1).max(100)).max(8).optional(),
  }).strict()).max(12),
  crossLinks: z.array(z.object({ sourceRef: ref, targetRef: ref, relation: z.enum(relations) }).strict()).max(5),
  nextQuestions: z.array(z.string()).max(3), summary: z.array(z.string()).max(8),
}).strict();

export type IntentPlan = z.infer<typeof intentPlanSchema>;
export type ResearchSynthesis = z.infer<typeof synthesisSchema>;
