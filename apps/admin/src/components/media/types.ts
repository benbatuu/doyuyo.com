import type { MediaItem } from "@doyuyo/core";

/** MediaItem as it crosses the server -> client boundary (dates as ISO strings). */
export type MediaDTO = Omit<MediaItem, "createdAt" | "updatedAt"> & { createdAt: string; updatedAt: string };
