import type { Claim, Evidence, Paper } from "../../../contracts/domain";

const labels = { supports: "支持", opposes: "反证", background: "背景" } as const;

export function CitationList({ claim, evidence, papers }: { claim: Claim; evidence: Evidence[]; papers: Paper[] }) {
  if (claim.epistemicStatus !== "sourced") return <small>此判断标记为{claim.epistemicStatus}，不显示为文献事实。</small>;
  return (
    <ul aria-label="判断依据">
      {claim.evidenceLinks.map((link) => {
        const item = evidence.find(({ id }) => id === link.evidenceId);
        const paper = item && papers.find(({ id }) => id === item.paperId);
        if (!item || !paper) return <li key={link.evidenceId}>证据记录不可用</li>;
        return <li key={item.id}><a href={item.locator.url} target="_blank" rel="noreferrer">{paper.title}</a> · {labels[link.stance]} · {item.level} · {item.locator.section}</li>;
      })}
    </ul>
  );
}
