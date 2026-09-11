import { literatureSourceManifestSchema } from "../../domain/literature-source/literature-source";
import { researchProfileSchema } from "../../domain/research-profile/research-profile";
import { sourcePackSchema } from "../../domain/import/source-pack";

export type ConfigurationImport =
  | { kind: "source"; name: string; sources: [ReturnType<typeof literatureSourceManifestSchema.parse>]; profiles: [] }
  | { kind: "profile"; name: string; sources: []; profiles: [ReturnType<typeof researchProfileSchema.parse>] }
  | { kind: "pack"; name: string; sources: ReturnType<typeof sourcePackSchema.parse>["sources"]; profiles: ReturnType<typeof sourcePackSchema.parse>["profiles"] };

export function parseConfigurationImport(text: string): ConfigurationImport {
  if (text.length > 2_000_000) throw new Error("配置文件超过 2 MB 安全上限。");
  let value: unknown;
  try { value = JSON.parse(text); }
  catch { throw new Error("配置不是有效 JSON。"); }
  if (!value || typeof value !== "object") throw new Error("无法识别配置文档类型。");
  const documentType = (value as Record<string, unknown>).documentType;
  if (documentType === "ideascope.literature-source") {
    const source = literatureSourceManifestSchema.parse(value);
    return { kind: "source", name: source.name, sources: [source], profiles: [] };
  }
  if (documentType === "ideascope.research-profile") {
    const profile = researchProfileSchema.parse(value);
    return { kind: "profile", name: profile.name, sources: [], profiles: [profile] };
  }
  if (documentType === "ideascope.pack") {
    const pack = sourcePackSchema.parse(value);
    return { kind: "pack", name: pack.name, sources: pack.sources, profiles: pack.profiles };
  }
  throw new Error("不支持的 IdeaScope 配置文档类型。");
}
