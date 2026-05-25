export default function PageHeader({ eyebrow, title, description, action }) {
  return (
    <div className="mb-6 flex flex-col gap-4 rounded-[1.75rem] border border-white/10 bg-white/[0.04] p-5 shadow-panel backdrop-blur-2xl md:flex-row md:items-end md:justify-between">
      <div className="min-w-0">
        {eyebrow && <span className="eyebrow">{eyebrow}</span>}
        <h1 className="mt-2 text-3xl font-black tracking-tight text-white md:text-4xl">{title}</h1>
        {description && <p className="mt-3 max-w-3xl text-sm leading-6 text-dexa-muted">{description}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
