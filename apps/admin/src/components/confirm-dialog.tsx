"use client";

import { Loader2, TriangleAlert } from "lucide-react";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";

/** Branded confirmation popup for destructive actions (replaces window.confirm). */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "Sil",
  pending,
  error,
  onConfirm,
  children,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  title: string;
  description: React.ReactNode;
  confirmLabel?: string;
  pending?: boolean;
  error?: string;
  onConfirm: () => void;
  children?: React.ReactNode;
}) {
  return (
    <AlertDialog open={open} onOpenChange={(o) => !pending && onOpenChange(o)}>
      <AlertDialogContent className="sm:max-w-md">
        <AlertDialogHeader className="sm:flex-row sm:items-start sm:gap-4 sm:text-left">
          <span className="mx-auto grid size-10 shrink-0 place-items-center rounded-full bg-red-50 text-red-600 sm:mx-0">
            <TriangleAlert className="size-5" />
          </span>
          <div className="space-y-1.5">
            <AlertDialogTitle>{title}</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div>{description}</div>
            </AlertDialogDescription>
          </div>
        </AlertDialogHeader>
        {children}
        {error && <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>Vazgeç</AlertDialogCancel>
          {/* Plain button (not AlertDialogAction) so the dialog stays open while working and on error. */}
          <Button variant="destructive" onClick={onConfirm} disabled={pending || !!error}>
            {pending && <Loader2 className="animate-spin" />} {confirmLabel}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
