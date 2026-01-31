export function Logo({ size = 20, className }: { size?: number; className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 32 32"
      width={size}
      height={size}
      className={className}
    >
      <defs>
        <linearGradient id="logo-bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#1a1a2e" />
          <stop offset="100%" stopColor="#16213e" />
        </linearGradient>
        <linearGradient id="logo-g1" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#818cf8" />
          <stop offset="100%" stopColor="#6366f1" />
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="7" fill="url(#logo-bg)" />
      <line x1="16" y1="7" x2="8" y2="15" stroke="#818cf8" strokeWidth="1.5" strokeOpacity="0.5" />
      <line x1="16" y1="7" x2="24" y2="14" stroke="#818cf8" strokeWidth="1.5" strokeOpacity="0.5" />
      <line x1="8" y1="15" x2="13" y2="24" stroke="#818cf8" strokeWidth="1.5" strokeOpacity="0.5" />
      <line x1="24" y1="14" x2="13" y2="24" stroke="#818cf8" strokeWidth="1.5" strokeOpacity="0.5" />
      <line x1="8" y1="15" x2="24" y2="14" stroke="#818cf8" strokeWidth="1.5" strokeOpacity="0.3" />
      <line x1="16" y1="7" x2="13" y2="24" stroke="#818cf8" strokeWidth="1.5" strokeOpacity="0.25" />
      <circle cx="16" cy="7" r="3" fill="url(#logo-g1)" />
      <circle cx="8" cy="15" r="2.5" fill="#a5b4fc" />
      <circle cx="24" cy="14" r="2.5" fill="#a5b4fc" />
      <circle cx="13" cy="24" r="3.5" fill="url(#logo-g1)" />
    </svg>
  );
}
