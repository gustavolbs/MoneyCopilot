"use client";

import type { ReactNode } from "react";

function inlineMarkdown(text: string) {
  const parts = text
    .split(/(`[^`]+`|\*\*[^*]+\*\*|__[^_]+__|\*[^*]+\*|_[^_]+_|\[[^\]]+\]\([^)]+\))/g)
    .filter(Boolean);
  return parts.map((part, index) => {
    if (part.startsWith("`") && part.endsWith("`")) {
      return <code key={index}>{part.slice(1, -1)}</code>;
    }
    if (
      (part.startsWith("**") && part.endsWith("**")) ||
      (part.startsWith("__") && part.endsWith("__"))
    ) {
      return <strong key={index}>{part.slice(2, -2)}</strong>;
    }
    if (
      (part.startsWith("*") && part.endsWith("*")) ||
      (part.startsWith("_") && part.endsWith("_"))
    ) {
      return <em key={index}>{part.slice(1, -1)}</em>;
    }
    const link = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
    if (link) {
      const href = link[2].trim();
      const isSafe = /^https?:\/\//i.test(href);
      return (
        <a
          key={index}
          href={isSafe ? href : undefined}
          target="_blank"
          rel="noreferrer"
        >
          {link[1]}
        </a>
      );
    }
    return <span key={index}>{part}</span>;
  });
}

function isTableDivider(line: string) {
  return /^\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?$/.test(line.trim());
}

function isTableLine(line: string) {
  return line.trim().includes("|");
}

function tableCells(line: string) {
  return line
    .trim()
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((cell) => cell.trim());
}

function flushTable(lines: string[], key: string) {
  if (lines.length < 2 || !isTableDivider(lines[1])) return null;
  const headers = tableCells(lines[0]);
  const rows = lines.slice(2).filter(isTableLine).map(tableCells);

  return (
    <div className="copilot-markdown-table-wrap" key={key}>
      <table>
        <thead>
          <tr>
            {headers.map((header, index) => (
              <th key={`${key}-h-${index}`}>{inlineMarkdown(header)}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rowIndex) => (
            <tr key={`${key}-r-${rowIndex}`}>
              {headers.map((_header, cellIndex) => (
                <td key={`${key}-r-${rowIndex}-${cellIndex}`}>
                  {inlineMarkdown(row[cellIndex] ?? "")}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
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

function headingBlock(level: number, children: ReactNode, key: string) {
  if (level === 1) return <h1 key={key}>{children}</h1>;
  if (level === 2) return <h2 key={key}>{children}</h2>;
  if (level === 3) return <h3 key={key}>{children}</h3>;
  if (level === 4) return <h4 key={key}>{children}</h4>;
  if (level === 5) return <h5 key={key}>{children}</h5>;
  return <h6 key={key}>{children}</h6>;
}

export function MarkdownMessage({ content }: { content: string }) {
  const blocks: ReactNode[] = [];
  const paragraph: string[] = [];
  const list: string[] = [];
  const table: string[] = [];
  const lines = content.replace(/\r\n/g, "\n").split("\n");
  let codeBlock: string[] | null = null;

  const flush = () => {
    const tableBlock = flushTable(table.splice(0), `table-${blocks.length}`);
    if (tableBlock) blocks.push(tableBlock);
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

    if (isTableLine(trimmed)) {
      const listBlock = flushList(list.splice(0), `list-${blocks.length}`);
      if (listBlock) blocks.push(listBlock);
      const paragraphBlock = flushParagraph(paragraph.splice(0), `p-${blocks.length}`);
      if (paragraphBlock) blocks.push(paragraphBlock);
      table.push(trimmed);
      continue;
    }

    const heading = trimmed.match(/^(#{1,6})\s+(.+)$/);
    if (heading) {
      flush();
      const level = heading[1].length;
      const children = inlineMarkdown(heading[2]);
      blocks.push(headingBlock(level, children, `h-${blocks.length}`));
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
