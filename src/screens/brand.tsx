export function Wordmark({ compact = false }: { compact?: boolean }) {
  return (
    <span className={compact ? "wordmark compact" : "wordmark"}>
      <svg
        viewBox="0 0 32 32"
        width={compact ? 22 : 26}
        height={compact ? 22 : 26}
        aria-hidden="true"
      >
        <circle
          cx="16"
          cy="16"
          r="14.5"
          fill="none"
          stroke="currentColor"
          strokeOpacity="0.35"
        />
        <path
          d="M5 17h6l2.5-6 4 11 3-7H27"
          fill="none"
          stroke="var(--accent)"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <span className="wordmark-text">ASTRAMED</span>
    </span>
  );
}
