import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useState } from 'react';
import ConfigPage from './pages/ConfigPage';
import MergePage from './pages/MergePage';
import ConflictPage from './pages/ConflictPage';
import ReportPage from './pages/ReportPage';
import StatusBar from './components/StatusBar';

export default function App() {
  const [currentStep, setCurrentStep] = useState<'config' | 'merge' | 'conflict' | 'report'>('config');

  return (
    <HashRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <div className="flex flex-col h-screen bg-gray-50">
        <div className="flex-1 overflow-auto">
          <Routes>
            <Route path="/" element={<Navigate to="/config" />} />
            <Route 
              path="/config" 
              element={<ConfigPage onNext={() => setCurrentStep('merge')} />} 
            />
            <Route 
              path="/merge" 
              element={<MergePage onNext={() => setCurrentStep('conflict')} />} 
            />
            <Route 
              path="/conflict" 
              element={<ConflictPage onNext={() => setCurrentStep('report')} />} 
            />
            <Route 
              path="/report" 
              element={<ReportPage />} 
            />
          </Routes>
        </div>
        <StatusBar currentStep={currentStep} />
      </div>
    </HashRouter>
  );
}
