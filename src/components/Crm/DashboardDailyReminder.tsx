"use client";

import { Sunrise } from "lucide-react";

import { Card, CardContent } from "@/components/Ui/Card";

/** Calm Jung-tinged nudge on the desk: consciousness vs habit, persona vs wholeness. */
export function DashboardDailyReminder() {
  return (
    <Card className="border-primary/12 from-primary/[0.06] to-transparent bg-gradient-to-br from-10% via-transparent to-transparent backdrop-blur-md">
      <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:gap-4 sm:p-5">
        <span
          className="bg-primary/10 text-primary inline-flex size-10 shrink-0 items-center justify-center rounded-full ring-1 ring-primary/15"
          aria-hidden
        >
          <Sunrise className="size-5" />
        </span>
        <div className="min-w-0 space-y-1">
          <p className="text-muted-foreground text-[10px] font-semibold tracking-[0.22em] uppercase">
            Daily reminder
          </p>
          <p className="text-foreground text-base font-semibold leading-snug tracking-tight sm:text-[1.05rem]">
            One life. What stays unconscious still steers you: choose on purpose,
            not on autopilot.
          </p>
          <p className="text-muted-foreground max-w-2xl text-sm leading-relaxed">
            Favor wholeness over performance. Keep rest and the people who know
            you. Let the desk carry tasks, not meaning.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
