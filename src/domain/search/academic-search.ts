import { z } from "zod";

export const searchIntentSchema = z.enum([
  "landscape", "representative", "recent", "counterevidence", "venue_focused",
  "citation_expand", "reference_expand", "direct_lookup",
]);
export type SearchIntent = z.infer<typeof searchIntentSchema>;

export const academicSearchRequestSchema = z.object({
  requestVersion: z.literal(1),
  userQuestion: z.string().trim().min(1).max(5_000),
  query: z.string().trim().min(1).max(1_000),
  intent: searchIntentSchema,
  filters: z.object({
    fromYear: z.number().int().min(1800).max(3000).optional(),
    toYear: z.number().int().min(1800).max(3000).optional(),
    venues: z.array(z.string().max(200)).max(100).optional(),
    authors: z.array(z.string().max(200)).max(100).optional(),
  }).strict().optional(),
  budget: z.object({
    maxSources: z.number().int().min(1).max(20),
    maxQueries: z.number().int().min(1).max(50),
    maxCandidates: z.number().int().min(1).max(1_000),
  }).strict(),
}).strict();
export type AcademicSearchRequest = z.infer<typeof academicSearchRequestSchema>;

export function inferSearchIntent(question: string, hasNodeContext: boolean): SearchIntent {
  if (/doi:|arxiv:|10\.\d{4,9}\//i.test(question)) return "direct_lookup";
  if (/引用|cited by|citations?/i.test(question)) return "citation_expand";
  if (/参考文献|references?/i.test(question)) return "reference_expand";
  if (/反例|反证|争议|counterevidence/i.test(question)) return "counterevidence";
  if (/近年|最新|recent|过去[三五十]年|20\d{2}/i.test(question)) return "recent";
  if (/期刊|会议|venue|ICRA|IROS|T-RO|RA-L/i.test(question)) return "venue_focused";
  return hasNodeContext ? "representative" : "landscape";
}
