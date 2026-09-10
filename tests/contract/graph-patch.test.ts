import Ajv2020 from 'ajv/dist/2020.js';
import { describe, expect, it } from 'vitest';
import type { GraphPatch } from '../../contracts/domain';
import schema from '../../contracts/graph-patch.schema.json';
import patch from '../../examples/patch.demo.json';

const ajv = new Ajv2020({ allErrors: true, strict: true });
const validate = ajv.compile(schema);

describe('graph patch JSON Schema', () => {
  it('accepts the shipped positive example', () => {
    expect(validate(patch), JSON.stringify(validate.errors)).toBe(true);
  });

  it('rejects unknown fields and unsupported operations', () => {
    const withSecret = { ...patch, apiKey: 'test-secret' };
    expect(validate(withSecret)).toBe(false);

    const unsupported = {
      ...patch,
      operations: [{ op: 'FETCH_URL', url: 'https://example.com' }],
    };
    expect(validate(unsupported)).toBe(false);
  });

  it('rejects a sourced claim without evidence links', () => {
    const sourcedWithoutEvidence = structuredClone(patch) as GraphPatch;
    const operation = sourcedWithoutEvidence.operations[0];
    if (operation?.op !== 'ADD_CLAIM') throw new Error('Fixture shape changed');
    operation.claim.epistemicStatus = 'sourced';
    expect(validate(sourcedWithoutEvidence)).toBe(false);
  });
});
