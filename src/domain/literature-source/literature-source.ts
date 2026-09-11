import { z } from "zod";

export const capabilityStateSchema = z.enum([
  "supported",
  "unsupported",
  "unknown",
]);
export type CapabilityState = z.infer<typeof capabilityStateSchema>;

export const sourceCapabilitiesSchema = z
  .object({
    search: capabilityStateSchema,
    abstract: capabilityStateSchema,
    citations: capabilityStateSchema,
    references: capabilityStateSchema,
    venueFilter: capabilityStateSchema,
    yearFilter: capabilityStateSchema,
    authorFilter: capabilityStateSchema,
    fullText: capabilityStateSchema,
    directLookup: capabilityStateSchema,
  })
  .strict();
export type SourceCapabilities = z.infer<typeof sourceCapabilitiesSchema>;

const authDescriptorSchema = z
  .object({
    kind: z.enum(["none", "api-key-header", "bearer", "query-param"]),
    credentialSlot: z.string().min(1).optional(),
    headerName: z.string().min(1).optional(),
    queryParamName: z.string().min(1).optional(),
  })
  .strict();
export type SourceAuthDescriptor = z.infer<typeof authDescriptorSchema>;

const adapterDescriptorSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("builtin"), driver: z.string().min(1) }).strict(),
  z
    .object({
      kind: z.literal("rest-json"),
      baseUrl: z.url(),
      search: z
        .object({
          path: z.string().min(1),
          method: z.enum(["GET", "POST"]),
          queryParameter: z.string().min(1).optional(),
          itemsPath: z.string().min(1),
          fields: z
            .object({
              externalId: z.string().min(1).optional(),
              title: z.string().min(1),
              authors: z.string().min(1).optional(),
              abstract: z.string().min(1).optional(),
              year: z.string().min(1).optional(),
              venue: z.string().min(1).optional(),
              doi: z.string().min(1).optional(),
              arxiv: z.string().min(1).optional(),
              url: z.string().min(1).optional(),
            })
            .strict(),
        })
        .strict(),
    })
    .strict(),
  z
    .object({ kind: z.literal("external-search"), urlTemplate: z.string().min(1) })
    .strict(),
]);

export const literatureSourceManifestSchema = z
  .object({
    documentType: z.literal("ideascope.literature-source"),
    manifestVersion: z.literal(1),
    id: z.string().regex(/^[a-z0-9][a-z0-9._-]{1,63}$/),
    name: z.string().min(1).max(100),
    description: z.string().max(1_000),
    adapter: adapterDescriptorSchema,
    auth: authDescriptorSchema,
    capabilities: sourceCapabilitiesSchema,
    metadata: z
      .object({
        homepage: z.url().optional(),
        documentation: z.url().optional(),
        terms: z.url().optional(),
        publisher: z.string().min(1).optional(),
      })
      .strict()
      .optional(),
  })
  .strict();
export type LiteratureSourceManifest = z.infer<
  typeof literatureSourceManifestSchema
>;

export interface SourceInstallation {
  sourceId: string;
  enabled: boolean;
  installedAt: string;
  updatedAt: string;
  credentialSlot: string | null;
}

export function parseLiteratureSourceManifest(value: unknown) {
  return literatureSourceManifestSchema.parse(value);
}
