/** IdeaScope planning contract, protocol 0.1. Compile-time contract only, not an implementation. */
export type ID = string;
export type NodeKind = 'question' | 'concept' | 'approach' | 'finding' | 'debate' | 'gap' | 'direction';
export type EpistemicStatus = 'sourced' | 'inference' | 'hypothesis' | 'user_note';
export type EvidenceLevel = 'metadata' | 'abstract' | 'user_excerpt' | 'full_text_excerpt';
export type Relation = 'decomposes_into' | 'addressed_by' | 'requires' | 'contrasts_with' | 'limited_by' | 'motivates' | 'related_to';
export interface Paper {
  id: ID; externalIds: {doi?: string; arxiv?: string; openalex?: string; semanticScholar?: string; ieee?: string; crossref?: string};
  title: string; authors: string[]; year: number | null; venue: string | null;
  url: string; abstract: string | null; source: string; fetchedAt: string;
  relatedVersionIds: ID[];
  citationCount?: number | null;
  selectionReasons?: string[];
}
export interface Evidence {
  id: ID; paperId: ID; level: EvidenceLevel;
  excerpt: string | null; paraphrase: string;
  locator: {url: string; section: string; version?: string};
  verification: 'source_located' | 'text_matched' | 'human_checked' | 'unreviewed';
  contentHash: string; fetchedAt: string;
}
export interface EvidenceLink { evidenceId: ID; stance: 'supports' | 'opposes' | 'background'; }
export interface Claim {
  id: ID; text: string; epistemicStatus: EpistemicStatus; evidenceLinks: EvidenceLink[];
  qualifiers: string[]; verification: 'unreviewed' | 'machine_checked' | 'human_reviewed';
}
export interface GraphNode {
  id: ID; kind: NodeKind; title: string; summary: string; claimIds: ID[];
  parentId: ID | null; depth: number;
  aliases: string[]; locked: boolean; archived: boolean; mergedInto: ID | null;
}
export interface GraphEdge {
  id: ID; source: ID; target: ID; relation: Relation; role: 'primary' | 'cross'; label: string; claimIds: ID[];
}
export interface GraphModel { nodes: GraphNode[]; edges: GraphEdge[]; claims: Claim[]; }
export interface GraphViewState {
  positions: Record<ID, {x: number; y: number; pinned: boolean}>;
  collapsedIds: ID[]; viewport: {x: number; y: number; zoom: number};
}
export interface ResearchScope {object: string; question: string; constraints: string[]; assumptions: string[];}
export interface DirectionCard {
  id: ID; title: string; researchQuestion: string; motivation: string;
  knownWork: string[]; possibleDifference: string; counterEvidence: string[];
  unresolvedQuestions: string[]; nextLiteratureQuestions: string[];
  status: 'exploring' | 'worth_following' | 'saved' | 'excluded';
  claimIds: ID[]; userEdited: boolean;
}
export interface Branch {
  id: ID; title: string; parentBranchId: ID | null; forkedFromRevision: number | null;
  revision: number; focusNodeId: ID | null; scope: ResearchScope;
  summary: {understood: string[]; decisions: string[]; openQuestions: string[]};
  graph: GraphModel; view: GraphViewState; directions: DirectionCard[];
}
export interface Message {
  id: ID; branchId: ID; role: 'user' | 'assistant'; text: string;
  evidenceIds: ID[]; createdAt: string; isDemo: boolean;
}
export interface RunRecord {
  id: ID; branchId: ID; baseRevision: number; promptVersion: string;
  status: 'completed' | 'failed' | 'cancelled' | 'interrupted' | 'budget_exhausted';
  startedAt: string; endedAt: string | null; committedPatchIds: ID[];
  usage: {inputTokens: number | null; outputTokens: number | null; source: 'reported' | 'estimated' | 'unknown'};
}
export interface WorkspaceExport {
  documentType: 'ideascope.workspace'; formatVersion: 2; createdWith: string;
  exportedAt: string; isDemo: boolean;
  workspace: {id: ID; title: string; seedIdea: string; activeBranchId: ID;
    branches: Branch[]; papers: Paper[]; evidence: Evidence[]; messages: Message[]; runs: RunRecord[];};
}
export type NewGraphNode = Omit<GraphNode, 'locked' | 'archived' | 'mergedInto'>;
export type NodeChanges = Partial<Pick<GraphNode, 'title' | 'summary' | 'kind' | 'claimIds' | 'aliases' | 'parentId' | 'depth'>>;
export type ClaimChanges = Partial<Omit<Claim, 'id'>>;
export type EdgeChanges = Partial<Omit<GraphEdge, 'id'>>;
export type GraphOperation =
  | {op: 'ADD_NODE'; node: NewGraphNode}
  | {op: 'UPDATE_NODE'; nodeId: ID; changes: NodeChanges}
  | {op: 'ADD_CLAIM'; claim: Claim}
  | {op: 'UPDATE_CLAIM'; claimId: ID; changes: ClaimChanges}
  | {op: 'ADD_EDGE'; edge: GraphEdge}
  | {op: 'UPDATE_EDGE'; edgeId: ID; changes: EdgeChanges}
  | {op: 'ARCHIVE_NODE'; nodeId: ID; reason: string}
  | {op: 'MERGE_NODES'; sourceIds: ID[]; targetId: ID; reason: string};
export interface GraphPatch {
  protocolVersion: '0.1'; patchId: ID; runId: ID; workspaceId: ID;
  branchId: ID; baseRevision: number; summary: string; operations: GraphOperation[];
}
/** Credentials are intentionally absent. Store actual secrets in a separate in-memory transport store. */
export interface ProviderProfile {
  id: ID; name: string; protocol: string; baseUrl: string; model: string;
  capabilities: Record<'streaming' | 'toolCalling' | 'jsonMode' | 'structuredOutput' | 'usageReporting',
    'supported' | 'unsupported' | 'unknown'>;
  testedAt: string | null;
}
