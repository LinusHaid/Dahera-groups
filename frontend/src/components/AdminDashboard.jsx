import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { Users, CalendarDays, Receipt, UserPlus, CheckCircle, XCircle, Clock, Search, ShieldCheck, IndianRupee, Download, UserX, UserCheck, Calculator, Filter, FileText, Database } from 'lucide-react';

export const AdminDashboard = ({ subTab = 'admin-dashboard', darkMode = false }) => {
  const [employees, setEmployees] = useState([]);
  const [leaves, setLeaves] = useState([]);
  const [slips, setSlips] = useState([]);
  const [attendanceLogs, setAttendanceLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [downloadingId, setDownloadingId] = useState(null);
  const [downloadingAttPdf, setDownloadingAttPdf] = useState(false);
  const [downloadingBackup, setDownloadingBackup] = useState(false);

  const [attFilters, setAttFilters] = useState({
    start_date: new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0],
    end_date: new Date().toISOString().split('T')[0],
    status: 'ALL',
    employee: 'ALL'
  });

  const [showAddModal, setShowAddModal] = useState(false);
  const [addMsg, setAddMsg] = useState('');
  const [newEmp, setNewEmp] = useState({
    username: '',
    email: '',
    first_name: '',
    last_name: '',
    password: '',
    gender: 'MALE',
    role: 'EMPLOYEE',
    employee_id: '',
    phone: '',
    designation: '',
    department: '',
    base_salary: '',
    bio: ''
  });

  const handleOpenAddModal = () => {
    const maleCount = employees.filter(emp => emp.gender === 'MALE' && emp.role === 'EMPLOYEE').length + 1;
    const formattedNum = maleCount >= 10 ? `${maleCount}` : `0${maleCount}`;
    const initialId = `THG-M-${formattedNum}`;
    
    setNewEmp({
      username: '',
      email: '',
      first_name: '',
      last_name: '',
      password: '',
      gender: 'MALE',
      role: 'EMPLOYEE',
      employee_id: initialId,
      phone: '',
      designation: '',
      department: '',
      base_salary: '',
      bio: ''
    });
    setAddMsg('');
    setShowAddModal(true);
  };

  const [showSlipModal, setShowSlipModal] = useState(false);
  const [slipForm, setSlipForm] = useState({
    employee: '',
    month: (new Date().getMonth() + 1).toString(),
    year: new Date().getFullYear().toString(),
    basic_salary: '',
    leave_days_deducted: '',
    allowances: '',
    deductions: ''
  });

  const getDaysInMonth = (month, year) => {
    const m = parseInt(month, 10);
    const y = parseInt(year, 10);
    if (m && y) {
      return new Date(y, m, 0).getDate();
    }
    return 30;
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams({
        start_date: attFilters.start_date,
        end_date: attFilters.end_date,
        status: attFilters.status,
        employee: attFilters.employee
      }).toString();

      const [empRes, leaveRes, slipRes, attRes] = await Promise.all([
        api.get('/users/employees/'),
        api.get('/leaves/'),
        api.get('/payroll/slips/'),
        api.get(`/attendance/logs/?${queryParams}`)
      ]);

      setEmployees(empRes.data.results || empRes.data || []);
      setLeaves(leaveRes.data.results || leaveRes.data || []);
      setSlips(slipRes.data.results || slipRes.data || []);
      setAttendanceLogs(attRes.data.results || attRes.data || []);
    } catch (err) {
      console.error("Fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [attFilters]);

  const handleApproveLeave = async (id) => {
    try {
      await api.post(`/leaves/${id}/approve/`, { admin_notes: 'Approved' });
      fetchData();
    } catch (err) {
      alert("Failed to approve leave.");
    }
  };

  const handleRejectLeave = async (id) => {
    try {
      await api.post(`/leaves/${id}/reject/`, { admin_notes: 'Rejected' });
      fetchData();
    } catch (err) {
      alert("Failed to reject leave.");
    }
  };

  const handleTerminateEmployee = async (id, empName) => {
    if (!window.confirm(`Are you sure you want to terminate ${empName}?`)) {
      return;
    }
    try {
      await api.post(`/users/employees/${id}/terminate/`);
      fetchData();
    } catch (err) {
      alert("Failed to terminate account.");
    }
  };

  const handleReactivateEmployee = async (id, empName) => {
    try {
      await api.post(`/users/employees/${id}/reactivate/`);
      fetchData();
    } catch (err) {
      alert("Failed to reactivate account.");
    }
  };

  const handleAddEmployeeSubmit = async (e) => {
    e.preventDefault();
    setAddMsg('');
    try {
      const formattedEmail = (newEmp.email || newEmp.username || '').trim();
      const payload = {
        ...newEmp,
        username: formattedEmail,
        email: formattedEmail,
        phone: (newEmp.phone || '').trim()
      };
      if (!payload.password || !payload.password.trim()) {
        delete payload.password;
      }
      await api.post('/users/employees/', payload);
      setShowAddModal(false);
      fetchData();
    } catch (err) {
      let errMsg = 'Error creating employee.';
      if (err.response?.data) {
        if (typeof err.response.data === 'string') {
          errMsg = err.response.data;
        } else if (err.response.data.detail) {
          errMsg = err.response.data.detail;
        } else {
          errMsg = Object.entries(err.response.data)
            .map(([field, msgs]) => `${field}: ${Array.isArray(msgs) ? msgs.join(', ') : msgs}`)
            .join(' | ');
        }
      }
      setAddMsg(errMsg);
    }
  };

  const handleGenerateSlipSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...slipForm,
        basic_salary: slipForm.basic_salary || '0',
        allowances: slipForm.allowances || '0',
        deductions: slipForm.deductions || '0',
        leave_days_deducted: slipForm.leave_days_deducted || '0'
      };
      await api.post('/payroll/slips/', payload);
      setShowSlipModal(false);
      fetchData();
    } catch (err) {
      let errMsg = 'Error generating salary slip.';
      if (err.response?.data) {
        if (typeof err.response.data === 'string') {
          errMsg = err.response.data;
        } else if (err.response.data.detail) {
          errMsg = err.response.data.detail;
        } else {
          errMsg = Object.entries(err.response.data)
            .map(([field, msgs]) => `${field}: ${Array.isArray(msgs) ? msgs.join(', ') : msgs}`)
            .join(' | ');
        }
      }
      alert(errMsg);
    }
  };

  const handleDownloadPdf = async (slipId, monthName, year, employeeId) => {
    setDownloadingId(slipId);
    try {
      const response = await api.get(`/payroll/slips/${slipId}/download_pdf/`, {
        responseType: 'blob',
      });

      if (response.data.type && response.data.type.includes('json')) {
        const errorText = await response.data.text();
        const json = JSON.parse(errorText);
        alert(json.detail || "Error downloading PDF.");
        return;
      }

      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Salary_Slip_${employeeId || 'EMP'}_${monthName}_${year}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => window.URL.revokeObjectURL(url), 1000);
    } catch (err) {
      alert("Failed to download PDF.");
    } finally {
      setDownloadingId(null);
    }
  };

  const handleDownloadAttendancePdf = async () => {
    setDownloadingAttPdf(true);
    try {
      const queryParams = new URLSearchParams({
        start_date: attFilters.start_date,
        end_date: attFilters.end_date,
        status: attFilters.status,
        employee: attFilters.employee
      }).toString();

      const response = await api.get(`/attendance/logs/download_pdf/?${queryParams}`, {
        responseType: 'blob'
      });

      if (response.data.type && response.data.type.includes('json')) {
        const errorText = await response.data.text();
        const json = JSON.parse(errorText);
        alert(json.detail || "Error generating attendance PDF.");
        return;
      }

      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Thahira_Attendance_Report_${attFilters.start_date}_to_${attFilters.end_date}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => window.URL.revokeObjectURL(url), 1000);
    } catch (err) {
      console.error("Attendance PDF error:", err);
      alert("Failed to download attendance PDF report.");
    } finally {
      setDownloadingAttPdf(false);
    }
  };

  const handleDownloadDbBackup = async () => {
    setDownloadingBackup(true);
    try {
      const response = await api.get('/users/employees/backup-db/', {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Thahira_ERP_Database_Backup_${new Date().toISOString().slice(0, 10)}.sqlite3`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => window.URL.revokeObjectURL(url), 1000);
    } catch (err) {
      console.error("Database backup download error:", err);
      alert(err.response?.data?.detail || "Failed to download database backup.");
    } finally {
      setDownloadingBackup(false);
    }
  };

  const staffList = employees.filter(e => e.role === 'EMPLOYEE');
  const totalEmployees = staffList.length || employees.length;
  const maleCount = employees.filter(e => e.gender === 'MALE' && e.role === 'EMPLOYEE').length;
  const femaleCount = employees.filter(e => e.gender === 'FEMALE' && e.role === 'EMPLOYEE').length;
  const pendingLeaves = leaves.filter(l => l.status === 'PENDING').length;
  const totalPayroll = slips.reduce((acc, curr) => acc + parseFloat(curr.net_salary || 0), 0);

  const todayStr = new Date().toISOString().split('T')[0];

  const todayEmployeeAttendance = staffList.map(emp => {
    const todayAtt = attendanceLogs.find(a => (a.employee === emp.id || a.employee_details?.id === emp.id) && a.date === todayStr);
    const approvedLeave = leaves.find(l => (l.employee === emp.id || l.employee_details?.id === emp.id) && l.status === 'APPROVED' && l.start_date <= todayStr && l.end_date >= todayStr);

    let statusText = 'ABSENT';
    let statusClass = 'bg-rose-100 text-rose-800 border-rose-200';

    if (approvedLeave) {
      statusText = 'ON LEAVE';
      statusClass = 'bg-purple-100 text-purple-800 border-purple-200';
    } else if (todayAtt) {
      if (todayAtt.status === 'LATE') {
        statusText = 'LATE';
        statusClass = 'bg-amber-100 text-amber-800 border-amber-200';
      } else {
        statusText = 'PRESENT';
        statusClass = 'bg-emerald-100 text-emerald-800 border-emerald-200';
      }
    }

    return {
      id: emp.id,
      name: emp.full_name || emp.username,
      employee_id: emp.employee_id || 'N/A',
      gender: emp.gender,
      shift_time: emp.scheduled_login_time,
      check_in: todayAtt?.check_in ? new Date(todayAtt.check_in).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '-',
      check_out: todayAtt?.check_out ? new Date(todayAtt.check_out).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '-',
      status: statusText,
      statusClass: statusClass
    };
  });

  const presentCountToday = todayEmployeeAttendance.filter(a => a.status === 'PRESENT' || a.status === 'LATE').length;
  const absentCountToday = todayEmployeeAttendance.filter(a => a.status === 'ABSENT').length;

  const filteredEmployees = employees.filter(e => 
    (e.full_name || e.username).toLowerCase().includes(searchTerm.toLowerCase()) ||
    (e.employee_id || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (e.department || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const calcBase = parseFloat(slipForm.basic_salary || 0);
  const calcDaysInMonth = getDaysInMonth(slipForm.month, slipForm.year);
  const calcDailyRate = calcBase > 0 ? (calcBase / calcDaysInMonth) : 0;
  const calcLeaveDays = parseFloat(slipForm.leave_days_deducted || 0);
  const calcLeaveDeduction = calcLeaveDays * calcDailyRate;
  const calcAllowances = parseFloat(slipForm.allowances || 0);
  const calcDeductions = parseFloat(slipForm.deductions || 0);
  const calcNetSalary = (calcBase - calcLeaveDeduction) + calcAllowances - calcDeductions;

  if (loading) {
    return (
      <div className="p-8 text-center flex flex-col items-center justify-center min-h-[400px]">
        <div className="w-8 h-8 border-4 border-rose-900 border-t-transparent rounded-full animate-spin mb-3"></div>
        <span className={darkMode ? 'text-stone-400' : 'text-stone-500'}>Loading...</span>
      </div>
    );
  }

  const cardBg = darkMode ? 'bg-stone-900 border-stone-800 text-white' : 'bg-white border-stone-200 text-stone-900';
  const innerBg = darkMode ? 'bg-stone-950 border-stone-800' : 'bg-stone-50 border-stone-200';
  const textMuted = darkMode ? 'text-stone-400' : 'text-stone-500';

  return (
    <div className="space-y-6 font-['Plus_Jakarta_Sans',sans-serif]">
      
      <div className="bg-gradient-to-r from-[#4C0519] via-[#881337] to-[#991B1B] text-white rounded-3xl p-6 md:p-8 shadow-xl border border-rose-900 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-rose-200 text-xs font-bold uppercase tracking-wider mb-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Admin Console</span>
          </div>
          <h1 className="text-2xl font-black tracking-tight">Admin Dashboard</h1>
          <p className="text-rose-100 text-xs mt-1">Manage staff accounts, track daily present/absent status, and generate filtered PDF reports.</p>
        </div>
        
        <div className="flex items-center gap-3 flex-wrap">
          <button
            onClick={handleOpenAddModal}
            className="bg-white hover:bg-rose-50 text-[#881337] font-black px-4 py-2.5 rounded-xl text-xs transition-all shadow-lg flex items-center gap-2"
          >
            <UserPlus className="w-4 h-4" />
            <span>Add Employee</span>
          </button>
          
          <button
            onClick={() => {
              setSlipForm({
                employee: '',
                month: (new Date().getMonth() + 1).toString(),
                year: new Date().getFullYear().toString(),
                basic_salary: '',
                leave_days_deducted: '',
                allowances: '',
                deductions: ''
              });
              setShowSlipModal(true);
            }}
            className="bg-rose-950/60 hover:bg-rose-950 text-white font-bold px-4 py-2.5 rounded-xl text-xs transition-all border border-white/20 flex items-center gap-2"
          >
            <Receipt className="w-4 h-4" />
            <span>Generate Payslip</span>
          </button>
        </div>
      </div>

      {(subTab === 'admin-dashboard' || subTab === 'all') && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className={`p-4 sm:p-5 rounded-2xl border shadow-sm flex items-center justify-between gap-3 overflow-hidden ${cardBg}`}>
            <div className="min-w-0 flex-1">
              <span className={`text-[11px] font-bold uppercase tracking-wider block truncate ${textMuted}`}>Total Staff</span>
              <span className="text-xl sm:text-2xl font-black block truncate">{totalEmployees}</span>
              <span className={`text-xs block mt-1 truncate ${textMuted}`}>
                <strong className="text-rose-800">{maleCount}</strong> Male • <strong className="text-amber-800">{femaleCount}</strong> Female
              </span>
            </div>
            <div className="p-3 bg-rose-50 text-rose-900 rounded-xl shrink-0">
              <Users className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
          </div>

          <div className={`p-4 sm:p-5 rounded-2xl border shadow-sm flex items-center justify-between gap-3 overflow-hidden ${cardBg}`}>
            <div className="min-w-0 flex-1">
              <span className={`text-[11px] font-bold uppercase tracking-wider block truncate ${textMuted}`}>Today's Attendance</span>
              <span className="text-xl sm:text-2xl font-black text-emerald-600 block truncate">{presentCountToday} / {totalEmployees}</span>
              <span className={`text-xs block mt-1 truncate ${textMuted}`}>
                <strong className="text-emerald-700">{presentCountToday} Present</strong> • <strong className="text-rose-800">{absentCountToday} Absent</strong>
              </span>
            </div>
            <div className="p-3 bg-emerald-50 text-emerald-700 rounded-xl shrink-0">
              <UserCheck className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
          </div>

          <div className={`p-4 sm:p-5 rounded-2xl border shadow-sm flex items-center justify-between gap-3 overflow-hidden ${cardBg}`}>
            <div className="min-w-0 flex-1">
              <span className={`text-[11px] font-bold uppercase tracking-wider block truncate ${textMuted}`}>Pending Leaves</span>
              <span className="text-xl sm:text-2xl font-black text-amber-600 block truncate">{pendingLeaves}</span>
              <span className={`text-xs block mt-1 truncate ${textMuted}`}>Awaiting action</span>
            </div>
            <div className="p-3 bg-amber-50 text-amber-700 rounded-xl shrink-0">
              <CalendarDays className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
          </div>

          <div className={`p-4 sm:p-5 rounded-2xl border shadow-sm flex items-center justify-between gap-3 overflow-hidden ${cardBg}`}>
            <div className="min-w-0 flex-1">
              <span className={`text-[11px] font-bold uppercase tracking-wider block truncate ${textMuted}`}>Monthly Payroll</span>
              <span className="text-xl sm:text-2xl font-black text-emerald-600 block truncate">₹{totalPayroll.toLocaleString('en-IN')}</span>
              <span className={`text-xs block mt-1 truncate ${textMuted}`}>Issued total</span>
            </div>
            <div className="p-3 bg-emerald-50 text-emerald-700 rounded-xl shrink-0">
              <IndianRupee className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
          </div>
        </div>
      )}

      {(subTab === 'admin-dashboard' || subTab === 'admin-attendance') && (
        <div className="space-y-6">
          <div className={`rounded-3xl border shadow-sm p-6 space-y-4 ${cardBg}`}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-100 pb-4">
              <div>
                <h2 className="text-lg font-bold">Today's Staff Attendance Status (Present / Absent)</h2>
                <p className={`text-xs mt-0.5 ${textMuted}`}>Live shift attendance tracking for all employees.</p>
              </div>
              <span className="text-xs font-bold px-3 py-1 bg-rose-50 text-rose-900 border border-rose-200 rounded-full w-fit">
                {todayStr}
              </span>
            </div>

            <div className="overflow-x-auto w-full">
              <table className="w-full text-left border-collapse min-w-[550px]">
                <thead>
                  <tr className={`border-b text-[11px] font-bold uppercase ${darkMode ? 'border-stone-800 text-stone-400 bg-stone-950' : 'border-stone-200 text-stone-500 bg-stone-50'}`}>
                    <th className="py-3 px-4">Employee ID</th>
                    <th className="py-3 px-4">Employee Name</th>
                    <th className="py-3 px-4">Shift Schedule</th>
                    <th className="py-3 px-4">Check-In Time</th>
                    <th className="py-3 px-4">Check-Out Time</th>
                    <th className="py-3 px-4 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 text-xs">
                  {todayEmployeeAttendance.map((empAtt) => (
                    <tr key={empAtt.id} className="hover:bg-stone-50/80 transition-colors">
                      <td className="py-3.5 px-4 font-black text-rose-800 font-mono">{empAtt.employee_id}</td>
                      <td className="py-3.5 px-4 font-bold">{empAtt.name}</td>
                      <td className="py-3.5 px-4">
                        <span className="font-semibold text-rose-900">{empAtt.shift_time}</span>
                      </td>
                      <td className="py-3.5 px-4 font-mono">{empAtt.check_in}</td>
                      <td className="py-3.5 px-4 font-mono">{empAtt.check_out}</td>
                      <td className="py-3.5 px-4 text-right">
                        <span className={`px-3 py-1 rounded-full text-[10px] font-bold border ${empAtt.statusClass}`}>
                          {empAtt.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className={`rounded-3xl border shadow-sm p-6 space-y-4 ${cardBg}`}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-100 pb-4">
              <div>
                <h2 className="text-lg font-bold">Attendance Filter & PDF Report Generator</h2>
                <p className={`text-xs mt-0.5 ${textMuted}`}>Filter attendance logs by date range, status, or employee, and download official PDF reports.</p>
              </div>

              <button
                onClick={handleDownloadAttendancePdf}
                disabled={downloadingAttPdf}
                className="px-4 py-2.5 bg-[#881337] hover:bg-[#991B1B] text-white font-bold rounded-xl text-xs transition-all shadow-md flex items-center gap-2 disabled:opacity-50 min-h-[42px]"
              >
                <Download className="w-4 h-4" />
                <span>{downloadingAttPdf ? 'Generating PDF...' : 'Download Attendance PDF Report'}</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
              <div>
                <label className="block font-bold mb-1">Start Date</label>
                <input
                  type="date"
                  value={attFilters.start_date}
                  onChange={(e) => setAttFilters({...attFilters, start_date: e.target.value})}
                  className={`w-full p-2.5 rounded-xl border ${innerBg}`}
                />
              </div>

              <div>
                <label className="block font-bold mb-1">End Date</label>
                <input
                  type="date"
                  value={attFilters.end_date}
                  onChange={(e) => setAttFilters({...attFilters, end_date: e.target.value})}
                  className={`w-full p-2.5 rounded-xl border ${innerBg}`}
                />
              </div>

              <div>
                <label className="block font-bold mb-1">Status Filter</label>
                <select
                  value={attFilters.status}
                  onChange={(e) => setAttFilters({...attFilters, status: e.target.value})}
                  className={`w-full p-2.5 rounded-xl border ${innerBg}`}
                >
                  <option value="ALL">All Statuses</option>
                  <option value="ON_TIME">Present / On Time</option>
                  <option value="LATE">Late Arrivals</option>
                  <option value="ABSENT">Absences</option>
                </select>
              </div>

              <div>
                <label className="block font-bold mb-1">Employee Filter</label>
                <select
                  value={attFilters.employee}
                  onChange={(e) => setAttFilters({...attFilters, employee: e.target.value})}
                  className={`w-full p-2.5 rounded-xl border ${innerBg}`}
                >
                  <option value="ALL">All Employees</option>
                  {employees.map(emp => (
                    <option key={emp.id} value={emp.employee_id}>
                      {emp.full_name} ({emp.role === 'ADMIN' ? 'Admin' : emp.employee_id})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="overflow-x-auto w-full pt-2">
              <table className="w-full text-left border-collapse min-w-[600px]">
                <thead>
                  <tr className={`border-b text-[11px] font-bold uppercase ${darkMode ? 'border-stone-800 text-stone-400 bg-stone-950' : 'border-stone-200 text-stone-500 bg-stone-50'}`}>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Employee</th>
                    <th className="py-3 px-4">Shift Schedule</th>
                    <th className="py-3 px-4">Check In</th>
                    <th className="py-3 px-4">Check Out</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Working Hours</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 text-xs">
                  {attendanceLogs.length === 0 ? (
                    <tr><td colSpan="7" className={`py-4 text-center ${textMuted}`}>No attendance records match the selected filter.</td></tr>
                  ) : (
                    attendanceLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-stone-50/80 transition-colors">
                        <td className="py-3.5 px-4 font-semibold">{log.date}</td>
                        <td className="py-3.5 px-4 font-bold">
                          {log.employee_name}
                          <span className="block text-[11px] font-mono text-rose-800">{log.employee_id}</span>
                        </td>
                        <td className="py-3.5 px-4 text-rose-900 font-medium">{log.expected_login_time}</td>
                        <td className="py-3.5 px-4 font-mono">
                          {log.check_in ? new Date(log.check_in).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '-'}
                        </td>
                        <td className="py-3.5 px-4 font-mono">
                          {log.check_out ? new Date(log.check_out).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '-'}
                        </td>
                        <td className="py-3.5 px-4">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            log.status === 'LATE' ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
                          }`}>
                            {log.status}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right font-medium">{log.working_hours} hrs</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {(subTab === 'admin-dashboard' || subTab === 'admin-leaves') && (
        <div className={`rounded-3xl border shadow-sm p-6 space-y-4 ${cardBg}`}>
          <div className="flex items-center justify-between border-b border-stone-100 pb-4">
            <div>
              <h2 className="text-lg font-bold">Leave Requests Queue</h2>
              <p className={`text-xs mt-0.5 ${textMuted}`}>Review and process employee leave applications.</p>
            </div>
            <span className="px-3 py-1 bg-amber-50 text-amber-800 font-bold text-xs rounded-full border border-amber-200">
              {pendingLeaves} Pending
            </span>
          </div>

          {leaves.length === 0 ? (
            <p className={`text-sm text-center py-6 ${textMuted}`}>No leave requests found.</p>
          ) : (
            <div className="overflow-x-auto w-full">
              <table className="w-full text-left border-collapse min-w-[600px]">
                <thead>
                  <tr className={`border-b text-[11px] font-bold uppercase ${darkMode ? 'border-stone-800 text-stone-400 bg-stone-950' : 'border-stone-200 text-stone-500 bg-stone-50'}`}>
                    <th className="py-3 px-4">Employee</th>
                    <th className="py-3 px-4">Type</th>
                    <th className="py-3 px-4">Duration</th>
                    <th className="py-3 px-4">Reason</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 text-xs">
                  {leaves.map((l) => (
                    <tr key={l.id} className="hover:bg-stone-50/80 transition-colors">
                      <td className="py-3.5 px-4 font-bold">
                        {l.employee_details?.full_name || 'Employee'}
                        <span className="block text-[11px] font-mono text-rose-800">{l.employee_details?.employee_id}</span>
                      </td>
                      <td className="py-3.5 px-4 font-semibold">
                        <span className={`px-2 py-0.5 rounded border ${innerBg}`}>{l.leave_type}</span>
                      </td>
                      <td className="py-3.5 px-4">
                        {l.start_date} to {l.end_date}
                        <span className={`block text-[10px] ${textMuted}`}>({l.total_days} days)</span>
                      </td>
                      <td className="py-3.5 px-4 max-w-xs truncate">{l.reason}</td>
                      <td className="py-3.5 px-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          l.status === 'APPROVED' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' :
                          l.status === 'REJECTED' ? 'bg-rose-50 text-rose-800 border border-rose-200' :
                          'bg-amber-50 text-amber-800 border border-amber-200'
                        }`}>
                          {l.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        {l.status === 'PENDING' ? (
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleApproveLeave(l.id)}
                              className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold text-[11px] flex items-center gap-1 transition-colors shadow-xs"
                            >
                              <CheckCircle className="w-3.5 h-3.5" />
                              <span>Approve</span>
                            </button>
                            <button
                              onClick={() => handleRejectLeave(l.id)}
                              className="px-3 py-1 bg-rose-800 hover:bg-rose-700 text-white rounded-lg font-bold text-[11px] flex items-center gap-1 transition-colors shadow-xs"
                            >
                              <XCircle className="w-3.5 h-3.5" />
                              <span>Reject</span>
                            </button>
                          </div>
                        ) : (
                          <span className={`text-[11px] font-medium ${textMuted}`}>Completed</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {(subTab === 'admin-dashboard' || subTab === 'admin-employees') && (
        <div className={`rounded-3xl border shadow-sm p-6 space-y-4 ${cardBg}`}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-100 pb-4">
            <div>
              <h2 className="text-lg font-bold">Employee Directory</h2>
              <p className={`text-xs mt-0.5 ${textMuted}`}>Manage employee profiles and active status.</p>
            </div>
            
            <div className="relative">
              <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search employees..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={`pl-9 pr-4 py-2 rounded-xl text-xs w-full sm:w-64 focus:outline-none focus:border-[#881337] border ${innerBg}`}
              />
            </div>
          </div>

          <div className="overflow-x-auto w-full">
            <table className="w-full text-left border-collapse min-w-[600px]">
              <thead>
                <tr className={`border-b text-[11px] font-bold uppercase ${darkMode ? 'border-stone-800 text-stone-400 bg-stone-950' : 'border-stone-200 text-stone-500 bg-stone-50'}`}>
                  <th className="py-3 px-4">Employee ID</th>
                  <th className="py-3 px-4">Name & Contact</th>
                  <th className="py-3 px-4">Shift Schedule</th>
                  <th className="py-3 px-4">Designation</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 text-xs">
                {filteredEmployees.map((emp) => {
                  const isTerminated = !emp.is_active || emp.status === 'TERMINATED';
                  const isAdminRole = emp.role === 'ADMIN';
                  return (
                    <tr key={emp.id} className="hover:bg-stone-50/80 transition-colors">
                      <td className="py-3.5 px-4 font-black text-rose-800 font-mono">
                        {isAdminRole ? 'ADMIN' : (emp.employee_id || 'N/A')}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="font-bold block">{emp.full_name}</span>
                        <span className={`text-[11px] block ${textMuted}`}>{emp.email} • {emp.phone || 'N/A'}</span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                          emp.gender === 'FEMALE' ? 'bg-amber-50 text-amber-900 border border-amber-200' : 'bg-rose-50 text-rose-900 border border-rose-200'
                        }`}>
                          <Clock className="w-3 h-3" />
                          {emp.gender} • {emp.scheduled_login_time}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="font-semibold block">{emp.designation || '-'}</span>
                        <span className={`text-[11px] ${textMuted}`}>{emp.department || '-'}</span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                          isTerminated ? 'bg-rose-100 text-rose-900 border-rose-300' : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                        }`}>
                          {isTerminated ? 'TERMINATED' : 'ACTIVE'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        {!isAdminRole && (
                          isTerminated ? (
                            <button
                              onClick={() => handleReactivateEmployee(emp.id, emp.full_name)}
                              className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-[11px] flex items-center gap-1.5 transition-colors shadow-xs ml-auto"
                            >
                              <UserCheck className="w-3.5 h-3.5" />
                              <span>Reactivate</span>
                            </button>
                          ) : (
                            <button
                              onClick={() => handleTerminateEmployee(emp.id, emp.full_name)}
                              className="px-3 py-1 bg-rose-800 hover:bg-rose-700 text-white rounded-xl font-bold text-[11px] flex items-center gap-1.5 transition-colors shadow-xs ml-auto"
                            >
                              <UserX className="w-3.5 h-3.5" />
                              <span>Terminate</span>
                            </button>
                          )
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {(subTab === 'admin-dashboard' || subTab === 'admin-payroll') && (
        <div className={`rounded-3xl border shadow-sm p-6 space-y-4 ${cardBg}`}>
          <div className="flex items-center justify-between border-b border-stone-100 pb-4">
            <div>
              <h2 className="text-lg font-bold">Salary Slips</h2>
              <p className={`text-xs mt-0.5 ${textMuted}`}>Issued salary statements and calendar rate deductions.</p>
            </div>
            <button
              onClick={() => {
                setSlipForm({
                  employee: '',
                  month: (new Date().getMonth() + 1).toString(),
                  year: new Date().getFullYear().toString(),
                  basic_salary: '',
                  leave_days_deducted: '',
                  allowances: '',
                  deductions: ''
                });
                setShowSlipModal(true);
              }}
              className="bg-[#881337] hover:bg-[#991B1B] text-white font-bold px-3.5 py-2 rounded-xl text-xs transition-colors flex items-center gap-1.5 shadow-md shadow-rose-950/20"
            >
              <Receipt className="w-4 h-4" />
              <span>Generate Slip</span>
            </button>
          </div>

          <div className="overflow-x-auto w-full">
            <table className="w-full text-left border-collapse min-w-[600px]">
              <thead>
                <tr className={`border-b text-[11px] font-bold uppercase ${darkMode ? 'border-stone-800 text-stone-400 bg-stone-950' : 'border-stone-200 text-stone-500 bg-stone-50'}`}>
                  <th className="py-3 px-4">Employee</th>
                  <th className="py-3 px-4">Period</th>
                  <th className="py-3 px-4">Daily Rate</th>
                  <th className="py-3 px-4">Leave Deduction</th>
                  <th className="py-3 px-4">Net Salary</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">PDF</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 text-xs">
                {slips.map((slip) => (
                  <tr key={slip.id} className="hover:bg-stone-50/80 transition-colors">
                    <td className="py-3.5 px-4 font-bold">
                      {slip.employee_details?.full_name}
                      <span className="block text-[11px] font-mono text-rose-800">{slip.employee_details?.employee_id}</span>
                    </td>
                    <td className="py-3.5 px-4 font-semibold">
                      {slip.month_name} {slip.year}
                      <span className="block text-[10px] text-stone-500">{slip.days_in_month || 30} Days</span>
                    </td>
                    <td className="py-3.5 px-4 font-mono font-bold text-stone-700">
                      ₹{parseFloat(slip.daily_rate || 0).toLocaleString('en-IN')}/day
                    </td>
                    <td className="py-3.5 px-4 font-mono font-bold text-rose-800">
                      -₹{parseFloat(slip.leave_deduction_amount || 0).toLocaleString('en-IN')}
                      <span className="block text-[10px] font-sans font-normal text-stone-500">({slip.leave_days_deducted || 0} day leave)</span>
                    </td>
                    <td className="py-3.5 px-4 font-black text-emerald-600">₹{parseFloat(slip.net_salary).toLocaleString('en-IN')}</td>
                    <td className="py-3.5 px-4">
                      <span className="px-2 py-0.5 bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-bold rounded-full">
                        {slip.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        type="button"
                        disabled={downloadingId === slip.id}
                        onClick={() => handleDownloadPdf(slip.id, slip.month_name, slip.year, slip.employee_details?.employee_id)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-900 border border-rose-200 rounded-xl text-xs font-bold transition-colors disabled:opacity-50"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>{downloadingId === slip.id ? 'Downloading...' : 'Download'}</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showAddModal && (
        <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-stone-200 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold text-stone-900 border-b border-stone-100 pb-3">Add Employee Account</h3>
            
            {addMsg && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl">
                {addMsg}
              </div>
            )}

            <form onSubmit={handleAddEmployeeSubmit} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-stone-700 font-bold mb-1">First Name</label>
                  <input
                    type="text"
                    required
                    placeholder="Enter first name"
                    value={newEmp.first_name}
                    onChange={(e) => setNewEmp({...newEmp, first_name: e.target.value})}
                    className="w-full p-2.5 bg-stone-50 border border-stone-300 rounded-xl text-stone-900"
                  />
                </div>
                <div>
                  <label className="block text-stone-700 font-bold mb-1">Last Name</label>
                  <input
                    type="text"
                    required
                    placeholder="Enter last name"
                    value={newEmp.last_name}
                    onChange={(e) => setNewEmp({...newEmp, last_name: e.target.value})}
                    className="w-full p-2.5 bg-stone-50 border border-stone-300 rounded-xl text-stone-900"
                  />
                </div>
              </div>

              <div>
                <label className="block text-stone-700 font-bold mb-1">Email Address</label>
                <input
                  type="email"
                  required
                  placeholder="e.g. employee@thahira.com"
                  value={newEmp.email}
                  onChange={(e) => setNewEmp({...newEmp, username: e.target.value, email: e.target.value})}
                  className="w-full p-2.5 bg-stone-50 border border-stone-300 rounded-xl text-stone-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-stone-700 font-bold mb-1">Gender</label>
                  <select
                    value={newEmp.gender}
                    onChange={(e) => {
                      const g = e.target.value;
                      const prefix = g === 'MALE' ? 'THG-M-' : 'THG-F-';
                      const count = employees.filter(emp => emp.gender === g && emp.role === 'EMPLOYEE').length + 1;
                      const formattedNum = count >= 10 ? `${count}` : `0${count}`;
                      setNewEmp({...newEmp, gender: g, employee_id: `${prefix}${formattedNum}`});
                    }}
                    className="w-full p-2.5 bg-stone-50 border border-stone-300 text-rose-800 font-bold rounded-xl"
                  >
                    <option value="MALE">MALE (Shift: 10:00 AM)</option>
                    <option value="FEMALE">FEMALE (Shift: 09:30 AM)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-stone-700 font-bold mb-1">Employee ID</label>
                  <input
                    type="text"
                    readOnly
                    value={newEmp.employee_id}
                    className="w-full p-2.5 bg-stone-100 border border-stone-300 text-rose-900 font-mono font-black rounded-xl cursor-not-allowed select-none shadow-inner"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-stone-700 font-bold mb-1">Mobile Number</label>
                  <input
                    type="text"
                    required
                    placeholder="Enter mobile number"
                    value={newEmp.phone}
                    onChange={(e) => setNewEmp({...newEmp, phone: e.target.value})}
                    className="w-full p-2.5 bg-stone-50 border border-stone-300 font-mono rounded-xl text-stone-900"
                  />
                </div>
                <div>
                  <label className="block text-stone-700 font-bold mb-1">Designation</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Software Engineer"
                    value={newEmp.designation}
                    onChange={(e) => setNewEmp({...newEmp, designation: e.target.value})}
                    className="w-full p-2.5 bg-stone-50 border border-stone-300 rounded-xl text-stone-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-stone-700 font-bold mb-1">Department</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Engineering"
                    value={newEmp.department}
                    onChange={(e) => setNewEmp({...newEmp, department: e.target.value})}
                    className="w-full p-2.5 bg-stone-50 border border-stone-300 rounded-xl text-stone-900"
                  />
                </div>
                <div>
                  <label className="block text-stone-700 font-bold mb-1">Monthly Salary (INR)</label>
                  <input
                    type="number"
                    required
                    placeholder="e.g. 50000"
                    value={newEmp.base_salary}
                    onChange={(e) => setNewEmp({...newEmp, base_salary: e.target.value})}
                    className="w-full p-2.5 bg-stone-50 border border-stone-300 rounded-xl text-stone-900 font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-stone-700 font-bold mb-1">Bio / Notes</label>
                <textarea
                  rows="2"
                  value={newEmp.bio}
                  onChange={(e) => setNewEmp({...newEmp, bio: e.target.value})}
                  className="w-full p-2.5 bg-stone-50 border border-stone-300 rounded-xl text-stone-900"
                  placeholder="Enter bio notes..."
                ></textarea>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2.5 bg-[#881337] hover:bg-[#991B1B] text-white font-bold rounded-xl shadow-md shadow-rose-950/20"
                >
                  Save Employee
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showSlipModal && (
        <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-stone-200 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold text-stone-900 border-b border-stone-100 pb-3">Generate Salary Slip</h3>

            <form onSubmit={handleGenerateSlipSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-stone-700 font-bold mb-1">Select Employee</label>
                <select
                  required
                  value={slipForm.employee}
                  onChange={(e) => {
                    const selectedEmp = employees.find(emp => emp.id.toString() === e.target.value);
                    setSlipForm({
                      ...slipForm,
                      employee: e.target.value,
                      basic_salary: selectedEmp ? selectedEmp.base_salary : slipForm.basic_salary
                    });
                  }}
                  className="w-full p-2.5 bg-stone-50 border border-stone-300 text-stone-900 rounded-xl font-medium"
                >
                  <option value="">-- Choose Employee --</option>
                  {staffList.map(e => (
                    <option key={e.id} value={e.id}>
                      {e.full_name} ({e.employee_id} • Shift: {e.scheduled_login_time})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-stone-700 font-bold mb-1">Pay Month</label>
                  <select
                    value={slipForm.month}
                    onChange={(e) => setSlipForm({...slipForm, month: e.target.value})}
                    className="w-full p-2.5 bg-stone-50 border border-stone-300 rounded-xl text-stone-900"
                  >
                    <option value="1">January (31 Days)</option>
                    <option value="2">February (28/29 Days)</option>
                    <option value="3">March (31 Days)</option>
                    <option value="4">April (30 Days)</option>
                    <option value="5">May (31 Days)</option>
                    <option value="6">June (30 Days)</option>
                    <option value="7">July (31 Days)</option>
                    <option value="8">August (31 Days)</option>
                    <option value="9">September (30 Days)</option>
                    <option value="10">October (31 Days)</option>
                    <option value="11">November (30 Days)</option>
                    <option value="12">December (31 Days)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-stone-700 font-bold mb-1">Pay Year</label>
                  <input
                    type="number"
                    value={slipForm.year}
                    onChange={(e) => setSlipForm({...slipForm, year: e.target.value})}
                    className="w-full p-2.5 bg-stone-50 border border-stone-300 rounded-xl text-stone-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-stone-700 font-bold mb-1">Basic Salary (INR)</label>
                  <input
                    type="number"
                    required
                    placeholder="Enter basic salary"
                    value={slipForm.basic_salary}
                    onChange={(e) => setSlipForm({...slipForm, basic_salary: e.target.value})}
                    className="w-full p-2.5 bg-stone-50 border border-stone-300 rounded-xl text-stone-900 font-bold"
                  />
                </div>
                <div>
                  <label className="block text-stone-700 font-bold mb-1">Leave Days Deducted</label>
                  <input
                    type="number"
                    step="0.5"
                    value={slipForm.leave_days_deducted}
                    onChange={(e) => setSlipForm({...slipForm, leave_days_deducted: e.target.value})}
                    placeholder="Enter leave days (e.g. 1)"
                    className="w-full p-2.5 bg-stone-50 border border-stone-300 text-rose-900 rounded-xl text-stone-900 font-bold"
                  />
                </div>
              </div>

              <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs space-y-1.5">
                <div className="flex items-center gap-1.5 text-rose-900 font-bold text-[11px] mb-1">
                  <Calculator className="w-4 h-4 text-rose-800" />
                  <span>Calendar Calculation Preview</span>
                </div>
                <div className="flex justify-between text-stone-700">
                  <span>Month Days: <strong>{calcDaysInMonth} Days</strong></span>
                  <span>Daily Rate: <strong>₹{calcDailyRate.toFixed(2)}/day</strong></span>
                </div>
                <div className="flex justify-between text-stone-700">
                  <span>Leave Deduction ({calcLeaveDays} day leave):</span>
                  <strong className="text-rose-900">-₹{calcLeaveDeduction.toFixed(2)}</strong>
                </div>
                <div className="flex justify-between text-stone-900 border-t border-rose-200 pt-1 font-bold">
                  <span>Net Salary:</span>
                  <span className="text-emerald-700 text-sm font-black">₹{calcNetSalary.toFixed(2)}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-stone-700 font-bold mb-1">Allowances (INR)</label>
                  <input
                    type="number"
                    placeholder="Enter allowances"
                    value={slipForm.allowances}
                    onChange={(e) => setSlipForm({...slipForm, allowances: e.target.value})}
                    className="w-full p-2.5 bg-stone-50 border border-stone-300 rounded-xl text-stone-900"
                  />
                </div>
                <div>
                  <label className="block text-stone-700 font-bold mb-1">Deductions (INR)</label>
                  <input
                    type="number"
                    placeholder="Enter deductions"
                    value={slipForm.deductions}
                    onChange={(e) => setSlipForm({...slipForm, deductions: e.target.value})}
                    className="w-full p-2.5 bg-stone-50 border border-stone-300 rounded-xl text-stone-900"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setShowSlipModal(false)}
                  className="px-4 py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2.5 bg-[#881337] hover:bg-[#991B1B] text-white font-bold rounded-xl shadow-md shadow-rose-950/20"
                >
                  Issue Salary Slip
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default AdminDashboard;
