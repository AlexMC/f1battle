import React, { useState, useEffect } from 'react';
import { LocationData } from '../types';
import { redisCacheUtils } from '../utils/redisCache';

interface Props {
  location: LocationData | null;
  teamColor: string;
  sessionId: number;
}

interface ScalingFactors {
  centerX: number;
  centerY: number;
  maxRange: number;
}

export const LocationPath: React.FC<Props> = ({ 
  location, 
  teamColor,
  sessionId
}) => {
  // Extract the hex color from the Tailwind class
  const extractColor = (colorClass: string) => {
    const match = colorClass.match(/\[(#[A-Fa-f0-9]+)\]/);
    return match ? match[1] : '#ffffff';
  };

  const color = extractColor(teamColor);
  const [positions, setPositions] = useState<LocationData[]>([]);
  const [scalingFactors, setScalingFactors] = useState<ScalingFactors | null>(null);
  
  const baseWidth = 300;
  const padding = 20;

  // Load scaling factors on mount
  useEffect(() => {
    const loadScalingFactors = async () => {
      if (!sessionId) return;
      const factors = await redisCacheUtils.get(`track_scaling_${sessionId}`);
      if (factors) {
        setScalingFactors(factors as ScalingFactors);
      }
    };
    loadScalingFactors();
  }, [sessionId]);

  // Update positions
  useEffect(() => {
    if (!location || typeof location.x !== 'number' || typeof location.y !== 'number') return;
    setPositions(prev => {
      const lastPos = prev[prev.length - 1];
      if (lastPos && lastPos.x === location.x && lastPos.y === location.y) {
        return prev;
      }
      return [...prev, location];
    });
  }, [location]);

  if (!scalingFactors) return null;

  const aspectRatio = 1;
  const svgWidth = baseWidth;
  const svgHeight = baseWidth * aspectRatio;

  const scaleX = (x: number) => {
    if (typeof x !== 'number' || isNaN(x)) return svgWidth / 2;
    if (!scalingFactors || scalingFactors.maxRange === 0) return svgWidth / 2;
    return ((x - scalingFactors.centerX) / (scalingFactors.maxRange / 2)) * 
           ((svgWidth - 2 * padding) / 2) + (svgWidth / 2);
  };
  
  const scaleY = (y: number) => {
    if (typeof y !== 'number' || isNaN(y)) return svgHeight / 2;
    if (!scalingFactors || scalingFactors.maxRange === 0) return svgHeight / 2;
    return (-(y - scalingFactors.centerY) / (scalingFactors.maxRange / 2)) * 
           ((svgHeight - 2 * padding) / 2) + (svgHeight / 2);
  };

  return (
    <div className="mt-4 bg-gray-800 p-4 rounded">
      <h3 className="text-sm font-medium text-gray-400 mb-2">
        Path History ({positions.length} points)
      </h3>
      <svg 
        width={svgWidth} 
        height={svgHeight} 
        className="bg-gray-900 rounded"
        style={{ border: '1px solid #374151' }}
      >
        {/* Center axes */}
        <line 
          x1={padding} y1={svgHeight/2} 
          x2={svgWidth-padding} y2={svgHeight/2} 
          stroke="#374151" strokeWidth="1" 
          strokeDasharray="4,4"
        />
        <line 
          x1={svgWidth/2} y1={padding} 
          x2={svgWidth/2} y2={svgHeight-padding} 
          stroke="#374151" strokeWidth="1" 
          strokeDasharray="4,4"
        />
        
        {/* All positions */}
        {positions.map((pos, index) => (
          <circle
            key={index}
            cx={scaleX(pos.x)}
            cy={scaleY(pos.y)}
            r="1.5"
            fill="#ffffff"
            className="opacity-25"
          />
        ))}

        {/* Current position */}
        {positions.length > 0 && (
          <circle
            cx={scaleX(positions[positions.length - 1].x)}
            cy={scaleY(positions[positions.length - 1].y)}
            r="5"
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