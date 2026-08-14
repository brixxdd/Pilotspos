import { EmptyState, PageHeader } from "@pilotspos/ui";

export function ComingSoon({ title, phase }: { title: string; phase: string }) {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={title} />
      <EmptyState title={`Módulo en construcción`} description={`Este módulo se implementa en ${phase}.`} />
    </div>
  );
}
