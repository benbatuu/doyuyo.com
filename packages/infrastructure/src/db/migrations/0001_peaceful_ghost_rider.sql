ALTER TABLE "media" ADD COLUMN "original_name" text;--> statement-breakpoint
ALTER TABLE "media_translations" ADD COLUMN "title" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "media_translations" ADD COLUMN "caption" text DEFAULT '' NOT NULL;