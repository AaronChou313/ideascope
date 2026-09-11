import { sourceCredentialStore } from "../secrets/source-credential-store";
import { SourceInstallationRepository } from "../storage/source-installation-repository";
import { createBuiltInSourceRegistry } from "./builtin-source-registry";
import { SourceManifestRepository } from "../storage/source-manifest-repository";
import { RestJsonLiteratureAdapter } from "./rest-json";

export async function createConfiguredSourceRegistry(options: { fetcher?: typeof fetch } = {}) {
  const installations = await new SourceInstallationRepository().list();
  const disabledSourceIds = installations
    .filter((installation) => !installation.enabled)
    .map((installation) => installation.sourceId);
  const registry = createBuiltInSourceRegistry({
    fetcher: options.fetcher,
    disabledSourceIds,
    getCredential: (slot) => sourceCredentialStore.get(slot),
  });
  const installationMap = new Map(installations.map((installation) => [installation.sourceId, installation]));
  const manifests = await new SourceManifestRepository().listCustom();
  for (const manifest of manifests) {
    const installation = installationMap.get(manifest.id);
    if (!installation) continue;
    registry.register({
      manifest,
      installation,
      createAdapter: manifest.adapter.kind === "rest-json"
        ? () => new RestJsonLiteratureAdapter(manifest, { fetcher: options.fetcher, getCredential: (slot) => sourceCredentialStore.get(slot) })
        : undefined,
    });
  }
  return registry;
}
