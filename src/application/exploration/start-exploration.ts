import { createWorkspaceFromIdea } from "../../domain/workspace/create-workspace";
import { memoryKeyStore } from "../../infrastructure/secrets/memory-key-store";
import { ProviderProfileRepository } from "../../infrastructure/storage/provider-profile-repository";
import { WorkspaceRepository } from "../../infrastructure/storage/workspace-repository";

export type StartExplorationResult =
  | { status: "started"; workspaceId: string }
  | { status: "needs_provider"; reason: "missing_profile" | "missing_session_key" }
  | { status: "failed"; message: string };

export async function startExploration(
  idea: string,
  providers: Pick<ProviderProfileRepository, "getActive"> = new ProviderProfileRepository(),
  workspaces: Pick<WorkspaceRepository, "save"> = new WorkspaceRepository(),
): Promise<StartExplorationResult> {
  const active = await providers.getActive();
  if (!active) return { status: "needs_provider", reason: "missing_profile" };
  if (!memoryKeyStore.get()) return { status: "needs_provider", reason: "missing_session_key" };
  const workspace = createWorkspaceFromIdea(idea);
  const saved = await workspaces.save(workspace);
  return saved.status === "saved"
    ? { status: "started", workspaceId: workspace.workspace.id }
    : { status: "failed", message: saved.message };
}
