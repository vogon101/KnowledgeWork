import { Github, Globe, FileText, ExternalLink, Figma } from "lucide-react";
import type { ExternalLink as ExternalLinkType } from "@/lib/knowledge-base";

interface ExternalLinksProps {
  links: ExternalLinkType[];
  className?: string;
}

const iconMap = {
  github: Github,
  globe: Globe,
  docs: FileText,
  figma: Figma,
  notion: FileText, // Use FileText for Notion
  airtable: FileText, // Use FileText for Airtable
  external: ExternalLink,
};

export function ExternalLinks({ links, className = "" }: ExternalLinksProps) {
  if (!links || links.length === 0) return null;

  return (
    <div className={`flex flex-wrap gap-2 ${className}`}>
      {links.map((link, index) => {
        const Icon = iconMap[link.icon || "external"];
        return (
          <a
            key={index}
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[12px] bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-zinc-100 rounded-full transition-colors border border-zinc-700 hover:border-zinc-600"
          >
            <Icon className="h-3.5 w-3.5" />
            <span>{link.title}</span>
            <ExternalLink className="h-3 w-3 text-zinc-500" />
          </a>
        );
      })}
    </div>
  );
}
