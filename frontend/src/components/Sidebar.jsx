import React from 'react';
import { useAuth } from '../context/AuthContext';
import { LayoutDashboard, UserCheck, CalendarDays, Receipt, Users, X, Shield, User } from 'lucide-react';

export const Sidebar = ({ activeTab, setActiveTab, mobileOpen, setMobileOpen, darkMode }) => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN' || user?.is_superuser;

  const employeeNav = [
    { id: 'dashboard', label: 'My Bio & Profile', icon: User },
    { id: 'attendance', label: 'Check-In / Attendance', icon: UserCheck },
    { id: 'leaves', label: 'Leave Applications', icon: CalendarDays },
    { id: 'payroll', label: 'Salary Slips', icon: Receipt },
  ];

  const adminNav = [
    { id: 'admin-dashboard', label: 'Overview', icon: LayoutDashboard },
    { id: 'admin-attendance', label: 'Attendance Monitoring', icon: UserCheck },
    { id: 'admin-employees', label: 'Employee Directory', icon: Users },
    { id: 'admin-leaves', label: 'Leave Approvals', icon: CalendarDays },
    { id: 'admin-payroll', label: 'Payroll & Slips', icon: Receipt },
  ];

  const navItems = isAdmin ? adminNav : employeeNav;

  const handleSelect = (id) => {
    setActiveTab(id);
    setMobileOpen(false);
  };

  const navContent = (
    <div className={`flex flex-col h-full justify-between py-5 border-r rounded-2xl md:rounded-3xl transition-colors duration-300 ${
      darkMode ? 'bg-stone-900 border-stone-800 text-white' : 'bg-white border-stone-200 text-stone-900'
    }`}>
      <div>
        <div className="px-5 mb-5 flex items-center justify-between">
          <span className="text-[11px] font-extrabold text-rose-800 uppercase tracking-wider flex items-center gap-1.5">
            {isAdmin ? (
              <>
                <Shield className="w-3.5 h-3.5 text-rose-800 shrink-0" />
                <span>Admin Console</span>
              </>
            ) : (
              <span>Employee Portal</span>
            )}
          </span>
          <button
            onClick={() => setMobileOpen(false)}
            className="md:hidden p-1.5 text-stone-400 hover:text-stone-700 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="space-y-1.5 px-3">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleSelect(item.id)}
                className={`w-full flex items-center gap-3.5 px-3.5 py-3 rounded-2xl text-xs font-bold transition-all ${
                  isActive
                    ? 'bg-[#881337] text-white shadow-md shadow-rose-950/20'
                    : darkMode
                      ? 'text-stone-400 hover:bg-stone-800 hover:text-white'
                      : 'text-stone-600 hover:bg-stone-100/80 hover:text-stone-900'
                }`}
              >
                <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-stone-400'}`} />
                <span className="truncate">{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      <div className={`px-5 pt-4 border-t text-xs flex items-center gap-2.5 ${darkMode ? 'border-stone-800 text-stone-500' : 'border-stone-100 text-stone-400'}`}>
        <img src="/logo.jpg" alt="Logo" className="w-6 h-6 rounded-full object-cover shadow-xs border border-stone-200" />
        <p className={`font-bold ${darkMode ? 'text-stone-300' : 'text-stone-800'}`}>Thahira Groups</p>
      </div>
    </div>
  );

  return (
    <>
      <aside className="hidden md:block w-64 min-h-[calc(100vh-6rem)] shrink-0">
        {navContent}
      </aside>

      {mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          className="fixed inset-0 bg-stone-950/60 backdrop-blur-xs z-50 md:hidden transition-opacity"
        />
      )}

      <div
        className={`fixed top-0 left-0 bottom-0 w-72 max-w-[85vw] bg-white z-50 transform transition-transform duration-300 ease-out md:hidden shadow-2xl ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {navContent}
      </div>
    </>
  );
};

export default Sidebar;
