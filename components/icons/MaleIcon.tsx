export default function MaleIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Circle */}
      <circle
        cx="40"
        cy="60"
        r="28"
        stroke="#3B82F6"
        strokeWidth="8"
        fill="none"
      />
      {/* Arrow */}
      <line
        x1="60"
        y1="40"
        x2="85"
        y2="15"
        stroke="#3B82F6"
        strokeWidth="8"
        strokeLinecap="round"
      />
      <line
        x1="85"
        y1="15"
        x2="65"
        y2="15"
        stroke="#3B82F6"
        strokeWidth="8"
        strokeLinecap="round"
      />
      <line
        x1="85"
        y1="15"
        x2="85"
        y2="35"
        stroke="#3B82F6"
        strokeWidth="8"
        strokeLinecap="round"
      />
    </svg>
  );
}
