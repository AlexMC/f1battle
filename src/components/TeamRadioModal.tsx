import React, { useRef, useState } from 'react';
import { TeamRadio, Driver } from '../types';
import { getTeamColor } from '../utils/colors';
import { formatTime } from '../utils/time';

interface Props {
  radio: TeamRadio;
  driver: Driver;
  raceTime: number;
  onClose: () => void;
}

export const TeamRadioModal: React.FC<Props> = ({ radio, driver, raceTime, onClose }) => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState<number | null>(null);

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
    }
  };

  const handlePlayPause = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  return (
    <div className="relative p-4 rounded-lg bg-gray-800 border border-gray-700 shadow-xl max-w-md w-full mb-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <button
            onClick={handlePlayPause}
            className="p-2 rounded-full bg-gray-700 hover:bg-gray-600 transition-colors"
          >
            {isPlaying ? '⏸' : '▶️'}
          </button>
          <span className={`${getTeamColor(driver.team_name)} font-semibold`}>
            {driver.name_acronym} ({driver.driver_number})
          </span>
        </div>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-white transition-colors"
        >
          ✕
        </button>
      </div>
      <audio 
        ref={audioRef}
        onEnded={() => setIsPlaying(false)}
        onLoadedMetadata={handleLoadedMetadata}
      >
        <source src={radio.recording_url} type="audio/mpeg" />
      </audio>
      <div className="flex justify-between text-sm text-gray-400 mt-2">
        <div>Race time: {formatTime(raceTime)}</div>
        <div>Duration: {duration ? `${duration.toFixed(1)}s` : '...'}</div>
      </div>
      <div className="text-sm text-gray-400 mt-1">
        {new Date(radio.date).toLocaleTimeString()}
      </div>
    </div>
  );
}; 