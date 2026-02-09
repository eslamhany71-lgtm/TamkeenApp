
import React, { useState } from 'react';
import { LeaveRequest, UserRole, RequestStatus, View } from '../../types';

interface HRDashboardProps {
  requests: LeaveRequest[];
  role: UserRole;
  onNavigate: (view: View) => void;
  onBack: () => void;
  onUpdate: (req: LeaveRequest) => void;
}

const HRDashboard: React.FC<HRDashboardProps> = ({ requests, role, onNavigate, onBack, onUpdate }) => {
  const [filter, setFilter] = useState<RequestStatus | 'ALL'>('ALL');

  const handleManagerAction = (id: string, approve: boolean) => {
    const req = requests.find(r => r.id === id);
    if (req) {
      onUpdate({
        ...req,
        status: approve ? RequestStatus.PENDING_HR : RequestStatus.REJECTED,
        managerNotes: approve ? 'تمت الموافقة المبدئية' : 'مرفوض من قبل المدير'
      });
    }
  };

  const handleHRAction = (id: string, approve: boolean) => {
    const req = requests.find(r => r.id === id);
    if (req) {
      onUpdate({
        ...req,
        status: approve ? RequestStatus.APPROVED : RequestStatus.REJECTED,
        hrNotes: approve ? 'تم الاعتماد النهائي' : 'مرفوض من شؤون الموظفين'
      });
    }
  };

  const getStatusBadge = (status: RequestStatus) => {
    switch (status) {
      case RequestStatus.PENDING_MANAGER: 
        return <span className="px-3 py-1 bg-amber-50 text-amber-600 border border-amber-200 rounded-full text-xs font-bold">انتظار المدير</span>;
      case RequestStatus.PENDING_HR: 
        return <span className="px-3 py-1 bg-blue-50 text-blue-600 border border-blue-200 rounded-full text-xs font-bold">انتظار HR</span>;
      case RequestStatus.APPROVED: 
        return <span className="px-3 py-1 bg-emerald-50 text-emerald-600 border border-emerald-200 rounded-full text-xs font-bold">تم الاعتماد</span>;
      case RequestStatus.REJECTED: 
        return <span className="px-3 py-1 bg-red-50 text-red-600 border border-red-200 rounded-full text-xs font-bold">مرفوض</span>;
    }
  };

  const getFilteredRequests = () => {
    let baseRequests = [...requests];
    
    // Logic for what requests each role can see
    if (role === UserRole.MANAGER) {
      // Manager sees what they need to act on OR what they already acted on
      baseRequests = requests.filter(r => 
        r.status === RequestStatus.PENDING_MANAGER || 
        r.status === RequestStatus.PENDING_HR ||
        r.status === RequestStatus.APPROVED ||
        r.status === RequestStatus.REJECTED
      );
    } else if (role === UserRole.HR) {
      // HR only cares about requests that passed the manager or are final
      baseRequests = requests.filter(r => 
        r.status === RequestStatus.PENDING_HR || 
        r.status === RequestStatus.APPROVED ||
        r.status === RequestStatus.REJECTED
      );
    }

    if (filter === 'ALL') return baseRequests;
    return baseRequests.filter(r => r.status === filter);
  };

  const stats = {
    total: requests.length,
    pending: requests.filter(r => r.status === RequestStatus.PENDING_MANAGER || r.status === RequestStatus.PENDING_HR).length,
    completed: requests.filter(r => r.status === RequestStatus.APPROVED).length
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <button 
            onClick={onBack}
            className="text-slate-500 hover:text-blue-600 flex items-center gap-2 text-sm mb-2 transition-colors"
          >
            <i className="fa-solid fa-arrow-right"></i> العودة للقائمة
          </button>
          <h1 className="text-2xl font-bold text-slate-800">متابعة طلبات الإجازة</h1>
          <p className="text-slate-500 text-sm">أنت تتصفح النظام بصفتك: <span className="font-bold text-blue-600">{
            role === UserRole.EMPLOYEE ? 'موظف' : 
            role === UserRole.MANAGER ? 'مدير مباشر' : 'مسؤول HR'
          }</span></p>
        </div>

        {role === UserRole.EMPLOYEE && (
          <button 
            onClick={() => onNavigate('LEAVE_FORM')}
            className="bg-blue-600 text-white px-6 py-2 rounded-xl font-bold hover:bg-blue-700 transition-all flex items-center gap-2 shadow-lg shadow-blue-200"
          >
            <i className="fa-solid fa-plus"></i> تقديم طلب جديد
          </button>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-slate-500 text-xs">إجمالي الطلبات</span>
            <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center text-slate-500"><i className="fa-solid fa-list"></i></div>
          </div>
          <div className="text-3xl font-bold text-slate-800 mt-2">{stats.total}</div>
        </div>
        <div className="bg-white p-5 rounded-2xl border shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-slate-500 text-xs">طلبات تحت المراجعة</span>
            <div className="w-8 h-8 bg-amber-50 rounded-lg flex items-center justify-center text-amber-500"><i className="fa-solid fa-clock"></i></div>
          </div>
          <div className="text-3xl font-bold text-amber-600 mt-2">{stats.pending}</div>
        </div>
        <div className="bg-white p-5 rounded-2xl border shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-slate-500 text-xs">طلبات معتمدة</span>
            <div className="w-8 h-8 bg-emerald-50 rounded-lg flex items-center justify-center text-emerald-500"><i className="fa-solid fa-check-double"></i></div>
          </div>
          <div className="text-3xl font-bold text-emerald-600 mt-2">{stats.completed}</div>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="flex overflow-x-auto gap-2 pb-2 scrollbar-hide">
        <button 
          onClick={() => setFilter('ALL')}
          className={`px-4 py-2 rounded-xl text-sm whitespace-nowrap transition-all ${filter === 'ALL' ? 'bg-slate-800 text-white shadow-md' : 'bg-white text-slate-600 border hover:bg-slate-50'}`}
        >
          الكل
        </button>
        <button 
          onClick={() => setFilter(RequestStatus.PENDING_MANAGER)}
          className={`px-4 py-2 rounded-xl text-sm whitespace-nowrap transition-all ${filter === RequestStatus.PENDING_MANAGER ? 'bg-amber-600 text-white shadow-md' : 'bg-white text-slate-600 border hover:bg-slate-50'}`}
        >
          بانتظار المدير
        </button>
        <button 
          onClick={() => setFilter(RequestStatus.PENDING_HR)}
          className={`px-4 py-2 rounded-xl text-sm whitespace-nowrap transition-all ${filter === RequestStatus.PENDING_HR ? 'bg-blue-600 text-white shadow-md' : 'bg-white text-slate-600 border hover:bg-slate-50'}`}
        >
          بانتظار الـ HR
        </button>
        <button 
          onClick={() => setFilter(RequestStatus.APPROVED)}
          className={`px-4 py-2 rounded-xl text-sm whitespace-nowrap transition-all ${filter === RequestStatus.APPROVED ? 'bg-emerald-600 text-white shadow-md' : 'bg-white text-slate-600 border hover:bg-slate-50'}`}
        >
          تم الاعتماد
        </button>
        <button 
          onClick={() => setFilter(RequestStatus.REJECTED)}
          className={`px-4 py-2 rounded-xl text-sm whitespace-nowrap transition-all ${filter === RequestStatus.REJECTED ? 'bg-red-600 text-white shadow-md' : 'bg-white text-slate-600 border hover:bg-slate-50'}`}
        >
          المرفوضة
        </button>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right border-collapse">
            <thead>
              <tr className="bg-slate-50/50 border-b text-slate-500 text-xs font-bold uppercase tracking-wider">
                <th className="p-5">الموظف والطلب</th>
                <th className="p-5">الفترة الزمنية</th>
                <th className="p-5">الحالة الحالية</th>
                <th className="p-5 text-left">الإجراءات</th>
              </tr>
            </thead>
            <tbody>
              {getFilteredRequests().length === 0 ? (
                <tr>
                  <td colSpan={4} className="p-20 text-center text-slate-400">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center text-3xl">
                        <i className="fa-solid fa-folder-open opacity-20"></i>
                      </div>
                      <p>لا توجد طلبات في هذا القسم حالياً</p>
                    </div>
                  </td>
                </tr>
              ) : (
                getFilteredRequests().map(req => (
                  <tr key={req.id} className="border-t last:border-0 hover:bg-slate-50/50 transition-colors group">
                    <td className="p-5">
                      <div className="font-bold text-slate-800">{req.employeeName}</div>
                      <div className="text-xs text-blue-500 font-medium">{req.leaveType}</div>
                    </td>
                    <td className="p-5">
                      <div className="text-sm text-slate-600">{req.startDate}</div>
                      <div className="text-xs text-slate-400">حتى {req.endDate}</div>
                    </td>
                    <td className="p-5">
                      {getStatusBadge(req.status)}
                    </td>
                    <td className="p-5 text-left">
                      <div className="flex justify-end gap-2">
                        {role === UserRole.MANAGER && req.status === RequestStatus.PENDING_MANAGER && (
                          <>
                            <button 
                              onClick={() => handleManagerAction(req.id, true)}
                              className="bg-blue-600 text-white px-4 py-1.5 rounded-lg text-xs font-bold hover:bg-blue-700 transition-all shadow-sm"
                            >
                              موافقة مبدئية
                            </button>
                            <button 
                              onClick={() => handleManagerAction(req.id, false)}
                              className="bg-white text-red-600 border border-red-100 px-4 py-1.5 rounded-lg text-xs font-bold hover:bg-red-50 transition-all"
                            >
                              رفض
                            </button>
                          </>
                        )}
                        {role === UserRole.HR && req.status === RequestStatus.PENDING_HR && (
                          <>
                            <button 
                              onClick={() => handleHRAction(req.id, true)}
                              className="bg-emerald-600 text-white px-4 py-1.5 rounded-lg text-xs font-bold hover:bg-emerald-700 transition-all shadow-sm"
                            >
                              اعتماد نهائي
                            </button>
                            <button 
                              onClick={() => handleHRAction(req.id, false)}
                              className="bg-white text-red-600 border border-red-100 px-4 py-1.5 rounded-lg text-xs font-bold hover:bg-red-50 transition-all"
                            >
                              رفض
                            </button>
                          </>
                        )}
                        {((role === UserRole.EMPLOYEE) || 
                          (role === UserRole.MANAGER && req.status !== RequestStatus.PENDING_MANAGER) || 
                          (role === UserRole.HR && req.status !== RequestStatus.PENDING_HR)) && (
                          <span className="text-slate-400 text-xs italic">مكتمل الإجراء</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default HRDashboard;
