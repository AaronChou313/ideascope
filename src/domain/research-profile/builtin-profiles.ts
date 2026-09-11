import type { ResearchProfile } from "./research-profile";

const updatedAt = "2026-09-11T00:00:00.000Z";
const common = {
  documentType: "ideascope.research-profile" as const,
  profileVersion: 1 as const,
  mode: "base" as const,
  provenance: "builtin" as const,
  updatedAt,
  languagePreferences: ["en"],
};

export const BUILTIN_RESEARCH_PROFILES = [
  {
    ...common,
    id: "builtin.general-research",
    name: "General Research",
    description: "通用研究探索模板，不施加学科硬过滤。",
    scope: { domains: ["General Research"], subfields: [], concepts: [] },
    sourcePreferences: [
      { sourceId: "openalex", priority: 80 },
      { sourceId: "crossref", priority: 55 },
    ],
    venueGroups: [], queryVocabulary: [], arxivCategories: [],
  },
  {
    ...common,
    id: "builtin.robotics",
    name: "Robotics",
    description: "机器人感知、规划、控制与学习的轻量检索信号。",
    scope: { domains: ["Robotics"], subfields: ["Robot Perception", "Robot Control"], concepts: ["autonomous robots"] },
    sourcePreferences: [
      { sourceId: "openalex", priority: 85 },
      { sourceId: "arxiv", priority: 70, purposes: ["recent"] },
      { sourceId: "ieee-xplore", priority: 65, purposes: ["engineering"] },
    ],
    venueGroups: [{
      id: "robotics-core", name: "Robotics core",
      venues: ["ICRA", "IROS", "RSS", "RA-L", "T-RO"].map((name) => ({ name, aliases: [] })),
    }],
    queryVocabulary: [
      { term: "robot perception", aliases: ["robot sensing"] },
      { term: "state estimation", aliases: ["robot localization"] },
    ],
    arxivCategories: ["cs.RO"],
  },
  {
    ...common,
    id: "builtin.localization-navigation",
    name: "Localization & Navigation",
    description: "定位、建图、状态估计和自主导航的检索与 Venue 信号。",
    scope: { domains: ["Robotics"], subfields: ["Localization", "Navigation", "SLAM"], concepts: ["state estimation", "sensor fusion"] },
    sourcePreferences: [
      { sourceId: "openalex", priority: 85 },
      { sourceId: "semantic-scholar", priority: 65 },
      { sourceId: "arxiv", priority: 70, purposes: ["recent"] },
    ],
    venueGroups: [{
      id: "localization-navigation", name: "Localization and navigation",
      venues: ["ICRA", "IROS", "RSS", "RA-L", "T-RO", "IEEE T-ITS"].map((name) => ({ name, aliases: [] })),
    }],
    queryVocabulary: [
      { term: "localization", aliases: ["pose estimation", "state estimation"] },
      { term: "navigation", aliases: ["motion planning", "autonomous navigation"] },
      { term: "SLAM", aliases: ["simultaneous localization and mapping"] },
    ],
    arxivCategories: ["cs.RO", "cs.CV"],
  },
  {
    ...common,
    id: "builtin.geomatics-surveying",
    name: "Geomatics / Surveying",
    description: "测绘、遥感、摄影测量与空间信息研究的轻量信号。",
    scope: { domains: ["Geomatics"], subfields: ["Surveying", "Remote Sensing", "Photogrammetry"], concepts: ["geospatial information"] },
    sourcePreferences: [
      { sourceId: "openalex", priority: 85 },
      { sourceId: "crossref", priority: 60 },
      { sourceId: "arxiv", priority: 55, purposes: ["recent"] },
    ],
    venueGroups: [{
      id: "geomatics", name: "Geomatics and remote sensing",
      venues: ["ISPRS Journal of Photogrammetry and Remote Sensing", "Remote Sensing of Environment", "IEEE TGRS", "ISPRS Congress"].map((name) => ({ name, aliases: [] })),
    }],
    queryVocabulary: [
      { term: "geomatics", aliases: ["geospatial science"] },
      { term: "remote sensing", aliases: ["earth observation"] },
      { term: "photogrammetry", aliases: ["image-based 3D reconstruction"] },
    ],
    arxivCategories: ["cs.CV", "eess.IV"],
  },
] satisfies readonly ResearchProfile[];

export function getBuiltInResearchProfile(profileId: string) {
  return BUILTIN_RESEARCH_PROFILES.find((profile) => profile.id === profileId) ?? null;
}
