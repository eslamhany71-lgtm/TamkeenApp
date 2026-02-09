
import React from 'react';
import { View, UserRole } from '../../types';

interface HRMenuProps {
  onNavigate: (view: View) => void;
  onBack: () => void;
  role: UserRole;
}

const HRMenu: React.FC<HRMenuProps> = ({ onNavigate, onBack, role }) => {
  const menuItems = [
    {
      id: 'LEAVE_FORM',
      title: 'طلب إجازة',
      description: 'تقديم طلب إجازة جديد للمدير',
      icon: 'fa-calendar-plus',
      color: 'bg-blue-500',
      allowedRoles: [UserRole.EMPLOYEE]
    },
    {
      id: 'HR_DASHBOARD',
      title: role === UserRole.EMPLOYEE ? 'طلباتي' : 'صندوق الوارد والطلبات',
      description: 'متابعة حالة الطلبات والإجراءات',
      icon: 'fa-clipboard-list',
      color: 'bg-emerald-500',
      allowedRoles: [UserRole.EMPLOYEE, UserRole.MANAGER, UserRole.HR]
    },
    {
      id: 'DOCUMENTS',
      title: 'وثائقي',
      description: 'قريباً: مفردات المرتب والشهادات',
      icon: 'fa-file-invoice',
      color: 'bg-amber-500',
      disabled: true,
      allowedRoles: [UserRole.EMPLOYEE]
    }
  ];

  return (
    <div className="max-w-4xl mx-auto">
      <button 
        onClick={onBack}
        className="mb-8 text-slate-500 hover:text-blue-600 flex items-center gap-2 transition-colors"
      >
        <i className="fa-solid fa-arrow-right"></i> العودة للرئيسية
      </button>

      <div className="text-center mb-12">
        <h1 className="text-3xl font-bold text-slate-800 mb-2">بوابة الموظف الذكية</h1>
        <p className="text-slate-500">اختر المهمة التي تود القيام بها</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {menuItems
          .filter(item => item.allowedRoles.includes(role))
          .map((item) => (
          <button
            key={item.id}
            disabled={item.disabled}
            onClick={() => onNavigate(item.id as View)}
            className={`p-6 bg-white rounded-2xl border-2 border-transparent shadow-sm hover:shadow-xl hover:border-blue-100 transition-all text-right group flex flex-col gap-4 ${item.disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <div className={`w-12 h-12 ${item.color} text-white rounded-xl flex items-center justify-center text-xl shadow-lg`}>
              <i className={`fa-solid ${item.icon}`}></i>
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-lg group-hover:text-blue-600">{item.title}</h3>
              <p className="text-sm text-slate-500 mt-1">{item.description}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

export default HRMenu;
