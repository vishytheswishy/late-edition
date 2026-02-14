CREATE TABLE "rsvps" (
	"id" serial PRIMARY KEY NOT NULL,
	"event_id" text NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"status" text DEFAULT 'going' NOT NULL,
	"plus_one" integer DEFAULT 0 NOT NULL,
	"note" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "rsvp_enabled" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "rsvps" ADD CONSTRAINT "rsvps_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "rsvps_event_email_idx" ON "rsvps" USING btree ("event_id","email");