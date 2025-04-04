import { X } from "lucide-react";
import React, { useEffect, useRef, useState } from "react";
import { Badge } from "./badge";

export interface MultiSelectOption {
  value: string;
  label: string;
}

export interface SimpleMultiSelectProps {
  options: MultiSelectOption[];
  selected: string[];
  onChange: (selected: string[]) => void;
  placeholder?: string;
  disabled?: boolean;
}

export function SimpleMultiSelect({
  options,
  selected,
  onChange,
  placeholder = "בחר...",
  disabled = false,
}: SimpleMultiSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Reset search term when dropdown closes
  useEffect(() => {
    if (!isOpen) {
      setSearchTerm("");
    }
  }, [isOpen]);

  const toggleOption = (value: string) => {
    const newSelected = selected.includes(value)
      ? selected.filter((item) => item !== value)
      : [...selected, value];
    onChange(newSelected);
  };

  const removeOption = (e: React.MouseEvent, value: string) => {
    e.stopPropagation();
    onChange(selected.filter((item) => item !== value));
  };

  const filteredOptions = options.filter((option) =>
    option.label.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div
      className={`relative w-full border rounded-md text-right dropdown-container ${
        isOpen ? "open" : ""
      }`}
      ref={containerRef}
      dir="rtl"
    >
      <div
        className={`min-h-10 p-2 flex flex-wrap gap-1 items-center cursor-pointer ${
          disabled ? "bg-gray-100 opacity-50" : "bg-white"
        }`}
        onClick={() => !disabled && setIsOpen(!isOpen)}
      >
        {selected.length > 0 ? (
          selected.map((value) => {
            const option = options.find((o) => o.value === value);
            return (
              <Badge
                key={value}
                className="flex items-center gap-1 rtl:flex-row-reverse badge-container"
              >
                {option?.label}
                <span
                  className="cursor-pointer rtl:mr-1 ltr:ml-1 hover:bg-gray-200 rounded-full p-0.5"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (!disabled) removeOption(e, value);
                  }}
                >
                  <X className="h-3 w-3" />
                </span>
              </Badge>
            );
          })
        ) : (
          <span className="text-gray-500">{placeholder}</span>
        )}
      </div>

      {isOpen && !disabled && (
        <div
          ref={dropdownRef}
          className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-[100] dropdown-content"
          style={{
            width: containerRef.current?.offsetWidth
              ? `${containerRef.current.offsetWidth}px`
              : "100%",
          }}
        >
          <div className="p-2 border-b sticky top-0 bg-white z-10 select-container">
            <input
              type="text"
              className="w-full p-2 border rounded"
              placeholder="חפש..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onClick={(e) => e.stopPropagation()}
              dir="rtl"
              autoFocus
            />
          </div>
          <div
            className="overflow-auto hide-scrollbar styled-scrollbar max-h-[200px]"
            style={{
              scrollbarWidth: "none",
              msOverflowStyle: "none",
            }}
          >
            {filteredOptions.map((option) => (
              <div
                key={option.value}
                className={`p-2 cursor-pointer hover:bg-gray-100 flex justify-between items-center dropdown-option ${
                  selected.includes(option.value) ? "option-selected" : ""
                }`}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  toggleOption(option.value);
                }}
              >
                <span>{option.label}</span>
                {selected.includes(option.value) && (
                  <span className="text-blue-600 font-bold">✓</span>
                )}
              </div>
            ))}
            {filteredOptions.length === 0 && (
              <div className="p-2 text-gray-500 text-center">אין תוצאות</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
