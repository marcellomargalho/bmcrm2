import React from 'react';

interface LogoProps {
  className?: string;
  color?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function Logo({ className, color = 'currentColor', size = 'md' }: LogoProps) {
  const dimensions = {
    sm: { width: 180, height: 40 },
    md: { width: 280, height: 60 },
    lg: { width: 400, height: 86 },
  }[size];

  return (
    <svg 
      width={dimensions.width} 
      height={dimensions.height} 
      viewBox="0 0 320 80" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Monogram BM - Serif and Elegant */}
      <text 
        x="10" 
        y="55" 
        fontFamily="'Playfair Display', serif" 
        fontSize="56" 
        fill={color} 
        style={{ fontWeight: 400, letterSpacing: '-0.02em' }}
      >
        BM
      </text>
      
      {/* Vertical Separator */}
      <rect x="105" y="15" width="1.2" height="50" fill={color} fillOpacity="0.3" />
      
      {/* BRENDA MARGALHO - Main Name */}
      <text 
        x="125" 
        y="42" 
        fontFamily="'Manrope', sans-serif" 
        fontSize="21" 
        fill={color} 
        style={{ fontWeight: 700, letterSpacing: '0.18em' }}
      >
        BRENDA MARGALHO
      </text>
      
      {/* ADVOCACIA - Subtitle */}
      <text 
        x="125" 
        y="62" 
        fontFamily="'Manrope', sans-serif" 
        fontSize="11" 
        fill={color} 
        style={{ fontWeight: 500, letterSpacing: '0.65em' }}
      >
        ADVOCACIA
      </text>
    </svg>
  );
}
