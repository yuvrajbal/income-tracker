"use client";

import { Archive, ArchiveRestore, Check, Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { Button, Input, SeriesSwatch } from "@/components/ui";
import { addSource, deleteSource, updateSource } from "@/lib/store";
import { useChartColors } from "@/lib/theme";
import type { AppData } from "@/lib/types";

export function SourcesManager({ data }: { data: AppData }) {
  const c = useChartColors();
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [newName, setNewName] = useState("");
  const entryCount = (id: string) => data.incomeEntries.filter((e) => e.sourceId === id).length;

  return (
    <div className="px-5 pb-4">
      <ul className="divide-y divide-border">
        {data.incomeSources.map((s) => (
          <li key={s.id} className="flex items-center gap-2 py-2">
            <SeriesSwatch color={c.series(s.colorSlot)} />
            {editing === s.id ? (
              <form
                className="flex flex-1 gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (draft.trim()) updateSource(s.id, { name: draft.trim() });
                  setEditing(null);
                }}
              >
                <Input autoFocus value={draft} onChange={(e) => setDraft(e.target.value)} className="h-8" />
                <Button size="icon" variant="ghost" type="submit" aria-label="Save name">
                  <Check size={15} />
                </Button>
              </form>
            ) : (
              <>
                <span className={`flex-1 text-sm ${s.archived ? "text-text-3 line-through" : ""}`}>{s.name}</span>
                <span className="text-xs text-text-3 tabular">{entryCount(s.id)} entries</span>
                <Button
                  size="icon"
                  variant="ghost"
                  aria-label={`Rename ${s.name}`}
                  onClick={() => {
                    setEditing(s.id);
                    setDraft(s.name);
                  }}
                >
                  <Pencil size={14} />
                </Button>
                {entryCount(s.id) === 0 ? (
                  <Button size="icon" variant="ghost" aria-label={`Delete ${s.name}`} onClick={() => deleteSource(s.id)}>
                    <Trash2 size={14} />
                  </Button>
                ) : (
                  <Button
                    size="icon"
                    variant="ghost"
                    aria-label={s.archived ? `Restore ${s.name}` : `Archive ${s.name}`}
                    title={s.archived ? "Restore" : "Archive (keeps history, hides from new entries)"}
                    onClick={() => updateSource(s.id, { archived: !s.archived })}
                  >
                    {s.archived ? <ArchiveRestore size={14} /> : <Archive size={14} />}
                  </Button>
                )}
              </>
            )}
          </li>
        ))}
      </ul>
      <form
        className="mt-2 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (!newName.trim()) return;
          addSource(newName);
          setNewName("");
        }}
      >
        <Input placeholder="New source, e.g. Teaching assistant" value={newName} onChange={(e) => setNewName(e.target.value)} className="h-9" />
        <Button type="submit" size="md">
          <Plus size={15} /> Add
        </Button>
      </form>
    </div>
  );
}
