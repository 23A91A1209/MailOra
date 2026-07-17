import React, { useState, useEffect } from "react";
import axiosClient from "../../helpers/axiosClient";

const Inbox = ({ selectedFilter, selectedSubFilter }) => {
  const [mails, setMails] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedMail, setSelectedMail] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null); // { mail, event } for confirm dialog

  useEffect(() => {
    const fetchEmails = async () => {
      try {
        setLoading(true);
        const res = await axiosClient.get("/api/emails");
        // Backend wraps list responses in { status, message, data, pagination }.
        // Tolerate both the wrapped shape and a bare array.
        const payload = res.data;
        setMails(Array.isArray(payload) ? payload : payload?.data || []);
      } catch (err) {
        console.error("Failed to fetch emails:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchEmails();
  }, []);

  // Delete handler — shows custom confirmation modal instead of window.confirm()
  const handleDelete = (mail, e) => {
    if (e) e.stopPropagation(); // prevent card click from opening modal
    setDeleteConfirm({ mail });
  };

  // Actual delete — called when user confirms deletion in the modal
  const confirmDelete = async () => {
    if (!deleteConfirm) return;
    const { mail } = deleteConfirm;
    setDeleteConfirm(null);
    setDeletingId(mail._id);
    try {
      await axiosClient.delete(`/api/emails/${mail.type}/${mail._id}`);
      // Optimistically remove from state
      setMails((prev) => prev.filter((m) => m._id !== mail._id));
      // Close detail modal if this mail was open
      if (selectedMail && selectedMail._id === mail._id) {
        setSelectedMail(null);
      }
    } catch (err) {
      console.error("Failed to delete email:", err);
    } finally {
      setDeletingId(null);
    }
  };

  // Filter logic
  let filtered = mails;

  if (selectedFilter !== "All") {
    filtered = filtered.filter((mail) => {
      let filterCategory = selectedFilter.toLowerCase();
      if (filterCategory === "workshops") filterCategory = "workshop";
      return mail.category.toLowerCase() === filterCategory;
    });
  }

  if (selectedSubFilter) {
    if (selectedSubFilter === "notregistered") {
      filtered = filtered.filter((mail) => mail.type === "registration");
    } else {
      filtered = filtered.filter((mail) => mail.type === selectedSubFilter);
    }
  }

  if (loading) {
    return <div className="inbox-container"><div className="inbox-header"><h2>Loading...</h2></div></div>;
  }

  const formatFrom = (fromStr) => {
    if (!fromStr) return "Unknown Sender";
    const match = fromStr.match(/^([^<]+)/);
    return match ? match[1].replace(/"/g, '').trim() : fromStr;
  };

  return (
    <div className="inbox-container">
      <div className="inbox-header" style={{ marginBottom: '20px' }}>
        <h2 style={{ margin: 0 }}>Inbox {filtered.length > 0 && `(${filtered.length})`}</h2>
      </div>

      <div className="mail-list" style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '4px' }}>
        {filtered.length === 0 ? (
          <div className="no-mails" style={{ textAlign: 'center', padding: '40px', color: '#888' }}>
            <h3>No messages found</h3>
            <p>Try changing your filters. New emails sync automatically.</p>
          </div>
        ) : (
          filtered.map((mail) => (
            <div 
              className="mail-item" 
              key={mail._id} 
              onClick={() => setSelectedMail(mail)}
              style={{ 
                background: 'var(--card-bg, #fff)', 
                border: '1px solid var(--border-color, #eee)', 
                padding: '16px', 
                borderRadius: '8px',
                cursor: 'pointer',
                transition: 'transform 0.2s, box-shadow 0.2s',
                boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
                opacity: deletingId === mail._id ? 0.5 : 1,
                position: 'relative'
              }}
              onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 4px 8px rgba(0,0,0,0.06)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.02)'; }}
            >
              <div className="mail-item-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
                 <h3 className="mail-name" style={{ fontWeight: '600', fontSize: '1.05em', margin: 0, color: 'var(--text-primary)', paddingRight: '12px', lineHeight: '1.3', flex: 1 }}>
                   {mail.subject || "(No Subject)"}
                 </h3>
                 <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
                   <span className="mail-date" style={{ fontSize: '0.8em', color: 'var(--text-secondary)', whiteSpace: 'nowrap', fontWeight: '500' }}>
                     {new Date(mail.receivedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                   </span>
                   <button
                     onClick={(e) => handleDelete(mail, e)}
                     disabled={deletingId === mail._id}
                     title="Delete email"
                     style={{
                       background: 'none',
                       border: 'none',
                       cursor: deletingId === mail._id ? 'wait' : 'pointer',
                       padding: '4px',
                       borderRadius: '4px',
                       fontSize: '1.1em',
                       color: 'var(--text-secondary, #999)',
                       transition: 'color 0.2s, background 0.2s',
                       lineHeight: 1
                     }}
                     onMouseEnter={(e) => { e.currentTarget.style.color = '#e53e3e'; e.currentTarget.style.background = 'rgba(229,62,62,0.08)'; }}
                     onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-secondary, #999)'; e.currentTarget.style.background = 'none'; }}
                   >
                     🗑️
                   </button>
                 </div>
              </div>
              
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: '10px' }}>
                <span style={{ fontSize: '0.85em', color: 'var(--text-primary)', fontWeight: '500', background: 'var(--hover-bg, #f5f5f5)', padding: '2px 8px', borderRadius: '12px' }}>
                  {formatFrom(mail.from)}
                </span>
              </div>

              <p className="preview" style={{ 
                color: 'var(--text-secondary, #666)', 
                lineHeight: '1.5', 
                fontSize: '0.9em',
                margin: '0 0 12px 0',
                display: '-webkit-box',
                WebkitLineClamp: '2',
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
                textOverflow: 'ellipsis'
              }}>
                {mail.matter || mail.snippet || "No preview available..."}
              </p>

              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <span className={`status-badge ${mail.category}`} style={{ background: 'var(--hover-bg, #eee)', border: '1px solid var(--border-color)', padding: '4px 10px', borderRadius: '12px', fontSize: '0.75em', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: '600', color: 'var(--text-primary)' }}>
                  {mail.category}
                </span>
                <span className={`status-badge ${mail.type}`} style={{ background: 'var(--primary-color)', color: 'white', padding: '4px 10px', borderRadius: '12px', fontSize: '0.75em', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: '600' }}>
                  {mail.type}
                </span>
                {mail.deadlineDate && (
                  <span style={{ fontSize: '0.75em', color: '#e53e3e', fontWeight: 'bold', marginLeft: 'auto' }}>
                    Due: {new Date(mail.deadlineDate).toLocaleDateString()}
                  </span>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {selectedMail && (
        <div className="modal-overlay" onClick={() => setSelectedMail(null)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <h3 style={{ marginBottom: '8px' }}>{selectedMail.subject}</h3>
            <p style={{ fontSize: '0.9em', color: '#666', marginBottom: '16px' }}>
              <strong>From:</strong> {selectedMail.from} <br/>
              <strong>Date:</strong> {new Date(selectedMail.receivedAt).toLocaleString()}
            </p>

            {/* AI Summary Display */}
            {selectedMail.matter && (
              <div style={{ marginBottom: '16px', padding: '12px', background: 'var(--primary-color-alpha, rgba(255, 152, 0, 0.1))', borderLeft: '4px solid var(--primary-color)', borderRadius: '4px' }}>
                <h4 style={{ margin: '0 0 8px 0', color: 'var(--text-primary)' }}>✨ AI Summary</h4>
                <p style={{ margin: 0, color: 'var(--text-primary)', lineHeight: '1.5', fontSize: '0.95em' }}>{selectedMail.matter}</p>
              </div>
            )}

            {/* Action Links Display */}
            {selectedMail.links && selectedMail.links.length > 0 && (
              <div style={{ marginBottom: '16px' }}>
                <h4 style={{ margin: '0 0 8px 0', color: 'var(--text-primary)' }}>🔗 Application Links</h4>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {selectedMail.links.map((link, idx) => (
                    <a key={idx} href={link} target="_blank" rel="noreferrer" style={{ background: 'var(--primary-color)', color: '#fff', padding: '8px 14px', borderRadius: '6px', textDecoration: 'none', fontSize: '0.85em', fontWeight: 'bold', transition: 'background 0.2s' }}>
                      Apply Link {idx + 1}
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* Show deadline if it exists */}
            {selectedMail.deadlineDate && (
              <p style={{ marginBottom: '16px', color: '#e53e3e', fontWeight: 'bold' }}>
                ⚠️ Deadline: {new Date(selectedMail.deadlineDate).toLocaleDateString()}
              </p>
            )}

            {/* Full Original Email (Hidden behind Details/Summary) */}
            <div className="modal-body" style={{ maxHeight: '250px', overflowY: 'auto', padding: '10px', background: 'var(--hover-bg, rgba(255,255,255,0.05))', borderRadius: '6px' }}>
              <details>
                 <summary style={{ cursor: 'pointer', fontWeight: 'bold', color: 'var(--text-secondary)' }}>View Full Original Email</summary>
                 <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit', margin: '10px 0 0 0', color: 'var(--text-primary)', fontSize: '0.85em', wordBreak: 'break-word' }}>
                   {selectedMail.body || selectedMail.snippet}
                 </pre>
              </details>
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
              <button 
                onClick={() => handleDelete(selectedMail)} 
                disabled={deletingId === selectedMail._id}
                style={{ 
                  flex: 1, 
                  padding: '10px', 
                  border: '1px solid #e53e3e', 
                  background: 'transparent', 
                  color: '#e53e3e', 
                  borderRadius: '6px', 
                  cursor: 'pointer', 
                  fontWeight: '600',
                  fontSize: '0.9em',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = '#e53e3e'; e.currentTarget.style.color = '#fff'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#e53e3e'; }}
              >
                {deletingId === selectedMail._id ? "Deleting..." : "🗑️ Delete"}
              </button>
              <button className="close-btn" onClick={() => setSelectedMail(null)} style={{ flex: 1 }}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Delete Confirmation Modal (replaces window.confirm) ─── */}
      {deleteConfirm && (
        <div className="modal-overlay" onClick={() => setDeleteConfirm(null)}>
          <div
            className="modal-box"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '420px', textAlign: 'center', padding: '32px' }}
          >
            <div style={{ fontSize: '2.5em', marginBottom: '12px' }}>⚠️</div>
            <h3 style={{ margin: '0 0 8px 0', fontSize: '1.2em' }}>Confirm Delete</h3>
            <p style={{ color: 'var(--text-secondary, #666)', margin: '0 0 6px 0', lineHeight: '1.5', fontSize: '0.95em' }}>
              Delete <strong>"{deleteConfirm.mail.subject || '(No Subject)'}"</strong>?
            </p>
            <p style={{ color: 'var(--text-secondary, #888)', margin: '0 0 24px 0', fontSize: '0.85em' }}>
              This will also cancel any pending WhatsApp reminders for this email.
            </p>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={() => setDeleteConfirm(null)}
                style={{
                  flex: 1, padding: '10px', border: '1px solid var(--border-color, #ddd)',
                  background: 'transparent', color: 'var(--text-primary)', borderRadius: '8px',
                  cursor: 'pointer', fontWeight: '600', fontSize: '0.9em', transition: 'all 0.2s'
                }}
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                style={{
                  flex: 1, padding: '10px', border: 'none',
                  background: '#e53e3e', color: '#fff', borderRadius: '8px',
                  cursor: 'pointer', fontWeight: '600', fontSize: '0.9em', transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = '#c53030'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = '#e53e3e'; }}
              >
                🗑️ Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Inbox;
