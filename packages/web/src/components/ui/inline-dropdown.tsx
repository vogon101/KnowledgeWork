"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { User, Folder, Flag } from "lucide-react";

export interface InlineDropdownItem {
  value: string;
  label: string;
  group?: string;
}

interface InlineDropdownProps {
  open: boolean;
  items: InlineDropdownItem[];
  searchValue: string;
  onSelect: (value: string, label: string) => void;
  onClose: () => void;
  position: { left: number; top: number };
  type: "person" | "project" | "priority";
  className?: string;
  selectedIndex: number;
  onSelectedIndexChange: (index: number) => void;
}

export function InlineDropdown({
  open,
  items,
  searchValue,
  onSelect,
  onClose,
  position,
  type,
  className,
  selectedIndex,
  onSelectedIndexChange,
}: InlineDropdownProps) {
  const ref = React.useRef<HTMLDivElement>(null);
  const listRef = React.useRef<HTMLDivElement>(null);

  // Filter items based on search value
  const filteredItems = React.useMemo(() => {
    if (!searchValue) return items;
    const search = searchValue.toLowerCase();
    return items.filter((item) => item.label.toLowerCase().includes(search));
  }, [items, searchValue]);

  // Reset selected index when filtered items change
  React.useEffect(() => {
    if (selectedIndex >= filteredItems.length) {
      onSelectedIndexChange(Math.max(0, filteredItems.length - 1));
    }
  }, [filteredItems.length, selectedIndex, onSelectedIndexChange]);

  // Scroll selected item into view
  React.useEffect(() => {
    if (!listRef.current || !open) return;
    const selectedElement = listRef.current.querySelector(`[data-index="${selectedIndex}"]`);
    if (selectedElement) {
      selectedElement.scrollIntoView({ block: "nearest" });
    }
  }, [selectedIndex, open]);

  // Close on click outside
  React.useEffect(() => {
    if (!open) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open, onClose]);

  if (!open) return null;

  const Icon = type === "person" ? User : type === "project" ? Folder : Flag;

  return (
    <div
      ref={ref}
      className={cn(
        "absolute z-50 w-64 rounded-md border border-zinc-700 bg-zinc-900 shadow-lg overflow-hidden",
        className
      )}
      style={{
        left: position.left,
        top: position.top,
      }}
    >
      <div ref={listRef} className="max-h-48 overflow-y-auto p-1">
        {filteredItems.length === 0 ? (
          <div className="py-3 text-[11px] text-zinc-500 text-center">
            No {type === "person" ? "people" : type === "project" ? "projects" : "priorities"} found
          </div>
        ) : (
          filteredItems.map((item, index) => (
            <div
              key={item.value}
              data-index={index}
              onClick={() => onSelect(item.value, item.label)}
              onMouseEnter={() => onSelectedIndexChange(index)}
              className={cn(
                "flex items-center gap-2 px-2 py-1.5 text-[11px] rounded cursor-pointer",
                index === selectedIndex
                  ? "bg-zinc-700 text-zinc-100"
                  : "text-zinc-300 hover:bg-zinc-800"
              )}
            >
              <Icon className="h-3 w-3 text-zinc-500 flex-shrink-0" />
              <span className="truncate">{item.label}</span>
              {item.group && (
                <span className="ml-auto text-[9px] text-zinc-600 flex-shrink-0">
                  {item.group}
                </span>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// Export filtered items helper for parent component
export function filterDropdownItems(
  items: InlineDropdownItem[],
  searchValue: string
): InlineDropdownItem[] {
  if (!searchValue) return items;
  const search = searchValue.toLowerCase();
  return items.filter((item) => item.label.toLowerCase().includes(search));
}
