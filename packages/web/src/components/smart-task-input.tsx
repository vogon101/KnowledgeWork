"use client";

import * as React from "react";
import { useState, useRef, useCallback, useEffect, useImperativeHandle, forwardRef } from "react";
import { cn } from "@/lib/utils";
import { InlineDropdown, filterDropdownItems, type InlineDropdownItem } from "@/components/ui/inline-dropdown";
import { X, User, Folder, Flag, Calendar } from "lucide-react";

interface Person {
  id: number;
  name: string;
}

interface Project {
  id: number;
  name: string;
  slug: string;
  org?: string | null;
}

export interface SmartTaskInputRef {
  hasUnactionedToken: () => boolean;
  getUnactionedTokenType: () => "person" | "project" | "priority" | null;
}

// Recognized token that has been detected but not yet actioned
interface RecognizedToken {
  type: "person" | "project" | "priority" | "date";
  text: string; // The text in the input (e.g., "@James", "p1", "tomorrow")
  startPosition: number;
  endPosition: number;
  // For resolved tokens
  resolvedId?: number;
  resolvedLabel?: string;
  resolvedValue?: string; // For dates: ISO string, for priority: "1"-"4"
}

interface SmartTaskInputProps {
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  placeholder?: string;
  autoFocus?: boolean;
  people: Person[];
  projects: Project[];
  onPersonSelect?: (personId: number) => void;
  onProjectSelect?: (projectId: number) => void;
  onPrioritySelect?: (priority: number) => void;
  onDateSelect?: (date: string) => void;
  className?: string;
  defaultUserId?: number;
}

type TriggerType = "person" | "project" | "priority" | "date" | null;

interface TriggerState {
  type: TriggerType;
  startPosition: number;
  searchText: string;
}

// Priority options
const PRIORITY_OPTIONS: InlineDropdownItem[] = [
  { value: "1", label: "P1 - Urgent" },
  { value: "2", label: "P2 - High" },
  { value: "3", label: "P3 - Medium" },
  { value: "4", label: "P4 - Low" },
];

// Date keywords to recognize
const DATE_KEYWORDS: Record<string, () => string> = {
  'today': () => new Date().toISOString().split('T')[0],
  'tod': () => new Date().toISOString().split('T')[0],
  'tomorrow': () => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  },
  'tom': () => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  },
};

// Get next weekday
function getNextWeekday(dayIndex: number): string {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const currentDay = today.getDay();
  let daysToAdd = dayIndex - currentDay;
  if (daysToAdd <= 0) {
    daysToAdd += 7;
  }
  today.setDate(today.getDate() + daysToAdd);
  return today.toISOString().split('T')[0];
}

// Add weekdays
const WEEKDAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
const WEEKDAYS_SHORT = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
WEEKDAYS.forEach((day, i) => {
  DATE_KEYWORDS[day] = () => getNextWeekday(i);
});
WEEKDAYS_SHORT.forEach((day, i) => {
  DATE_KEYWORDS[day] = () => getNextWeekday(i);
});

// Months for parsing dates like "!jan15" or "!15jan"
const MONTHS_SHORT = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];

// Parse explicit date with ! prefix (returns date string or null)
function parseExplicitDate(keyword: string): string | null {
  const lower = keyword.toLowerCase();

  // Check simple keywords first
  if (DATE_KEYWORDS[lower]) {
    return DATE_KEYWORDS[lower]();
  }

  // ISO format: 2026-01-15
  if (/^\d{4}-\d{2}-\d{2}$/.test(lower)) {
    return lower;
  }

  // Month-day format: jan15, 15jan
  const monthDayMatch = lower.match(/^(\d{1,2})(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)$/) ||
    lower.match(/^(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)(\d{1,2})$/);

  if (monthDayMatch) {
    let monthStr: string;
    let day: number;

    if (isNaN(parseInt(monthDayMatch[1], 10))) {
      // "jan15" format
      monthStr = monthDayMatch[1];
      day = parseInt(monthDayMatch[2], 10);
    } else {
      // "15jan" format
      day = parseInt(monthDayMatch[1], 10);
      monthStr = monthDayMatch[2];
    }

    const monthIndex = MONTHS_SHORT.indexOf(monthStr);
    if (monthIndex !== -1 && day >= 1 && day <= 31) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const result = new Date(today.getFullYear(), monthIndex, day);
      // If the date is in the past, assume next year
      if (result < today) {
        result.setFullYear(result.getFullYear() + 1);
      }
      return result.toISOString().split('T')[0];
    }
  }

  return null;
}

// Format date for display
function formatDateDisplay(dateStr: string): string {
  const date = new Date(dateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  if (dateStr === today.toISOString().split('T')[0]) return 'Today';
  if (dateStr === tomorrow.toISOString().split('T')[0]) return 'Tomorrow';

  const daysUntil = Math.ceil((date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  if (daysUntil > 0 && daysUntil <= 7) {
    return date.toLocaleDateString('en-GB', { weekday: 'long' });
  }
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

export const SmartTaskInput = forwardRef<SmartTaskInputRef, SmartTaskInputProps>(function SmartTaskInput({
  value,
  onChange,
  onBlur,
  onKeyDown: externalOnKeyDown,
  placeholder,
  autoFocus,
  people,
  projects,
  onPersonSelect,
  onProjectSelect,
  onPrioritySelect,
  onDateSelect,
  className,
  defaultUserId,
}, ref) {
  const inputRef = useRef<HTMLInputElement>(null);
  const measureRef = useRef<HTMLSpanElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [trigger, setTrigger] = useState<TriggerState | null>(null);
  const [dropdownPosition, setDropdownPosition] = useState({ left: 0, top: 0 });
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Badges for resolved tokens (shown below input)
  const [badges, setBadges] = useState<RecognizedToken[]>([]);

  // Expose methods via ref
  // Date triggers don't count as "unactioned" - they resolve on space or become text
  useImperativeHandle(ref, () => ({
    hasUnactionedToken: () => trigger !== null && trigger.type !== "date",
    getUnactionedTokenType: () => {
      if (!trigger || trigger.type === "date") return null;
      return trigger.type;
    },
  }), [trigger]);

  // Get items for dropdown based on trigger type
  const dropdownItems: InlineDropdownItem[] = React.useMemo(() => {
    if (!trigger) return [];

    if (trigger.type === "person") {
      return people.map((p) => ({
        value: String(p.id),
        label: p.name,
      }));
    } else if (trigger.type === "project") {
      return projects.map((p) => ({
        value: String(p.id),
        label: p.name,
        group: p.org || undefined,
      }));
    } else if (trigger.type === "priority") {
      return PRIORITY_OPTIONS;
    }
    return [];
  }, [trigger, people, projects]);

  // Get filtered items count for keyboard navigation bounds
  const filteredItems = React.useMemo(() => {
    if (!trigger) return [];
    return filterDropdownItems(dropdownItems, trigger.searchText);
  }, [dropdownItems, trigger]);

  // Reset selected index when trigger changes or search changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [trigger?.type, trigger?.searchText]);

  // Calculate dropdown position based on cursor position
  const updateDropdownPosition = useCallback(() => {
    if (!inputRef.current || !measureRef.current || !containerRef.current || !trigger) {
      return;
    }

    const textToCursor = value.substring(0, trigger.startPosition);
    measureRef.current.textContent = textToCursor;

    const inputRect = inputRef.current.getBoundingClientRect();
    const measureWidth = measureRef.current.offsetWidth;

    setDropdownPosition({
      left: Math.min(measureWidth, inputRect.width - 256),
      top: inputRef.current.offsetHeight + 4,
    });
  }, [trigger, value]);

  useEffect(() => {
    if (trigger) {
      updateDropdownPosition();
    }
  }, [trigger, updateDropdownPosition]);

  // Detect patterns and create triggers
  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = e.target.value;
      const cursorPosition = e.target.selectionStart || 0;

      onChange(newValue);

      // Check if user just typed a trigger character
      const charJustTyped = newValue[cursorPosition - 1];
      const charBefore = cursorPosition > 1 ? newValue[cursorPosition - 2] : " ";
      const isAtWordBoundary = charBefore === " " || cursorPosition === 1;

      // Trigger on @, #, or ! if at start or after space
      if ((charJustTyped === "@" || charJustTyped === "#" || charJustTyped === "!") && isAtWordBoundary) {
        const triggerType: TriggerType = charJustTyped === "@" ? "person" : charJustTyped === "#" ? "project" : "date";
        setTrigger({
          type: triggerType,
          startPosition: cursorPosition - 1,
          searchText: "",
        });
        setSelectedIndex(0);
        return;
      }

      // Check for priority pattern: "p" followed by 1-4 at word boundary
      if (charJustTyped === "p" && isAtWordBoundary) {
        setTrigger({
          type: "priority",
          startPosition: cursorPosition - 1,
          searchText: "",
        });
        setSelectedIndex(0);
        return;
      }

      // Check if typing a number after "p" trigger
      if (trigger?.type === "priority" && /^[1-4]$/.test(charJustTyped)) {
        // Auto-select the priority
        const priorityValue = charJustTyped;
        handleSelect(priorityValue, `P${priorityValue}`);
        return;
      }

      // Update search text if trigger is active
      if (trigger) {
        const cursorPos = cursorPosition;

        if (cursorPos <= trigger.startPosition) {
          setTrigger(null);
          return;
        }

        const searchText = newValue.substring(trigger.startPosition + 1, cursorPos);

        if (searchText.includes(" ")) {
          setTrigger(null);
          return;
        }

        const triggerChar = trigger.type === "person" ? "@" : trigger.type === "project" ? "#" : trigger.type === "date" ? "!" : "p";
        if (newValue[trigger.startPosition] !== triggerChar) {
          setTrigger(null);
          return;
        }

        setTrigger({
          ...trigger,
          searchText,
        });
      }
    },
    [onChange, trigger]
  );

  // Handle key events for dropdown navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (!trigger) {
        externalOnKeyDown?.(e);
        return;
      }

      if (e.key === "Escape") {
        e.preventDefault();
        setTrigger(null);
        return;
      }

      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) => Math.min(prev + 1, filteredItems.length - 1));
        return;
      }

      if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) => Math.max(prev - 1, 0));
        return;
      }

      if (e.key === "Enter" || e.key === "Tab" || e.key === " ") {
        // Handle special @me and @none mentions
        if (trigger.type === "person") {
          const searchLower = trigger.searchText.toLowerCase();

          if (searchLower === "me" && defaultUserId) {
            e.preventDefault();
            // Select default user
            const person = people.find(p => p.id === defaultUserId);
            handleSelect(String(defaultUserId), person?.name || "Me");
            return;
          }

          if (searchLower === "none") {
            e.preventDefault();
            // Remove @none from text, clear owner
            const beforeTrigger = value.substring(0, trigger.startPosition);
            const afterToken = value.substring(trigger.startPosition + 1 + trigger.searchText.length);
            let cleanedValue = (beforeTrigger + afterToken).replace(/\s+/g, ' ').trim();
            onChange(cleanedValue);
            onPersonSelect?.(0);
            // Remove person badge if exists
            setBadges(prev => prev.filter(b => b.type !== "person"));
            setTrigger(null);
            return;
          }
        }

        // Handle !date triggers on space/enter
        if (trigger.type === "date" && trigger.searchText) {
          const parsedDate = parseExplicitDate(trigger.searchText);
          if (parsedDate) {
            e.preventDefault();
            // Remove the !keyword from the input
            const beforeTrigger = value.substring(0, trigger.startPosition);
            const afterToken = value.substring(trigger.startPosition + 1 + trigger.searchText.length);
            let cleanedValue = (beforeTrigger + afterToken).replace(/\s+/g, ' ').trim();
            onChange(cleanedValue);

            // Add date badge
            setBadges(prev => [...prev.filter(b => b.type !== "date"), {
              type: "date",
              text: `!${trigger.searchText}`,
              startPosition: 0,
              endPosition: 0,
              resolvedValue: parsedDate,
              resolvedLabel: formatDateDisplay(parsedDate),
            }]);
            onDateSelect?.(parsedDate);
            setTrigger(null);
            return;
          }
        }

        // For space, only handle special cases above, otherwise let it pass through
        if (e.key === " ") {
          return;
        }

        if (filteredItems.length > 0 && selectedIndex < filteredItems.length) {
          e.preventDefault();
          const selectedItem = filteredItems[selectedIndex];
          handleSelect(selectedItem.value, selectedItem.label);
        }
        return;
      }

      if (e.key === "Backspace") {
        const cursorPosition = inputRef.current?.selectionStart || 0;
        if (cursorPosition === trigger.startPosition + 1) {
          setTrigger(null);
        }
      }
    },
    [trigger, externalOnKeyDown, filteredItems, selectedIndex, defaultUserId, people, value, onChange, onPersonSelect, onDateSelect]
  );

  // Handle selection from dropdown
  const handleSelect = useCallback(
    (itemValue: string, itemLabel: string) => {
      if (!trigger) return;

      // Remove the token from the title
      const beforeTrigger = value.substring(0, trigger.startPosition);
      const afterToken = value.substring(
        trigger.startPosition + 1 + trigger.searchText.length
      );

      let newValue = beforeTrigger.trimEnd();
      if (newValue && afterToken.trimStart()) {
        newValue += " ";
      }
      newValue += afterToken.trimStart();

      onChange(newValue.trim() || "");

      // Add badge and call handler
      const id = parseInt(itemValue, 10);

      if (trigger.type === "person") {
        const person = people.find(p => p.id === id);
        setBadges(prev => [...prev.filter(b => b.type !== "person"), {
          type: "person",
          text: `@${trigger.searchText}`,
          startPosition: trigger.startPosition,
          endPosition: trigger.startPosition + 1 + trigger.searchText.length,
          resolvedId: id,
          resolvedLabel: person?.name || itemLabel,
        }]);
        onPersonSelect?.(id);
      } else if (trigger.type === "project") {
        const project = projects.find(p => p.id === id);
        setBadges(prev => [...prev.filter(b => b.type !== "project"), {
          type: "project",
          text: `#${trigger.searchText}`,
          startPosition: trigger.startPosition,
          endPosition: trigger.startPosition + 1 + trigger.searchText.length,
          resolvedId: id,
          resolvedLabel: project?.name || itemLabel,
        }]);
        onProjectSelect?.(id);
      } else if (trigger.type === "priority") {
        const priority = parseInt(itemValue, 10);
        setBadges(prev => [...prev.filter(b => b.type !== "priority"), {
          type: "priority",
          text: `p${itemValue}`,
          startPosition: trigger.startPosition,
          endPosition: trigger.startPosition + 2,
          resolvedValue: itemValue,
          resolvedLabel: `P${itemValue}`,
        }]);
        onPrioritySelect?.(priority);
      }

      setTrigger(null);
      setTimeout(() => inputRef.current?.focus(), 0);
    },
    [trigger, value, onChange, onPersonSelect, onProjectSelect, onPrioritySelect, people, projects]
  );

  // Remove a badge
  const removeBadge = useCallback((type: RecognizedToken["type"]) => {
    setBadges(prev => prev.filter(b => b.type !== type));
    // Clear the corresponding value
    if (type === "person") {
      onPersonSelect?.(0); // 0 or undefined to clear
    } else if (type === "project") {
      onProjectSelect?.(0);
    } else if (type === "priority") {
      onPrioritySelect?.(0);
    } else if (type === "date") {
      onDateSelect?.("");
    }
  }, [onPersonSelect, onProjectSelect, onPrioritySelect, onDateSelect]);

  const handleCloseDropdown = useCallback(() => {
    setTrigger(null);
  }, []);

  // Get icon and colors for badge type
  const getBadgeStyle = (type: RecognizedToken["type"]) => {
    switch (type) {
      case "person":
        return { icon: User, bg: "bg-blue-500/20", text: "text-blue-300", border: "border-blue-500/30" };
      case "project":
        return { icon: Folder, bg: "bg-purple-500/20", text: "text-purple-300", border: "border-purple-500/30" };
      case "priority":
        return { icon: Flag, bg: "bg-orange-500/20", text: "text-orange-300", border: "border-orange-500/30" };
      case "date":
        return { icon: Calendar, bg: "bg-emerald-500/20", text: "text-emerald-300", border: "border-emerald-500/30" };
    }
  };

  return (
    <div ref={containerRef} className="relative">
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onBlur={onBlur}
        placeholder={placeholder}
        autoFocus={autoFocus}
        className={cn(
          "w-full px-2 py-1.5 text-[12px] bg-zinc-800 border border-zinc-700 rounded text-zinc-200 placeholder:text-zinc-500 focus:outline-none focus:ring-1 focus:ring-blue-500",
          className
        )}
      />

      {/* Hidden span for measuring text width */}
      <span
        ref={measureRef}
        className="absolute invisible whitespace-pre text-[12px]"
        style={{ font: "inherit" }}
        aria-hidden="true"
      />

      {/* Badges for recognized tokens */}
      {badges.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-1.5">
          {badges.map((badge) => {
            const style = getBadgeStyle(badge.type);
            const Icon = style.icon;
            return (
              <span
                key={badge.type}
                className={cn(
                  "inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] rounded border",
                  style.bg, style.text, style.border
                )}
              >
                <Icon className="h-3 w-3" />
                <span>{badge.resolvedLabel}</span>
                <button
                  type="button"
                  onClick={() => removeBadge(badge.type)}
                  className="ml-0.5 hover:opacity-70"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            );
          })}
        </div>
      )}

      <InlineDropdown
        open={trigger !== null && trigger.type !== "date"}
        items={dropdownItems}
        searchValue={trigger?.searchText || ""}
        onSelect={handleSelect}
        onClose={handleCloseDropdown}
        position={dropdownPosition}
        type={trigger?.type === "priority" || trigger?.type === "date" ? "person" : (trigger?.type || "person")}
        selectedIndex={selectedIndex}
        onSelectedIndexChange={setSelectedIndex}
      />
    </div>
  );
});
