'use client'

export function HeroBackground() {
  return (
    <div className="absolute inset-0 overflow-hidden">
      {/* Sky Gradient Background */}
      <div 
        className="absolute inset-0"
        style={{
          background: 'linear-gradient(to bottom, hsl(200, 80%, 70%), hsl(200, 60%, 85%), hsl(0, 0%, 90%))',
        }}
      />

      {/* SVG Container for all elements */}
      <svg 
        className="absolute inset-0 w-full h-full" 
        viewBox="0 0 1280 800" 
        preserveAspectRatio="xMidYMid slice"
      >
        {/* Left Figure - Person 1 (background) */}
        <g opacity="0.85">
          {/* Head */}
          <circle cx="120" cy="280" r="35" fill="hsl(25, 60%, 35%)" />
          {/* Body */}
          <rect x="105" y="320" width="30" height="120" fill="hsl(0, 0%, 10%)" />
          {/* Left arm */}
          <rect x="60" y="340" width="50" height="25" fill="hsl(25, 60%, 35%)" />
          {/* Right arm pointing up */}
          <rect x="135" y="280" width="25" height="80" fill="hsl(25, 60%, 35%)" 
            transform="rotate(-30 150 320)" />
          {/* Legs */}
          <rect x="105" y="440" width="15" height="80" fill="hsl(0, 0%, 10%)" />
          <rect x="120" y="440" width="15" height="80" fill="hsl(0, 0%, 10%)" />
        </g>

        {/* Center-Left Figure - Person 2 holding trophy */}
        <g opacity="0.9">
          {/* Head */}
          <circle cx="350" cy="320" r="40" fill="hsl(25, 65%, 45%)" />
          {/* Body */}
          <ellipse cx="350" cy="400" rx="35" ry="90" fill="hsl(0, 0%, 15%)" />
          {/* Left arm holding trophy base */}
          <rect x="280" y="360" width="35" height="100" fill="hsl(25, 65%, 45%)" 
            transform="rotate(-25 300 360)" />
          {/* Right arm up */}
          <rect x="365" y="340" width="30" height="95" fill="hsl(25, 65%, 45%)" 
            transform="rotate(35 380 340)" />
          {/* Legs */}
          <rect x="330" y="485" width="18" height="95" fill="hsl(0, 0%, 15%)" />
          <rect x="352" y="485" width="18" height="95" fill="hsl(0, 0%, 15%)" />

          {/* Trophy 1 - Gold */}
          <g transform="translate(300, 320)">
            {/* Trophy Cup */}
            <path d="M -20 0 Q -25 -15 -20 -25 L 20 -25 Q 25 -15 20 0 Z" 
              fill="hsl(45, 100%, 50%)" stroke="hsl(45, 100%, 40%)" strokeWidth="2" />
            {/* Trophy Stem */}
            <rect x="-8" y="0" width="16" height="35" fill="hsl(45, 100%, 45%)" stroke="hsl(45, 100%, 35%)" strokeWidth="1" />
            {/* Trophy Base */}
            <ellipse cx="0" cy="40" rx="25" ry="8" fill="hsl(45, 100%, 45%)" stroke="hsl(45, 100%, 35%)" strokeWidth="2" />
            {/* Detail lines on cup */}
            <line x1="-15" y1="-15" x2="15" y2="-15" stroke="hsl(45, 100%, 40%)" strokeWidth="1" />
          </g>
        </g>

        {/* Center Figure - Person 3 holding trophy */}
        <g opacity="0.95">
          {/* Head */}
          <circle cx="640" cy="300" r="42" fill="hsl(25, 70%, 50%)" />
          {/* Body */}
          <ellipse cx="640" cy="390" rx="38" ry="100" fill="hsl(0, 0%, 12%)" />
          {/* Left arm up holding trophy */}
          <rect x="570" y="320" width="35" height="110" fill="hsl(25, 70%, 50%)" 
            transform="rotate(-40 590 320)" />
          {/* Right arm up */}
          <rect x="645" y="310" width="32" height="105" fill="hsl(25, 70%, 50%)" 
            transform="rotate(45 661 310)" />
          {/* Legs */}
          <rect x="620" y="485" width="18" height="100" fill="hsl(0, 0%, 12%)" />
          <rect x="642" y="485" width="18" height="100" fill="hsl(0, 0%, 12%)" />

          {/* Trophy 2 - Teal/Blue */}
          <g transform="translate(580, 280)">
            {/* Trophy Cup */}
            <path d="M -22 0 Q -28 -18 -22 -28 L 22 -28 Q 28 -18 22 0 Z" 
              fill="hsl(180, 75%, 45%)" stroke="hsl(180, 75%, 35%)" strokeWidth="2" />
            {/* Trophy Stem */}
            <rect x="-9" y="0" width="18" height="40" fill="hsl(180, 75%, 40%)" stroke="hsl(180, 75%, 30%)" strokeWidth="1" />
            {/* Trophy Base */}
            <ellipse cx="0" cy="45" rx="28" ry="10" fill="hsl(180, 75%, 40%)" stroke="hsl(180, 75%, 30%)" strokeWidth="2" />
            {/* Handle details */}
            <circle cx="-20" cy="-8" r="6" fill="none" stroke="hsl(180, 75%, 35%)" strokeWidth="1.5" />
            <circle cx="20" cy="-8" r="6" fill="none" stroke="hsl(180, 75%, 35%)" strokeWidth="1.5" />
          </g>
        </g>

        {/* Center-Right Figure - Person 4 */}
        <g opacity="0.85">
          {/* Head */}
          <circle cx="900" cy="310" r="38" fill="hsl(25, 68%, 48%)" />
          {/* Body */}
          <ellipse cx="900" cy="395" rx="32" ry="95" fill="hsl(0, 0%, 20%)" />
          {/* Left arm */}
          <rect x="840" y="340" width="32" height="100" fill="hsl(25, 68%, 48%)" 
            transform="rotate(-35 856 340)" />
          {/* Right arm up */}
          <rect x="910" y="320" width="28" height="100" fill="hsl(25, 68%, 48%)" 
            transform="rotate(40 924 320)" />
          {/* Legs */}
          <rect x="882" y="485" width="16" height="95" fill="hsl(0, 0%, 20%)" />
          <rect x="902" y="485" width="16" height="95" fill="hsl(0, 0%, 20%)" />
        </g>

        {/* Right Figure - Person 5 (foreground, hair visible) */}
        <g opacity="0.9">
          {/* Hair flowing */}
          <ellipse cx="1050" cy="250" rx="50" ry="60" fill="hsl(25, 60%, 40%)" />
          {/* Head */}
          <circle cx="1050" cy="300" r="36" fill="hsl(25, 65%, 48%)" />
          {/* Body */}
          <ellipse cx="1050" cy="385" rx="30" ry="90" fill="hsl(0, 0%, 18%)" />
          {/* Left arm */}
          <rect x="995" y="350" width="30" height="95" fill="hsl(25, 65%, 48%)" 
            transform="rotate(-20 1010 350)" />
          {/* Right arm up */}
          <rect x="1060" y="310" width="28" height="105" fill="hsl(25, 65%, 48%)" 
            transform="rotate(50 1074 310)" />
          {/* Legs */}
          <rect x="1032" y="475" width="16" height="100" fill="hsl(0, 0%, 18%)" />
          <rect x="1052" y="475" width="16" height="100" fill="hsl(0, 0%, 18%)" />

          {/* Trophy 3 - Gold variation */}
          <g transform="translate(1050, 250)">
            {/* Trophy Cup */}
            <path d="M -18 0 Q -23 -14 -18 -23 L 18 -23 Q 23 -14 18 0 Z" 
              fill="hsl(45, 100%, 55%)" stroke="hsl(45, 95%, 45%)" strokeWidth="2" />
            {/* Trophy Stem */}
            <rect x="-7" y="0" width="14" height="32" fill="hsl(45, 100%, 48%)" stroke="hsl(45, 100%, 38%)" strokeWidth="1" />
            {/* Trophy Base */}
            <ellipse cx="0" cy="37" rx="22" ry="8" fill="hsl(45, 100%, 48%)" stroke="hsl(45, 100%, 38%)" strokeWidth="2" />
          </g>
        </g>

        {/* Far Left Figure (background, partial) */}
        <g opacity="0.7">
          {/* Head */}
          <circle cx="50" cy="320" r="30" fill="hsl(25, 55%, 40%)" />
          {/* Body */}
          <rect x="38" y="355" width="24" height="100" fill="hsl(0, 0%, 20%)" />
          {/* Arm up */}
          <rect x="30" y="340" width="22" height="75" fill="hsl(25, 55%, 40%)" 
            transform="rotate(-25 41 340)" />
          {/* Legs */}
          <rect x="38" y="455" width="12" height="80" fill="hsl(0, 0%, 20%)" />
          <rect x="50" y="455" width="12" height="80" fill="hsl(0, 0%, 20%)" />
        </g>

        {/* Far Right Figure (foreground with flowing hair) */}
        <g opacity="0.88">
          {/* Long flowing hair */}
          <path d="M 1160 220 Q 1150 250 1155 320 Q 1160 350 1170 380" 
            fill="hsl(25, 58%, 35%)" />
          {/* Head */}
          <circle cx="1170" cy="280" r="32" fill="hsl(25, 62%, 46%)" />
          {/* Body */}
          <ellipse cx="1170" cy="360" rx="28" ry="85" fill="hsl(0, 0%, 22%)" />
          {/* Left arm */}
          <rect x="1120" y="330" width="28" height="90" fill="hsl(25, 62%, 46%)" 
            transform="rotate(-30 1134 330)" />
          {/* Right arm */}
          <rect x="1175" y="340" width="26" height="85" fill="hsl(25, 62%, 46%)" />
          {/* Legs */}
          <rect x="1152" y="445" width="14" height="90" fill="hsl(0, 0%, 22%)" />
          <rect x="1170" y="445" width="14" height="90" fill="hsl(0, 0%, 22%)" />
        </g>

        {/* Warm lighting overlay rays */}
        <g opacity="0.15">
          <line x1="640" y1="0" x2="640" y2="800" stroke="hsl(45, 100%, 60%)" strokeWidth="100" />
          <line x1="320" y1="0" x2="400" y2="800" stroke="hsl(45, 100%, 60%)" strokeWidth="80" />
          <line x1="880" y1="0" x2="800" y2="800" stroke="hsl(45, 100%, 60%)" strokeWidth="80" />
        </g>
      </svg>

      {/* Overlay for depth */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/10" />
    </div>
  )
}
