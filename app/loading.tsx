export default function Loading() {
  return (
    <div className="mx-auto grid min-h-screen max-w-[1500px] gap-6 px-4 py-6 lg:grid-cols-[290px_minmax(0,1fr)] lg:px-8">
      <div className="rounded-[32px] border border-border bg-card p-5 shadow-panel">
        <div className="h-6 w-36 animate-pulse rounded bg-muted" />
        <div className="mt-4 h-4 w-52 animate-pulse rounded bg-muted" />
        <div className="mt-10 space-y-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="h-11 animate-pulse rounded-2xl bg-muted" />
          ))}
        </div>
      </div>
      <div className="space-y-6">
        <div className="h-40 animate-pulse rounded-[28px] border border-border bg-card shadow-panel" />
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="h-32 animate-pulse rounded-[28px] border border-border bg-card shadow-panel" />
          ))}
        </div>
        <div className="h-[480px] animate-pulse rounded-[28px] border border-border bg-card shadow-panel" />
      </div>
    </div>
  );
}
