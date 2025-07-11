import { cli } from 'cleye';
import { readFile } from 'fs/promises';
import { existsSync } from 'fs';
import fsPromise from 'fs/promises';
import path from 'path';
import clipboard from 'clipboardy';
import c from 'ansis';
import { version } from './version';
import { MARK_BULLET, MARK_CHECK, MARK_ERROR, MARK_INFO } from './constant';
import { parseCoverageAndFormat } from './core';

const argv = cli({
  name: 'uncoverage',
  version,
  parameters: ['[coverageFile]'],
  flags: {
    print: {
      type: Boolean,
      description: 'Also print to stdout',
      default: false,
    },
    output: {
      type: String,
      description: 'Write output to file (Markdown)',
    },
  },
});

const coveragePath = path.resolve(argv._.coverageFile || 'coverage/coverage-final.json');

async function main() {
  console.log(c.bold(c.blue(`\n${c.bgBlue('uncoverage')} v${version} - Extract uncovered context for LLM\n`)));

  if (!existsSync(coveragePath)) {
    console.error(c.red(`${MARK_ERROR} File not found: ${coveragePath}`));
    process.exit(1);
  }

  console.log(`${MARK_INFO} Reading coverage from:\n   ${coveragePath}`);

  const raw = await readFile(coveragePath, 'utf8');
  const content = await parseCoverageAndFormat(JSON.parse(raw), coveragePath);

  if (argv.flags.output) {
    const outPath = path.resolve(argv.flags.output);
    await fsPromise.writeFile(outPath, content, 'utf8');
    console.log(`\n${MARK_CHECK} Written output to ${outPath}`);
  } else if (argv.flags.print) {
    console.log(content);
  } else {
    await clipboard.write(content);
    console.log(`\n${MARK_CHECK} Copied output to clipboard`);
  }

  console.log(c.green(`\n${MARK_CHECK} Done!\n`));
}

main().catch(err => {
  console.error(c.red(`${MARK_ERROR} Unexpected error:\n`), err);
  process.exit(1);
});
