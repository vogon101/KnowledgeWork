"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import Link from "next/link";
import { useMemo } from "react";

// Import highlight.js theme
import "highlight.js/styles/github-dark.css";

interface MarkdownProps {
  content: string;
  className?: string;
}

// Convert wikilinks [[path|label]] or [[path]] to markdown links
function processWikilinks(content: string): string {
  // Match [[path|label]] or [[path]]
  // Handle escaped pipes (\|) in table cells - they appear as \| in the source
  return content.replace(/\[\[([^\]|]+?)\\?\|([^\]]+)\]\]|\[\[([^\]]+)\]\]/g, (match, pathWithLabel, label, pathOnly) => {
    // pathWithLabel + label = [[path|label]] format (with possible escaped pipe)
    // pathOnly = [[path]] format (no label)
    const path = pathWithLabel || pathOnly;
    const displayText = label || path.split("/").pop() || path;
    // Remove .md extension for cleaner display if no label provided
    const cleanDisplay = label ? displayText : displayText.replace(/\.md$/, "");
    // Convert path to browse URL - remove any trailing backslash from escaped pipe
    const cleanPath = path.replace(/\\$/, "");
    const url = `/browse/${cleanPath.replace(/\.md$/, ".md")}`;
    return `[${cleanDisplay}](${url})`;
  });
}

export function Markdown({ content, className = "" }: MarkdownProps) {
  const processedContent = useMemo(() => processWikilinks(content), [content]);

  return (
    <div className={`prose prose-sm prose-invert max-w-none ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeHighlight]}
        components={{
          // Heading styles with proper spacing and visual hierarchy
          h1: ({ children, ...props }) => (
            <h1
              className="text-xl font-semibold text-zinc-100 mt-8 mb-4 pb-2 border-b border-zinc-700/50 first:mt-0"
              {...props}
            >
              {children}
            </h1>
          ),
          h2: ({ children, ...props }) => (
            <h2
              className="text-lg font-semibold text-zinc-200 mt-8 mb-3 pb-1.5 border-b border-zinc-800/50"
              {...props}
            >
              {children}
            </h2>
          ),
          h3: ({ children, ...props }) => (
            <h3
              className="text-base font-medium text-zinc-300 mt-6 mb-2"
              {...props}
            >
              {children}
            </h3>
          ),
          h4: ({ children, ...props }) => (
            <h4
              className="text-sm font-medium text-zinc-400 mt-4 mb-2"
              {...props}
            >
              {children}
            </h4>
          ),
          // Paragraphs with proper spacing
          p: ({ children, ...props }) => (
            <p className="mb-3 leading-relaxed" {...props}>
              {children}
            </p>
          ),
          // Lists with better spacing
          ul: ({ children, ...props }) => (
            <ul className="mb-4 ml-4 space-y-1 list-disc" {...props}>
              {children}
            </ul>
          ),
          ol: ({ children, ...props }) => (
            <ol className="mb-4 ml-4 space-y-1 list-decimal" {...props}>
              {children}
            </ol>
          ),
          li: ({ children, ...props }) => (
            <li className="leading-relaxed" {...props}>
              {children}
            </li>
          ),
          // Horizontal rules
          hr: ({ ...props }) => (
            <hr className="my-6 border-zinc-700/50" {...props} />
          ),
          // Blockquotes
          blockquote: ({ children, ...props }) => (
            <blockquote
              className="border-l-2 border-zinc-600 pl-4 my-4 text-zinc-400 italic"
              {...props}
            >
              {children}
            </blockquote>
          ),
          a: ({ href, children, ...props }) => {
            // Internal links (browse paths)
            if (href?.startsWith("/browse/")) {
              return (
                <Link
                  href={href}
                  className="text-blue-400 hover:text-blue-300 no-underline hover:underline"
                  {...props}
                >
                  {children}
                </Link>
              );
            }
            // External links
            return (
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 hover:text-blue-300"
                {...props}
              >
                {children}
              </a>
            );
          },
          // Tighter table styling
          table: ({ children, ...props }) => (
            <table className="text-[12px] w-full border-collapse" {...props}>
              {children}
            </table>
          ),
          th: ({ children, ...props }) => (
            <th
              className="text-left px-2 py-1.5 border-b border-zinc-700 text-zinc-400 font-medium"
              {...props}
            >
              {children}
            </th>
          ),
          td: ({ children, ...props }) => (
            <td className="px-2 py-1.5 border-b border-zinc-800" {...props}>
              {children}
            </td>
          ),
          // Inline code
          code: ({ className, children, ...props }) => {
            const isInline = !className;
            if (isInline) {
              return (
                <code
                  className="px-1 py-0.5 bg-zinc-800 rounded text-[12px] font-mono text-zinc-300"
                  {...props}
                >
                  {children}
                </code>
              );
            }
            return (
              <code className={className} {...props}>
                {children}
              </code>
            );
          },
          // Code blocks
          pre: ({ children, ...props }) => (
            <pre
              className="bg-zinc-800/50 rounded-lg p-3 overflow-x-auto text-[12px]"
              {...props}
            >
              {children}
            </pre>
          ),
        }}
      >
        {processedContent}
      </ReactMarkdown>
    </div>
  );
}
