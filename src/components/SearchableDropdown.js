import React, { useState, useRef, useEffect } from 'react';

const SearchableDropdown = ({ 
  value, 
  onChange, 
  options, 
  placeholder = "Select...", 
  className = "" 
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const dropdownRef = useRef(null);
  const inputRef = useRef(null);

  // Close dropdown when clicking outside and handle window resize
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
        setSearchTerm('');
      }
    };
    
    // Force rerender of dropdown position on window resize
    const handleResize = () => {
      if (isOpen) {
        // Force rerender by toggling state
        setIsOpen(false);
        setTimeout(() => setIsOpen(true), 10);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('resize', handleResize);
    window.addEventListener('scroll', handleResize, true);
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('scroll', handleResize, true);
    };
  }, [isOpen]);

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

  const handleSelect = (selectedOption) => {
    onChange(selectedOption);
    setIsOpen(false);
    setSearchTerm('');
  };

  const handleInputClick = () => {
    setIsOpen(true);
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <div
        onClick={handleInputClick}
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

      {isOpen && (
        <div className="fixed z-[9999] w-max min-w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto" style={{
          left: dropdownRef.current ? dropdownRef.current.getBoundingClientRect().left + 'px' : '0px',
          top: dropdownRef.current ? dropdownRef.current.getBoundingClientRect().bottom + window.scrollY + 'px' : '0px',
          minWidth: dropdownRef.current ? dropdownRef.current.offsetWidth + 'px' : '100%',
          maxWidth: '90vw'
        }}>
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
                  onClick={() => handleSelect(option)}
                  className="px-3 py-2 text-sm hover:bg-gray-100 cursor-pointer text-gray-900 whitespace-nowrap"
                >
                  {typeof option === 'string' ? option : option.value}
                </div>
              ))
            ) : (
              <div className="px-3 py-2 text-sm text-gray-500 text-center">
                No options found
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default SearchableDropdown;
