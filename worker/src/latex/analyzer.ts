export interface AnalysisResult {
  words: number;
  characters: number;
  sentences: number;
  paragraphs: number;
  figures: number;
  tables: number;
  equations: number;
  references: {
    bibItems: number;
    uniqueCiteKeys: number;
  };
  sections: {
    abstract?: { words: number };
  };
}

const ENVIRONMENTS_TO_EXCLUDE = [
  'figure',
  'table',
  'tabular',
  'tikzpicture',
  'lstlisting',
  'verbatim',
  'minted',
  'equation',
  'equation*',
  'align',
  'align*',
  'gather',
  'gather*',
  'displaymath',
  'math',
  'eqnarray',
];

function stripComments(input: string): string {
  return input
    .split(/\r?\n/)
    .map((line) => {
      let out = '';
      let i = 0;
      while (i < line.length) {
        const c = line[i];
        if (c === '%' && (i === 0 || line[i - 1] !== '\\')) break;
        out += c;
        i += 1;
      }
      return out;
    })
    .join('\n');
}

function removeEnvironment(content: string, env: string): string {
  const pattern = new RegExp(`\\\\begin\\{${env}\\}(?:[\\s\\S]*?)\\\\end\\{${env}\\}`,'g');
  return content.replace(pattern, ' ');
}

function removeMath(content: string): string {
  content = content.replace(/\$\$[\s\S]*?\$\$/g, ' ');
  content = content.replace(/\$[^\$]*\$/g, ' ');
  content = content.replace(/\\\[[\s\S]*?\\\]/g, ' ');
  content = content.replace(/\\\([\s\S]*?\\\)/g, ' ');
  return content;
}

function keepArgumentTextWhereApplicable(content: string): string {
  return content.replace(/\\[a-zA-Z]+\*?\s*(?:\[[^\]]*\])?\s*\{([^{}]*)\}/g, '$1');
}

function removeRemainingCommands(content: string): string {
  return content.replace(/\\[a-zA-Z@]+\*?(?:\[[^\]]*\])?/g, ' ');
}

function normalizeSpaces(content: string): string {
  return content.replace(/[\t\f\v]+/g, ' ').replace(/\s{2,}/g, ' ').trim();
}

function countWords(text: string): number {
  const tokens = text
    .split(/\s+/)
    .map((t) => t.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, ''))
    .filter(Boolean);
  return tokens.length;
}

function countSentences(text: string): number {
  const pieces = text.split(/[.!?]+\s+/).filter((s) => s.trim().length > 0);
  return pieces.length;
}

function countParagraphs(text: string): number {
  const parts = text.split(/\n\s*\n/).filter((p) => p.trim().length > 0);
  return parts.length;
}

function countOccurrences(src: string, pattern: RegExp): number {
  return (src.match(pattern) || []).length;
}

function extractAbstractWords(src: string): number | undefined {
  const m = src.match(/\\begin\{abstract\}([\s\S]*?)\\end\{abstract\}/);
  if (!m) return undefined;
  const cleaned = analyzeLatex(m[1]).words;
  return cleaned;
}

export function analyzeLatex(raw: string): AnalysisResult {
  const original = raw;
  const figures = countOccurrences(original, /\\begin\{figure\}/g);
  const tables = countOccurrences(original, /\\begin\{table\}/g);
  const equations =
    countOccurrences(original, /\\begin\{equation\*?\}/g) +
    countOccurrences(original, /\$\$[\s\S]*?\$\$/g) +
    countOccurrences(original, /\\\[[\s\S]*?\\\]/g);

  const bibItems = countOccurrences(original, /\\bibitem\b/g);
  const citeKeys = new Set<string>();
  for (const m of original.matchAll(/\\cite\w*\*?\s*(?:\[[^\]]*\])?\s*\{([^}]*)\}/g)) {
    const keys = m[1].split(',').map((k) => k.trim()).filter(Boolean);
    for (const k of keys) citeKeys.add(k);
  }

  let content = stripComments(original);
  for (const env of ENVIRONMENTS_TO_EXCLUDE) {
    content = removeEnvironment(content, env);
  }
  content = removeMath(content);
  content = content.replace(/\\(?:label|ref|pageref|eqref|autoref)\*?\s*\{[^}]*\}/g, ' ');
  content = content.replace(/\\cite\w*\*?\s*(?:\[[^\]]*\])?\s*\{[^}]*\}/g, ' ');
  content = keepArgumentTextWhereApplicable(content);
  content = removeRemainingCommands(content);

  const characters = normalizeSpaces(content).replace(/\s/g, '').length;
  const words = countWords(content);
  const sentences = countSentences(content);
  const paragraphs = countParagraphs(content);
  const abstractWords = extractAbstractWords(original);

  return {
    words,
    characters,
    sentences,
    paragraphs,
    figures,
    tables,
    equations,
    references: { bibItems, uniqueCiteKeys: citeKeys.size },
    sections: { abstract: abstractWords !== undefined ? { words: abstractWords } : undefined },
  };
}


