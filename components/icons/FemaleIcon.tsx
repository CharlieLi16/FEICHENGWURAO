export default function FemaleIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Circle */}
      <circle
        cx="50"
        cy="35"
        r="28"
        stroke="#EC4899"
        strokeWidth="8"
        fill="none"
      />
      {/* Vertical line */}
      <line
        x1="50"
        y1="63"
        x2="50"
        y2="95"
        stroke="#EC4899"
        strokeWidth="8"
        strokeLinecap="round"
      />
      {/* Horizontal line */}
      <line
        x1="35"
        y1="80"
        x2="65"
        y2="80"
        stroke="#EC4899"
        strokeWidth="8"
        strokeLinecap="round"
      />
    </svg>
  );
}
