import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { Building2, Clock, Menu, Sun, Moon, LogOut, Bell, Send, X, Megaphone } from 'lucide-react';

export const Navbar = ({ onMobileMenuToggle, onSelectTab, darkMode, setDarkMode }) => {
  const { user, logout } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [showNotifPanel, setShowNotifPanel] = useState(false);
  const [showSendModal, setShowSendModal] = useState(false);

  const [notifForm, setNotifForm] = useState({
    title: '',
    message: '',
    target: 'ALL'
  });
  const [notifMsg, setNotifMsg] = useState('');

  const isAdmin = user?.role === 'ADMIN' || user?.is_superuser;
  const isMale = user?.gender === 'MALE';
  const scheduledTime = user?.scheduled_login_time || (isMale ? '10:00 AM' : '09:30 AM');

  const fetchNotifications = async () => {
    try {
      const res = await api.get('/users/notifications/');
      setNotifications(res.data.results || res.data);
    } catch (err) {
      console.error("Fetch notifications error:", err);
    }
  };

  useEffect(() => {
    if (user) {
      fetchNotifications();
      const interval = setInterval(fetchNotifications, 10000);
      return () => clearInterval(interval);
    }
  }, [user]);

  const handleSendNotification = async (e) => {
    e.preventDefault();
    setNotifMsg('');
    try {
      await api.post('/users/notifications/', notifForm);
      setNotifForm({ title: '', message: '', target: 'ALL' });
      setShowSendModal(false);
      fetchNotifications();
      alert("Notification broadcasted successfully!");
    } catch (err) {
      setNotifMsg(err.response?.data?.detail || 'Error sending notification.');
    }
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;

  const handleNotificationClick = async (n) => {
    if (!n.is_read) {
      try {
        setNotifications((prev) =>
          prev.map((item) => (item.id === n.id ? { ...item, is_read: true } : item))
        );
        await api.post(`/users/notifications/${n.id}/mark-read/`);
        fetchNotifications();
      } catch (err) {
        console.error("Mark notification read error:", err);
      }
    }
    setShowNotifPanel(false);
    if (n.link_tab && onSelectTab) {
      onSelectTab(n.link_tab);
    }
  };

  const handleMarkAllRead = async (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    try {
      setNotifications((prev) => prev.map((item) => ({ ...item, is_read: true })));
      await api.post('/users/notifications/mark-all-read/');
      fetchNotifications();
    } catch (err) {
      console.error("Mark all notifications read error:", err);
      fetchNotifications();
    }
  };

  const handleToggleNotifPanel = () => {
    const nextState = !showNotifPanel;
    setShowNotifPanel(nextState);
    if (nextState && unreadCount > 0) {
      handleMarkAllRead();
    }
  };

  return (
    <div className="sticky top-1 sm:top-3 z-40 px-1 sm:px-6 lg:px-8 mb-3 sm:mb-6 font-['Plus_Jakarta_Sans',sans-serif]">
      <header className={`max-w-7xl mx-auto rounded-2xl sm:rounded-full border transition-all duration-300 shadow-lg backdrop-blur-md px-2.5 sm:px-6 h-14 sm:h-16 flex items-center justify-between ${
        darkMode
          ? 'bg-stone-900/90 border-stone-800 text-white shadow-rose-950/20'
          : 'bg-white/90 border-stone-200 text-stone-900 shadow-stone-300/40'
      }`}>
        
        <div className="flex items-center gap-1.5 sm:gap-3">
          <button
            onClick={onMobileMenuToggle}
            className={`md:hidden p-1.5 rounded-xl transition-transform active:scale-95 ${
              darkMode ? 'text-stone-300 hover:bg-stone-800' : 'text-stone-600 hover:bg-stone-100'
            }`}
            aria-label="Toggle Menu"
          >
            <Menu className="w-5 h-5" />
          </button>
          
          <div className="flex items-center gap-2 sm:gap-3 cursor-pointer">
            <img
              src="/logo.jpg"
              alt="Thahira Groups Logo"
              className="w-8 h-8 sm:w-9 sm:h-9 rounded-full object-cover shadow-md shrink-0 border border-stone-200"
            />
            <div>
              <span className={`font-black text-xs sm:text-sm tracking-tight block leading-tight ${darkMode ? 'text-white' : 'text-stone-900'}`}>
                Thahira Groups
              </span>
              <span className="text-[9px] sm:text-[10px] text-rose-800 font-bold tracking-wider uppercase block leading-none">
                ERP System
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-3">
          {!isAdmin && user && (
            <div className={`hidden lg:flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-bold ${
              darkMode
                ? 'bg-stone-800 text-rose-300 border-stone-700'
                : 'bg-rose-50 text-rose-900 border-rose-200'
            }`}>
              <Clock className="w-3.5 h-3.5 text-rose-800" />
              <span>Shift: {scheduledTime}</span>
            </div>
          )}

          <div className="relative">
            <button
              onClick={handleToggleNotifPanel}
              title="Notifications"
              className={`p-1.5 sm:p-2 rounded-full border transition-all duration-200 active:scale-95 relative ${
                darkMode
                  ? 'bg-stone-800 text-stone-200 border-stone-700 hover:bg-stone-700'
                  : 'bg-stone-100 text-stone-700 border-stone-200 hover:bg-stone-200'
              }`}
            >
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-600 text-white rounded-full text-[9px] font-black flex items-center justify-center animate-pulse">
                  {unreadCount}
                </span>
              )}
            </button>

            {showNotifPanel && (
              <div className={`absolute right-0 mt-3 w-[calc(100vw-2rem)] max-w-sm sm:w-96 rounded-2xl border shadow-2xl p-3.5 sm:p-4 z-50 ${
                darkMode ? 'bg-stone-900 border-stone-800 text-white' : 'bg-white border-stone-200 text-stone-900'
              }`}>
                <div className="flex items-center justify-between border-b pb-2 mb-3 border-stone-100">
                  <div className="flex items-center gap-2">
                    <Megaphone className="w-4 h-4 text-rose-800" />
                    <h4 className="font-bold text-xs">Notifications & Alerts</h4>
                    {unreadCount > 0 && (
                      <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-rose-100 text-rose-800 font-bold">
                        {unreadCount} new
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {unreadCount > 0 && (
                      <button
                        type="button"
                        onClick={handleMarkAllRead}
                        className="text-[10px] text-rose-800 font-bold hover:underline px-1 py-0.5 rounded transition-colors hover:bg-rose-50"
                      >
                        Mark all read
                      </button>
                    )}
                    <button onClick={() => setShowNotifPanel(false)} className="text-stone-400 hover:text-stone-700 p-1">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {isAdmin && (
                  <button
                    onClick={() => {
                      setShowNotifPanel(false);
                      setShowSendModal(true);
                    }}
                    className="w-full mb-3 bg-[#881337] hover:bg-[#991B1B] text-white font-bold py-2 rounded-xl text-xs transition-colors flex items-center justify-center gap-2"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Broadcast Notification</span>
                  </button>
                )}

                <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
                  {notifications.length === 0 ? (
                    <p className="text-xs text-center py-4 text-stone-400">No active notifications.</p>
                  ) : (
                    notifications.map((n) => (
                      <div
                        key={n.id}
                        onClick={() => handleNotificationClick(n)}
                        className={`p-3 rounded-xl border text-xs space-y-1 cursor-pointer transition-all hover:scale-[1.01] ${
                          !n.is_read
                            ? darkMode
                              ? 'bg-rose-950/40 border-rose-800/60 text-white'
                              : 'bg-rose-50/70 border-rose-200 text-stone-900'
                            : darkMode
                              ? 'bg-stone-950 border-stone-800 text-stone-300 opacity-80'
                              : 'bg-stone-50 border-stone-200 text-stone-600'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-1">
                          <div className="flex items-center gap-1.5 truncate">
                            {!n.is_read && (
                              <span className="w-2 h-2 rounded-full bg-rose-600 shrink-0" title="Unread" />
                            )}
                            <strong className={`font-bold truncate ${!n.is_read ? 'text-rose-900' : 'text-stone-700'}`}>
                              {n.title}
                            </strong>
                          </div>
                          <span className="text-[9px] px-2 py-0.5 rounded-full bg-stone-200/60 text-stone-700 font-bold shrink-0">
                            {n.target}
                          </span>
                        </div>
                        <p className="text-[11px] leading-relaxed line-clamp-2">{n.message}</p>
                        <div className="flex items-center justify-between pt-1">
                          <span className="text-[9px] text-stone-400">
                            {new Date(n.created_at).toLocaleString([], {month:'short', day:'numeric', hour:'2-digit', minute:'2-digit'})}
                          </span>
                          {n.link_tab && (
                            <span className="text-[9px] font-bold text-rose-800 underline">
                              View Section →
                            </span>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          <button
            onClick={() => setDarkMode(!darkMode)}
            title="Toggle Theme"
            className={`p-1.5 sm:p-2 rounded-full border transition-all duration-200 active:scale-95 ${
              darkMode
                ? 'bg-stone-800 text-amber-300 border-stone-700 hover:bg-stone-700'
                : 'bg-stone-100 text-stone-700 border-stone-200 hover:bg-stone-200'
            }`}
          >
            {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>

          <div className={`flex items-center gap-1.5 px-2 sm:px-3.5 py-1 sm:py-1.5 rounded-full border ${
            darkMode
              ? 'bg-stone-800 border-stone-700'
              : 'bg-stone-100 border-stone-200'
          }`}>
            <div className="w-6 h-6 bg-[#881337] text-white rounded-full flex items-center justify-center text-xs font-black shadow-xs shrink-0">
              {user?.full_name ? user.full_name.charAt(0).toUpperCase() : 'U'}
            </div>
            <div className="text-left hidden md:block">
              <span className={`text-xs font-bold block leading-tight truncate max-w-[100px] lg:max-w-[120px] ${darkMode ? 'text-white' : 'text-stone-900'}`}>
                {user?.full_name || user?.username}
              </span>
              <span className={`text-[9px] font-semibold uppercase block ${darkMode ? 'text-stone-400' : 'text-stone-500'}`}>
                {user?.role}
              </span>
            </div>
          </div>

          <button
            onClick={logout}
            title="Logout"
            className="p-1.5 sm:p-2 rounded-full border border-stone-200 text-stone-500 hover:text-rose-900 hover:bg-rose-50 transition-all active:scale-95 shrink-0"
          >
            <LogOut className="w-4 h-4" />
          </button>

        </div>

      </header>

      {showSendModal && (
        <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white border border-stone-200 rounded-3xl max-w-md w-full p-5 sm:p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b pb-3 border-stone-100">
              <h3 className="text-base font-bold text-stone-900">Broadcast Notification</h3>
              <button onClick={() => setShowSendModal(false)} className="text-stone-400 hover:text-stone-700 p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            {notifMsg && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl">
                {notifMsg}
              </div>
            )}

            <form onSubmit={handleSendNotification} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-stone-700 mb-1">Notification Title</label>
                <input
                  type="text"
                  required
                  placeholder="Title..."
                  value={notifForm.title}
                  onChange={(e) => setNotifForm({...notifForm, title: e.target.value})}
                  className="w-full p-2.5 bg-stone-50 border border-stone-300 rounded-xl"
                />
              </div>

              <div>
                <label className="block font-bold text-stone-700 mb-1">Target Audience</label>
                <select
                  value={notifForm.target}
                  onChange={(e) => setNotifForm({...notifForm, target: e.target.value})}
                  className="w-full p-2.5 bg-stone-50 border border-stone-300 rounded-xl"
                >
                  <option value="ALL">All Staff & Admin</option>
                  <option value="EMPLOYEE">Employees Only</option>
                  <option value="ADMIN">Admins Only</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-stone-700 mb-1">Message Content</label>
                <textarea
                  rows="3"
                  required
                  placeholder="Details..."
                  value={notifForm.message}
                  onChange={(e) => setNotifForm({...notifForm, message: e.target.value})}
                  className="w-full p-2.5 bg-stone-50 border border-stone-300 rounded-xl"
                ></textarea>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setShowSendModal(false)}
                  className="px-4 py-2 bg-stone-100 text-stone-700 font-bold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#881337] text-white font-bold rounded-xl shadow-md"
                >
                  Broadcast
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default Navbar;
