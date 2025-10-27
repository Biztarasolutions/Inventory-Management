import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useFloating, shift, offset } from '@floating-ui/react-dom';

const SearchableDropdown = ({ 
  value, 
  onChange, 
  options = [], 
  placeholder = "Select...", 
  className = "",
  allowCustomInput = false,
  onInputChange,
  // optional external trigger: when this value changes, close the floating panel.
  closeTrigger,
  // optional callback invoked when input is clicked/opened
  onOpen
}) => {
  const [isOpen, setIsOpen] = useState(false);
  useEffect(() => {
    // TEMP DEBUG: Log options prop for diagnosis
    console.log('SearchableDropdown options:', options);
  }, [options]);
  useEffect(() => {
    // TEMP DEBUG: Log options prop for diagnosis
    console.log('SearchableDropdown options:', options);
  }, [options]);
  // Ensure searchTerm is always a string to avoid non-string runtime errors
  const [searchTerm, setSearchTerm] = useState(value ? (typeof value === 'object' ? String(value.value) : String(value)) : '');
  const containerRef = useRef(null);
  const inputRef = useRef(null);
  const { refs, floatingStyles } = useFloating({
    placement: 'bottom-start',
    middleware: [offset(4), shift()],
  });

  // Close dropdown when clicking outside and handle window resize
  // Memoized handlers to prevent unnecessary rerenders
  const handleSelect = useCallback((selectedOption) => {
    onChange(selectedOption);
    setIsOpen(false);
    setSearchTerm(selectedOption && typeof selectedOption === 'object' ? selectedOption.value : selectedOption || '');
  }, [onChange]);

  const handleInputClick = useCallback(() => {
    if (onOpen) {
      try { onOpen(); } catch (err) { /* swallow */ }
    }
    setIsOpen(prev => !prev);
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus();
      }
    }, 0);
  }, [onOpen]);

  // Outside click handling with stable ref
  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        // If custom input allowed and there's a search term that doesn't match existing options,
        // treat clicking outside as confirming the custom option (so it gets "added").
        try {
          const raw = searchTerm || '';
          if (allowCustomInput && raw) {
            const exists = options.some(opt => {
              if (typeof opt === 'string') return String(opt) === String(raw);
              return String(opt.value) === String(raw);
            });
            if (!exists) {
              handleSelect({ label: raw, value: raw });
            }
          }
        } catch (err) {
          // ignore any comparison errors
        }
        setIsOpen(false);
        setSearchTerm('');
      }
    }
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []); // Only run once on mount

  // If the parent changes the selected value (for example when a 10-digit phone
  // is detected and the parent programmatically sets the value), close the
  // dropdown and synchronize the search term so the floating input doesn't
  // block other UI elements (like the Name field) beneath it.
  useEffect(() => {
    // Close dropdown when value prop changes
    setIsOpen(false);
    setSearchTerm(value ? (typeof value === 'object' ? String(value.value) : String(value)) : '');
  }, [value]);

  // Close dropdown when an external closeTrigger toggles (used by parents to
  // force-close the floating panel after auto-detection like a 10-digit phone).
  useEffect(() => {
    if (typeof closeTrigger !== 'undefined') {
      setIsOpen(false);
    }
  }, [closeTrigger]);

  // Filter options based on search term — normalize everything to strings first
  const lowerTerm = (searchTerm || '').toString().toLowerCase();
  let filteredOptions = options.filter(option => {
    // Handle both string options and object options with label/value
    if (typeof option === 'string') {
      return option.toString().toLowerCase().includes(lowerTerm);
    } else if (option && option.label != null) {
      return String(option.label).toLowerCase().includes(lowerTerm);
    } else if (option && option.value != null) {
      return String(option.value).toLowerCase().includes(lowerTerm);
    }
    return false;
  });

  // Deduplicate filteredOptions by value
  if (filteredOptions.length > 0 && typeof filteredOptions[0] === 'object') {
    const seen = new Set();
    filteredOptions = filteredOptions.filter(opt => {
      if (seen.has(opt.value)) return false;
      seen.add(opt.value);
      return true;
    });
  } else if (filteredOptions.length > 0 && typeof filteredOptions[0] === 'string') {
    filteredOptions = Array.from(new Set(filteredOptions));
  }

  // If custom input is allowed and searchTerm is not in options, add it as a selectable option
  let customOption = null;
  if (allowCustomInput && searchTerm && !filteredOptions.some(opt => (typeof opt === 'string' ? opt : opt.value) === searchTerm)) {
    customOption = { label: searchTerm, value: searchTerm };
  }

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <div
        ref={refs.setReference}
        onMouseDown={handleInputClick}
        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md shadow-sm bg-white cursor-pointer hover:border-gray-400 focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500"
      >
        <div className="flex justify-between items-center">
          <span className={`${value ? 'text-gray-900' : 'text-gray-500'}`}>
            {value ? (typeof value === 'object' ? (value.label || value.value) : value) : placeholder}
          </span>
          <svg
            className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>

      {isOpen && createPortal(
        <div
          ref={refs.setFloating}
          style={{
            ...floatingStyles,
            zIndex: 99999,
            width: refs.reference ? refs.reference.offsetWidth : undefined,
            background: 'white',
            border: '1px solid #d1d5db',
            borderRadius: '0.375rem',
            boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
            maxHeight: '15rem',
            overflow: 'auto'
          }}
        >
          {/* Search Input */}
          <div className="p-2 border-b border-gray-200">
            <input
              ref={inputRef}
              type="text"
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                if (allowCustomInput && onInputChange) onInputChange(e.target.value);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  if (customOption) {
                    handleSelect(customOption);
                  } else if (filteredOptions && filteredOptions.length > 0) {
                    handleSelect(filteredOptions[0]);
                  }
                }
              }}
              className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          {/* Options List */}
          <div className="max-h-48 overflow-y-auto" style={{ overflowX: 'visible' }}>
            {customOption && (
              <div
                key={customOption.value}
                onMouseDown={() => handleSelect(customOption)}
                data-dropdown-option
                className="px-3 py-2 text-sm hover:bg-blue-100 cursor-pointer text-blue-700 whitespace-nowrap font-semibold"
              >
                Add "{customOption.value}"
              </div>
            )}
            {filteredOptions.length > 0 ? (
              filteredOptions.map((option, index) => (
                <div
                  key={index}
                  onMouseDown={() => handleSelect(option)}
                  data-dropdown-option
                  className="px-3 py-2 text-sm hover:bg-gray-100 cursor-pointer text-gray-900 whitespace-nowrap"
                >
                  {typeof option === 'string' ? option : (option.label || option.value)}
                </div>
              ))
            ) : (
              !customOption && <div className="px-3 py-2 text-sm text-gray-500 text-center">No options found</div>
            )}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default SearchableDropdown;
