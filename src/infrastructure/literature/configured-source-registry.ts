import { sourceCredentialStore } from "../secrets/source-credential-store";
import { SourceInstallationRepository } from "../storage/source-installation-repository";
import { createBuiltInSourceRegistry } from "./builtin-source-registry";

export async function createConfiguredSourceRegistry(options: { fetcher?: typeof fetch } = {}) {
  const installations = await new SourceInstallationRepository().list();
  const disabledSourceIds = installations
    .filter((installation) => !installation.enabled)
    .map((installation) => installation.sourceId);
  return createBuiltInSourceRegistry({
    fetcher: options.fetcher,
    disabledSourceIds,
    getCredential: (slot) => sourceCredentialStore.get(slot),
  });
}
