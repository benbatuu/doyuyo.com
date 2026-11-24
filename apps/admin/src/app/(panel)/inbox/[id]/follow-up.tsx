"use client";

import { useState, useTransition } from "react";
import { Check, Loader2 } from "lucide-react";
import { SUBMISSION_STATUSES, type SubmissionStatus } from "@doyuyo/core";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { updateNotes, updateStatus } from "./actions";

const LABEL: Record<SubmissionStatus, string> = { new: "Yeni", in_progress: "İnceleniyor", done: "Tamamlandı", spam: "Spam" };
const DOT: Record<SubmissionStatus, string> = { new: "bg-primary", in_progress: "bg-amber-400", done: "bg-ok", spam: "bg-muted-foreground/40" };

/** Status saves on click; notes save with the button or ⌘/Ctrl+Enter. */
export function FollowUp({ id, status: initialStatus, notes: initialNotes, updatedAt }: { id: number; status: SubmissionStatus; notes: string; updatedAt: string }) {
  const [status, setStatus] = useState(initialStatus);
  const [statusState, setStatusState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [notes, setNotes] = useState(initialNotes);
  const [savedNotes, setSavedNotes] = useState(initialNotes);
  const [notesState, setNotesState] = useState<"idle" | "saved" | "error">("idle");
  const [pending, start] = useTransition();
  const dirty = notes !== savedNotes;

  const pickStatus = (next: SubmissionStatus) => {
    if (next === status) return;
    const prev = status;
    setStatus(next);
    setStatusState("saving");
    updateStatus(id, next)
      .then(() => setStatusState("saved"))
      .catch(() => {
        setStatus(prev);
        setStatusState("error");
      });
  };

  const saveNotes = () => {
    if (!dirty || pending) return;
    start(async () => {
      try {
        await updateNotes(id, notes);
        setSavedNotes(notes);
        setNotesState("saved");
      } catch {
        setNotesState("error");
      }
    });
  };

  return (
    <section className="rounded-xl border bg-card shadow-xs">
      <div className="flex items-center justify-between border-b px-5 py-3.5">
        <h2 className="font-semibold">Takip</h2>
        <SaveHint state={statusState === "saving" ? "saving" : statusState} />
      </div>

      <div className="space-y-5 p-5">
        <div>
          <p className="mb-2 text-xs font-medium text-muted-foreground">Durum</p>
          <div role="radiogroup" aria-label="Durum" className="grid grid-cols-2 gap-1.5">
            {SUBMISSION_STATUSES.map((s) => {
              const active = s === status;
              return (
                <button
                  key={s}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => pickStatus(s)}
                  className={cn(
                    "flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-colors",
                    active ? "border-foreground/25 bg-muted text-foreground shadow-xs" : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
                  )}
                >
                  <span className={cn("size-2 rounded-full", DOT[s])} />
                  {LABEL[s]}
                  {active && <Check className="ml-auto size-3.5" />}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <label htmlFor="notes" className="mb-2 block text-xs font-medium text-muted-foreground">
            Notlar
          </label>
          <textarea
            id="notes"
            rows={5}
            value={notes}
            maxLength={5000}
            onChange={(e) => {
              setNotes(e.target.value);
              setNotesState("idle");
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) saveNotes();
            }}
            placeholder="Görüşme notu, sonraki adım…"
            className="w-full resize-y rounded-lg border bg-transparent px-3 py-2 text-sm shadow-xs outline-none transition-[box-shadow] placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
          />
          <div className="mt-2 flex items-center justify-between gap-3">
            <span className="text-xs text-muted-foreground">
              {notesState === "error" ? <span className="text-red-600">Kaydedilemedi</span> : notesState === "saved" && !dirty ? "Not kaydedildi" : dirty ? "⌘ + Enter ile kaydet" : `Son güncelleme: ${updatedAt}`}
            </span>
            <Button type="button" size="sm" onClick={saveNotes} disabled={!dirty || pending}>
              {pending && <Loader2 className="animate-spin" />} Notu kaydet
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}

function SaveHint({ state }: { state: "idle" | "saving" | "saved" | "error" }) {
  if (state === "idle") return null;
  return (
    <span className={cn("flex items-center gap-1.5 text-xs", state === "error" ? "text-red-600" : "text-muted-foreground")} aria-live="polite">
      {state === "saving" && <Loader2 className="size-3.5 animate-spin" />}
      {state === "saved" && <Check className="size-3.5 text-ok" />}
      {state === "saving" ? "Kaydediliyor" : state === "saved" ? "Kaydedildi" : "Kaydedilemedi"}
    </span>
  );
}
