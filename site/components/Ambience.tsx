/** The backdrop: three drifting colour fields, a faint grid, film grain — the reference's
 *  ambience — and, instead of its fog and bats, two faceted clouds crossing the sky.
 *  Fixed behind everything; no pointer events. */
const Cloud = () => (
  <svg viewBox="0 0 240 80" aria-hidden>
    <g fill="currentColor" stroke="var(--cloud-line)">
      <path d="M20 50 l18 -16 l22 4 l14 -14 l24 8 l16 -6 l18 18 l-6 10 h-100z" />
      <path d="M150 38 l12 -10 l16 2 l10 -8 l18 6 l10 12 l-4 8 h-62z" />
    </g>
  </svg>
);

export default function Ambience() {
  return (
    <div className="ambience" aria-hidden>
      <div className="blob a" /><div className="blob b" /><div className="blob c" />
      <div className="grid" />
      <div className="cloud one"><Cloud /></div>
      <div className="cloud two"><Cloud /></div>
      <div className="grain" />
    </div>
  );
}
