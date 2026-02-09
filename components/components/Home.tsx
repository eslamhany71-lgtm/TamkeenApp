
import React from 'react';
import { View } from '../types';

interface HomeProps {
  onNavigate: (view: View) => void;
}

const Home: React.FC<HomeProps> = ({ onNavigate }) => {
  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] text-center px-4">
      <div className="mb-8">
        <div className="inline-block p-3 bg-blue-50 text-blue-600 rounded-2xl mb-4">
          <i className="fa-solid fa-bolt-lightning text-2xl"></i>
        </div>
        <h1 className="text-4xl font-bold text-slate-800 mb-2">منصة الإدارة الذكية</h1>
        <p className="text-slate-600">نظام متكامل لإدارة المهام اليومية والحلول المؤسسية</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-2xl">
        <button
          onClick={() => onNavigate('CALCULATOR')}
          className="group p-8 bg-white border border-slate-200 hover:border-blue-500 rounded-3xl shadow-sm hover:shadow-xl transition-all transform hover:-translate-y-1 flex flex-col items-center gap-4"
        >
          <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center text-2xl group-hover:bg-blue-600 group-hover:text-white transition-all duration-300">
            <i className="fa-solid fa-calculator"></i>
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-800">الآلة الحاسبة</h2>
            <p className="text-slate-500 text-sm">أدوات حسابية سريعة ومتقدمة</p>
          </div>
        </button>

        <button
          onClick={() => onNavigate('HR_MENU')}
          className="group p-8 bg-white border border-slate-200 hover:border-emerald-500 rounded-3xl shadow-sm hover:shadow-xl transition-all transform hover:-translate-y-1 flex flex-col items-center gap-4"
        >
          <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center text-2xl group-hover:bg-emerald-600 group-hover:text-white transition-all duration-300">
            <i className="fa-solid fa-users-gear"></i>
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-800">HR Solution</h2>
            <p className="text-slate-500 text-sm">إدارة الإجازات وشؤون الموظفين</p>
          </div>
        </button>
      </div>
    </div>
  );
};

export default Home;
