import React from 'react';
import { Session } from '../types';

interface Props {
  sessions: Session[];
  selectedSession: Session | null;
  onSelectSession: (session: Session) => void;
}

export const SessionSelector: React.FC<Props> = ({
  sessions,
  selectedSession,
  onSelectSession,
}) => {
  // Filter only race sessions
  const raceSessions = sessions.filter(session => 
    session.session_type.toLowerCase() === 'race'
  );
  
  return (
    <div className="mb-8 bg-gray-800 p-6 rounded-lg shadow-xl">
      <label className="block text-lg font-medium mb-3 text-gray-200">Select Race</label>
      <select
        className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all"
        value={selectedSession?.session_id || ''}
        onChange={(e) => {
          const session = raceSessions.find(s => s.session_id.toString() === e.target.value);
          if (session) onSelectSession(session);
        }}
      >
        <option value="">Select a Race</option>
        {raceSessions.map((session) => (
          <option key={session.session_id} value={session.session_id}>
            {session.circuit_short_name} - {new Date(session.date).toLocaleDateString()}
          </option>
        ))}
      </select>
      <div className="text-sm text-gray-500 mt-1">
        {raceSessions.length} races available
      </div>
    </div>
  );
}; 