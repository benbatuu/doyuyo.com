"use client";

import { useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  BadgeQuestionMark,
  Images,
  LayoutGrid,
  Megaphone,
  Minus,
  Plus,
  Quote,
  Rows3,
  Sparkles,
  Trash2,
  Type,
  Video,
  BarChart3,
  Image as ImageIcon,
  Columns2,
  type LucideIcon,
} from "lucide-react";
import {
  DEFAULT_SECTION_STYLE,
  type BlockButton,
  type BlockImage,
  type ContentNode,
  type ContentSection,
  type SectionBlock,
  type SectionBlockType,
  type SectionStyle,
} from "@doyuyo/core";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { MediaPicker } from "@/components/media/media-picker";
import { mediaUrl } from "@/lib/media";
import { cn } from "@/lib/utils";
import { RichText } from "./rich-text";

const TYPE_META: Record<SectionBlockType, { label: string; hint: string; icon: LucideIcon }> = {
  hero: { label: "Giriş", hint: "Büyük başlık, metin, buton ve görsel", icon: Sparkles },
  mediaText: { label: "Görsel + metin", hint: "Yanyana görsel ve yazı", icon: Columns2 },
  richText: { label: "Yazı", hint: "Başlık ve paragraflar", icon: Type },
  cards: { label: "Kartlar", hint: "Görselli kart ızgarası", icon: LayoutGrid },
  gallery: { label: "Galeri", hint: "Görsel ızgarası", icon: Images },
  stats: { label: "Rakamlar", hint: "Büyük sayı kutuları", icon: BarChart3 },
  cta: { label: "Çağrı", hint: "Koyu kutuda buton", icon: Megaphone },
  faq: { label: "Sık sorulanlar", hint: "Açılır soru-cevap", icon: BadgeQuestionMark },
  quote: { label: "Alıntı", hint: "Yorum ya da söz", icon: Quote },
  video: { label: "Video", hint: "YouTube bağlantısı", icon: Video },
  spacer: { label: "Boşluk", hint: "Bölümler arası ayırıcı", icon: Minus },
};
export const BLOCK_TYPES = Object.keys(TYPE_META) as SectionBlockType[];

const img = (): BlockImage => ({ mediaId: null, src: "", alt: "" });
const btn = (text = "", href = "", variant: BlockButton["variant"] = "primary"): BlockButton => ({ text, href, variant });

/** Starting content for each block type. */
export function defaultBlock(type: SectionBlockType): SectionBlock {
  switch (type) {
    case "hero":
      return { type, eyebrow: "", title: "Başlık", text: "", image: img(), buttons: [], align: "left" };
    case "mediaText":
      return { type, eyebrow: "", title: "Başlık", html: "", image: img(), imageSide: "right", buttons: [] };
    case "richText":
      return { type, nodes: [{ type: "paragraph", html: "", text: "" }], width: "narrow" };
    case "cards":
      return { type, eyebrow: "", title: "Başlık", intro: "", columns: 3, items: [{ image: img(), title: "Kart", text: "", href: "" }] };
    case "gallery":
      return { type, title: "", columns: 3, images: [img()] };
    case "stats":
      return { type, title: "", items: [{ value: "0", label: "Etiket" }] };
    case "cta":
      return { type, title: "Hemen başla", text: "", button: btn("Bize ulaş", "") };
    case "faq":
      return { type, title: "Sık sorulan sorular", items: [{ q: "Soru?", a: "Cevap." }] };
    case "quote":
      return { type, text: "", author: "", role: "", image: null };
    case "video":
      return { type, title: "", href: "", thumbnail: null };
    case "spacer":
      return { type, size: "md", line: false };
  }
}

export const defaultSection = (type: SectionBlockType): ContentSection => ({
  key: null,
  nodes: [],
  block: defaultBlock(type),
  style: { ...DEFAULT_SECTION_STYLE },
});

/** Sections made by the builder (have a block). Old-style node sections are shown read-only. */
export function BlockBuilder({ sections, onChange }: { sections: ContentSection[]; onChange: (s: ContentSection[]) => void }) {
  const [adding, setAdding] = useState(false);
  const set = (i: number, patch: Partial<ContentSection>) => onChange(sections.map((s, j) => (j === i ? { ...s, ...patch } : s)));
  const move = (i: number, to: number) => {
    if (to < 0 || to >= sections.length) return;
    const next = [...sections];
    const [s] = next.splice(i, 1);
    next.splice(to, 0, s!);
    onChange(next);
  };

  return (
    <div className="space-y-4">
      {sections.length === 0 && (
        <div className="grid place-items-center gap-3 rounded-xl border border-dashed bg-card px-5 py-14 text-center">
          <span className="grid size-11 place-items-center rounded-full bg-muted text-muted-foreground">
            <Rows3 className="size-5" />
          </span>
          <p className="font-medium">Sayfa boş</p>
          <p className="max-w-sm text-sm text-muted-foreground">Bir bölüm ekleyerek başla. Her bölümün tasarımını ve sırasını kendin seçersin.</p>
        </div>
      )}

      {sections.map((s, i) => {
        if (!s.block) return <LegacySection key={i} section={s} />;
        const meta = TYPE_META[s.block.type];
        return (
          <section key={i} className="overflow-hidden rounded-xl border bg-card shadow-xs">
            <header className="flex flex-wrap items-center gap-2 border-b px-4 py-2.5">
              <span className="grid size-7 place-items-center rounded-md bg-muted text-muted-foreground">
                <meta.icon className="size-3.5" />
              </span>
              <span className="text-sm font-semibold">
                {i + 1}. {meta.label}
              </span>
              <span className="hidden text-xs text-muted-foreground sm:inline">· {meta.hint}</span>
              <div className="ml-auto flex items-center gap-0.5">
                <IconBtn label="Yukarı taşı" disabled={i === 0} onClick={() => move(i, i - 1)}>
                  <ArrowUp />
                </IconBtn>
                <IconBtn label="Aşağı taşı" disabled={i === sections.length - 1} onClick={() => move(i, i + 1)}>
                  <ArrowDown />
                </IconBtn>
                <DeleteSection onConfirm={() => onChange(sections.filter((_, j) => j !== i))} label={meta.label} />
              </div>
            </header>

            <div className="space-y-5 p-4">
              <StyleBar style={s.style ?? DEFAULT_SECTION_STYLE} onChange={(style) => set(i, { style })} />
              <BlockFields block={s.block} onChange={(block) => set(i, { block })} />
            </div>
          </section>
        );
      })}

      {adding ? (
        <div className="rounded-xl border bg-card p-4 shadow-xs">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-semibold">Bölüm türü seç</p>
            <button type="button" onClick={() => setAdding(false)} className="text-xs text-muted-foreground hover:text-foreground">
              Kapat
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
            {BLOCK_TYPES.map((t) => {
              const m = TYPE_META[t];
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => {
                    onChange([...sections, defaultSection(t)]);
                    setAdding(false);
                  }}
                  className="flex flex-col items-start gap-2 rounded-lg border p-3 text-left transition-colors hover:border-foreground/20 hover:bg-muted/50"
                >
                  <m.icon className="size-4 text-muted-foreground" />
                  <span className="text-sm font-semibold">{m.label}</span>
                  <span className="text-xs text-muted-foreground">{m.hint}</span>
                </button>
              );
            })}
          </div>
        </div>
      ) : (
        <Button variant="outline" className="w-full border-dashed bg-card" onClick={() => setAdding(true)}>
          <Plus /> Bölüm ekle
        </Button>
      )}
    </div>
  );
}

function LegacySection({ section }: { section: ContentSection }) {
  return (
    <div className="rounded-xl border border-dashed bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
      Eski bölüm ({section.nodes.length} blok). Bu bölüm sitede olduğu gibi görünür. Düzenlemek için yeni bir bölüm ekle.
    </div>
  );
}

function IconBtn({ label, disabled, onClick, children }: { label: string; disabled?: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className="grid size-7 place-items-center rounded text-muted-foreground hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-30 [&_svg]:size-3.5"
    >
      {children}
    </button>
  );
}

function DeleteSection({ label, onConfirm }: { label: string; onConfirm: () => void }) {
  const [ask, setAsk] = useState(false);
  return (
    <>
      <button
        type="button"
        aria-label="Bölümü sil"
        title="Bölümü sil"
        onClick={() => setAsk(true)}
        className="grid size-7 place-items-center rounded text-muted-foreground hover:bg-red-50 hover:text-red-600 [&_svg]:size-3.5"
      >
        <Trash2 />
      </button>
      <ConfirmDialog
        open={ask}
        onOpenChange={setAsk}
        title={`${label} bölümü silinsin mi?`}
        description="Bölüm ve içindeki tüm alanlar kaldırılır. Kaydetmeden çıkarsan değişiklik uygulanmaz."
        onConfirm={() => {
          setAsk(false);
          onConfirm();
        }}
      />
    </>
  );
}

const SEL = "h-9 rounded-md border bg-transparent px-2 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50";
const FIELD = "w-full rounded-md border bg-transparent px-3 py-2 text-sm shadow-xs outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50";

function StyleBar({ style, onChange }: { style: SectionStyle; onChange: (s: SectionStyle) => void }) {
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-lg bg-muted/50 px-3 py-2 text-xs">
      <span className="font-medium text-muted-foreground">Stil</span>
      <label className="flex items-center gap-1.5">
        Arka plan
        <select value={style.background} onChange={(e) => onChange({ ...style, background: e.target.value as SectionStyle["background"] })} className={SEL}>
          <option value="white">Beyaz</option>
          <option value="cream">Krem</option>
          <option value="navy">Lacivert</option>
          <option value="red">Kırmızı</option>
        </select>
      </label>
      <label className="flex items-center gap-1.5">
        Boşluk
        <select value={style.padding} onChange={(e) => onChange({ ...style, padding: e.target.value as SectionStyle["padding"] })} className={SEL}>
          <option value="sm">Dar</option>
          <option value="md">Normal</option>
          <option value="lg">Geniş</option>
        </select>
      </label>
    </div>
  );
}

function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <div className="space-y-1.5">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

function Text({ value, onChange, placeholder, mono }: { value: string; onChange: (v: string) => void; placeholder?: string; mono?: boolean }) {
  return <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className={cn(FIELD, "h-9", mono && "font-mono text-xs")} />;
}

function Area({ value, onChange, placeholder, rows = 3 }: { value: string; onChange: (v: string) => void; placeholder?: string; rows?: number }) {
  return <textarea rows={rows} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className={cn(FIELD, "resize-y")} />;
}

function ColumnsPick({ value, onChange, max = 4 }: { value: number; onChange: (n: 2 | 3 | 4) => void; max?: 2 | 3 | 4 }) {
  return (
    <div className="flex gap-1">
      {([2, 3, 4] as const)
        .filter((n) => n <= max)
        .map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => onChange(n)}
            aria-pressed={value === n}
            className={cn("h-9 w-10 rounded-md border text-sm font-semibold", value === n ? "border-foreground/25 bg-muted" : "text-muted-foreground hover:bg-muted/60")}
          >
            {n}
          </button>
        ))}
    </div>
  );
}

/** One image slot: pick from the library (uploads go there too). */
export function ImageSlot({ image, onChange, folder = "product", label = "Görsel" }: { image: BlockImage | null; onChange: (i: BlockImage | null) => void; folder?: string; label?: string }) {
  const [open, setOpen] = useState(false);
  const src = image?.src ? mediaUrl(image.src) : "";
  return (
    <div className="flex gap-3">
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="group relative grid size-20 shrink-0 place-items-center overflow-hidden rounded-lg border bg-muted text-muted-foreground"
        title={`${label} seç`}
      >
        {src ? <img src={src} alt="" className="size-full object-cover" /> : <ImageIcon className="size-5" />}
        <span className="absolute inset-0 grid place-items-center bg-black/50 text-[11px] font-medium text-white opacity-0 transition-opacity group-hover:opacity-100">Değiştir</span>
      </button>
      <div className="min-w-0 flex-1 space-y-2">
        <Text value={image?.alt ?? ""} onChange={(alt) => image && onChange({ ...image, alt })} placeholder="Görsel açıklaması (alt)" />
        <div className="flex items-center gap-2">
          <p className="min-w-0 flex-1 truncate font-mono text-[11px] text-muted-foreground">{image?.src || "Görsel yok"}</p>
          <Button type="button" variant="outline" size="sm" onClick={() => setOpen(true)}>
            Medyadan seç
          </Button>
          {image && (
            <Button type="button" variant="ghost" size="sm" onClick={() => onChange(null)}>
              Kaldır
            </Button>
          )}
        </div>
      </div>
      <MediaPicker
        folder={folder}
        open={open}
        onOpenChange={setOpen}
        onPick={(m) => onChange({ mediaId: m.id, src: m.path, alt: image?.alt || m.texts.tr?.alt || "" })}
      />
    </div>
  );
}

function ButtonsEditor({ buttons, onChange }: { buttons: BlockButton[]; onChange: (b: BlockButton[]) => void }) {
  const set = (i: number, p: Partial<BlockButton>) => onChange(buttons.map((b, j) => (j === i ? { ...b, ...p } : b)));
  return (
    <div className="space-y-2">
      {buttons.map((b, i) => (
        <div key={i} className="grid gap-2 sm:grid-cols-[1fr_1fr_auto_auto]">
          <Text value={b.text} onChange={(text) => set(i, { text })} placeholder="Buton yazısı" />
          <Text value={b.href} onChange={(href) => set(i, { href })} placeholder="/tr/iletisim veya https://…" mono />
          <select value={b.variant} onChange={(e) => set(i, { variant: e.target.value as BlockButton["variant"] })} className={SEL}>
            <option value="primary">Kırmızı</option>
            <option value="secondary">İkincil</option>
          </select>
          <Button type="button" variant="ghost" size="icon" onClick={() => onChange(buttons.filter((_, j) => j !== i))} aria-label="Butonu kaldır">
            <Trash2 />
          </Button>
        </div>
      ))}
      {buttons.length < 3 && (
        <Button type="button" variant="outline" size="sm" onClick={() => onChange([...buttons, btn()])}>
          <Plus /> Buton ekle
        </Button>
      )}
    </div>
  );
}

/** Repeating items (cards, faq). Each item renders its own fields. */
function ListEditor<T>({ items, make, render, onItems, max = 12 }: { items: T[]; make: () => T; render: (item: T, set: (p: Partial<T>) => void) => React.ReactNode; onItems: (items: T[]) => void; max?: number }) {
  const setAt = (i: number, p: Partial<T>) => onItems(items.map((x, j) => (j === i ? { ...x, ...p } : x)));
  return (
    <div className="space-y-3">
      {items.map((it, i) => (
        <div key={i} className="relative rounded-lg border bg-background p-3 pr-10">
          <div className="space-y-3">{render(it, (p) => setAt(i, p))}</div>
          <Button type="button" variant="ghost" size="icon" className="absolute right-1 top-1 size-7" aria-label="Öğeyi kaldır" onClick={() => onItems(items.filter((_, j) => j !== i))}>
            <Trash2 />
          </Button>
        </div>
      ))}
      {items.length < max && (
        <Button type="button" variant="outline" size="sm" onClick={() => onItems([...items, make()])}>
          <Plus /> Ekle
        </Button>
      )}
    </div>
  );
}

function BlockFields({ block: b, onChange }: { block: SectionBlock; onChange: (b: SectionBlock) => void }) {
  switch (b.type) {
    case "hero":
      return (
        <div className="grid gap-4 lg:grid-cols-[1fr_16rem]">
          <div className="space-y-4">
            <Field label="Üst etiket">
              <Text value={b.eyebrow} onChange={(eyebrow) => onChange({ ...b, eyebrow })} placeholder="Ör. Yeni" />
            </Field>
            <Field label="Başlık">
              <Text value={b.title} onChange={(title) => onChange({ ...b, title })} />
            </Field>
            <Field label="Metin">
              <Area value={b.text} onChange={(text) => onChange({ ...b, text })} />
            </Field>
            <Field label="Butonlar">
              <ButtonsEditor buttons={b.buttons} onChange={(buttons) => onChange({ ...b, buttons })} />
            </Field>
            <Field label="Hizalama">
              <Seg value={b.align} options={[["left", "Sol"], ["center", "Orta"]]} onChange={(align) => onChange({ ...b, align })} />
            </Field>
          </div>
          <Field label="Görsel">
            <ImageSlot image={b.image} onChange={(image) => onChange({ ...b, image: image ?? null })} folder="page" />
          </Field>
        </div>
      );

    case "mediaText":
      return (
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="space-y-4">
            <Field label="Üst etiket">
              <Text value={b.eyebrow} onChange={(eyebrow) => onChange({ ...b, eyebrow })} />
            </Field>
            <Field label="Başlık">
              <Text value={b.title} onChange={(title) => onChange({ ...b, title })} />
            </Field>
            <Field label="Metin">
              <RichText value={b.html} onChange={(html) => onChange({ ...b, html })} />
            </Field>
            <Field label="Butonlar">
              <ButtonsEditor buttons={b.buttons} onChange={(buttons) => onChange({ ...b, buttons })} />
            </Field>
          </div>
          <div className="space-y-4">
            <Field label="Görsel">
              <ImageSlot image={b.image} onChange={(image) => onChange({ ...b, image: image ?? null })} folder="page" />
            </Field>
            <Field label="Görsel konumu">
              <Seg value={b.imageSide} options={[["left", "Solda"], ["right", "Sağda"]]} onChange={(imageSide) => onChange({ ...b, imageSide })} />
            </Field>
          </div>
        </div>
      );

    case "richText":
      return (
        <div className="space-y-4">
          <Field label="Genişlik">
            <Seg value={b.width} options={[["narrow", "Dar"], ["wide", "Geniş"]]} onChange={(width) => onChange({ ...b, width })} />
          </Field>
          <div className="space-y-3">
            {b.nodes.map((n, i) => (
              <div key={i} className="flex gap-2">
                <div className="min-w-0 flex-1">
                  {n.type === "heading" ? (
                    <div className="flex gap-2">
                      <select value={n.level} onChange={(e) => onChange({ ...b, nodes: b.nodes.map((x, j) => (j === i ? { ...n, level: Number(e.target.value) } : x)) })} className={SEL} aria-label="Seviye">
                        <option value={2}>H2</option>
                        <option value={3}>H3</option>
                      </select>
                      <Text value={n.text} onChange={(text) => onChange({ ...b, nodes: b.nodes.map((x, j) => (j === i ? { ...n, text } : x)) })} placeholder="Başlık" />
                    </div>
                  ) : n.type === "paragraph" ? (
                    <RichText value={n.html} onChange={(html) => onChange({ ...b, nodes: b.nodes.map((x, j) => (j === i ? { type: "paragraph", html, text: html.replace(/<[^>]+>/g, "") } : x)) })} />
                  ) : null}
                </div>
                <Button type="button" variant="ghost" size="icon" aria-label="Kaldır" onClick={() => onChange({ ...b, nodes: b.nodes.filter((_, j) => j !== i) })}>
                  <Trash2 />
                </Button>
              </div>
            ))}
            <div className="flex gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => onChange({ ...b, nodes: [...b.nodes, { type: "paragraph", html: "", text: "" }] })}>
                <Plus /> Paragraf
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={() => onChange({ ...b, nodes: [...b.nodes, { type: "heading", level: 2, text: "" }] })}>
                <Plus /> Başlık
              </Button>
            </div>
          </div>
        </div>
      );

    case "cards":
      return (
        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Üst etiket">
              <Text value={b.eyebrow} onChange={(eyebrow) => onChange({ ...b, eyebrow })} />
            </Field>
            <Field label="Başlık">
              <Text value={b.title} onChange={(title) => onChange({ ...b, title })} />
            </Field>
          </div>
          <Field label="Kısa açıklama">
            <Area value={b.intro} onChange={(intro) => onChange({ ...b, intro })} rows={2} />
          </Field>
          <Field label="Sütun sayısı">
            <ColumnsPick value={b.columns} onChange={(columns) => onChange({ ...b, columns })} />
          </Field>
          <ListEditor
            items={b.items}
            make={() => ({ image: img(), title: "Kart", text: "", href: "" })}
            onItems={(items) => onChange({ ...b, items })}
            render={(it, set) => (
              <>
                <ImageSlot image={it.image} onChange={(image) => set({ image })} folder="product" />
                <Text value={it.title} onChange={(title) => set({ title })} placeholder="Kart başlığı" />
                <Area value={it.text} onChange={(text) => set({ text })} rows={2} placeholder="Kart metni" />
                <Text value={it.href} onChange={(href) => set({ href })} placeholder="Link (isteğe bağlı)" mono />
              </>
            )}
          />
        </div>
      );

    case "gallery":
      return (
        <div className="space-y-4">
          <Field label="Başlık (isteğe bağlı)">
            <Text value={b.title} onChange={(title) => onChange({ ...b, title })} />
          </Field>
          <Field label="Sütun sayısı">
            <ColumnsPick value={b.columns} onChange={(columns) => onChange({ ...b, columns })} />
          </Field>
          <div className="space-y-3">
            {b.images.map((im, i) => (
              <div key={i} className="relative rounded-lg border p-3 pr-10">
                <ImageSlot image={im} onChange={(image) => onChange({ ...b, images: b.images.map((x, j) => (j === i ? image ?? img() : x)) })} folder="page" />
                <Button type="button" variant="ghost" size="icon" className="absolute right-1 top-1 size-7" aria-label="Görseli kaldır" onClick={() => onChange({ ...b, images: b.images.filter((_, j) => j !== i) })}>
                  <Trash2 />
                </Button>
              </div>
            ))}
          </div>
          <Button type="button" variant="outline" size="sm" onClick={() => onChange({ ...b, images: [...b.images, img()] })}>
            <Plus /> Görsel ekle
          </Button>
        </div>
      );

    case "stats":
      return (
        <div className="space-y-4">
          <Field label="Başlık (isteğe bağlı)">
            <Text value={b.title} onChange={(title) => onChange({ ...b, title })} />
          </Field>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {b.items.map((s, i) => (
              <div key={i} className="space-y-2 rounded-lg border p-3">
                <Text value={s.value} onChange={(value) => onChange({ ...b, items: b.items.map((x, j) => (j === i ? { ...x, value } : x)) })} placeholder="91" />
                <Text value={s.label} onChange={(label) => onChange({ ...b, items: b.items.map((x, j) => (j === i ? { ...x, label } : x)) })} placeholder="Şube sayımız" />
                <Button type="button" variant="ghost" size="sm" onClick={() => onChange({ ...b, items: b.items.filter((_, j) => j !== i) })}>
                  <Trash2 /> Kaldır
                </Button>
              </div>
            ))}
          </div>
          {b.items.length < 8 && (
            <Button type="button" variant="outline" size="sm" onClick={() => onChange({ ...b, items: [...b.items, { value: "0", label: "Etiket" }] })}>
              <Plus /> Rakam ekle
            </Button>
          )}
        </div>
      );

    case "cta":
      return (
        <div className="space-y-4">
          <Field label="Başlık">
            <Text value={b.title} onChange={(title) => onChange({ ...b, title })} />
          </Field>
          <Field label="Metin">
            <Area value={b.text} onChange={(text) => onChange({ ...b, text })} rows={2} />
          </Field>
          <Field label="Buton">
            <ButtonsEditor buttons={b.button ? [b.button] : []} onChange={(bs) => onChange({ ...b, button: bs[0] ?? null })} />
          </Field>
        </div>
      );

    case "faq":
      return (
        <div className="space-y-4">
          <Field label="Başlık">
            <Text value={b.title} onChange={(title) => onChange({ ...b, title })} />
          </Field>
          <ListEditor
            items={b.items}
            make={() => ({ q: "Soru?", a: "Cevap." })}
            onItems={(items) => onChange({ ...b, items })}
            max={20}
            render={(it, set) => (
              <>
                <Text value={it.q} onChange={(q) => set({ q })} placeholder="Soru" />
                <Area value={it.a} onChange={(a) => set({ a })} rows={2} placeholder="Cevap" />
              </>
            )}
          />
        </div>
      );

    case "quote":
      return (
        <div className="grid gap-4 lg:grid-cols-[1fr_16rem]">
          <div className="space-y-4">
            <Field label="Metin">
              <Area value={b.text} onChange={(text) => onChange({ ...b, text })} rows={3} />
            </Field>
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Kişi">
                <Text value={b.author} onChange={(author) => onChange({ ...b, author })} />
              </Field>
              <Field label="Unvan">
                <Text value={b.role} onChange={(role) => onChange({ ...b, role })} />
              </Field>
            </div>
          </div>
          <Field label="Fotoğraf (isteğe bağlı)">
            <ImageSlot image={b.image} onChange={(image) => onChange({ ...b, image })} folder="page" />
          </Field>
        </div>
      );

    case "video":
      return (
        <div className="space-y-4">
          <Field label="Başlık (isteğe bağlı)">
            <Text value={b.title} onChange={(title) => onChange({ ...b, title })} />
          </Field>
          <Field label="YouTube bağlantısı">
            <Text value={b.href} onChange={(href) => onChange({ ...b, href })} placeholder="https://www.youtube.com/watch?v=…" mono />
          </Field>
        </div>
      );

    case "spacer":
      return (
        <div className="flex flex-wrap items-center gap-4">
          <Field label="Boyut">
            <Seg value={b.size} options={[["sm", "Küçük"], ["md", "Orta"], ["lg", "Büyük"]]} onChange={(size) => onChange({ ...b, size })} />
          </Field>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={b.line} onChange={(e) => onChange({ ...b, line: e.target.checked })} /> Ayırıcı çizgi
          </label>
        </div>
      );
  }
}

function Seg<T extends string>({ value, options, onChange }: { value: T; options: [T, string][]; onChange: (v: T) => void }) {
  return (
    <div className="inline-flex gap-1 rounded-lg border p-1">
      {options.map(([v, l]) => (
        <button
          key={v}
          type="button"
          onClick={() => onChange(v)}
          aria-pressed={value === v}
          className={cn("rounded-md px-3 py-1 text-sm font-medium", value === v ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground")}
        >
          {l}
        </button>
      ))}
    </div>
  );
}

