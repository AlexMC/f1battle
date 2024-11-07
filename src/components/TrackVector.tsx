import React, { useEffect } from 'react';

interface Props {
  circuitKey?: string;
  className?: string;
}

const TRACK_PATHS: { [key: string]: string } = {
  'bahrain': 'M20,50 L40,30 L80,30 C90,30 95,35 95,45 L95,55 C95,65 90,70 80,70 L60,70 C50,70 45,65 45,55 L45,45 C45,35 40,30 30,30 L20,30 Z',
  'saudi': 'M20,20 L80,20 C90,20 95,25 95,35 L95,65 C95,75 90,80 80,80 L20,80 C10,80 5,75 5,65 L5,35 C5,25 10,20 20,20 Z',
  'australian': 'M10,50 L30,30 L70,30 C80,30 85,35 85,45 L85,55 C85,65 80,70 70,70 L30,70 C20,70 15,65 15,55 L15,45 Z',
  'interlagos': `
    M 30,20
    L 45,20
    C 48,20 50,22 50,25
    L 50,35
    C 50,38 52,40 55,40
    L 65,40
    C 68,40 70,42 70,45
    L 70,50
    C 70,52 69,54 67,55
    L 60,58
    C 58,59 57,61 57,63
    L 57,68
    C 57,70 56,72 54,73
    L 45,77
    C 43,78 40,78 38,77
    L 32,74
    C 30,73 29,71 29,69
    L 29,65
    C 29,63 28,61 26,60
    L 22,58
    C 20,57 19,55 19,53
    L 19,48
    C 19,46 20,44 22,43
    L 28,40
    C 30,39 31,37 31,35
    L 31,25
    C 31,22 30,20 28,20
    L 30,20
    Z
  `.replace(/\s+/g, ' ').trim(),
};

export const TrackVector: React.FC<Props> = ({ circuitKey = 'bahrain', className = '' }) => {
  useEffect(() => {
    console.log('TrackVector received circuitKey:', circuitKey);
    console.log('Available track paths:', Object.keys(TRACK_PATHS));
    console.log('Normalized circuit key:', String(circuitKey).toLowerCase());
  }, [circuitKey]);
  
  const path = TRACK_PATHS[String(circuitKey).toLowerCase()] || TRACK_PATHS['bahrain'];

  return (
    <div className={`relative ${className}`}>
      <svg
        viewBox="0 0 100 100"
        className="w-full h-full"
        preserveAspectRatio="xMidYMid meet"
      >
        <path
          d={path}
          className="fill-none stroke-gray-600 stroke-2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}; 