import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import clsx from "clsx";

/**
 * Markdown from Jarvis or from a document, rendered: headings, lists, tables, code and math.
 * Nothing widens its container: long words wrap, and a wide table, code block or formula
 * scrolls sideways inside it (a phone-width card never scrolls the page).
 */
export function Markdown({ children, className }: { children: string; className?: string }) {
  return (
    <div
      className={clsx(
        `prose prose-sm max-w-none min-w-0 text-primary text-sm leading-relaxed [overflow-wrap:anywhere]
        prose-table:block prose-table:max-w-full prose-table:overflow-x-auto prose-table:[overflow-wrap:normal]
        prose-pre:max-w-full prose-pre:overflow-x-auto prose-pre:[overflow-wrap:normal]
        [&_.katex-display]:max-w-full [&_.katex-display]:overflow-x-auto [&_.katex-display]:overflow-y-hidden
        prose-headings:text-primary prose-headings:font-semibold prose-headings:mt-3 prose-headings:mb-1
        prose-p:text-primary prose-p:leading-relaxed prose-p:my-2
        prose-strong:text-primary
        prose-code:text-terra prose-code:bg-surface-subtle prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:text-xs prose-code:before:content-none prose-code:after:content-none
        prose-pre:bg-surface-muted prose-pre:border prose-pre:border-border prose-pre:rounded-lg prose-pre:my-2
        prose-li:text-primary prose-li:my-0
        prose-ul:my-1 prose-ol:my-1
        prose-a:text-dusk prose-a:no-underline hover:prose-a:underline
        prose-h1:text-lg prose-h2:text-base prose-h3:text-sm
        prose-blockquote:border-terra prose-blockquote:text-secondary prose-blockquote:not-italic prose-blockquote:font-normal
        [&_blockquote_p]:before:content-none [&_blockquote_p]:after:content-none
        prose-table:text-sm prose-th:text-primary prose-td:text-primary`,
        className,
      )}
    >
      <ReactMarkdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeKatex]}>
        {children}
      </ReactMarkdown>
    </div>
  );
}
