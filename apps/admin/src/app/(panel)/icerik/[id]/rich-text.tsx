"use client";

import { useEffect, useRef, useState } from "react";
import { Bold, Italic, Link2, RemoveFormatting } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

const SAFE_URL = /^(https?:\/\/|mailto:|tel:|\/(?!\/))/i;

/**
 * Minimal inline rich text (bold, italic, link). Output is cleaned again on the server.
 * Uncontrolled on purpose: we only write innerHTML when the value changes from outside.
 */
export function RichText({ value, onChange }: { value: string; onChange: (html: string) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const saved = useRef<Range | null>(null);
  const [linkOpen, setLinkOpen] = useState(false);

  useEffect(() => {
    if (ref.current && ref.current.innerHTML !== value) ref.current.innerHTML = value;
  }, [value]);

  const run = (cmd: string, arg?: string) => {
    ref.current?.focus();
    document.execCommand(cmd, false, arg);
    if (ref.current) onChange(ref.current.innerHTML);
  };

  // The popup steals focus, so remember the selection and put it back before linking.
  const openLink = () => {
    const sel = window.getSelection();
    saved.current = sel && sel.rangeCount && ref.current?.contains(sel.anchorNode) ? sel.getRangeAt(0).cloneRange() : null;
    setLinkOpen(true);
  };
  const applyLink = (url: string) => {
    ref.current?.focus();
    const sel = window.getSelection();
    if (saved.current && sel) {
      sel.removeAllRanges();
      sel.addRange(saved.current);
    }
    // No text selected: insert the address itself as the link text.
    if (!saved.current || saved.current.collapsed) document.execCommand("insertHTML", false, `<a href="${url.replace(/"/g, "&quot;")}">${url.replace(/</g, "&lt;")}</a>`);
    else document.execCommand("createLink", false, url);
    if (ref.current) onChange(ref.current.innerHTML);
  };

  return (
    <div className="rounded-md border shadow-xs focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/50">
      <div className="flex gap-0.5 border-b px-1.5 py-1">
        <ToolButton label="Kalın" onClick={() => run("bold")}>
          <Bold />
        </ToolButton>
        <ToolButton label="İtalik" onClick={() => run("italic")}>
          <Italic />
        </ToolButton>
        <ToolButton label="Bağlantı" onClick={openLink}>
          <Link2 />
        </ToolButton>
        <ToolButton label="Biçimi temizle" onClick={() => run("removeFormat")}>
          <RemoveFormatting />
        </ToolButton>
      </div>
      <div
        ref={ref}
        contentEditable
        suppressContentEditableWarning
        role="textbox"
        aria-multiline
        onInput={(e) => onChange(e.currentTarget.innerHTML)}
        onPaste={(e) => {
          // Paste as plain text; keeps foreign styles out.
          e.preventDefault();
          document.execCommand("insertText", false, e.clipboardData.getData("text/plain"));
        }}
        className="min-h-20 px-3 py-2 text-sm leading-relaxed outline-none [&_a]:text-primary [&_a]:underline [&_strong]:font-semibold"
      />
      <LinkDialog open={linkOpen} onOpenChange={setLinkOpen} selectedText={saved.current?.toString() ?? ""} onSubmit={applyLink} />
    </div>
  );
}

function LinkDialog({ open, onOpenChange, selectedText, onSubmit }: { open: boolean; onOpenChange: (o: boolean) => void; selectedText: string; onSubmit: (url: string) => void }) {
  const [url, setUrl] = useState("");
  const [error, setError] = useState("");
  const pending = useRef<string | null>(null);
  useEffect(() => {
    if (open) {
      setUrl("");
      setError("");
    }
  }, [open]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const v = url.trim();
    if (!SAFE_URL.test(v)) return setError("Adres https://, /, mailto: veya tel: ile başlamalı.");
    // Apply after the dialog has closed: while open, its focus trap keeps the editor from taking focus.
    pending.current = v;
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-md"
        onCloseAutoFocus={(e) => {
          if (!pending.current) return;
          e.preventDefault();
          const v = pending.current;
          pending.current = null;
          onSubmit(v);
        }}
      >
        <form onSubmit={submit} className="space-y-4">
          <DialogHeader>
            <DialogTitle>Bağlantı ekle</DialogTitle>
            <DialogDescription>
              {selectedText ? (
                <>
                  <span className="font-medium text-foreground">“{selectedText.slice(0, 60)}”</span> metnine bağlantı verilecek.
                </>
              ) : (
                "Metin seçilmedi; adres metin olarak eklenecek."
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <Input autoFocus value={url} onChange={(e) => (setUrl(e.target.value), setError(""))} placeholder="/tr/iletisim veya https://…" aria-invalid={!!error} className="font-mono text-sm" />
            {error ? <p className="text-xs text-red-600">{error}</p> : <p className="text-xs text-muted-foreground">Site içi sayfalar için /tr/… ile başla.</p>}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Vazgeç
            </Button>
            <Button type="submit" disabled={!url.trim()}>
              Ekle
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ToolButton({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className="grid size-7 place-items-center rounded text-muted-foreground hover:bg-muted hover:text-foreground [&_svg]:size-3.5"
    >
      {children}
    </button>
  );
}
