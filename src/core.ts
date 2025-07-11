import * as path from 'path';
import { readFile } from 'fs/promises';

export async function parseCoverageAndFormat(
  coverage: Record<string, any>,
  rootFilePath?: string
): Promise<string> {
  const result: string[] = [];

  result.push('## ❗ Here are the files and code blocks that are not covered by tests\n');

  for (const filePath in coverage) {
    const data = coverage[filePath];
    const absPath = path.resolve(path.dirname(rootFilePath || '.'), filePath);

    let lines: string[];
    try {
      const raw = await readFile(absPath, 'utf8');
      lines = raw.split('\n');
    } catch {
      continue;
    }

    const uncoveredLines = new Set<number>();

    for (const [id, count] of Object.entries(data.s)) {
      if (count === 0) {
        const stmt = data.statementMap[id];
        const start = stmt.start.line - 1;
        const end = stmt.end.line - 1;
        for (let i = start; i <= end; i++) uncoveredLines.add(i);
      }
    }

    if (uncoveredLines.size === 0) continue;

    const sorted = [...uncoveredLines].sort((a, b) => a - b);
    const groups = groupLineRanges(sorted);

    result.push(`### \`${filePath}\`\n`);

    for (const group of groups) {
      const context = new Set<number>();
      for (const line of group) {
        for (let d = -1; d <= 1; d++) {
          const ctx = line + d;
          if (ctx >= 0 && ctx < lines.length) context.add(ctx);
        }
      }

      const contextLines = [...context].sort((a, b) => a - b);
      const label = group.length === 1
        ? `Line ${group[0] + 1}`
        : `Lines ${group[0] + 1} - ${group[group.length - 1] + 1}`;

      result.push(`#### 🧩 ${label}\n`);
      result.push('```ts');
      for (const i of contextLines) {
        const lineText = lines[i];
        const marker = uncoveredLines.has(i) ? ' // ← uncovered' : '';
        result.push(`${String(i + 1).padStart(4)}: ${lineText}${marker}`);
      }
      result.push('```\n');
    }
  }

  return result.join('\n');
}

function groupLineRanges(lines: number[]): number[][] {
  const groups: number[][] = [];
  let group: number[] = [lines[0]];

  for (let i = 1; i < lines.length; i++) {
    if (lines[i] <= lines[i - 1] + 1) {
      group.push(lines[i]);
    } else {
      groups.push(group);
      group = [lines[i]];
    }
  }
  groups.push(group);
  return groups;
}
