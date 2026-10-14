import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export const Navbar: React.FC = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { user, profile, signOut } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await signOut();
      navigate('/login');
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    `px-3 py-2 rounded-md text-sm font-medium transition-colors ${
      isActive
        ? 'bg-blue-700 text-white shadow-sm'
        : 'text-slate-200 hover:bg-blue-600 hover:text-white'
    }`;

  const displayName = profile?.full_name || user?.email || 'User';
  const roleName = profile?.role === 'admin' ? 'Admin' : 'Employee';
  const isAdmin = profile?.role === 'admin';

  return (
    <nav className="bg-blue-800 text-white shadow-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo / App Name */}
          <div className="flex items-center space-x-3">
            <div className="h-9 w-9 rounded-lg bg-white/10 flex items-center justify-center font-bold text-white border border-white/20">
              ⏱
            </div>
            <NavLink to="/dashboard" className="font-bold text-lg tracking-tight hover:text-blue-100">
              AttendanceTracker
            </NavLink>
          </div>

          {/* Desktop Nav Links */}
          <div className="hidden md:flex items-center space-x-1">
            <NavLink to="/dashboard" className={navLinkClass}>
              Dashboard
            </NavLink>
            <NavLink to="/tasks" className={navLinkClass}>
              Tasks
            </NavLink>
            <NavLink to="/reports" className={navLinkClass}>
              Reports
            </NavLink>
            {isAdmin && (
              <NavLink to="/admin" className={navLinkClass}>
                Admin
              </NavLink>
            )}
          </div>

          {/* User profile & Logout */}
          <div className="hidden md:flex items-center space-x-4">
            <div className="flex items-center space-x-2 bg-blue-900/60 py-1.5 px-3 rounded-full border border-blue-700/50">
              <div className="w-2 h-2 rounded-full bg-emerald-400"></div>
              <span className="text-xs font-medium text-slate-200 max-w-[150px] truncate" title={displayName}>
                {displayName}
              </span>
              <span
                className={`text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded ${
                  isAdmin ? 'bg-purple-500/30 text-purple-200' : 'bg-blue-500/30 text-blue-200'
                }`}
              >
                {roleName}
              </span>
            </div>
            <button
              onClick={handleLogout}
              className="text-xs bg-red-600 hover:bg-red-700 text-white font-medium py-1.5 px-3 rounded-md transition shadow-sm"
              title="Logout"
            >
              Logout
            </button>
          </div>

          {/* Mobile hamburger button */}
          <div className="md:hidden flex items-center">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              type="button"
              className="p-2 rounded-md text-slate-200 hover:text-white hover:bg-blue-700 focus:outline-none"
              aria-label="Toggle navigation menu"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                {mobileMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-blue-900 px-4 pt-2 pb-4 space-y-2 border-t border-blue-700">
          <NavLink
            to="/dashboard"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3 py-2 rounded-md text-base font-medium text-slate-200 hover:bg-blue-800 hover:text-white"
          >
            Dashboard
          </NavLink>
          <NavLink
            to="/tasks"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3 py-2 rounded-md text-base font-medium text-slate-200 hover:bg-blue-800 hover:text-white"
          >
            Tasks
          </NavLink>
          <NavLink
            to="/reports"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3 py-2 rounded-md text-base font-medium text-slate-200 hover:bg-blue-800 hover:text-white"
          >
            Reports
          </NavLink>
          {isAdmin && (
            <NavLink
              to="/admin"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2 rounded-md text-base font-medium text-slate-200 hover:bg-blue-800 hover:text-white"
            >
              Admin
            </NavLink>
          )}

          <div className="pt-3 border-t border-blue-800 flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-xs font-semibold text-slate-200">{displayName}</span>
              <span className="text-[10px] text-blue-300 capitalize">{roleName}</span>
            </div>
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                handleLogout();
              }}
              className="text-xs bg-red-600 hover:bg-red-700 text-white font-medium py-1.5 px-3 rounded-md"
            >
              Logout
            </button>
          </div>
        </div>
      )}
    </nav>
  );
};
