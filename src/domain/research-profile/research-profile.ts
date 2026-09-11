import { z } from "zod";

const text160 = z.string().trim().min(1).max(160);
const priority = z.number().min(0).max(100);
const uniqueStrings = (limit: number, item = text160) =>
  z.array(item).max(limit).refine((items) => new Set(items).size === items.length, "Items must be unique");

export const researchProfileSchema = z.object({
  documentType: z.literal("ideascope.research-profile"),
  profileVersion: z.literal(1),
  id: z.string().min(1).max(100),
  name: z.string().min(1).max(100),
  mode: z.enum(["base", "session"]),
  description: z.string().max(2_000),
  scope: z.object({
    domains: uniqueStrings(100),
    subfields: uniqueStrings(100),
    concepts: uniqueStrings(100),
  }).strict(),
  sourcePreferences: z.array(z.object({
    sourceId: z.string().min(1).max(100),
    priority,
    purposes: uniqueStrings(20, z.string().trim().min(1).max(80)).optional(),
  }).strict()).max(100),
  venueGroups: z.array(z.object({
    id: z.string().min(1).max(100),
    name: z.string().min(1).max(100),
    venues: z.array(z.object({
      name: z.string().min(1).max(200),
      aliases: uniqueStrings(30, z.string().trim().min(1).max(100)),
      priority: priority.optional(),
    }).strict()).max(100),
  }).strict()).max(50),
  queryVocabulary: z.array(z.object({
    term: text160,
    aliases: uniqueStrings(50),
  }).strict()).max(200),
  arxivCategories: uniqueStrings(50, z.string().trim().min(1).max(20)),
  languagePreferences: uniqueStrings(20, z.string().trim().min(1).max(20)),
  provenance: z.enum(["builtin", "manual", "imported", "ai_suggested", "session_derived"]),
  updatedAt: z.iso.datetime(),
}).strict();

export type ResearchProfile = z.infer<typeof researchProfileSchema>;

const patchOperationSchema = z.discriminatedUnion("op", [
  z.object({ op: z.literal("addDomainSignal"), value: text160 }).strict(),
  z.object({ op: z.literal("addSubfield"), value: text160 }).strict(),
  z.object({ op: z.literal("addConcept"), value: text160 }).strict(),
  z.object({ op: z.literal("addQueryAlias"), value: z.object({ term: text160, alias: text160 }).strict() }).strict(),
  z.object({ op: z.literal("addVenueSignal"), value: z.object({
    groupId: z.string().min(1).max(100), groupName: z.string().min(1).max(100),
    venue: z.string().min(1).max(200), aliases: uniqueStrings(30, z.string().trim().min(1).max(100)).optional(),
  }).strict() }).strict(),
  z.object({ op: z.literal("addSourceHint"), value: z.object({
    sourceId: z.string().min(1).max(100), priority, purposes: uniqueStrings(20, z.string().trim().min(1).max(80)).optional(),
  }).strict() }).strict(),
  z.object({ op: z.literal("adjustTemporaryPriority"), value: z.object({
    sourceId: z.string().min(1).max(100), priority,
  }).strict() }).strict(),
]);

export const sessionProfilePatchSchema = z.object({
  patchVersion: z.literal(1),
  targetProfileId: z.string().min(1).max(100),
  operations: z.array(patchOperationSchema).max(100),
}).strict();
export type SessionProfilePatch = z.infer<typeof sessionProfilePatchSchema>;

export interface EffectiveResearchProfile {
  scope: ResearchProfile["scope"];
  sourcePreferences: ResearchProfile["sourcePreferences"];
  venueGroups: ResearchProfile["venueGroups"];
  queryVocabulary: ResearchProfile["queryVocabulary"];
  arxivCategories: string[];
  languagePreferences: string[];
  provenance: { baseProfileIds: string[]; sessionProfileId: string | null; contextTerms: string[] };
}

export function applySessionProfilePatch(profile: ResearchProfile, input: unknown): ResearchProfile {
  if (profile.mode !== "session") throw new Error("Session Profile Patch 不能修改 Base Profile。");
  const patch = sessionProfilePatchSchema.parse(input);
  if (patch.targetProfileId !== profile.id) throw new Error("Profile Patch 目标不匹配。");
  const next = structuredClone(profile);
  for (const operation of patch.operations) applyOperation(next, operation);
  next.updatedAt = new Date().toISOString();
  return researchProfileSchema.parse(next);
}

function addUnique(target: string[], value: string) {
  if (!target.some((item) => item.toLocaleLowerCase() === value.toLocaleLowerCase())) target.push(value);
}

function applyOperation(profile: ResearchProfile, operation: SessionProfilePatch["operations"][number]) {
  if (operation.op === "addDomainSignal") addUnique(profile.scope.domains, operation.value);
  else if (operation.op === "addSubfield") addUnique(profile.scope.subfields, operation.value);
  else if (operation.op === "addConcept") addUnique(profile.scope.concepts, operation.value);
  else if (operation.op === "addQueryAlias") {
    const vocabulary = profile.queryVocabulary.find((item) => item.term.toLowerCase() === operation.value.term.toLowerCase());
    if (vocabulary) addUnique(vocabulary.aliases, operation.value.alias);
    else profile.queryVocabulary.push({ term: operation.value.term, aliases: [operation.value.alias] });
  } else if (operation.op === "addVenueSignal") {
    let group = profile.venueGroups.find((item) => item.id === operation.value.groupId);
    if (!group) {
      group = { id: operation.value.groupId, name: operation.value.groupName, venues: [] };
      profile.venueGroups.push(group);
    }
    if (!group.venues.some((venue) => venue.name.toLowerCase() === operation.value.venue.toLowerCase()))
      group.venues.push({ name: operation.value.venue, aliases: operation.value.aliases ?? [] });
  } else {
    const hint = operation.value;
    const existing = profile.sourcePreferences.find((item) => item.sourceId === hint.sourceId);
    if (existing) existing.priority = hint.priority;
    else profile.sourcePreferences.push({ sourceId: hint.sourceId, priority: hint.priority, ...("purposes" in hint && hint.purposes ? { purposes: hint.purposes } : {}) });
  }
}

export function mergeResearchProfiles(
  baseProfiles: readonly ResearchProfile[],
  sessionProfile: ResearchProfile | null,
  contextTerms: readonly string[] = [],
): EffectiveResearchProfile {
  const profiles = [...baseProfiles, ...(sessionProfile ? [sessionProfile] : [])];
  const unique = (values: string[]) => [...new Map(values.map((value) => [value.toLowerCase(), value])).values()];
  const sourcePreferences = new Map<string, ResearchProfile["sourcePreferences"][number]>();
  const vocabulary = new Map<string, ResearchProfile["queryVocabulary"][number]>();
  const venues = new Map<string, ResearchProfile["venueGroups"][number]>();
  for (const profile of profiles) {
    for (const source of profile.sourcePreferences) sourcePreferences.set(source.sourceId, structuredClone(source));
    for (const item of profile.queryVocabulary) {
      const current = vocabulary.get(item.term.toLowerCase());
      vocabulary.set(item.term.toLowerCase(), current
        ? { ...current, aliases: unique([...current.aliases, ...item.aliases]) }
        : structuredClone(item));
    }
    for (const group of profile.venueGroups) venues.set(group.id, structuredClone(group));
  }
  return {
    scope: {
      domains: unique(profiles.flatMap((profile) => profile.scope.domains)),
      subfields: unique(profiles.flatMap((profile) => profile.scope.subfields)),
      concepts: unique([...profiles.flatMap((profile) => profile.scope.concepts), ...contextTerms]),
    },
    sourcePreferences: [...sourcePreferences.values()],
    venueGroups: [...venues.values()],
    queryVocabulary: [...vocabulary.values()],
    arxivCategories: unique(profiles.flatMap((profile) => profile.arxivCategories)),
    languagePreferences: unique(profiles.flatMap((profile) => profile.languagePreferences)),
    provenance: {
      baseProfileIds: baseProfiles.map((profile) => profile.id),
      sessionProfileId: sessionProfile?.id ?? null,
      contextTerms: [...contextTerms],
    },
  };
}

export function createEmptySessionProfile(workspaceId: string, now = new Date().toISOString()): ResearchProfile {
  return {
    documentType: "ideascope.research-profile", profileVersion: 1,
    id: `session:${workspaceId}`, name: "自动研究领域", mode: "session",
    description: "由当前探索自动形成的临时研究领域配置。",
    scope: { domains: [], subfields: [], concepts: [] }, sourcePreferences: [],
    venueGroups: [], queryVocabulary: [], arxivCategories: [], languagePreferences: [],
    provenance: "session_derived", updatedAt: now,
  };
}
