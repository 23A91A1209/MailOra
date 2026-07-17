import React, { useState } from "react";
import Sidebar from "../../components/DashboardSidebar";
import Inbox from "./Inbox";
import "./dashboard.css";

const Dashboard = () => {
  const [activeFilter, setActiveFilter] = useState("All");
  const [subFilter, setSubFilter] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const closeSidebar = () => setSidebarOpen(false);

  return (
    <div className="dashboard-container">
      {/* Mobile top bar */}
      <div className="mobile-topbar">
        <button className="hamburger" onClick={() => setSidebarOpen(true)}>
          &#9776;
        </button>
        <span className="mobile-title">Dashboard</span>
      </div>

      {/* Overlay (mobile only) */}
      <div
        className={`sidebar-overlay ${sidebarOpen ? "show" : ""}`}
        onClick={closeSidebar}
      />

      <div className="dashboard-body">
        <Sidebar
          activeFilter={activeFilter}
          setActiveFilter={setActiveFilter}
          subFilter={subFilter}
          setSubFilter={setSubFilter}
          isOpen={sidebarOpen}
          onClose={closeSidebar}
        />

        <Inbox
          selectedFilter={activeFilter}
          selectedSubFilter={subFilter}
        />
      </div>
    </div>
  );
};

export default Dashboard;
