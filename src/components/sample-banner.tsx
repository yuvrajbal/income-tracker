"use client";

import { startFresh } from "@/lib/store";
import { Button } from "./ui";

export function SampleBanner() {
  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-dashed border-border bg-surface-2 px-4 py-3 text-sm">
      <span className="text-text-2">You&apos;re looking at sample data. Clear it whenever you&apos;re ready to enter your real numbers.</span>
      <Button
        size="sm"
        onClick={() => {
          if (confirm("Remove all sample data and start fresh?")) startFresh();
        }}
      >
        Start fresh
      </Button>
    </div>
  );
}
