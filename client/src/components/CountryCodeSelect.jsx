import React, { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { FiChevronDown, FiSearch } from 'react-icons/fi';

export const countryCodes = [
  { code: "+91", name: "India" },
  { code: "+1", name: "US/Canada" },
  { code: "+44", name: "UK" },
  { code: "+61", name: "Australia" },
  { code: "+81", name: "Japan" },
  { code: "+49", name: "Germany" },
  { code: "+33", name: "France" },
  { code: "+86", name: "China" },
  { code: "+55", name: "Brazil" },
  { code: "+7", name: "Russia" },
  { code: "+27", name: "South Africa" },
  { code: "+82", name: "South Korea" },
  { code: "+39", name: "Italy" },
  { code: "+34", name: "Spain" },
  { code: "+52", name: "Mexico" },
  { code: "+62", name: "Indonesia" },
  { code: "+90", name: "Turkey" },
  { code: "+31", name: "Netherlands" },
  { code: "+41", name: "Switzerland" },
  { code: "+46", name: "Sweden" },
  { code: "+48", name: "Poland" },
  { code: "+32", name: "Belgium" },
  { code: "+43", name: "Austria" },
  { code: "+45", name: "Denmark" },
  { code: "+358", name: "Finland" },
  { code: "+47", name: "Norway" },
  { code: "+351", name: "Portugal" },
  { code: "+30", name: "Greece" },
  { code: "+353", name: "Ireland" },
  { code: "+64", name: "New Zealand" },
  { code: "+65", name: "Singapore" },
  { code: "+60", name: "Malaysia" },
  { code: "+66", name: "Thailand" },
  { code: "+63", name: "Philippines" },
  { code: "+84", name: "Vietnam" },
  { code: "+92", name: "Pakistan" },
  { code: "+880", name: "Bangladesh" },
  { code: "+94", name: "Sri Lanka" },
  { code: "+977", name: "Nepal" },
  { code: "+971", name: "UAE" },
  { code: "+966", name: "Saudi Arabia" },
  { code: "+20", name: "Egypt" },
  { code: "+234", name: "Nigeria" }
];

export default function CountryCodeSelect({ value, onChange, disabled }) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const dropdownRef = useRef(null);

  const [dropdownStyle, setDropdownStyle] = useState({});

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        if (event.target.closest('.country-dropdown-menu')) return;
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useLayoutEffect(() => {
    if (!isOpen) return;

    const updatePosition = () => {
      if (dropdownRef.current) {
        const rect = dropdownRef.current.getBoundingClientRect();
        setDropdownStyle({
          position: 'fixed',
          top: rect.bottom + 4,
          left: rect.left,
          width: '200px',
          zIndex: 99999,
        });
      }
    };

    updatePosition();
    window.addEventListener('scroll', updatePosition, true);
    window.addEventListener('resize', updatePosition);

    return () => {
      window.removeEventListener('scroll', updatePosition, true);
      window.removeEventListener('resize', updatePosition);
    };
  }, [isOpen]);

  const filteredCodes = countryCodes.filter(c => 
    c.name.toLowerCase().includes(search.toLowerCase()) || 
    c.code.includes(search)
  );

  const selected = countryCodes.find(c => c.code === value) || { code: value, name: "Unknown" };

  return (
    <div className="country-code-select" ref={dropdownRef} style={{ width: '75px', flexShrink: 0, alignSelf: 'stretch' }}>
      <div 
        className={`auth-input ${disabled ? 'disabled' : ''}`}
        style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between', 
          cursor: disabled ? 'not-allowed' : 'pointer',
          padding: '0 8px',
          height: '100%',
          boxSizing: 'border-box',
          fontSize: '13px'
        }}
        onClick={() => !disabled && setIsOpen(!isOpen)}
      >
        <span>{selected.code}</span>
        <FiChevronDown size={14} />
      </div>
      
      {isOpen && createPortal(
        <div className="country-dropdown-menu" style={{
          ...dropdownStyle,
          background: 'var(--lc-surface, #282828)',
          border: '1px solid var(--lc-border, #3e3e3e)',
          borderRadius: '8px',
          boxShadow: 'var(--lc-card-shadow, 0 10px 25px -5px rgba(0, 0, 0, 0.5))',
          overflow: 'hidden'
        }}>
          <div style={{ padding: '8px', borderBottom: '1px solid var(--lc-border, #3e3e3e)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FiSearch color="var(--lc-muted, #8a8a8a)" size={14} />
            <input 
              type="text"
              autoFocus
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search..."
              style={{
                background: 'transparent',
                border: 'none',
                outline: 'none',
                color: 'var(--lc-text, #eff1f6)',
                width: '100%',
                fontSize: '13px'
              }}
            />
          </div>
          <div style={{ maxHeight: '180px', overflowY: 'auto' }}>
            {filteredCodes.map((c, i) => (
              <div 
                key={i}
                onClick={() => {
                  onChange(c.code);
                  setIsOpen(false);
                  setSearch("");
                }}
                style={{
                  padding: '8px 10px',
                  cursor: 'pointer',
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: '13px',
                  background: value === c.code ? 'var(--lc-accent-glow, rgba(255, 161, 22, 0.15))' : 'transparent',
                  color: 'var(--lc-text, #eff1f6)'
                }}
                onMouseEnter={(e) => e.target.style.background = 'var(--lc-input-bg, #333)'}
                onMouseLeave={(e) => e.target.style.background = value === c.code ? 'var(--lc-accent-glow, rgba(255, 161, 22, 0.15))' : 'transparent'}
              >
                <span>{c.name}</span>
                <span style={{ color: 'var(--lc-muted, #8a8a8a)' }}>{c.code}</span>
              </div>
            ))}
            {filteredCodes.length === 0 && (
              <div style={{ padding: '10px 12px', fontSize: '13px', color: 'var(--lc-muted, #8a8a8a)', textAlign: 'center' }}>
                No results found
              </div>
            )}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
