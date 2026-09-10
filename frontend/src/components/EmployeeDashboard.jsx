import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { Clock, UserCheck, CalendarDays, Receipt, Download, Send, Lock, KeyRound, CheckCircle, AlertCircle } from 'lucide-react';

export const EmployeeDashboard = ({ subTab = 'dashboard', darkMode = false }) => {
  const { user } = useAuth();

  const [todayAttendance, setTodayAttendance] = useState(null);
  const [attendanceLogs, setAttendanceLogs] = useState([]);
  const [clockTime, setClockTime] = useState(new Date().toLocaleTimeString());

  const [leaveRequests, setLeaveRequests] = useState([]);
  const [leaveForm, setLeaveForm] = useState({
    leave_type: 'CASUAL',
    start_date: '',
    end_date: '',
    reason: ''
  });
  const [leaveSuccessMsg, setLeaveSuccessMsg] = useState('');
  const [leaveErrorMsg, setLeaveErrorMsg] = useState('');
  const [leaveSubmitting, setLeaveSubmitting] = useState(false);

  const [salarySlips, setSalarySlips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [downloadingId, setDownloadingId] = useState(null);

  const [passForm, setPassForm] = useState({ old_password: '', new_password: '' });
  const [passMsg, setPassMsg] = useState('');
  const [passError, setPassError] = useState('');
  const [passLoading, setPassLoading] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => setClockTime(new Date().toLocaleTimeString()), 1000);
    return () => clearInterval(timer);
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [todayRes, logsRes, leavesRes, slipsRes] = await Promise.all([
        api.get('/attendance/today/'),
        api.get('/attendance/logs/'),
        api.get('/leaves/'),
        api.get('/payroll/slips/')
      ]);
      setTodayAttendance(todayRes.data.attendance);
      setAttendanceLogs(logsRes.data.results || logsRes.data);
      setLeaveRequests(leavesRes.data.results || leavesRes.data);
      setSalarySlips(slipsRes.data.results || slipsRes.data);
    } catch (err) {
      console.error("Dashboard fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCheckIn = async () => {
    try {
      await api.post('/attendance/check-in/');
      fetchData();
    } catch (err) {
      alert(err.response?.data?.detail || 'Check-in failed.');
    }
  };

  const handleCheckOut = async () => {
    try {
      await api.post('/attendance/check-out/');
      fetchData();
    } catch (err) {
      alert(err.response?.data?.detail || 'Check-out failed.');
    }
  };

  const handleLeaveSubmit = async (e) => {
    e.preventDefault();
    setLeaveSuccessMsg('');
    setLeaveErrorMsg('');
    setLeaveSubmitting(true);
    try {
      await api.post('/leaves/', leaveForm);
      setLeaveForm({ leave_type: 'CASUAL', start_date: '', end_date: '', reason: '' });
      setLeaveSuccessMsg('Leave application submitted successfully! Sent to Admin for approval.');
      fetchData();
    } catch (err) {
      let errMsg = 'Error submitting leave request.';
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
      setLeaveErrorMsg(errMsg);
    } finally {
      setLeaveSubmitting(false);
    }
  };

  const handleChangePasswordSubmit = async (e) => {
    e.preventDefault();
    setPassMsg('');
    setPassError('');
    setPassLoading(true);
    try {
      const res = await api.post('/users/change-password/', passForm);
      setPassMsg(res.data.message || 'Password changed successfully.');
      setPassForm({ old_password: '', new_password: '' });
    } catch (err) {
      setPassError(err.response?.data?.detail || 'Error changing password.');
    } finally {
      setPassLoading(false);
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
      const filename = `Salary_Slip_${employeeId || 'EMP'}_${monthName}_${year}.pdf`;

      const reader = new FileReader();
      reader.onloadend = () => {
        const base64Url = reader.result;
        const link = document.createElement('a');
        link.href = base64Url;
        link.setAttribute('download', filename);
        document.body.appendChild(link);
        link.click();
        setTimeout(() => link.remove(), 500);
      };
      reader.readAsDataURL(blob);
    } catch (err) {
      alert("Failed to download PDF.");
    } finally {
      setDownloadingId(null);
    }
  };

  const isMale = user?.gender === 'MALE';
  const scheduledTime = user?.scheduled_login_time || (isMale ? '10:00 AM' : '09:30 AM');

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

      {(subTab === 'dashboard' || subTab === 'all') && (
        <div className={`rounded-3xl border shadow-sm overflow-hidden ${cardBg}`}>
          <div className="p-5 sm:p-8 bg-gradient-to-r from-[#4C0519] via-[#881337] to-[#991B1B] text-white">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
              
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-white/10 backdrop-blur border border-white/20 text-white flex items-center justify-center font-black text-xl sm:text-2xl shadow-lg shrink-0">
                  {user?.full_name?.charAt(0) || 'T'}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h1 className="text-xl sm:text-2xl font-black text-white leading-tight">{user?.full_name || user?.username}</h1>
                    <span className="px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-bold bg-white/10 border border-white/20 text-rose-200">
                      {user?.gender}
                    </span>
                  </div>
                  <p className="text-rose-100 text-xs mt-1">
                    {user?.designation} • {user?.department} • ID: <strong className="text-white font-mono">{user?.employee_id || 'N/A'}</strong>
                  </p>
                </div>
              </div>

              <div className="bg-black/20 backdrop-blur border border-white/20 p-3.5 sm:p-4 rounded-2xl flex items-center gap-3.5">
                <div className="p-2.5 bg-white/10 rounded-xl text-rose-200 shrink-0">
                  <Clock className="w-6 h-6 sm:w-7 sm:h-7" />
                </div>
                <div>
                  <span className="text-[10px] font-bold tracking-wider uppercase text-rose-200 block">Shift Schedule</span>
                  <span className="text-xl sm:text-2xl font-black text-white tracking-tight">
                    {scheduledTime}
                  </span>
                  <span className="text-[10px] text-rose-200 font-semibold block">
                    {isMale ? 'Male Shift: 10:00 AM' : 'Female Shift: 09:30 AM'}
                  </span>
                </div>
              </div>

            </div>
          </div>

          <div className={`p-4 sm:p-6 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs border-t ${darkMode ? 'bg-stone-950 border-stone-800' : 'bg-stone-50/60 border-stone-100'}`}>
            <div className={`p-3.5 rounded-2xl border ${cardBg}`}>
              <span className={`${textMuted} font-bold uppercase block mb-0.5`}>Email Address</span>
              <span className="font-bold text-xs sm:text-sm truncate block">{user?.email}</span>
            </div>
            <div className={`p-3.5 rounded-2xl border ${cardBg}`}>
              <span className={`${textMuted} font-bold uppercase block mb-0.5`}>Date of Joining</span>
              <span className="font-bold text-xs sm:text-sm block">{user?.date_of_joining || 'Jan 15, 2023'}</span>
            </div>
            <div className={`p-3.5 rounded-2xl border ${cardBg}`}>
              <span className={`${textMuted} font-bold uppercase block mb-0.5`}>Bio Notes</span>
              <span className="font-medium leading-relaxed block">{user?.bio || 'Staff Member'}</span>
            </div>
          </div>
        </div>
      )}

      {(subTab === 'dashboard' || subTab === 'all') && (
        <div className={`p-5 sm:p-6 rounded-3xl border shadow-sm space-y-4 ${cardBg}`}>
          <div className="flex items-center gap-2 border-b pb-3 border-stone-200">
            <KeyRound className="w-5 h-5 text-rose-800" />
            <div>
              <h2 className="text-base font-bold">Change Password</h2>
              <p className={`text-xs ${textMuted}`}>Update account password.</p>
            </div>
          </div>

          {passMsg && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl font-bold flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{passMsg}</span>
            </div>
          )}

          {passError && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl font-bold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-700 shrink-0" />
              <span>{passError}</span>
            </div>
          )}

          <form onSubmit={handleChangePasswordSubmit} className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div>
              <label className="block font-bold mb-1">Current Password</label>
              <input
                type="password"
                required
                value={passForm.old_password}
                onChange={(e) => setPassForm({...passForm, old_password: e.target.value})}
                placeholder="Current password"
                className={`w-full p-2.5 rounded-xl border ${innerBg}`}
              />
            </div>
            <div>
              <label className="block font-bold mb-1">New Password</label>
              <input
                type="password"
                required
                value={passForm.new_password}
                onChange={(e) => setPassForm({...passForm, new_password: e.target.value})}
                placeholder="New password"
                className={`w-full p-2.5 rounded-xl border ${innerBg}`}
              />
            </div>
            <div className="flex items-end">
              <button
                type="submit"
                disabled={passLoading}
                className="w-full bg-[#881337] hover:bg-[#991B1B] text-white font-bold py-2.5 px-4 rounded-xl text-xs transition-all shadow-md flex items-center justify-center gap-2 disabled:opacity-50 min-h-[42px]"
              >
                <Lock className="w-4 h-4" />
                <span>{passLoading ? 'Updating...' : 'Update Password'}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {(subTab === 'dashboard' || subTab === 'attendance') && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className={`p-5 sm:p-6 rounded-3xl border shadow-sm flex flex-col justify-between space-y-4 ${cardBg}`}>
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className={`text-xs font-bold uppercase tracking-wider ${textMuted}`}>Daily Check-In</span>
                <span className="text-xs font-bold px-2.5 py-0.5 bg-rose-50 text-rose-900 border border-rose-200 rounded-full">
                  {new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                </span>
              </div>
              
              <div className="text-center py-5 bg-[#881337] text-white rounded-2xl my-2 shadow-lg shadow-rose-950/20">
                <span className="text-xs text-rose-200 font-bold tracking-wider uppercase block">Current Time</span>
                <span className="text-2xl sm:text-3xl font-black font-mono text-white tracking-tight">{clockTime}</span>
                <span className="text-[11px] text-rose-100 block mt-1">Shift Schedule: <strong className="text-white">{scheduledTime}</strong></span>
              </div>

              {todayAttendance ? (
                <div className="space-y-2 text-xs pt-2">
                  <div className={`flex justify-between p-2.5 rounded-xl border ${innerBg}`}>
                    <span className={textMuted}>Check-in:</span>
                    <span className="font-bold font-mono">
                      {todayAttendance.check_in ? new Date(todayAttendance.check_in).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}) : 'Not Checked In'}
                    </span>
                  </div>
                  <div className={`flex justify-between p-2.5 rounded-xl border ${innerBg}`}>
                    <span className={textMuted}>Check-out:</span>
                    <span className="font-bold font-mono">
                      {todayAttendance.check_out ? new Date(todayAttendance.check_out).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}) : 'Pending'}
                    </span>
                  </div>
                  <div className={`flex justify-between p-2.5 rounded-xl border ${innerBg}`}>
                    <span className={textMuted}>Status:</span>
                    <span className={`font-bold px-2 py-0.5 rounded text-[11px] ${
                      todayAttendance.status === 'LATE' ? 'bg-amber-100 text-amber-800 border border-amber-200' : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                    }`}>
                      {todayAttendance.status}
                    </span>
                  </div>
                </div>
              ) : (
                <p className={`text-xs text-center py-2 ${textMuted}`}>No record for today yet.</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2.5 pt-2">
              <button
                onClick={handleCheckIn}
                disabled={todayAttendance?.check_in}
                className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-30 text-white font-bold py-3 rounded-xl text-xs transition-all shadow-md flex items-center justify-center gap-1.5 min-h-[44px]"
              >
                <UserCheck className="w-4 h-4" />
                <span>Check In</span>
              </button>

              <button
                onClick={handleCheckOut}
                disabled={!todayAttendance?.check_in || todayAttendance?.check_out}
                className="w-full bg-stone-800 hover:bg-stone-700 disabled:opacity-30 text-white font-bold py-3 rounded-xl text-xs transition-all shadow-md flex items-center justify-center gap-1.5 min-h-[44px]"
              >
                <Clock className="w-4 h-4" />
                <span>Check Out</span>
              </button>
            </div>
          </div>

          <div className={`lg:col-span-2 p-5 sm:p-6 rounded-3xl border shadow-sm space-y-4 ${cardBg}`}>
            <h2 className="text-base font-bold border-b border-stone-100 pb-3">Attendance History</h2>
            
            <div className="overflow-x-auto w-full">
              <table className="w-full text-left border-collapse min-w-[500px]">
                <thead>
                  <tr className={`border-b text-[11px] font-bold uppercase ${darkMode ? 'border-stone-800 text-stone-400 bg-stone-950' : 'border-stone-200 text-stone-500 bg-stone-50'}`}>
                    <th className="py-3 px-3">Date</th>
                    <th className="py-3 px-3">Shift Time</th>
                    <th className="py-3 px-3">Check In</th>
                    <th className="py-3 px-3">Check Out</th>
                    <th className="py-3 px-3">Status</th>
                    <th className="py-3 px-3">Hours</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 text-xs">
                  {attendanceLogs.length === 0 ? (
                    <tr><td colSpan="6" className={`py-4 text-center ${textMuted}`}>No records found.</td></tr>
                  ) : (
                    attendanceLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-stone-50/80 transition-colors">
                        <td className="py-3 px-3 font-semibold">{log.date}</td>
                        <td className="py-3 px-3 font-bold text-rose-900">{log.expected_login_time}</td>
                        <td className="py-3 px-3 font-mono">
                          {log.check_in ? new Date(log.check_in).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '-'}
                        </td>
                        <td className="py-3 px-3 font-mono">
                          {log.check_out ? new Date(log.check_out).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '-'}
                        </td>
                        <td className="py-3 px-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            log.status === 'HALF_DAY' || log.status === 'HALF DAY' ? 'bg-amber-100 text-amber-900 border border-amber-300' :
                            log.status === 'LATE' ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
                          }`}>
                            {log.status === 'HALF_DAY' ? 'HALF DAY' : log.status}
                          </span>
                        </td>
                        <td className="py-3 px-3 font-medium">{log.working_hours} hrs</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {(subTab === 'dashboard' || subTab === 'leaves') && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className={`p-5 sm:p-6 rounded-3xl border shadow-sm space-y-4 ${cardBg}`}>
            <div>
              <h2 className="text-base font-bold">Apply for Leave</h2>
              <p className={`text-xs mt-0.5 ${textMuted}`}>Submit leave application for approval.</p>
            </div>

            {leaveSuccessMsg && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl font-bold flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{leaveSuccessMsg}</span>
              </div>
            )}

            {leaveErrorMsg && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl font-bold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-700 shrink-0" />
                <span>{leaveErrorMsg}</span>
              </div>
            )}

            <form onSubmit={handleLeaveSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold mb-1">Leave Type</label>
                <select
                  value={leaveForm.leave_type}
                  onChange={(e) => setLeaveForm({...leaveForm, leave_type: e.target.value})}
                  className={`w-full p-2.5 rounded-xl border ${innerBg}`}
                >
                  <option value="CASUAL">Casual Leave</option>
                  <option value="SICK">Sick Leave</option>
                  <option value="PAID">Paid Leave</option>
                  <option value="UNPAID">Unpaid Leave</option>
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold mb-1">Start Date</label>
                  <input
                    type="date"
                    required
                    value={leaveForm.start_date}
                    onChange={(e) => setLeaveForm({...leaveForm, start_date: e.target.value})}
                    className={`w-full p-2 rounded-xl border ${innerBg}`}
                  />
                </div>
                <div>
                  <label className="block font-bold mb-1">End Date</label>
                  <input
                    type="date"
                    required
                    value={leaveForm.end_date}
                    onChange={(e) => setLeaveForm({...leaveForm, end_date: e.target.value})}
                    className={`w-full p-2 rounded-xl border ${innerBg}`}
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold mb-1">Reason</label>
                <textarea
                  rows="3"
                  required
                  placeholder="Reason for leave..."
                  value={leaveForm.reason}
                  onChange={(e) => setLeaveForm({...leaveForm, reason: e.target.value})}
                  className={`w-full p-2.5 rounded-xl border ${innerBg}`}
                ></textarea>
              </div>

              <button
                type="submit"
                disabled={leaveSubmitting}
                className="w-full bg-[#881337] hover:bg-[#991B1B] text-white font-bold py-3 rounded-xl text-xs transition-all shadow-md flex items-center justify-center gap-2 disabled:opacity-50 min-h-[44px]"
              >
                <Send className="w-4 h-4" />
                <span>{leaveSubmitting ? 'Submitting...' : 'Submit Request'}</span>
              </button>
            </form>
          </div>

          <div className={`lg:col-span-2 p-5 sm:p-6 rounded-3xl border shadow-sm space-y-4 ${cardBg}`}>
            <h2 className="text-base font-bold border-b border-stone-100 pb-3">My Leave Requests</h2>
            
            <div className="overflow-x-auto w-full">
              <table className="w-full text-left border-collapse min-w-[550px]">
                <thead>
                  <tr className={`border-b text-[11px] font-bold uppercase ${darkMode ? 'border-stone-800 text-stone-400 bg-stone-950' : 'border-stone-200 text-stone-500 bg-stone-50'}`}>
                    <th className="py-3 px-3">Type</th>
                    <th className="py-3 px-3">Dates</th>
                    <th className="py-3 px-3">Reason</th>
                    <th className="py-3 px-3">Status</th>
                    <th className="py-3 px-3">Remarks</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 text-xs">
                  {leaveRequests.length === 0 ? (
                    <tr><td colSpan="5" className={`py-4 text-center ${textMuted}`}>No requests submitted yet.</td></tr>
                  ) : (
                    leaveRequests.map((req) => (
                      <tr key={req.id} className="hover:bg-stone-50/80 transition-colors">
                        <td className="py-3 px-3 font-semibold">{req.leave_type}</td>
                        <td className="py-3 px-3">
                          {req.start_date} to {req.end_date}
                          <span className={`block text-[10px] ${textMuted}`}>({req.total_days} days)</span>
                        </td>
                        <td className="py-3 px-3 max-w-xs truncate">{req.reason}</td>
                        <td className="py-3 px-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            req.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-800' :
                            req.status === 'REJECTED' ? 'bg-rose-100 text-rose-800' :
                            'bg-amber-100 text-amber-800'
                          }`}>
                            {req.status}
                          </span>
                        </td>
                        <td className="py-3 px-3 italic">{req.admin_notes || '-'}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {(subTab === 'dashboard' || subTab === 'payroll') && (
        <div className={`rounded-3xl border shadow-sm p-5 sm:p-6 space-y-4 ${cardBg}`}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-stone-100 pb-3">
            <div>
              <h2 className="text-lg font-bold">My Salary Slips</h2>
              <p className={`text-xs mt-0.5 ${textMuted}`}>Monthly earnings statements and PDF downloads.</p>
            </div>
          </div>

          {salarySlips.length === 0 ? (
            <p className={`text-sm text-center py-6 ${textMuted}`}>No salary slips found.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {salarySlips.map((slip) => (
                <div key={slip.id} className={`p-4 sm:p-5 rounded-2xl border space-y-3 ${innerBg}`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-base font-bold block">{slip.month_name} {slip.year} Payslip</span>
                      <span className={`text-xs ${textMuted}`}>Shift Schedule: <strong className="text-rose-900">{scheduledTime}</strong></span>
                    </div>
                    <span className="px-2.5 py-0.5 bg-emerald-100 text-emerald-800 text-xs font-bold rounded-full">
                      {slip.status}
                    </span>
                  </div>

                  <div className="p-3 bg-rose-50/70 border border-rose-200 rounded-xl text-xs space-y-1">
                    <div className="flex justify-between items-center text-[11px]">
                      <span className="text-stone-600 font-medium">Working Days:</span>
                      <strong className="text-stone-900">
                        {slip.working_days || 26} Days ({slip.late_days || 0} Late{slip.half_days ? `, ${slip.half_days} Half-Day` : ''})
                      </strong>
                    </div>
                    <div className="flex justify-between items-center text-[11px]">
                      <span className="text-stone-600 font-medium">Daily Salary Rate:</span>
                      <strong className="text-stone-900">₹{parseFloat(slip.daily_rate || 0).toLocaleString('en-IN')}/day</strong>
                    </div>
                    {parseFloat(slip.late_salary_deduction || 0) > 0 && (
                      <div className="flex justify-between items-center text-[11px]">
                        <span className="text-rose-900 font-bold">Late Salary Deduction ({slip.total_late_hours || 0}h {slip.total_late_minutes || 0}m late):</span>
                        <strong className="text-rose-900 font-black">-₹{parseFloat(slip.late_salary_deduction || 0).toLocaleString('en-IN')}</strong>
                      </div>
                    )}
                    {parseFloat(slip.leave_deduction_amount || 0) > 0 && (
                      <div className="flex justify-between items-center text-[11px]">
                        <span className="text-rose-900 font-bold">Leave Days Deducted ({slip.leave_days_deducted || 0} days):</span>
                        <strong className="text-rose-900 font-black">-₹{parseFloat(slip.leave_deduction_amount || 0).toLocaleString('en-IN')}</strong>
                      </div>
                    )}
                  </div>

                  <div className={`grid grid-cols-3 gap-2 p-3 rounded-xl border text-xs ${cardBg}`}>
                    <div>
                      <span className={`block text-[10px] ${textMuted}`}>BASE SALARY</span>
                      <span className="font-semibold">₹{parseFloat(slip.basic_salary).toLocaleString('en-IN')}</span>
                    </div>
                    <div>
                      <span className={`block text-[10px] ${textMuted}`}>ALLOWANCES</span>
                      <span className="font-semibold">₹{parseFloat(slip.allowances).toLocaleString('en-IN')}</span>
                    </div>
                    <div>
                      <span className={`block text-[10px] ${textMuted}`}>NET PAYABLE</span>
                      <span className="font-bold text-emerald-700">₹{parseFloat(slip.net_salary).toLocaleString('en-IN')}</span>
                    </div>
                  </div>

                  <div className="pt-2 flex items-center justify-between border-t border-stone-200/60">
                    <span className={`text-[11px] ${textMuted}`}>Issued: {new Date(slip.generated_at).toLocaleDateString()}</span>
                    <button
                      type="button"
                      disabled={downloadingId === slip.id}
                      onClick={() => handleDownloadPdf(slip.id, slip.month_name, slip.year, user?.employee_id)}
                      className="px-4 py-2 bg-[#881337] hover:bg-[#991B1B] text-white font-bold rounded-xl text-xs transition-all shadow-md flex items-center gap-2 disabled:opacity-50 min-h-[38px]"
                    >
                      <Download className="w-4 h-4" />
                      <span>{downloadingId === slip.id ? 'Downloading...' : 'Download PDF'}</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

    </div>
  );
};

export default EmployeeDashboard;
