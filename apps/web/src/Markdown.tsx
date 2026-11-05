// Dependency-free markdown subset for agent replies: fences, headings, lists, quotes,
// inline code, bold/italic and links. Anything else renders as plain text.
import type { ReactNode } from 'react'

type Block =
  | { type: 'code'; text: string }
  | { type: 'heading'; text: string }
  | { type: 'item'; marker: string; text: string }
  | { type: 'quote'; text: string }
  | { type: 'table'; head: string[]; rows: string[][] }
  | { type: 'paragraph'; text: string }

export function Markdown({ text }: { text: string }) {
  return (
    <div className="md">
      {parseBlocks(text).map((block, index) => {
        switch (block.type) {
          case 'code':
            return (
              <pre key={index} className="md-code">
                {block.text}
              </pre>
            )
          case 'heading':
            return (
              <p key={index} className="md-heading">
                {inline(block.text)}
              </p>
            )
          case 'item':
            return (
              <p key={index} className="md-item">
                <span className="md-marker">{block.marker}</span>
                {inline(block.text)}
              </p>
            )
          case 'quote':
            return (
              <p key={index} className="md-quote">
                {inline(block.text)}
              </p>
            )
          case 'table':
            return (
              <div key={index} className="md-table-wrap">
                <table className="md-table">
                  <thead>
                    <tr>
                      {block.head.map((cell, cellIndex) => (
                        <th key={cellIndex}>{inline(cell)}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {block.rows.map((row, rowIndex) => (
                      <tr key={rowIndex}>
                        {row.map((cell, cellIndex) => (
                          <td key={cellIndex}>{inline(cell)}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          default:
            return <p key={index}>{inline(block.text)}</p>
        }
      })}
    </div>
  )
}

function parseBlocks(text: string): Block[] {
  const blocks: Block[] = []
  const lines = text.split('\n')
  let paragraph: string[] = []

  const flush = () => {
    if (paragraph.length > 0) {
      blocks.push({ type: 'paragraph', text: paragraph.join('\n') })
      paragraph = []
    }
  }

  for (let index = 0; index < lines.length; index++) {
    const line = lines[index]!
    if (line.startsWith('```')) {
      flush()
      const body: string[] = []
      index += 1
      while (index < lines.length && !lines[index]!.startsWith('```')) {
        body.push(lines[index]!)
        index += 1
      }
      blocks.push({ type: 'code', text: body.join('\n') })
      continue
    }
    const heading = /^(#{1,6})\s+(.*)$/.exec(line)
    if (heading) {
      flush()
      blocks.push({ type: 'heading', text: heading[2]! })
      continue
    }
    if (line.trim().startsWith('|')) {
      const rows: string[] = []
      let cursor = index
      while (cursor < lines.length && lines[cursor]!.trim().startsWith('|')) {
        rows.push(lines[cursor]!)
        cursor += 1
      }
      if (rows.length >= 2 && isTableDivider(rows[1]!)) {
        flush()
        blocks.push({
          type: 'table',
          head: splitRow(rows[0]!),
          rows: rows.slice(2).map(splitRow)
        })
        index = cursor - 1
        continue
      }
    }
    const bullet = /^\s*[-*+]\s+(.*)$/.exec(line)
    if (bullet) {
      flush()
      blocks.push({ type: 'item', marker: '•', text: bullet[1]! })
      continue
    }
    const ordered = /^\s*\d+[.)]\s+(.*)$/.exec(line)
    if (ordered) {
      flush()
      blocks.push({ type: 'item', marker: `${ordered[0]!.trim().split(/[.)]/)[0]}.`, text: ordered[1]! })
      continue
    }
    const quote = /^>\s?(.*)$/.exec(line)
    if (quote) {
      flush()
      blocks.push({ type: 'quote', text: quote[1]! })
      continue
    }
    if (line.trim() === '') {
      flush()
      continue
    }
    paragraph.push(line)
  }
  flush()
  return blocks
}

function splitRow(row: string): string[] {
  return row
    .trim()
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split('|')
    .map((cell) => cell.trim())
}

function isTableDivider(row: string): boolean {
  const cells = splitRow(row)
  return cells.length > 0 && cells.every((cell) => /^:?-{2,}:?$/.test(cell))
}

const INLINE_PATTERN = /(`[^`\n]+`|\*\*[^*\n]+\*\*|\*[^*\n]+\*|\[[^\]]+\]\([^)\s]+\))/g

function inline(text: string): ReactNode[] {
  const nodes: ReactNode[] = []
  let last = 0
  for (const match of text.matchAll(INLINE_PATTERN)) {
    const token = match[0]
    const start = match.index ?? 0
    if (start > last) {
      nodes.push(text.slice(last, start))
    }
    if (token.startsWith('`')) {
      nodes.push(
        <code key={start} className="md-inline-code">
          {token.slice(1, -1)}
        </code>
      )
    } else if (token.startsWith('**')) {
      nodes.push(<strong key={start}>{inline(token.slice(2, -2))}</strong>)
    } else if (token.startsWith('[')) {
      const link = /^\[([^\]]+)\]\(([^)]+)\)$/.exec(token)
      nodes.push(
        <a key={start} href={link?.[2]} target="_blank" rel="noreferrer noopener">
          {link?.[1] ?? token}
        </a>
      )
    } else {
      nodes.push(<em key={start}>{inline(token.slice(1, -1))}</em>)
    }
    last = start + token.length
  }
  if (last < text.length) {
    nodes.push(text.slice(last))
  }
  return nodes
}
