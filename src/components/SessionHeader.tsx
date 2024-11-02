import React from 'react';
import { Driver, Session } from '../types';
import { getTeamColor } from '../utils/colors';

interface Props {
  session: Session;
  driver1: Driver;
  driver2: Driver;
  onEdit: () => void;
}

export const SessionHeader: React.FC<Props> = ({
  session,
  driver1,
  driver2,
  onEdit,
}) => {
  return (
    <div className="mb-8 bg-gray-800 p-6 rounded-lg shadow-xl">
      <div className="flex justify-between items-center">
        <div className="flex-1">
          <h2 className="text-xl font-bold text-gray-200">
            {session.circuit_short_name} ({new Date(session.date).toLocaleDateString()})
          </h2>
          <div className="text-lg mt-2">
            <span className={getTeamColor(driver1.team_name)}>
              {driver1.full_name} (#{driver1.driver_number})
            </span>
            <span className="text-gray-300"> vs </span>
            <span className={getTeamColor(driver2.team_name)}>
              {driver2.full_name} (#{driver2.driver_number})
            </span>
          </div>
        </div>
        <button
          onClick={onEdit}
          className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
        >
          Edit
        </button>
      </div>
    </div>
  );
}; 