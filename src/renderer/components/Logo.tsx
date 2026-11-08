/** Logo do Kandesk (mesma arte de resources/icon.svg), em SVG inline. */
export function Logo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 1024 1024" className={className} role="img" aria-label="Kandesk">
      <rect width="1024" height="1024" rx="228" fill="#1d4ed8" />
      <rect x="232" y="232" width="150" height="560" rx="44" fill="#fff" />
      <rect x="437" y="232" width="150" height="380" rx="44" fill="#fff" />
      <rect x="642" y="232" width="150" height="240" rx="44" fill="#fff" />
      <circle cx="700" cy="700" r="170" fill="#fff" stroke="#1d4ed8" strokeWidth="44" />
      <path
        d="M700 610v90l60 40"
        fill="none"
        stroke="#1d4ed8"
        strokeWidth="40"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
