"use client";

import type { ReactNode } from "react";

function inlineMarkdown(text: string) {
  const parts = text.split(/(`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*)/g).filter(Boolean);
  return parts.map((part, index) => {
    if (part.startsWith("`") && part.endsWith("`")) {
      return <code key={index}>{part.slice(1, -1)}</code>;
    }
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={index}>{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith("*") && part.endsWith("*")) {
      return <em key={index}>{part.slice(1, -1)}</em>;
    }
    return <span key={index}>{part}</span>;
  });
}

function flushList(items: string[], key: string) {
  if (!items.length) return null;
  return (
    <ul key={key}>
      {items.map((item, index) => (
        <li key={`${key}-${index}`}>{inlineMarkdown(item)}</li>
      ))}
    </ul>
  );
}

function flushParagraph(lines: string[], key: string) {
  if (!lines.length) return null;
  return <p key={key}>{inlineMarkdown(lines.join(" "))}</p>;
}

export function MarkdownMessage({ content }: { content: string }) {
  const blocks: ReactNode[] = [];
  const paragraph: string[] = [];
  const list: string[] = [];
  const lines = content.replace(/\r\n/g, "\n").split("\n");
  let codeBlock: string[] | null = null;

  const flush = () => {
    const listBlock = flushList(list.splice(0), `list-${blocks.length}`);
    if (listBlock) blocks.push(listBlock);
    const paragraphBlock = flushParagraph(paragraph.splice(0), `p-${blocks.length}`);
    if (paragraphBlock) blocks.push(paragraphBlock);
  };

  for (const line of lines) {
    const trimmed = line.trim();

    if (trimmed.startsWith("```")) {
      if (codeBlock) {
        blocks.push(<pre key={`code-${blocks.length}`}><code>{codeBlock.join("\n")}</code></pre>);
        codeBlock = null;
      } else {
        flush();
        codeBlock = [];
      }
      continue;
    }

    if (codeBlock) {
      codeBlock.push(line);
      continue;
    }

    if (!trimmed) {
      flush();
      continue;
    }

    const heading = trimmed.match(/^(#{1,3})\s+(.+)$/);
    if (heading) {
      flush();
      const level = heading[1].length;
      const children = inlineMarkdown(heading[2]);
      if (level === 1) blocks.push(<h3 key={`h-${blocks.length}`}>{children}</h3>);
      else if (level === 2) blocks.push(<h4 key={`h-${blocks.length}`}>{children}</h4>);
      else blocks.push(<h5 key={`h-${blocks.length}`}>{children}</h5>);
      continue;
    }

    const bullet = trimmed.match(/^[-*]\s+(.+)$/);
    const ordered = trimmed.match(/^\d+\.\s+(.+)$/);
    if (bullet || ordered) {
      const paragraphBlock = flushParagraph(paragraph.splice(0), `p-${blocks.length}`);
      if (paragraphBlock) blocks.push(paragraphBlock);
      list.push((bullet ?? ordered)![1]);
      continue;
    }

    paragraph.push(trimmed);
  }

  flush();
  if (codeBlock) blocks.push(<pre key={`code-${blocks.length}`}><code>{codeBlock.join("\n")}</code></pre>);

  return <div className="copilot-markdown">{blocks}</div>;
}
