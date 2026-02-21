import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import LandingPage from './components/LandingPage';
import Dashboard from './components/Dashboard';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Dashboard />} />
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
