"use client";

import { PageHeader } from "@/components/app-shell";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button, Card, CardHeader } from "@/components/ui";
import { todayISO } from "@/lib/dates";
import { exportJSON, loadSampleData, startFresh, useAppData } from "@/lib/store";

export default function SettingsPage() {
  const data = useAppData();

  function download() {
    const blob = new Blob([exportJSON()], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `ledger-backup-${todayISO()}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  return (
    <>
      <PageHeader title="Settings" />
      <div className="space-y-4">
        <Card>
          <CardHeader title="Appearance" action={<ThemeToggle />} />
          <div className="pb-2" />
        </Card>
        <Card>
          <CardHeader
            title="Data"
            subtitle="For now your data is stored in this browser only. It moves to your Supabase database in a later milestone."
          />
          <div className="flex flex-wrap gap-2 px-5 pb-4">
            <Button onClick={download} disabled={!data}>
              Download backup (JSON)
            </Button>
            <Button
              variant="danger"
              onClick={() => confirm("Delete ALL data in this browser and start fresh?") && startFresh()}
            >
              Erase everything
            </Button>
            <Button variant="ghost" onClick={() => confirm("Replace your data with sample data?") && loadSampleData()}>
              Load sample data
            </Button>
          </div>
        </Card>
      </div>
    </>
  );
}
