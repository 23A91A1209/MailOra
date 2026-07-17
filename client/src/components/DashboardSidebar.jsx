import React, { useState } from "react";
import { FiInbox, FiBriefcase, FiCode, FiMonitor, FiAward, FiChevronDown, FiChevronUp, FiFilter, FiCheckCircle, FiClock, FiFileText } from "react-icons/fi";

const CATEGORY_ICONS = {
  "Internship": <FiAward className="menu-icon" />,
  "Job": <FiBriefcase className="menu-icon" />,
  "Hackathon": <FiCode className="menu-icon" />,
  "Workshops": <FiMonitor className="menu-icon" />
};

const Sidebar = ({ activeFilter, setActiveFilter, subFilter, setSubFilter, isOpen, onClose }) => {
  const [activeMenu, setActiveMenu] = useState(null);

  const toggleMenu = (menu) => {
    setActiveMenu(activeMenu === menu ? null : menu);
    if (activeFilter !== menu) {
      setActiveFilter(menu);
      setSubFilter("");
    }
  };

  const handleSubFilter = (value, e) => {
    e.stopPropagation();
    setSubFilter(value);
    onClose(); 
  };

  const handleMainFilter = (filter) => {
    setActiveFilter(filter);
    setSubFilter("");
    setActiveMenu(null);
    onClose(); 
  };

  return (
    <div className={`sidebar ${isOpen ? "open" : ""}`}>
      <button className="sidebar-close-btn" onClick={onClose}>&#10005;</button>

      <div className="sidebar-header">
        <FiFilter className="filter-icon" />
        <h3 className="filter-title">Filters</h3>
      </div>

      <div className="sidebar-nav">
        {/* ALL */}
        <button
          className={`filter-btn ${activeFilter === "All" ? "active" : ""}`}
          onClick={() => handleMainFilter("All")}
        >
          <div className="filter-btn-content">
            <FiInbox className="menu-icon" />
            <span>All Inbox</span>
          </div>
        </button>

        <div className="sidebar-divider"></div>

        {/* Categories */}
        {Object.keys(CATEGORY_ICONS).map((category) => (
          <div className="menu-group" key={category}>
            <button
              className={`filter-btn ${activeFilter === category ? "active" : ""}`}
              onClick={() => toggleMenu(category)}
            >
              <div className="filter-btn-content">
                {CATEGORY_ICONS[category]}
                <span>{category}</span>
              </div>
              <div className="menu-chevron">
                {activeMenu === category ? <FiChevronUp size={16} /> : <FiChevronDown size={16} />}
              </div>
            </button>

            {/* Submenu */}
            <div className={`submenu-wrapper ${activeMenu === category ? "open" : ""}`}>
              <div className="submenu">
                <div 
                  className={`submenu-item ${subFilter === "notregistered" ? "active" : ""}`} 
                  onClick={(e) => handleSubFilter("notregistered", e)}
                >
                  <FiFileText className="sub-icon" />
                  <span>Not Registered</span>
                </div>
                <div 
                  className={`submenu-item ${subFilter === "registered" ? "active" : ""}`} 
                  onClick={(e) => handleSubFilter("registered", e)}
                >
                  <FiCheckCircle className="sub-icon" />
                  <span>Registered</span>
                </div>
                <div 
                  className={`submenu-item ${subFilter === "inprogress" ? "active" : ""}`} 
                  onClick={(e) => handleSubFilter("inprogress", e)}
                >
                  <FiClock className="sub-icon" />
                  <span>In Progress</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Sidebar;
