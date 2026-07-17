import React from "react";

const SubFilters = ({ subFilter, setSubFilter }) => {
  return (
    <div className="subfilter-section">
      <button
        className={`subfilter ${subFilter === "Registered" ? "active" : ""}`}
        onClick={() => setSubFilter("Registered")}
      >
        Registered
      </button>

      <button
        className={`subfilter ${subFilter === "Not Register" ? "active" : ""}`}
        onClick={() => setSubFilter("Not Register")}
      >
        Not Register
      </button>
    </div>
  );
};

export default SubFilters;
