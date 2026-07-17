import React, { useState, useEffect } from "react";
import "./JobTable.css";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

function JobsTable() {
  const [jobsData, setJobsData] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);

  // Server-side pagination & filtering state
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedRole, setSelectedRole] = useState("");
  const [selectedType, setSelectedType] = useState(""); // fresher | experienced
  const [inputPage, setInputPage] = useState("");

  const limit = 10;

  // Fetch Roles for dropdown
  useEffect(() => {
    fetch(`${API_URL}/api/jobs/roles`)
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setRoles(data.roles);
        }
      })
      .catch(err => console.error("Failed to fetch roles:", err));
  }, []);

  // Fetch Jobs whenever page, selectedRole, or selectedType changes
  useEffect(() => {
    setLoading(true);
    let url = `${API_URL}/api/jobs/search?page=${page}&limit=${limit}`;
    if (selectedRole) {
      url += `&role=${encodeURIComponent(selectedRole)}`;
    }
    if (selectedType) {
      url += `&type=${encodeURIComponent(selectedType)}`;
    }

    fetch(url)
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setJobsData(data.jobs);
          setTotalPages(data.totalPages || 1);
        } else {
          setJobsData([]);
        }
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setJobsData([]);
        setLoading(false);
      });
  }, [page, selectedRole, selectedType]);

  /* Visible Pages logic */
  const visiblePages = [];
  for (let i = Math.max(1, page - 2); i <= Math.min(totalPages, page + 2); i++) {
    visiblePages.push(i);
  }

  /* Jump Page */
  const goToPage = () => {
    const num = Number(inputPage);
    if (num >= 1 && num <= totalPages) {
      setPage(num);
      setInputPage("");
    }
  };

  return (
    <div className="jobtable-page">
      <div className="container">
        
        <div className="jobs-header">
          <h2>Discover Your Next Role</h2>
          <p>Explore top opportunities across the tech industry</p>
        </div>

        <div className="filters-container">
          <select
            className="filter-select"
            value={selectedRole}
            onChange={(e) => {
              setSelectedRole(e.target.value);
              setPage(1); // Reset to page 1 on filter change
            }}
          >
            <option value="">🚀 All Tech Roles</option>
            {roles.map(role => (
              <option key={role} value={role}>{role}</option>
            ))}
          </select>

          <select
            className="filter-select"
            value={selectedType}
            onChange={(e) => {
              setSelectedType(e.target.value);
              setPage(1); // Reset to page 1 on filter change
            }}
          >
            <option value="">🎓 All Experience Levels</option>
            <option value="fresher">Fresher / Entry Level</option>
            <option value="experienced">Experienced Professional</option>
          </select>
        </div>

        {loading ? (
          <div className="loading-container">
            <div className="spinner"></div>
            <p>Fetching premium opportunities...</p>
          </div>
        ) : (
          <>
            <div className="table-wrapper">
              <table className="premium-table">
                <thead>
                  <tr>
                    <th>Role</th>
                    <th>Company</th>
                    <th>Location</th>
                    <th>Salary</th>
                    <th>Level</th>
                    <th className="action-col">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {jobsData.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="no-jobs">
                        <h3>No opportunities found for this category right now.</h3>
                        <p>Try adjusting your filters.</p>
                      </td>
                    </tr>
                  ) : (
                    jobsData.map(job => (
                      <tr key={job._id}>
                        <td className="font-bold text-white">{job.role}</td>
                        <td className="text-blue">{job.company}</td>
                        <td>{job.location}</td>
                        <td>{job.salary}</td>
                        <td>
                          <span className={`badge ${job.jobType === 'fresher' ? 'badge-fresher' : 'badge-experienced'}`}>
                            {job.jobType === 'fresher' ? 'Fresher' : 'Experienced'}
                          </span>
                        </td>
                        <td className="action-col">
                          {job.applyLinks && job.applyLinks.length > 0 ? (
                            <a href={job.applyLinks[0]} target="_blank" rel="noreferrer" className="apply-btn">
                              Apply
                            </a>
                          ) : (
                            <button className="apply-btn disabled" disabled>
                              Closed
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {jobsData.length > 0 && totalPages > 1 && (
              <div className="pagination-wrapper">
                <div className="pagination">
                  {/* Previous */}
                  <button 
                    className="page-btn"
                    onClick={() => setPage(page === 1 ? totalPages : page - 1)}
                  >
                    ◀
                  </button>

                  {/* Page Numbers */}
                  {visiblePages.map(p => (
                    <button
                      key={p}
                      className={`page-btn ${page === p ? "active" : ""}`}
                      onClick={() => setPage(p)}
                    >
                      {p}
                    </button>
                  ))}

                  {/* Last Page */}
                  {visiblePages[visiblePages.length - 1] !== totalPages && totalPages > 0 && (
                    <>
                      <span className="page-dots">...</span>
                      <button className="page-btn" onClick={() => setPage(totalPages)}>
                        {totalPages}
                      </button>
                    </>
                  )}

                  {/* Next */}
                  <button 
                    className="page-btn"
                    onClick={() => setPage(page === totalPages ? 1 : page + 1)}
                  >
                    ▶
                  </button>
                </div>

                <div className="jump">
                  <span>Go to page:</span>
                  <input
                    type="number"
                    placeholder="e.g. 5"
                    value={inputPage}
                    onChange={(e) => setInputPage(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && goToPage()}
                  />
                  <button onClick={goToPage}>▶</button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default JobsTable;
