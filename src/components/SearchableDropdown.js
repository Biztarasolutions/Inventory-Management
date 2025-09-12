import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useFloating, shift, offset } from '@floating-ui/react-dom';

const SearchableDropdown = ({ 
  value, 
  onChange, 
  options, 
  placeholder = "Select...", 
  className = "" 
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
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
    setSearchTerm('');
  }, [onChange]);

  const handleInputClick = useCallback(() => {
    setIsOpen(prev => !prev);
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  // Outside click handling with stable ref
  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
        setSearchTerm('');
      }
    }
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []); // Only run once on mount

  // Filter options based on search term
  const filteredOptions = options.filter(option => {
    // Handle both string options and object options with label/value
    if (typeof option === 'string') {
      return option.toLowerCase().includes(searchTerm.toLowerCase());
    } else if (option && option.label) {
      return option.label.toLowerCase().includes(searchTerm.toLowerCase());
    }
    return false;
  });

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <div
        ref={refs.setReference}
        onMouseDown={handleInputClick}
        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md shadow-sm bg-white cursor-pointer hover:border-gray-400 focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500"
      >
        <div className="flex justify-between items-center">
          <span className={`${value ? 'text-gray-900' : 'text-gray-500'}`}>
            {value ? (typeof value === 'object' ? value.value : value) : placeholder}
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
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          {/* Options List */}
          <div className="max-h-48 overflow-y-auto" style={{ overflowX: 'visible' }}>
            {filteredOptions.length > 0 ? (
              filteredOptions.map((option, index) => (
                <div
                  key={index}
                  onMouseDown={() => handleSelect(option)}
                  data-dropdown-option
                  className="px-3 py-2 text-sm hover:bg-gray-100 cursor-pointer text-gray-900 whitespace-nowrap"
                >
                  {typeof option === 'string' ? option : (
                    <div className="flex flex-col">
                      <span className="font-medium">{option.value}</span>
                      <span className="text-xs text-gray-500">{option.label}</span>
                    </div>
                  )}
                </div>
              ))
            ) : (
              <div className="px-3 py-2 text-sm text-gray-500 text-center">
                No options found
              </div>
            )}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default SearchableDropdown;
