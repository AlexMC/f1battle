import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { BurgerMenu } from './components/BurgerMenu';
import { RaceTime } from './components/RaceTime';
import { LiveBattle } from './components/LiveBattle';

export const App: React.FC = () => {
  return (
    <Router>
      <BurgerMenu />
      <Routes>
        <Route path="/" element={<LiveBattle />} />
        <Route path="/race-time" element={<RaceTime />} />
      </Routes>
    </Router>
  );
}; 