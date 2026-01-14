"use client";

import { useState, useRef, useEffect } from "react";

interface MultiSelectOption {
  value: string;
  label: string;
  color?: string;
}

interface MultiSelectProps {
  options: MultiSelectOption[];
  selected: string[];
  onChange: (selected: string[]) => void;
  placeholder: string;
  label?: string;
}

export default function MultiSelect({
  options,
  selected,
  onChange,
  placeholder,
  label,
}: MultiSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Filter options by search term
  const filteredOptions = options.filter(opt =>
    opt.label.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Toggle selection
  const toggleOption = (value: string) => {
    if (selected.includes(value)) {
      onChange(selected.filter(v => v !== value));
    } else {
      onChange([...selected, value]);
    }
  };

  // Select all visible options
  const selectAll = () => {
    const allValues = filteredOptions.map(opt => opt.value);
    const newSelected = [...new Set([...selected, ...allValues])];
    onChange(newSelected);
  };

  // Clear all selections
  const clearAll = () => {
    onChange([]);
    setSearchTerm("");
  };

  // Get display text
  const getDisplayText = () => {
    if (selected.length === 0) return placeholder;
    if (selected.length === 1) {
      const option = options.find(opt => opt.value === selected[0]);
      return option?.label || selected[0];
    }
    return `${selected.length} selected`;
  };

  return (
    <div className="multi-select" ref={dropdownRef}>
      {label && <label className="multi-select-label">{label}</label>}

      <button
        type="button"
        className={`multi-select-trigger ${isOpen ? "open" : ""} ${selected.length > 0 ? "has-selection" : ""}`}
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className="multi-select-text">{getDisplayText()}</span>
        <span className="multi-select-arrow">{isOpen ? "▲" : "▼"}</span>
      </button>

      {selected.length > 0 && (
        <button
          type="button"
          className="multi-select-clear"
          onClick={(e) => {
            e.stopPropagation();
            clearAll();
          }}
          title="Clear all"
        >
          ×
        </button>
      )}

      {isOpen && (
        <div className="multi-select-dropdown">
          {/* Search input */}
          <div className="multi-select-search">
            <input
              type="text"
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onClick={(e) => e.stopPropagation()}
            />
          </div>

          {/* Actions */}
          <div className="multi-select-actions">
            <button type="button" onClick={selectAll}>Select All</button>
            <button type="button" onClick={clearAll}>Clear</button>
          </div>

          {/* Options list */}
          <div className="multi-select-options">
            {filteredOptions.length === 0 ? (
              <div className="multi-select-empty">No options found</div>
            ) : (
              filteredOptions.map(option => (
                <label
                  key={option.value}
                  className={`multi-select-option ${selected.includes(option.value) ? "selected" : ""}`}
                >
                  <input
                    type="checkbox"
                    checked={selected.includes(option.value)}
                    onChange={() => toggleOption(option.value)}
                  />
                  {option.color && (
                    <span
                      className="option-color"
                      style={{ backgroundColor: option.color }}
                    />
                  )}
                  <span className="option-label">{option.label}</span>
                </label>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
