interface IVPageHeaderProps {
  title: string;
  subtitle?: string;
  badge?: string;
  badgeColor?: string;
  actions?: React.ReactNode;
}

export default function IVPageHeader({ title, subtitle, badge, badgeColor, actions }: IVPageHeaderProps) {
  return (
    <div className="flex items-start justify-between px-6 pt-6 pb-4 shrink-0" style={{ borderBottom: "1px solid var(--iv-border)" }}>
      <div>
        <div className="flex items-center gap-3 mb-1">
          <h1 className="text-xl font-bold" style={{ fontFamily: "'Syne', sans-serif", color: "var(--iv-text)" }}>
            {title}
          </h1>
          {badge && (
            <span className="text-xs px-2 py-0.5 rounded font-mono" style={{ backgroundColor: badgeColor ?? "rgba(0,180,216,0.15)", color: badgeColor ? "#fff" : "var(--iv-blue)", border: `1px solid ${badgeColor ?? "rgba(0,180,216,0.3)"}` }}>
              {badge}
            </span>
          )}
        </div>
        {subtitle && <p className="text-sm" style={{ color: "var(--iv-text-muted)" }}>{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}

