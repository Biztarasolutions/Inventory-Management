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
    
    // Force rerender of dropdown position on window resize or scroll
    const handlePositionChange = () => {
      if (isOpen && dropdownRef.current) {
        // Force redraw by toggling state
        setIsOpen(false);
        setTimeout(() => setIsOpen(true), 10);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('resize', handlePositionChange);
    window.addEventListener('scroll', handlePositionChange, true);
    
    // Initial position check
    if (isOpen) {
      setTimeout(() => {
        if (dropdownRef.current) {
          // Make sure dropdown is visible and positioned correctly
          const rect = dropdownRef.current.getBoundingClientRect();
          if (rect.bottom > window.innerHeight) {
            window.scrollTo({
              top: window.scrollY + (rect.bottom - window.innerHeight) + 10,
              behavior: 'smooth'
            });
          }
        }
      }, 100);
    }
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('resize', handlePositionChange);
      window.removeEventListener('scroll', handlePositionChange, true);
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
          position: 'fixed',
          left: dropdownRef.current ? Math.max(5, dropdownRef.current.getBoundingClientRect().left) + 'px' : '5px',
          top: dropdownRef.current ? dropdownRef.current.getBoundingClientRect().bottom + window.scrollY + 'px' : '0px',
          minWidth: dropdownRef.current ? dropdownRef.current.offsetWidth + 'px' : '100%',
          width: 'auto',
          maxWidth: `${Math.min(90, window.innerWidth - 10)}vw`
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
        </div>
      )}
    </div>
  );
};

export default SearchableDropdown;
