export default function CalendarIllustration({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 220 200" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <defs>
        <linearGradient id="ci-card" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#eef0fe" />
          <stop offset="100%" stopColor="#e0e4fd" />
        </linearGradient>
        <linearGradient id="ci-header" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#6366f1" />
          <stop offset="100%" stopColor="#7c3aed" />
        </linearGradient>
      </defs>

      {/* back card */}
      <rect x="34" y="26" width="150" height="150" rx="16" fill="url(#ci-card)" transform="rotate(-6 109 101)" />

      {/* main calendar card */}
      <rect x="26" y="34" width="150" height="140" rx="16" fill="white" stroke="#e4e6ee" strokeWidth="1.5" />
      <path d="M26 50a16 16 0 0 1 16-16h118a16 16 0 0 1 16 16v14H26V50Z" fill="url(#ci-header)" />
      <rect x="54" y="26" width="6" height="16" rx="3" fill="white" fillOpacity="0.85" />
      <rect x="140" y="26" width="6" height="16" rx="3" fill="white" fillOpacity="0.85" />

      {/* grid of day cells */}
      {Array.from({ length: 4 }).map((_, row) =>
        Array.from({ length: 5 }).map((__, col) => {
          const x = 42 + col * 24;
          const y = 78 + row * 22;
          const idx = row * 5 + col;
          const highlight = [2, 7, 8, 13].includes(idx);
          const isMilestone = idx === 13;
          return (
            <rect
              key={`${row}-${col}`}
              x={x}
              y={y}
              width="18"
              height="16"
              rx="4"
              fill={isMilestone ? "#7c3aed" : highlight ? "#818cf8" : "#f1f2f8"}
            />
          );
        })
      )}

      {/* connecting dependency line */}
      <path
        d="M60 86 h24 M60 86 v22 M60 108 h48"
        stroke="#a5adf0"
        strokeWidth="2"
        strokeLinecap="round"
        strokeDasharray="1 5"
        fill="none"
      />

      {/* floating badge: checkmark */}
      <circle cx="182" cy="70" r="18" fill="#10b981" stroke="white" strokeWidth="4" />
      <path d="M174 70l5 5 10-10" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />

      {/* floating badge: sparkle */}
      <circle cx="30" cy="150" r="14" fill="white" stroke="#e4e6ee" strokeWidth="1.5" />
      <path
        d="M30 143v14M23 150h14"
        stroke="#6366f1"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </svg>
  );
}
