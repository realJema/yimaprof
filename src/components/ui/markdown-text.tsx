import React from 'react';
import { LatexText } from './latex-text';

interface MarkdownTextProps {
  text: string | undefined | null;
  className?: string;
}

/**
 * MarkdownText renders text with basic markdown formatting + LaTeX support.
 * Supports: **bold**, *italic*, - lists, | tables |, line breaks.
 * Falls through to LatexText for LaTeX content.
 */
export function MarkdownText({ text, className }: MarkdownTextProps) {
  if (!text) return null;

  // Check if text has markdown syntax
  const hasMarkdown = /(\*\*|__|\*|_(?!\s)|- |\|.*\||\n)/.test(text);

  if (!hasMarkdown) {
    return <LatexText text={text} className={className} />;
  }

  // Check if it's a table
  if (text.includes('|') && text.split('\n').filter(line => line.trim().startsWith('|')).length >= 2) {
    return <div className={className}>{renderTable(text)}</div>;
  }

  // Split by lines and render
  const lines = text.split('\n');
  
  // Check if it's a list
  const isList = lines.some(line => /^\s*[-*]\s/.test(line));
  
  if (isList) {
    return (
      <div className={className}>
        {renderList(lines)}
      </div>
    );
  }

  // General markdown rendering
  return (
    <div className={className}>
      {lines.map((line, i) => (
        <React.Fragment key={i}>
          {renderInlineMarkdown(line)}
          {i < lines.length - 1 && <br />}
        </React.Fragment>
      ))}
    </div>
  );
}

function renderInlineMarkdown(text: string): React.ReactNode {
  // Handle bold **text** or __text__
  const parts: React.ReactNode[] = [];
  const pattern = /(\*\*(.+?)\*\*|__(.+?)__|\*(.+?)\*|_(.+?)_)/g;
  let lastIndex = 0;
  let match;

  while ((match = pattern.exec(text)) !== null) {
    // Text before the match
    if (match.index > lastIndex) {
      const before = text.slice(lastIndex, match.index);
      parts.push(<LatexText key={`t-${lastIndex}`} text={before} />);
    }

    if (match[2] || match[3]) {
      // Bold
      const boldText = match[2] || match[3];
      parts.push(<strong key={`b-${match.index}`}><LatexText text={boldText} /></strong>);
    } else if (match[4] || match[5]) {
      // Italic
      const italicText = match[4] || match[5];
      parts.push(<em key={`i-${match.index}`}><LatexText text={italicText} /></em>);
    }

    lastIndex = match.index + match[0].length;
  }

  // Remaining text
  if (lastIndex < text.length) {
    parts.push(<LatexText key={`t-${lastIndex}`} text={text.slice(lastIndex)} />);
  }

  if (parts.length === 0) {
    return <LatexText text={text} />;
  }

  return <>{parts}</>;
}

function renderList(lines: string[]): React.ReactNode {
  const items: React.ReactNode[] = [];
  const nonListLines: React.ReactNode[] = [];

  lines.forEach((line, i) => {
    const listMatch = line.match(/^\s*[-*]\s+(.+)/);
    if (listMatch) {
      items.push(
        <li key={i} className="text-sm">
          {renderInlineMarkdown(listMatch[1])}
        </li>
      );
    } else if (line.trim()) {
      nonListLines.push(
        <p key={`p-${i}`} className="text-sm mb-1">
          {renderInlineMarkdown(line)}
        </p>
      );
    }
  });

  return (
    <>
      {nonListLines}
      {items.length > 0 && <ul className="list-disc list-inside space-y-1">{items}</ul>}
    </>
  );
}

function renderTable(text: string): React.ReactNode {
  const lines = text.split('\n').filter(line => line.trim());
  const tableLines = lines.filter(line => line.trim().startsWith('|'));
  
  if (tableLines.length < 2) {
    return <LatexText text={text} />;
  }

  const parseRow = (line: string): string[] => {
    return line.split('|').filter((_, i, arr) => i > 0 && i < arr.length - 1).map(cell => cell.trim());
  };

  const headerCells = parseRow(tableLines[0]);
  
  // Check if second line is separator (---)
  const isSeparator = tableLines[1] && /^\|[\s-:|]+\|$/.test(tableLines[1].trim());
  const dataStartIndex = isSeparator ? 2 : 1;
  const dataRows = tableLines.slice(dataStartIndex);

  // Render any text before the table
  const preTableLines = lines.filter(line => !line.trim().startsWith('|'));

  return (
    <>
      {preTableLines.map((line, i) => (
        <p key={`pre-${i}`} className="text-sm mb-2">
          {renderInlineMarkdown(line)}
        </p>
      ))}
      <div className="overflow-x-auto my-2">
        <table className="min-w-full border-collapse border border-border text-sm">
          <thead>
            <tr className="bg-muted/50">
              {headerCells.map((cell, i) => (
                <th key={i} className="border border-border px-3 py-2 text-left font-semibold">
                  {renderInlineMarkdown(cell)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {dataRows.map((row, rowIdx) => {
              const cells = parseRow(row);
              return (
                <tr key={rowIdx} className={rowIdx % 2 === 0 ? '' : 'bg-muted/20'}>
                  {cells.map((cell, cellIdx) => (
                    <td key={cellIdx} className="border border-border px-3 py-2">
                      {renderInlineMarkdown(cell)}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}

export default MarkdownText;
