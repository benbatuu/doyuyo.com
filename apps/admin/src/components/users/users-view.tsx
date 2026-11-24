"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2, Trash2, UserPlus } from "lucide-react";
import { MIN_PASSWORD, RESOURCES, ROLES, ROLE_LABEL, type AdminUserRow, type Matrix, type Resource, type Role } from "@doyuyo/core";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { field } from "@/components/catalog/product-sheet";
import { cn } from "@/lib/utils";
import { createUser, removeUser, saveAccess, setUserPassword, updateUser } from "@/app/(panel)/kullanicilar/actions";

const EDITABLE_ROLES: Role[] = ["editor", "viewer"];

export function UsersView({ users, matrix, actorEmail, actorRole }: { users: AdminUserRow[]; matrix: Matrix; actorEmail: string; actorRole: Role }) {
  return (
    <div className="space-y-8">
      <UsersSection users={users} actorEmail={actorEmail} actorRole={actorRole} />
      <AccessSection matrix={matrix} canEdit={actorRole === "owner"} />
    </div>
  );
}

function UsersSection({ users, actorEmail, actorRole }: { users: AdminUserRow[]; actorEmail: string; actorRole: Role }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState<Role>("editor");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [pending, start] = useTransition();

  const create = () => {
    setError("");
    start(async () => {
      const r = await createUser({ email, name, role, password });
      if (!r.ok) return setError(r.error);
      setEmail("");
      setName("");
      setPassword("");
      router.refresh();
    });
  };

  return (
    <section className="space-y-4">
      <h2 className="text-sm font-semibold">Kullanıcılar</h2>

      <div className="grid gap-3 rounded-xl border bg-card p-4 shadow-xs md:grid-cols-[1fr_1fr_160px_1fr_auto]">
        <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="E-posta" type="email" className="h-9" />
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ad soyad" className="h-9" />
        <select value={role} onChange={(e) => setRole(e.target.value as Role)} className={cn(field, "h-9")}>
          {ROLES.filter((r) => r !== "owner" || actorRole === "owner").map((r) => (
            <option key={r} value={r}>
              {ROLE_LABEL[r]}
            </option>
          ))}
        </select>
        <Input value={password} onChange={(e) => setPassword(e.target.value)} placeholder={`Geçici şifre (en az ${MIN_PASSWORD})`} type="password" autoComplete="new-password" className="h-9" />
        <Button onClick={create} disabled={pending || !email || !password} className="h-9">
          {pending ? <Loader2 className="size-4 animate-spin" /> : <UserPlus className="size-4" />} Ekle
        </Button>
        {error && <p className="text-xs text-destructive md:col-span-5">{error}</p>}
      </div>

      <div className="overflow-x-auto rounded-xl border bg-card shadow-xs">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="text-xs text-muted-foreground">
            <tr className="border-b">
              <th className="px-4 py-2.5 font-medium">Kullanıcı</th>
              <th className="px-3 py-2.5 font-medium">Rol</th>
              <th className="px-3 py-2.5 font-medium">Durum</th>
              <th className="px-3 py-2.5 text-right font-medium">İşlem</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {users.map((u) => (
              <UserRow key={u.id + u.email} u={u} isSelf={u.email === actorEmail} actorRole={actorRole} />
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function UserRow({ u, isSelf, actorRole }: { u: AdminUserRow; isSelf: boolean; actorRole: Role }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [err, setErr] = useState("");
  const [pwOpen, setPwOpen] = useState(false);
  const [pw, setPw] = useState("");
  const [delOpen, setDelOpen] = useState(false);
  const [delErr, setDelErr] = useState("");
  const locked = u.builtin || (u.role === "owner" && actorRole !== "owner");

  const run = (fn: () => Promise<{ ok: boolean; error?: string }>, onOk?: () => void) =>
    start(async () => {
      setErr("");
      const r = await fn();
      if (!r.ok) return setErr(r.error ?? "Hata");
      onOk?.();
      router.refresh();
    });

  return (
    <>
      <tr>
        <td className="px-4 py-2.5">
          <span className="block font-medium">{u.name || u.email}{isSelf && <span className="ml-2 text-xs text-muted-foreground">(sen)</span>}</span>
          <span className="block text-xs text-muted-foreground">{u.email}</span>
          {err && <span className="block text-xs text-destructive">{err}</span>}
        </td>
        <td className="px-3 py-2.5">
          {u.builtin || locked ? (
            <span className="text-sm">{ROLE_LABEL[u.role]}</span>
          ) : (
            <select
              value={u.role}
              disabled={pending || isSelf}
              onChange={(e) => run(() => updateUser(u.id, { role: e.target.value }))}
              className={cn(field, "h-8 w-40")}
            >
              {EDITABLE_ROLES.map((r) => (
                <option key={r} value={r}>
                  {ROLE_LABEL[r]}
                </option>
              ))}
            </select>
          )}
        </td>
        <td className="px-3 py-2.5">
          {u.builtin ? (
            <span className="text-xs text-muted-foreground">Ortam hesabı</span>
          ) : (
            <button
              type="button"
              disabled={pending || isSelf}
              onClick={() => run(() => updateUser(u.id, { active: !u.active }))}
              className={cn("rounded-full border px-2.5 py-0.5 text-xs font-medium disabled:opacity-50", u.active ? "border-emerald-300 bg-emerald-50 text-emerald-800" : "text-muted-foreground")}
            >
              {u.active ? "Aktif" : "Pasif"}
            </button>
          )}
        </td>
        <td className="px-3 py-2.5 text-right">
          {!u.builtin && !locked && (
            <span className="inline-flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setPwOpen((o) => !o)} disabled={pending}>
                Şifre
              </Button>
              <Button variant="outline" size="sm" onClick={() => setDelOpen(true)} disabled={pending || isSelf} aria-label="Kullanıcıyı sil">
                <Trash2 className="size-4" />
              </Button>
            </span>
          )}
        </td>
      </tr>
      {pwOpen && (
        <tr>
          <td colSpan={4} className="bg-muted/30 px-4 py-3">
            <div className="flex items-center gap-2">
              <Input value={pw} onChange={(e) => setPw(e.target.value)} type="password" autoComplete="new-password" placeholder={`Yeni şifre (en az ${MIN_PASSWORD})`} className="h-9 max-w-xs" />
              <Button
                size="sm"
                disabled={pending || pw.length < MIN_PASSWORD}
                onClick={() =>
                  run(() => setUserPassword(u.id, pw), () => {
                    setPw("");
                    setPwOpen(false);
                  })
                }
              >
                <Check className="size-4" /> Kaydet
              </Button>
            </div>
          </td>
        </tr>
      )}
      <ConfirmDialog
        open={delOpen}
        onOpenChange={setDelOpen}
        title="Kullanıcı silinsin mi?"
        description={`${u.email} panele giremez hale gelir. Bu işlem geri alınamaz.`}
        confirmLabel="Sil"
        pending={pending}
        error={delErr}
        onConfirm={() =>
          start(async () => {
            const r = await removeUser(u.id);
            if (!r.ok) return setDelErr(r.error);
            setDelOpen(false);
            router.refresh();
          })
        }
      />
    </>
  );
}

function AccessSection({ matrix, canEdit }: { matrix: Matrix; canEdit: boolean }) {
  const [m, setM] = useState<Matrix>(matrix);
  const [msg, setMsg] = useState("");
  const [pending, start] = useTransition();
  const dirty = JSON.stringify(m) !== JSON.stringify(matrix);
  const toggle = (role: Role, r: Resource) => setM((x) => ({ ...x, [role]: { ...x[role], [r]: !x[role][r] } }));

  const save = () =>
    start(async () => {
      setMsg("");
      const r = await saveAccess(m);
      setMsg(r.ok ? "Kaydedildi" : r.error);
    });

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold">Roller ve izinler</h2>
          <p className="text-xs text-muted-foreground">Sahip her zaman tam yetkilidir. Editör ve görüntüleyici için hangi alanların açık olduğunu seçersin.</p>
        </div>
        <div className="flex items-center gap-3">
          {msg && <span className="text-xs text-muted-foreground">{msg}</span>}
          <Button onClick={save} disabled={!canEdit || !dirty || pending}>
            {pending && <Loader2 className="size-4 animate-spin" />} Yetkileri kaydet
          </Button>
        </div>
      </div>
      <div className="overflow-x-auto rounded-xl border bg-card shadow-xs">
        <table className="w-full min-w-[520px] text-left text-sm">
          <thead className="text-xs text-muted-foreground">
            <tr className="border-b">
              <th className="px-4 py-2.5 font-medium">Alan</th>
              {ROLES.map((r) => (
                <th key={r} className="px-3 py-2.5 text-center font-medium">
                  {ROLE_LABEL[r]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y">
            {RESOURCES.map((res) => (
              <tr key={res.id}>
                <td className="px-4 py-2.5">{res.label}</td>
                {ROLES.map((role) => (
                  <td key={role} className="px-3 py-2.5 text-center">
                    {role === "owner" ? (
                      <input type="checkbox" checked disabled className="size-4 accent-foreground" aria-label={`${ROLE_LABEL[role]}: ${res.label}`} />
                    ) : (
                      <input
                        type="checkbox"
                        checked={m[role][res.id]}
                        disabled={!canEdit}
                        onChange={() => toggle(role, res.id)}
                        className="size-4 accent-foreground"
                        aria-label={`${ROLE_LABEL[role]}: ${res.label}`}
                      />
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
