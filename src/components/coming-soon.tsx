import { PageHeader } from "./app-shell";
import { Card } from "./ui";

export function ComingSoon({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <>
      <PageHeader title={title} />
      <Card className="px-5 py-10 text-center">
        <p className="text-sm font-medium">Coming in the next milestone</p>
        <p className="mx-auto mt-1 max-w-md text-sm text-text-2">{children}</p>
      </Card>
    </>
  );
}
