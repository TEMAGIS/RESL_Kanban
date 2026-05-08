// Tennessee flag-style badge — same SVG used in Critical2TN.
// Red top with serif "TN", thin white stripe, blue bottom.
export default function TnBadge({ size = 56, className = '' }) {
  return (
    <svg
      className={`tn-badge ${className}`.trim()}
      width={size}
      height={size}
      viewBox="0 0 100 100"
      role="img"
      aria-label="Tennessee state logo"
    >
      <rect x="0" y="0"  width="100" height="84" fill="#D22730" />
      <rect x="0" y="84" width="100" height="5"  fill="#ffffff" />
      <rect x="0" y="89" width="100" height="11" fill="#002868" />
      <text
        x="50" y="70"
        textAnchor="middle"
        textLength="86"
        lengthAdjust="spacingAndGlyphs"
        fontFamily="Georgia, 'Times New Roman', serif"
        fontWeight="700"
        fontSize="74"
        fill="#ffffff"
      >
        TN
      </text>
    </svg>
  );
}
