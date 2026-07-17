import { Link } from "react-router-dom";
import { useState } from "react";
import { FaChevronDown } from "react-icons/fa";

export default function Sidebar() {

  return (
    <div className="w-64 bg-white dark:bg-[#0a0a0a] shadow-lg min-h-screen p-5 border-r border-slate-100 dark:border-gray-900 transition-colors duration-300">

      <h1 className="text-xl font-bold text-[#ff9800] dark:text-[#ff9800] mb-8 transition-colors">
        CareerPortal
      </h1>

      <ul className="space-y-2 text-slate-600 dark:text-gray-400 transition-colors font-medium">

        <li>
          <Link to="/dashboard" className="block px-3 py-2 rounded-lg hover:bg-slate-50 dark:hover:bg-gray-900 hover:text-[#ff9800] dark:hover:text-[#ff9800] transition-colors">Dashboard</Link>
        </li>

        <li>
          <Link to="/jobs" className="block px-3 py-2 rounded-lg hover:bg-slate-50 dark:hover:bg-gray-900 hover:text-[#ff9800] dark:hover:text-[#ff9800] transition-colors">Job Opportunities</Link>
        </li>

        <li>
          <Link to="/applications" className="block px-3 py-2 rounded-lg hover:bg-slate-50 dark:hover:bg-gray-900 hover:text-[#ff9800] dark:hover:text-[#ff9800] transition-colors">Applications</Link>
        </li>

        <li>
          <Link to="/profile" className="block px-3 py-2 rounded-lg bg-[#ff9800]/10 dark:bg-[#ff9800]/20/10 text-[#ff9800] dark:text-[#ff9800] transition-colors">My Profile</Link>
        </li>

        <li>
          <Link to="/resume" className="block px-3 py-2 rounded-lg hover:bg-slate-50 dark:hover:bg-gray-900 hover:text-[#ff9800] dark:hover:text-[#ff9800] transition-colors">Resume Builder</Link>
        </li>

        <li>
          <Link to="/interviews" className="block px-3 py-2 rounded-lg hover:bg-slate-50 dark:hover:bg-gray-900 hover:text-[#ff9800] dark:hover:text-[#ff9800] transition-colors">Interview Schedule</Link>
        </li>

        <li>
          <Link to="/notifications" className="block px-3 py-2 rounded-lg hover:bg-slate-50 dark:hover:bg-gray-900 hover:text-[#ff9800] dark:hover:text-[#ff9800] transition-colors">Notifications</Link>
        </li>

        {/* Settings and Change Password removed as requested, leaving just normal nav links */}

      </ul>

    </div>
  );
}
