import React, { useState } from 'react';
import { Eye, Copy, Check, Maximize2 } from 'lucide-react';
import katex from 'katex';

interface FormattedContentProps {
  content: string;
  onSaveToNotes?: (snippet: string) => void;
}

/**
 * Safely renders LaTeX mathematical / chemical formulas using KaTeX.
 * Supports inline equations ($...$, \(...\)) and block equations ($$...$$, \[...\]).
 */
export const renderKatex = (expression: string, isBlock: boolean = false): string => {
  try {
    let clean = expression.trim();
    // Normalize unicode arrows or escaped LaTeX arrows if needed
    clean = clean.replace(/\\longrightarrow/g, '\\rightarrow');
    return katex.renderToString(clean, {
      displayMode: isBlock,
      throwOnError: false,
      output: 'htmlAndMathml',
      strict: false,
    });
  } catch (err) {
    return `<span class="text-purple-300 font-mono">${expression}</span>`;
  }
};

export const FormattedContent: React.FC<FormattedContentProps> = ({ content, onSaveToNotes }) => {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [expandedSvg, setExpandedSvg] = useState<string | null>(null);

  const handleCopy = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  // Check if a line is a markdown table separator (e.g. |---|---|)
  const isTableSeparator = (line: string): boolean => {
    return /^\|?(\s*:?-+:?\s*\|)+\s*:?-+:?\s*\|?$/.test(line.trim());
  };

  // Check if a line is a markdown table row (starts/ends with | or contains multiple |)
  const isTableRow = (line: string): boolean => {
    const trimmed = line.trim();
    return trimmed.startsWith('|') && trimmed.endsWith('|') && trimmed.includes('|');
  };

  // Render markdown table rows into styled HTML table
  const renderTable = (tableLines: string[], key: string | number) => {
    if (tableLines.length < 2) return null;
    const headerRow = tableLines[0];
    const bodyRows = tableLines.slice(2); // Skip separator row

    const parseCells = (row: string) => {
      return row
        .trim()
        .replace(/^\|/, '')
        .replace(/\|$/, '')
        .split('|')
        .map(c => c.trim());
    };

    const headers = parseCells(headerRow);

    return (
      <div key={key} className="my-4 overflow-x-auto rounded-xl border border-purple-500/30 bg-slate-950/70 shadow-md">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-purple-500/30 bg-purple-950/50">
              {headers.map((h, i) => (
                <th key={i} className="py-2.5 px-3.5 font-bold text-purple-200">
                  {renderInline(h)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {bodyRows.map((row, rIdx) => {
              const cells = parseCells(row);
              return (
                <tr key={rIdx} className="hover:bg-slate-900/60 transition-colors">
                  {cells.map((c, cIdx) => (
                    <td key={cIdx} className="py-2.5 px-3.5 text-slate-300">
                      {renderInline(c)}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  };

  // Parse blocks: checks for code blocks, SVG diagrams, block math, tables, lists, headers
  const renderBlocks = () => {
    // Strip metadata tags if present
    const cleanContent = content
      .replace(/<<<SUGGESTIONS:[\s\S]*?>>>/g, '')
      .replace(/<<<QUIZ:[\s\S]*?>>>/g, '')
      .trim();

    const lines = cleanContent.split('\n');
    const elements: React.ReactNode[] = [];
    let currentParagraph: string[] = [];
    let inCodeBlock = false;
    let codeLanguage = '';
    let codeContent: string[] = [];
    let inTable = false;
    let tableLines: string[] = [];
    let inBlockMath = false;
    let mathBlockContent: string[] = [];
    let blockCounter = 0;

    const flushParagraph = () => {
      if (currentParagraph.length > 0) {
        const text = currentParagraph.join('\n').trim();
        if (text) {
          elements.push(
            <div key={`p-${blockCounter++}`} className="my-2 leading-relaxed text-slate-200 font-normal">
              {renderInline(text)}
            </div>
          );
        }
        currentParagraph = [];
      }
    };

    const flushTable = () => {
      if (tableLines.length > 0) {
        elements.push(renderTable(tableLines, `table-${blockCounter++}`));
        tableLines = [];
        inTable = false;
      }
    };

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();

      // Block math delimiter: $$ or \[
      if (trimmed === '$$' || trimmed === '\\[' || trimmed.startsWith('$$') && trimmed.endsWith('$$') && trimmed.length > 4) {
        flushParagraph();
        flushTable();

        if (trimmed.startsWith('$$') && trimmed.endsWith('$$') && trimmed.length > 4) {
          // Single-line block math
          const math = trimmed.slice(2, -2).trim();
          elements.push(
            <div 
              key={`math-${blockCounter++}`} 
              className="my-3 py-3 px-4 rounded-xl bg-purple-950/30 border border-purple-500/25 overflow-x-auto text-center shadow-inner"
              dangerouslySetInnerHTML={{ __html: renderKatex(math, true) }}
            />
          );
          continue;
        }

        if (!inBlockMath) {
          inBlockMath = true;
          mathBlockContent = [];
        } else {
          inBlockMath = false;
          const fullMath = mathBlockContent.join('\n').trim();
          elements.push(
            <div 
              key={`math-${blockCounter++}`} 
              className="my-3 py-3 px-4 rounded-xl bg-purple-950/30 border border-purple-500/25 overflow-x-auto text-center shadow-inner"
              dangerouslySetInnerHTML={{ __html: renderKatex(fullMath, true) }}
            />
          );
          mathBlockContent = [];
        }
        continue;
      }

      if (inBlockMath) {
        if (trimmed === '$$' || trimmed === '\\]') {
          inBlockMath = false;
          const fullMath = mathBlockContent.join('\n').trim();
          elements.push(
            <div 
              key={`math-${blockCounter++}`} 
              className="my-3 py-3 px-4 rounded-xl bg-purple-950/30 border border-purple-500/25 overflow-x-auto text-center shadow-inner"
              dangerouslySetInnerHTML={{ __html: renderKatex(fullMath, true) }}
            />
          );
          mathBlockContent = [];
        } else {
          mathBlockContent.push(line);
        }
        continue;
      }

      // Check for standalone chemical/physics formula without delimiters (e.g. 2\text{H}_2 + \text{O}_2 \longrightarrow 2\text{H}_2\text{O})
      if (!inCodeBlock && (trimmed.includes('\\text{') || trimmed.includes('\\longrightarrow') || trimmed.includes('\\frac{') || trimmed.includes('\\sqrt{')) && !trimmed.startsWith('#') && !trimmed.startsWith('-') && !trimmed.startsWith('*')) {
        flushParagraph();
        flushTable();
        elements.push(
          <div 
            key={`math-raw-${blockCounter++}`} 
            className="my-3 py-3 px-4 rounded-xl bg-purple-950/30 border border-purple-500/25 overflow-x-auto text-center shadow-inner"
            dangerouslySetInnerHTML={{ __html: renderKatex(trimmed, true) }}
          />
        );
        continue;
      }

      // Code block start or end
      if (trimmed.startsWith('```')) {
        flushParagraph();
        flushTable();

        if (!inCodeBlock) {
          inCodeBlock = true;
          codeLanguage = trimmed.replace(/^```/, '').trim().toLowerCase();
          codeContent = [];
        } else {
          inCodeBlock = false;
          const fullCode = codeContent.join('\n');
          const currentIdx = blockCounter++;

          // If math or latex inside code block, render with KaTeX instead of raw code block!
          if (codeLanguage === 'math' || codeLanguage === 'latex' || codeLanguage === 'tex') {
            elements.push(
              <div 
                key={`math-code-${currentIdx}`} 
                className="my-3 py-3 px-4 rounded-xl bg-purple-950/30 border border-purple-500/25 overflow-x-auto text-center shadow-inner"
                dangerouslySetInnerHTML={{ __html: renderKatex(fullCode, true) }}
              />
            );
          } else if (codeLanguage === 'xml:svg' || codeLanguage === 'svg' || (fullCode.includes('<svg') && fullCode.includes('</svg>'))) {
            // Render interactive SVG diagram
            const svgMatch = fullCode.match(/<svg[\s\S]*<\/svg>/i);
            const svgMarkup = svgMatch ? svgMatch[0] : fullCode;

            elements.push(
              <div key={`svg-${currentIdx}`} className="my-4 rounded-xl overflow-hidden border border-purple-500/30 bg-slate-950/80 shadow-lg shadow-purple-950/20">
                <div className="flex items-center justify-between px-4 py-2 bg-purple-950/40 border-b border-purple-500/20 text-xs text-purple-300 font-medium">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-purple-400 animate-pulse" />
                    Interactive Conceptual Diagram
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setExpandedSvg(svgMarkup)}
                      className="flex items-center gap-1 px-2 py-1 rounded bg-purple-900/40 hover:bg-purple-800/60 text-purple-200 transition-colors text-[11px]"
                      title="Enlarge diagram"
                    >
                      <Maximize2 className="w-3.5 h-3.5" />
                      Expand
                    </button>
                    <button
                      onClick={() => handleCopy(svgMarkup, currentIdx)}
                      className="flex items-center gap-1 px-2 py-1 rounded bg-purple-900/40 hover:bg-purple-800/60 text-purple-200 transition-colors text-[11px]"
                    >
                      {copiedIndex === currentIdx ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      {copiedIndex === currentIdx ? 'Copied' : 'Copy SVG'}
                    </button>
                  </div>
                </div>
                <div 
                  className="p-4 flex items-center justify-center max-w-full overflow-x-auto [&>svg]:max-w-full [&>svg]:h-auto [&>svg]:rounded-lg"
                  dangerouslySetInnerHTML={{ __html: svgMarkup }}
                />
              </div>
            );
          } else {
            // Regular code block
            elements.push(
              <div key={`code-${currentIdx}`} className="my-3 rounded-xl overflow-hidden border border-slate-700/60 bg-slate-950/90 font-mono text-xs shadow-inner">
                <div className="flex items-center justify-between px-3 py-1.5 bg-slate-900 border-b border-slate-800 text-slate-400 text-[11px]">
                  <span>{codeLanguage || 'code'}</span>
                  <button
                    onClick={() => handleCopy(fullCode, currentIdx)}
                    className="flex items-center gap-1 hover:text-purple-300 transition-colors"
                  >
                    {copiedIndex === currentIdx ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    {copiedIndex === currentIdx ? 'Copied' : 'Copy'}
                  </button>
                </div>
                <pre className="p-3 overflow-x-auto text-purple-200/90 leading-relaxed font-mono">
                  <code>{fullCode}</code>
                </pre>
              </div>
            );
          }
        }
        continue;
      }

      if (inCodeBlock) {
        codeContent.push(line);
        continue;
      }

      // Markdown Table detection
      if (isTableRow(line)) {
        flushParagraph();
        if (!inTable) {
          inTable = true;
          tableLines = [line];
        } else {
          tableLines.push(line);
        }
        continue;
      } else if (inTable) {
        flushTable();
      }

      // Headers
      if (line.startsWith('### ')) {
        flushParagraph();
        elements.push(
          <h3 key={`h3-${blockCounter++}`} className="text-base font-semibold text-purple-200 mt-4 mb-2 flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />
            {renderInline(line.replace('### ', ''))}
          </h3>
        );
        continue;
      }
      if (line.startsWith('## ')) {
        flushParagraph();
        elements.push(
          <h2 key={`h2-${blockCounter++}`} className="text-lg font-bold text-white mt-5 mb-2.5 pb-1 border-b border-purple-500/20">
            {renderInline(line.replace('## ', ''))}
          </h2>
        );
        continue;
      }
      if (line.startsWith('# ')) {
        flushParagraph();
        elements.push(
          <h1 key={`h1-${blockCounter++}`} className="text-xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-purple-200 via-violet-300 to-indigo-200 mt-4 mb-3">
            {renderInline(line.replace('# ', ''))}
          </h1>
        );
        continue;
      }

      // Bullet points (- or *)
      if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
        flushParagraph();
        const bulletText = trimmed.replace(/^[-*]\s+/, '');
        elements.push(
          <div key={`li-${blockCounter++}`} className="flex items-start gap-2.5 my-1.5 pl-2 text-slate-200">
            <span className="w-1.5 h-1.5 rounded-full bg-purple-400 mt-2 shrink-0" />
            <div className="flex-1 text-sm leading-relaxed">{renderInline(bulletText)}</div>
          </div>
        );
        continue;
      }

      // Numbered list
      const numMatch = trimmed.match(/^(\d+)\.\s+(.*)/);
      if (numMatch) {
        flushParagraph();
        elements.push(
          <div key={`num-${blockCounter++}`} className="flex items-start gap-2.5 my-1.5 pl-2 text-slate-200">
            <span className="text-xs font-bold text-purple-400 min-w-5 pt-0.5">{numMatch[1]}.</span>
            <div className="flex-1 text-sm leading-relaxed">{renderInline(numMatch[2])}</div>
          </div>
        );
        continue;
      }

      // Blockquotes or tips
      if (trimmed.startsWith('>')) {
        flushParagraph();
        elements.push(
          <div key={`quote-${blockCounter++}`} className="my-3 pl-3.5 border-l-2 border-purple-500 bg-purple-950/20 py-2 pr-3 rounded-r-lg text-sm text-purple-200 italic">
            {renderInline(trimmed.replace(/^>\s*/, ''))}
          </div>
        );
        continue;
      }

      // Empty line breaks
      if (!trimmed) {
        flushParagraph();
        continue;
      }

      currentParagraph.push(line);
    }

    flushParagraph();
    flushTable();
    return elements;
  };

  /**
   * Render inline formatting:
   * - Block/Inline KaTeX Math: $$...$$, \[...\], \(...\), $...$
   * - Bold: **...**
   * - Italic: *...*
   * - Inline Code: `...`
   */
  const renderInline = (text: string): React.ReactNode => {
    // Regex splits on:
    // 1. $$...$$
    // 2. \[...\]
    // 3. \(...\)
    // 4. $...$
    // 5. `...`
    // 6. **...**
    // 7. *...*
    const parts = text.split(/(\$\$[^\$]+\$\$|\\\[[\s\S]+?\\\]|\\\([^\)]+\\\)|\$[^\$]+\$|`[^`]+`|\*\*[^\*]+\*\*|\*[^\*]+\*)/g);

    return parts.map((part, idx) => {
      if (!part) return null;

      // Block math inline: $$...$$ or \[...\]
      if (
        (part.startsWith('$$') && part.endsWith('$$') && part.length > 4) ||
        (part.startsWith('\\[') && part.endsWith('\\]') && part.length > 4)
      ) {
        const mathExpr = part.startsWith('$$') ? part.slice(2, -2) : part.slice(2, -2);
        return (
          <span 
            key={idx}
            className="inline-block my-1 px-2.5 py-1 rounded bg-purple-950/40 border border-purple-500/30 align-middle"
            dangerouslySetInnerHTML={{ __html: renderKatex(mathExpr, true) }}
          />
        );
      }

      // Inline LaTeX math: $...$ or \(...\)
      if (
        (part.startsWith('$') && part.endsWith('$') && part.length > 2) ||
        (part.startsWith('\\(') && part.endsWith('\\)') && part.length > 4)
      ) {
        const mathExpr = part.startsWith('$') ? part.slice(1, -1) : part.slice(2, -2);
        return (
          <span 
            key={idx} 
            className="inline-flex items-center px-1.5 py-0.5 mx-0.5 rounded bg-purple-950/50 border border-purple-500/30 text-purple-100 text-sm align-baseline"
            dangerouslySetInnerHTML={{ __html: renderKatex(mathExpr, false) }}
          />
        );
      }

      // Inline code: `...` (only non-math code)
      if (part.startsWith('`') && part.endsWith('`') && part.length > 2) {
        const codeContent = part.slice(1, -1);
        // If accidental math inside backticks like `F = m * a` or `2H2 + O2`
        if (codeContent.includes('\\') || codeContent.includes('->') || codeContent.includes('longrightarrow')) {
          return (
            <span 
              key={idx} 
              className="inline-flex items-center px-1.5 py-0.5 mx-0.5 rounded bg-purple-950/50 border border-purple-500/30 text-purple-100 text-sm align-baseline"
              dangerouslySetInnerHTML={{ __html: renderKatex(codeContent, false) }}
            />
          );
        }
        return (
          <code key={idx} className="px-1.5 py-0.5 rounded bg-slate-800 text-purple-300 font-mono text-xs border border-slate-700">
            {codeContent}
          </code>
        );
      }

      // Bold: **...**
      if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
        return (
          <strong key={idx} className="font-semibold text-white">
            {renderInline(part.slice(2, -2))}
          </strong>
        );
      }

      // Italics: *...*
      if (part.startsWith('*') && part.endsWith('*') && part.length > 2) {
        return (
          <em key={idx} className="italic text-purple-200/90">
            {part.slice(1, -1)}
          </em>
        );
      }

      return part;
    });
  };

  return (
    <div className="text-sm leading-relaxed select-text space-y-1">
      {renderBlocks()}

      {/* Expanded Diagram Modal */}
      {expandedSvg && (
        <div 
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4"
          onClick={() => setExpandedSvg(null)}
        >
          <div 
            className="bg-slate-900 border border-purple-500/40 rounded-2xl p-6 max-w-4xl w-full max-h-[90vh] overflow-auto shadow-2xl relative"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-4 border-b border-purple-500/20 mb-4">
              <h4 className="text-purple-200 font-semibold text-base flex items-center gap-2">
                <Eye className="w-4 h-4 text-purple-400" />
                Conceptual Diagram Full View
              </h4>
              <button
                onClick={() => setExpandedSvg(null)}
                className="px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs transition-colors"
              >
                Close
              </button>
            </div>
            <div 
              className="flex justify-center p-4 bg-slate-950 rounded-xl overflow-auto [&>svg]:max-w-full [&>svg]:h-auto"
              dangerouslySetInnerHTML={{ __html: expandedSvg }}
            />
          </div>
        </div>
      )}
    </div>
  );
};
