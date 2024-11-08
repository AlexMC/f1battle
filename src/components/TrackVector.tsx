import React, { useEffect, useState } from 'react';
import { TRACK_PATHS } from '../constants/trackPaths';
import { calculateTrackScalingFactors } from '../utils/trackScaling';

interface Props {
  circuitKey?: string;
  className?: string;
  location?: {
    x: number;
    y: number;
  } | null;
  color?: string;
  sessionId?: number;
  driverNumber?: number;
}

export const TrackVector: React.FC<Props> = ({ 
  circuitKey = 'bahrain', 
  className = '',
  location = null,
  color = '#ffffff',
  sessionId,
  driverNumber
}) => {
  const [scalingFactors, setScalingFactors] = useState<{
    centerX: number;
    centerY: number;
    maxRange: number;
  } | null>(null);

  useEffect(() => {
    const loadScalingFactors = async () => {
      if (!sessionId || !driverNumber) return;
      try {
        const factors = await calculateTrackScalingFactors(sessionId, driverNumber);
        setScalingFactors(factors);
      } catch (error) {
        console.error('Error loading scaling factors:', error);
      }
    };
    loadScalingFactors();
  }, [sessionId, driverNumber]);

  const path = TRACK_PATHS[String(circuitKey).toLowerCase()] || TRACK_PATHS['bahrain'];

  const scaleCoordinate = (value: number, isY: boolean = false): number => {
    if (!scalingFactors || !location) return 50;
    if (typeof value !== 'number' || isNaN(value)) return 50;

    const center = isY ? scalingFactors.centerY : scalingFactors.centerX;
    const scaled = ((value - center) / (scalingFactors.maxRange / 2)) * 50;
    return isY ? 50 - scaled : 50 + scaled;
  };

  return (
    <div className={`relative ${className}`}>
      <svg
        viewBox="-10 -10 120 120"
        className="w-full h-full"
        preserveAspectRatio="xMidYMid meet"
      >
        <path
          d={path}
          className="fill-none stroke-white stroke-2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {location && scalingFactors && (
          <circle
            cx={scaleCoordinate(location.x)}
            cy={scaleCoordinate(location.y, true)}
            r="3"
            fill={color}
            className="animate-pulse"
            stroke="#ffffff"
            strokeWidth="1"
          />
        )}
      </svg>
    </div>
  );
}; 