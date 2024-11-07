import React from 'react';

interface Props {
  value: number;
  min: number;
  max: number;
  label: string;
  unit?: string;
  redline?: number;
}

export const Gauge: React.FC<Props> = ({ value, min, max, label, unit, redline }) => {
  // Calculate the percentage for the gauge needle
  const percentage = ((value - min) / (max - min)) * 100;
  const clampedPercentage = Math.min(Math.max(percentage, 0), 100);
  
  // Calculate the rotation angle for the needle (from -90 to 90 degrees)
  const rotation = (clampedPercentage * 1.8) - 90;

  // Determine if the value is in the redline zone
  const isRedlined = redline ? value >= redline : false;
  
  return (
    <div className="relative w-full aspect-[2/1]">
      {/* Gauge Background */}
      <div className="absolute inset-0 bg-gray-800 rounded-t-full overflow-hidden">
        {/* Gauge Scale */}
        <div className="absolute inset-0">
          {[...Array(11)].map((_, i) => (
            <div
              key={i}
              className="absolute bottom-0 w-0.5 h-6 bg-gray-600 origin-bottom"
              style={{
                left: `${i * 10}%`,
                transform: `rotate(${(i * 18) - 90}deg)`,
              }}
            />
          ))}
          {redline && (
            <div
              className="absolute bottom-0 w-full h-full opacity-20 bg-red-500"
              style={{
                clipPath: `polygon(${(redline - min) / (max - min) * 100}% 0, 100% 0, 100% 100%, ${(redline - min) / (max - min) * 100}% 100%)`,
              }}
            />
          )}
        </div>

        {/* Gauge Needle */}
        <div
          className="absolute bottom-0 left-1/2 w-1 h-[95%] bg-red-500 origin-bottom transition-transform duration-200"
          style={{ transform: `translateX(-50%) rotate(${rotation}deg)` }}
        >
          <div className="absolute -top-1 left-1/2 w-3 h-3 bg-red-500 rounded-full transform -translate-x-1/2" />
        </div>
      </div>

      {/* Value Display */}
      <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 -translate-y-8 text-center">
        <div className={`text-2xl font-bold ${isRedlined ? 'text-red-500' : 'text-white'}`}>
          {value.toFixed(0)}
          {unit && <span className="text-sm ml-1">{unit}</span>}
        </div>
        <div className="text-gray-400 text-sm">{label}</div>
      </div>
    </div>
  );
}; 