export default function ComingSoon({ title, icon = 'fa-hammer' }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-16 gap-3">
      <div className="w-14 h-14 rounded-2xl bg-surface-2 border border-border flex items-center justify-center text-2xl text-text-dim">
        <i className={`fa-solid ${icon}`} />
      </div>
      <h2 className="font-extrabold text-base">{title}</h2>
      <p className="text-sm text-text-muted max-w-[240px]">
        Bu sahifa React frontendga keyingi bosqichda to'liq ko'chiriladi.
      </p>
    </div>
  );
}
