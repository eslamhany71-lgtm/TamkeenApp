
import React, { useState } from 'react';
import { LeaveRequest, RequestStatus, View } from '../../types';

interface LeaveFormProps {
  onBack: () => void;
  onSubmit: (req: LeaveRequest) => void;
}

const LeaveForm: React.FC<LeaveFormProps> = ({ onBack, onSubmit }) => {
  const [formData, setFormData] = useState({
    employeeName: '',
    leaveType: 'إجازة اعتيادية',
    startDate: '',
    endDate: '',
    reason: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newRequest: LeaveRequest = {
      id: Math.random().toString(36).substr(2, 9),
      ...formData,
      status: RequestStatus.PENDING_MANAGER,
      createdAt: new Date().toISOString()
    };
    onSubmit(newRequest);
  };

  return (
    <div className="max-w-2xl mx-auto bg-white p-8 rounded-2xl shadow-sm border">
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-2xl font-bold text-slate-800">تقديم طلب إجازة جديد</h2>
        <button onClick={onBack} className="text-slate-400 hover:text-slate-600">
          <i className="fa-solid fa-xmark text-xl"></i>
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">اسم الموظف</label>
          <input 
            required
            type="text"
            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            value={formData.employeeName}
            onChange={e => setFormData({...formData, employeeName: e.target.value})}
            placeholder="أدخل اسمك الكامل"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">تاريخ البدء</label>
            <input 
              required
              type="date"
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              value={formData.startDate}
              onChange={e => setFormData({...formData, startDate: e.target.value})}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">تاريخ الانتهاء</label>
            <input 
              required
              type="date"
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              value={formData.endDate}
              onChange={e => setFormData({...formData, endDate: e.target.value})}
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">نوع الإجازة</label>
          <select 
            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            value={formData.leaveType}
            onChange={e => setFormData({...formData, leaveType: e.target.value})}
          >
            <option>إجازة اعتيادية</option>
            <option>إجازة مرضية</option>
            <option>إجازة اضطرارية</option>
            <option>إجازة بدون مرتب</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">السبب</label>
          <textarea 
            required
            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none min-h-[100px]"
            value={formData.reason}
            onChange={e => setFormData({...formData, reason: e.target.value})}
            placeholder="اكتب سبب طلب الإجازة..."
          ></textarea>
        </div>

        <button 
          type="submit"
          className="w-full bg-blue-600 text-white font-bold py-3 rounded-xl hover:bg-blue-700 transition-colors shadow-lg shadow-blue-200"
        >
          إرسال الطلب للمدير المباشر
        </button>
      </form>
    </div>
  );
};

export default LeaveForm;
