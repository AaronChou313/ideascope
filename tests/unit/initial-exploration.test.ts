import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it } from "vitest";
import { runExploration } from "../../src/application/exploration/run-exploration";
import { createEmptyWorkspace } from "../../src/domain/workspace/create-workspace";
import { ideaScopeDatabase } from "../../src/infrastructure/storage/ideascope-database";
import { ProviderProfileRepository } from "../../src/infrastructure/storage/provider-profile-repository";
import { memoryKeyStore } from "../../src/infrastructure/secrets/memory-key-store";

const plan = { title: "足端传感与定位", understanding: "研究足端接触感知对定位和状态估计的作用", queries: ["quadruped robot foot contact state estimation", "legged robot foot force localization"] };
const synthesis = { answer: "文献显示这一问题可从接触约束、状态估计和打滑鲁棒性三个层面展开。", nodes: [
  { kind:"question",title:"足端信息如何约束定位",summary:"核心问题",evidenceIds:["evidence:openalex:W1"] },
  { kind:"approach",title:"接触辅助状态估计",summary:"把可信接触转为运动学约束",evidenceIds:["evidence:openalex:W1"] },
  { kind:"concept",title:"接触状态识别",summary:"识别足端是否稳定接触",evidenceIds:["evidence:openalex:W1"] },
  { kind:"gap",title:"打滑条件下的失效",summary:"错误接触约束会污染估计",evidenceIds:[] },
  { kind:"direction",title:"触觉与惯性融合",summary:"联合足端触觉和惯性信息",evidenceIds:[] },
  { kind:"finding",title:"接触约束抑制漂移",summary:"稳定接触可提供相对运动约束",evidenceIds:["evidence:openalex:W1"] },
], edges:[{source:0,target:1,relation:"addressed_by",label:"通过"},{source:1,target:2,relation:"requires",label:"依赖"},{source:1,target:3,relation:"limited_by",label:"受限于"},{source:3,target:4,relation:"motivates",label:"推动"}], nextQuestions:["接触检测如何处理打滑？"], summary:["足端接触可作为状态估计约束"] };

describe("initial exploration pipeline", () => {
  beforeEach(async () => { await Promise.all(ideaScopeDatabase.tables.map((table) => table.clear())); memoryKeyStore.set("unit-test-key"); await new ProviderProfileRepository().saveActive({name:"Mock",providerType:"custom",format:"openai-chat",baseUrl:"https://provider.test/v1",model:"mock"}); });
  it("plans searches, binds real adapter results and creates a multi-node graph", async () => {
    const providerFetcher:typeof fetch = () => Promise.resolve(new Response(JSON.stringify({choices:[{message:{content:JSON.stringify(providerFetcherCalls++ ? synthesis : plan)}}]}),{status:200})); let providerFetcherCalls=0;
    const literatureFetcher:typeof fetch = () => Promise.resolve(new Response(JSON.stringify({meta:{count:1,next_cursor:null},results:[{id:"https://openalex.org/W1",doi:"https://doi.org/10.1000/test",title:"Contact-Aided State Estimation for Legged Robots",publication_year:2024,authorships:[{author:{display_name:"A. Researcher"}}],primary_location:{source:{display_name:"Robotics Journal"},landing_page_url:"https://example.test/paper"},best_oa_location:null,abstract_inverted_index:{Contact:[0],aided:[1],estimation:[2]}}]}),{status:200}));
    const progress:string[]=[];const result=await runExploration(createEmptyWorkspace("initial-test"),"我想研究四足机器人足端传感器对于定位导航的作用",{signal:new AbortController().signal,fetcher:literatureFetcher,providerFetcher,onProgress:item=>progress.push(item.stage)});
    expect(result.queries).toBe(2);expect(result.candidates).toBe(1);expect(result.evidence).toBe(1);expect(result.nodesAdded).toBe(6);expect(result.workspace.workspace.branches[0]!.graph.edges).toHaveLength(4);expect(result.workspace.workspace.messages).toHaveLength(2);expect(result.workspace.workspace.branches[0]!.graph.claims.some(claim=>claim.epistemicStatus==="sourced")).toBe(true);expect(progress).toEqual(expect.arrayContaining(["understanding","planning","searching","synthesizing","updating"]));
  });
});
