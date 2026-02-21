import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import DashboardCockpit from './components/DashboardCockpit';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<DashboardCockpit />} />
      <Route path="/dashboard" element={<DashboardCockpit />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
