import { z } from "zod";
export const intentPlanSchema=z.object({title:z.string().min(1).max(40),understanding:z.string().min(1),queries:z.array(z.string().min(2).max(300)).min(2).max(4)}).strict();
const kinds=["question","concept","approach","finding","debate","gap","direction"] as const;
const relations=["decomposes_into","addressed_by","requires","contrasts_with","limited_by","motivates","related_to"] as const;
const stringOr=(value:unknown,fallback:string)=>typeof value==="string"?value:fallback;
function normalizeSynthesis(value:unknown){
  if(!value||typeof value!=="object")return value;
  const raw=value as Record<string,unknown>;
  const nodes=Array.isArray(raw.nodes)?raw.nodes.map(item=>{const node=item&&typeof item==="object"?item as Record<string,unknown>:{};return{kind:kinds.includes(node.kind as typeof kinds[number])?node.kind:"concept",title:stringOr(node.title,"待核查主题"),summary:stringOr(node.summary,stringOr(node.description,"待进一步核查")),evidenceIds:Array.isArray(node.evidenceIds)?node.evidenceIds.filter((id):id is string=>typeof id==="string"):[]};}):[];
  const edges=Array.isArray(raw.edges)?raw.edges.map(item=>{const edge=item&&typeof item==="object"?item as Record<string,unknown>:{};return{source:Number(edge.source),target:Number(edge.target),relation:relations.includes(edge.relation as typeof relations[number])?edge.relation:"related_to",label:stringOr(edge.label,"相关")};}).filter(edge=>Number.isInteger(edge.source)&&Number.isInteger(edge.target)):[];
  return{answer:stringOr(raw.answer,stringOr(raw.response,"研究结构已更新。")),nodes,edges,nextQuestions:Array.isArray(raw.nextQuestions)?raw.nextQuestions.filter((item):item is string=>typeof item==="string").slice(0,3):[],summary:Array.isArray(raw.summary)?raw.summary.filter((item):item is string=>typeof item==="string").slice(0,8):[]};
}
export const synthesisSchema=z.preprocess(normalizeSynthesis,z.object({answer:z.string().min(1),nodes:z.array(z.object({kind:z.enum(kinds),title:z.string().min(1).max(100),summary:z.string().min(1).max(800),evidenceIds:z.array(z.string()).max(12)}).strict()).min(1).max(15),edges:z.array(z.object({source:z.number().int().nonnegative(),target:z.number().int().nonnegative(),relation:z.enum(relations),label:z.string().min(1).max(40)}).strict()).max(30),nextQuestions:z.array(z.string()).max(3),summary:z.array(z.string()).max(8)}).strict());
export type IntentPlan=z.infer<typeof intentPlanSchema>;export type ResearchSynthesis=z.infer<typeof synthesisSchema>;
