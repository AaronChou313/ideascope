import { Fragment } from "react";

const linkPattern = /(https?:\/\/[^\s<>{}"]+)/g;

export function SafeRichText({ text }: { text: string }) {
  return <span>{text.split(linkPattern).map((part, index) => /^https?:\/\//.test(part) ? <a key={index} href={part} target="_blank" rel="noreferrer noopener">{part}</a> : <Fragment key={index}>{part}</Fragment>)}</span>;
}
