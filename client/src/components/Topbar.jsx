import { useState, useRef, useEffect } from "react";
import { IoNotificationsOutline } from "react-icons/io5";
import { FaUserCircle } from "react-icons/fa";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext"; // [NEW] global auth

export default function Topbar() {
  const { logout } = useAuth(); // [NEW]
  const navigate   = useNavigate(); // [NEW]

  const [openNotifications, setOpenNotifications] = useState(false);
  const [openProfile, setOpenProfile] = useState(false);

  const notificationRef = useRef(null);
  const profileRef = useRef(null);

  // Close dropdowns when clicking outside
  useEffect(() => {

    const handleClickOutside = (event) => {

      if (
        notificationRef.current &&
        !notificationRef.current.contains(event.target)
      ) {
        setOpenNotifications(false);
      }

      if (
        profileRef.current &&
        !profileRef.current.contains(event.target)
      ) {
        setOpenProfile(false);
      }

    };

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };

  }, []);

  return (
    <div className="bg-[#ff9800] dark:bg-black text-white flex justify-end items-center px-6 py-3 rounded-xl shadow-sm transition-colors duration-300">

      <div className="flex items-center gap-6">

        {/* 🔔 Notification Bell */}
        <div className="relative" ref={notificationRef}>

          <IoNotificationsOutline
            size={28}
            className="cursor-pointer"
            onClick={() => setOpenNotifications(!openNotifications)}
          />

          <span className="absolute -top-1 -right-2 bg-red-500 text-xs px-1.5 rounded-full">
            3
          </span>

          {openNotifications && (
            <div className="absolute right-0 mt-3 w-64 bg-white dark:bg-black text-black dark:text-gray-200 rounded-lg shadow-xl border border-slate-100 dark:border-gray-800 z-50 transition-colors">

              <h3 className="px-4 py-3 border-b border-slate-50 dark:border-gray-800 font-semibold text-sm">
                Notifications
              </h3>

              <ul className="text-sm">

                <li className="px-4 py-3 hover:bg-slate-50 dark:hover:bg-gray-900 cursor-pointer transition-colors border-b border-slate-50 dark:border-gray-800 last:border-0">
                  New job posted: React Developer
                </li>

                <li className="px-4 py-3 hover:bg-slate-50 dark:hover:bg-gray-900 cursor-pointer transition-colors border-b border-slate-50 dark:border-gray-800 last:border-0">
                  Your application was viewed
                </li>

                <li className="px-4 py-3 hover:bg-slate-50 dark:hover:bg-gray-900 cursor-pointer transition-colors border-b border-slate-50 dark:border-gray-800 last:border-0">
                  Interview scheduled tomorrow
                </li>

              </ul>

            </div>
          )}

        </div>



        {/* 👤 Profile */}
        <div className="relative" ref={profileRef}>

          <FaUserCircle
            size={34}
            className="cursor-pointer"
            onClick={() => setOpenProfile(!openProfile)}
          />

          {openProfile && (
            <div className="absolute right-0 mt-3 w-44 bg-white dark:bg-black text-black dark:text-gray-200 rounded-lg shadow-xl border border-slate-100 dark:border-gray-800 z-50 overflow-hidden transition-colors">

              <ul className="text-sm py-1">

                <li className="hover:bg-slate-50 dark:hover:bg-gray-900 cursor-pointer transition-colors">
                  <Link
                    to="/profile"
                    onClick={() => setOpenProfile(false)}
                    className="block w-full px-4 py-2.5"
                  >
                    My Profile
                  </Link>
                </li>

                {/* [NEW] Logout wired to AuthContext — clears session and redirects */}
                <li
                  className="px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-gray-900 cursor-pointer text-red-500 dark:text-red-400 transition-colors border-t border-slate-50 dark:border-gray-800"
                  onClick={() => { setOpenProfile(false); logout(); navigate('/login'); }}
                >
                  Logout
                </li>

              </ul>

            </div>
          )}

        </div>

      </div>

    </div>
  );
}
