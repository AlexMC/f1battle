export const getTeamColor = (teamName: string): string => {
  const teamColors: { [key: string]: string } = {
    'Red Bull Racing': 'text-[#3671C6]',
    'Mercedes': 'text-[#6CD3BF]',
    'Ferrari': 'text-[#F91536]',
    'McLaren': 'text-[#F58020]',
    'Aston Martin': 'text-[#358C75]',
    'Alpine': 'text-[#2293D1]',
    'Williams': 'text-[#37BEDD]',
    'AlphaTauri': 'text-[#5E8FAA]',
    'Alfa Romeo': 'text-[#C92D4B]',
    'Haas F1 Team': 'text-[#B6BABD]'
  };
  
  return teamColors[teamName] || 'text-gray-200';
}; 