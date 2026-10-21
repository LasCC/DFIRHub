import { useMemo, useState } from "react";

import { Panel } from "../ui/Panel";

export interface ChecklistItem {
  id: string;
  label: string;
  description: string;
  group: string;
  badge?: string;
  meta?: string;
}

interface ChecklistPickerProps {
  headingId: string;
  title: string;
  subtitle: string;
  items: ChecklistItem[];
  groups: string[];
  selected: string[];
  onChange: (selected: string[]) => void;
  searchLabel: string;
}

const ALL_GROUPS = "All groups";

function matchesQuery(item: ChecklistItem, query: string): boolean {
  return (
    item.label.toLowerCase().includes(query) ||
    item.description.toLowerCase().includes(query)
  );
}

export function ChecklistPicker({
  headingId,
  title,
  subtitle,
  items,
  groups,
  selected,
  onChange,
  searchLabel,
}: ChecklistPickerProps) {
  const [activeGroup, setActiveGroup] = useState(ALL_GROUPS);
  const [query, setQuery] = useState("");
  const selectedSet = useMemo(() => new Set(selected), [selected]);
  const itemsById = useMemo(
    () => new Map(items.map((item) => [item.id, item])),
    [items]
  );

  const visibleItems = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return items.filter((item) => {
      const inGroup = activeGroup === ALL_GROUPS || item.group === activeGroup;
      return (
        inGroup && (!normalizedQuery || matchesQuery(item, normalizedQuery))
      );
    });
  }, [items, activeGroup, query]);

  const toggle = (id: string) => {
    onChange(
      selectedSet.has(id)
        ? selected.filter((selectedId) => selectedId !== id)
        : [...selected, id]
    );
  };

  const selectVisible = () => {
    const additions = visibleItems
      .map((item) => item.id)
      .filter((id) => !selectedSet.has(id));
    onChange([...selected, ...additions]);
  };

  return (
    <Panel
      actions={
        <>
          <button
            className="panel-action focus-ring"
            disabled={visibleItems.length === 0}
            onClick={selectVisible}
            type="button"
          >
            Select shown
          </button>
          <button
            className="panel-action focus-ring text-destructive"
            disabled={selected.length === 0}
            onClick={() => onChange([])}
            type="button"
          >
            Clear
          </button>
        </>
      }
      className="min-w-0"
      headingId={headingId}
      subtitle={subtitle}
      title={
        <span className="flex items-center gap-2">
          {title}
          <span className="rounded-full border border-border bg-overlay/[0.03] px-2 py-0.5 font-mono font-normal text-[11px] text-muted-foreground">
            {selected.length}/{items.length}
          </span>
        </span>
      }
      toolbar={
        <>
          <input
            aria-label={searchLabel}
            className="h-8 min-w-32 flex-1 rounded-lg border border-border bg-background px-2.5 text-sm outline-none placeholder:text-muted-foreground/70 focus:border-primary/50"
            onChange={(event) => setQuery(event.target.value)}
            placeholder={`${searchLabel}…`}
            type="search"
            value={query}
          />
          <select
            aria-label={`Filter ${searchLabel.toLowerCase()} by group`}
            className="h-8 max-w-40 shrink-0 rounded-lg border border-border bg-background px-2 text-muted-foreground text-xs outline-none focus:border-primary/50"
            onChange={(event) => setActiveGroup(event.target.value)}
            value={activeGroup}
          >
            <option value={ALL_GROUPS}>{ALL_GROUPS}</option>
            {groups.map((group) => (
              <option key={group} value={group}>
                {group}
              </option>
            ))}
          </select>
        </>
      }
    >
      {selected.length > 0 && (
        <div className="scrollbar-hide flex items-center gap-1 overflow-x-auto border-border border-b px-3 py-1.5">
          {selected.map((id) => (
            <button
              aria-label={`Remove ${itemsById.get(id)?.label ?? id}`}
              className="focus-ring inline-flex shrink-0 items-center gap-1 rounded-md border border-primary/30 bg-primary/10 px-2 py-0.5 font-mono text-foreground text-xs transition-colors hover:border-destructive/50 hover:bg-destructive/10"
              key={id}
              onClick={() => toggle(id)}
              type="button"
            >
              {itemsById.get(id)?.label ?? id}
              <span aria-hidden="true" className="text-muted-foreground">
                ×
              </span>
            </button>
          ))}
        </div>
      )}
      <div className="scrollbar-thin fade-y max-h-72 overflow-y-auto">
        {visibleItems.length === 0 ? (
          <div className="p-4 text-center text-muted-foreground text-sm">
            Nothing matches this search
          </div>
        ) : (
          <div className="divide-y divide-border">
            {visibleItems.map((item) => (
              <label
                className="flex cursor-pointer items-center gap-3 px-3 py-2 transition-colors hover:bg-muted"
                key={item.id}
              >
                <input
                  checked={selectedSet.has(item.id)}
                  className="h-3.5 w-3.5 shrink-0 accent-primary"
                  onChange={() => toggle(item.id)}
                  type="checkbox"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-sm">{item.label}</span>
                    {item.badge && (
                      <span className="shrink-0 rounded border border-cyan-500/30 bg-cyan-500/10 px-1.5 py-0.5 text-cyan-700 text-xs dark:text-cyan-400">
                        {item.badge}
                      </span>
                    )}
                  </div>
                  {item.description && (
                    <p className="truncate text-muted-foreground text-xs">
                      {item.description}
                    </p>
                  )}
                </div>
                {item.meta && (
                  <span className="shrink-0 text-muted-foreground text-xs">
                    {item.meta}
                  </span>
                )}
              </label>
            ))}
          </div>
        )}
      </div>
    </Panel>
  );
}
