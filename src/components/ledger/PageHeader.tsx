/** Title block shown at the top of each page, under the shared app header. */
export function PageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    // flex-wrap: when the action doesn't fit beside the title (e.g. the month picker on a
    // phone) it drops to its own line instead of squeezing the title into a narrow column.
    <div className="mb-5 flex flex-wrap items-end justify-between gap-x-4 gap-y-3">
      <div className="min-w-48 flex-1">
        <h1 className="text-2xl text-ink md:text-[1.75rem]">{title}</h1>
        {description ? <p className="mt-1 text-sm text-ink-muted">{description}</p> : null}
      </div>
      {action}
    </div>
  );
}
