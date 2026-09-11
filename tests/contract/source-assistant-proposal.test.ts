import Ajv2020 from "ajv/dist/2020";
import { describe, expect, it } from "vitest";
import schema from "../../contracts/source-assistant-proposal.schema.json";
import { sourceAssistantProposalSchema } from "../../src/domain/literature-source/source-assistant-proposal";

const proposal = {
  proposalVersion: 1,
  requestSummary: "机器人定位与导航",
  recommendations: [{ action: "use_builtin", sourceId: "openalex", reason: "覆盖跨学科元数据", missingInputs: [] }],
  warnings: [],
};

describe("source assistant proposal contract", () => {
  it("keeps JSON Schema and Zod aligned", () => {
    const validate = new Ajv2020({ strict: false }).compile(schema);
    expect(validate(proposal)).toBe(true);
    expect(sourceAssistantProposalSchema.safeParse(proposal).success).toBe(true);
    expect(validate({ ...proposal, apiKey: "forbidden" })).toBe(false);
    expect(sourceAssistantProposalSchema.safeParse({ ...proposal, endpoint: "https://invented.test" }).success).toBe(false);
  });
});
