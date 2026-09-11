import { z } from "zod";
import { sessionProfilePatchSchema } from "../research-profile/research-profile";

export const intentPlanSchema = z.object({
  title: z.string().min(1).max(40),
  understanding: z.string().min(1),
  queries: z.array(z.string().min(2).max(300)).min(2).max(4),
  profilePatch: sessionProfilePatchSchema,
}).strict();

const providerIntentPlanSchema = z.object({
  title: z.string().trim().min(1).max(200),
  understanding: z.string().trim().min(1).max(4_000),
  queries: z.array(z.string().trim().min(2).max(500)).min(2).max(8),
  profilePatch: z.unknown().optional(),
});

/**
 * Provider JSON is normalized into the strict application contract. Research
 * Profile enrichment is optional and must never prevent a valid search plan
 * from running; malformed enrichment is replaced with an empty session patch.
 */
export function normalizeIntentPlanOutput(value: unknown, sessionProfileId: string) {
  const draft = providerIntentPlanSchema.parse(value);
  const patch = sessionProfilePatchSchema.safeParse(draft.profilePatch);
  return intentPlanSchema.parse({
    title: draft.title.slice(0, 40),
    understanding: draft.understanding,
    queries: draft.queries.slice(0, 4),
    profilePatch: patch.success ? patch.data : {
      patchVersion: 1,
      targetProfileId: sessionProfileId,
      operations: [],
    },
  });
}
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

const providerNodeSchema = z.object({
  tempId: z.string().trim().min(1).max(300),
  parentRef: z.string().trim().min(1).max(300).nullable().optional(),
  existingNodeId: z.string().trim().min(1).max(300).optional(),
  kind: z.string().trim().min(1).max(60),
  title: z.string().trim().min(1).max(300),
  summary: z.string().trim().min(1).max(4_000),
  evidenceIds: z.array(z.string()).max(30).optional(),
  aliases: z.array(z.string()).max(20).optional(),
});
const providerCrossLinkSchema = z.object({
  sourceRef: z.string().trim().min(1).max(300),
  targetRef: z.string().trim().min(1).max(300),
  relation: z.string().trim().min(1).max(80),
});
const providerSynthesisSchema = z.object({
  answer: z.string().trim().min(1).max(20_000),
  nodes: z.array(z.unknown()).max(24),
  crossLinks: z.array(z.unknown()).max(12).optional(),
  nextQuestions: z.array(z.string()).max(10).optional(),
  summary: z.union([z.string(), z.array(z.string()).max(16)]).optional(),
});

const kindAliases: Record<string, (typeof kinds)[number]> = {
  question: "question", research_question: "question",
  concept: "concept", topic: "concept", theme: "concept",
  approach: "approach", method: "approach", methodology: "approach",
  finding: "finding", result: "finding", insight: "finding",
  debate: "debate", controversy: "debate",
  gap: "gap", limitation: "gap", challenge: "gap",
  direction: "direction", future_direction: "direction",
};
const relationAliases: Record<string, (typeof relations)[number]> = {
  decomposes_into: "decomposes_into", decomposes: "decomposes_into",
  addressed_by: "addressed_by", requires: "requires",
  contrasts_with: "contrasts_with", contrasts: "contrasts_with",
  limited_by: "limited_by", motivates: "motivates",
  related_to: "related_to", related: "related_to",
};

/** Normalize common JSON variations while retaining the strict graph contract. */
export function normalizeSynthesisOutput(value: unknown) {
  const draft = providerSynthesisSchema.parse(value);
  const nodes = draft.nodes.slice(0, 12).map((raw) => {
    const node = providerNodeSchema.parse(raw);
    return {
      tempId: node.tempId.slice(0, 160),
      parentRef: node.parentRef?.slice(0, 160) ?? null,
      ...(node.existingNodeId ? { existingNodeId: node.existingNodeId.slice(0, 160) } : {}),
      kind: kindAliases[node.kind.toLowerCase()] ?? "concept",
      title: node.title.slice(0, 100),
      summary: node.summary.slice(0, 800),
      evidenceIds: (node.evidenceIds ?? []).slice(0, 12),
      ...(node.aliases ? { aliases: node.aliases.filter((item) => item.trim()).map((item) => item.slice(0, 100)).slice(0, 8) } : {}),
    };
  });
  const crossLinks = (draft.crossLinks ?? []).flatMap((raw) => {
    const parsed = providerCrossLinkSchema.safeParse(raw);
    if (!parsed.success) return [];
    const relation = relationAliases[parsed.data.relation.toLowerCase()];
    return relation ? [{ sourceRef: parsed.data.sourceRef.slice(0, 160), targetRef: parsed.data.targetRef.slice(0, 160), relation }] : [];
  }).slice(0, 5);
  const summary = typeof draft.summary === "string" ? [draft.summary] : (draft.summary ?? []);
  return synthesisSchema.parse({
    answer: draft.answer,
    nodes,
    crossLinks,
    nextQuestions: (draft.nextQuestions ?? []).slice(0, 3),
    summary: summary.slice(0, 8),
  });
}

export type IntentPlan = z.infer<typeof intentPlanSchema>;
export type ResearchSynthesis = z.infer<typeof synthesisSchema>;
