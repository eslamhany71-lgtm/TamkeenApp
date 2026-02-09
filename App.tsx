
import React, { useState, useEffect } from 'react';
import { View, UserRole, LeaveRequest } from './types';
import Home from './components/Home';
import Calculator from './components/Calculator';
import HRMenu from './components/HR/HRMenu';
import HRDashboard from './components/HR/HRDashboard';
import LeaveForm from './components/HR/LeaveForm';

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<View>('HOME');
  const [currentRole, setCurrentRole] = useState<UserRole>(UserRole.EMPLOYEE);
  const [requests, setRequests] = useState<LeaveRequest[]>([]);

  // Load data from localStorage on mount
  useEffect(() => {
    const savedRequests = localStorage.getItem('hr_requests');
    if (savedRequests) {
      try {
        setRequests(JSON.parse(savedRequests));
      } catch (e) {
        console.error("Failed to parse requests", e);
      }
    }
  }, []);

  // Save data to localStorage whenever requests change
  useEffect(() => {
    localStorage.setItem('hr_requests', JSON.stringify(requests));
  }, [requests]);

  const navigate = (view: View) => setCurrentView(view);

  const addRequest = (req: LeaveRequest) => {
    setRequests(prev => [req, ...prev]);
    setCurrentView('HR_DASHBOARD');
  };

  const updateRequest = (updatedReq: LeaveRequest) => {
    setRequests(prev => prev.map(r => r.id === updatedReq.id ? updatedReq : r));
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      {/* Simulation Switcher (Top Bar) */}
      <div className="bg-slate-900 text-white px-4 py-2 sticky top-0 z-50">
        <div className="container mx-auto flex justify-between items-center text-xs">
          <div className="flex items-center gap-2">
            <span className="text-slate-500 hidden sm:inline">تبديل الهوية للتجربة:</span>
            <div className="flex bg-slate-800 p-1 rounded-lg">
              <button 
                onClick={() => setCurrentRole(UserRole.EMPLOYEE)}
                className={`px-3 py-1 rounded-md transition-all ${currentRole === UserRole.EMPLOYEE ? 'bg-blue-600 shadow-lg' : 'hover:bg-slate-700'}`}
              >
                موظف
              </button>
              <button 
                onClick={() => setCurrentRole(UserRole.MANAGER)}
                className={`px-3 py-1 rounded-md transition-all ${currentRole === UserRole.MANAGER ? 'bg-blue-600 shadow-lg' : 'hover:bg-slate-700'}`}
              >
                مدير
              </button>
              <button 
                onClick={() => setCurrentRole(UserRole.HR)}
                className={`px-3 py-1 rounded-md transition-all ${currentRole === UserRole.HR ? 'bg-blue-600 shadow-lg' : 'hover:bg-slate-700'}`}
              >
                HR
              </button>
            </div>
          </div>
          <div className="font-bold flex items-center gap-2">
            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
            نظام الحلول الذكية | متصل
          </div>
        </div>
      </div>

      <main className="flex-grow container mx-auto p-4 md:p-8">
        <div className="max-w-6xl mx-auto">
          {currentView === 'HOME' && (
            <Home onNavigate={navigate} />
          )}

          {currentView === 'CALCULATOR' && (
            <Calculator onBack={() => navigate('HOME')} />
          )}

          {currentView === 'HR_MENU' && (
            <HRMenu 
              role={currentRole}
              onNavigate={navigate}
              onBack={() => navigate('HOME')}
            />
          )}

          {currentView === 'HR_DASHBOARD' && (
            <HRDashboard 
              requests={requests} 
              role={currentRole} 
              onNavigate={navigate} 
              onBack={() => navigate('HR_MENU')}
              onUpdate={updateRequest}
            />
          )}

          {currentView === 'LEAVE_FORM' && (
            <LeaveForm 
              onBack={() => navigate('HR_MENU')} 
              onSubmit={addRequest}
            />
          )}
        </div>
      </main>

      <footer className="p-6 text-center text-slate-400 text-sm bg-white border-t border-slate-100">
        <p className="mb-1 font-bold text-slate-600">نظام HR Solution الرقمي</p>
        <p>&copy; {new Date().getFullYear()} - جميع البيانات تحفظ محلياً في متصفحك</p>
      </footer>
    </div>
  );
};

export default App;
