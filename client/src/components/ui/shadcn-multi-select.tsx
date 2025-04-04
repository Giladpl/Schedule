import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { cn } from "@/lib/utils";
import { Check, ChevronsUpDown, X } from "lucide-react";
import * as React from "react";

export type OptionType = {
  value: string;
  label: string;
};

interface MultiSelectProps {
  options: OptionType[];
  selected: string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
  emptyMessage?: string;
  className?: string;
  disabled?: boolean;
}

export function ShadcnMultiSelect({
  options,
  selected,
  onChange,
  placeholder = "בחר אפשרויות...",
  emptyMessage = "אין אפשרויות זמינות",
  className,
  disabled = false,
}: MultiSelectProps) {
  const [open, setOpen] = React.useState(false);
  const [inputValue, setInputValue] = React.useState("");
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [selectedValues, setSelectedValues] = React.useState<OptionType[]>([]);

  // Update selected options when selected prop changes
  React.useEffect(() => {
    const selectedOptions = options.filter((option) =>
      selected.includes(option.value)
    );
    setSelectedValues(selectedOptions);
  }, [selected, options]);

  // Handle toggling selection
  const handleSelect = React.useCallback(
    (option: OptionType) => {
      const isSelected = selected.includes(option.value);

      if (isSelected) {
        onChange(selected.filter((value) => value !== option.value));
      } else {
        onChange([...selected, option.value]);
      }
    },
    [onChange, selected]
  );

  // Handle removing a selected option
  const handleRemove = React.useCallback(
    (value: string) => {
      onChange(selected.filter((item) => item !== value));
    },
    [onChange, selected]
  );

  // Filter options based on input
  const filteredOptions = React.useMemo(() => {
    if (!inputValue) return options;

    return options.filter((option) =>
      option.label.toLowerCase().includes(inputValue.toLowerCase())
    );
  }, [options, inputValue]);

  // Handle when component loses focus
  const handleBlur = React.useCallback((e: React.FocusEvent) => {
    // Don't close if still within the component
    if (e.currentTarget.contains(e.relatedTarget as Node)) {
      return;
    }
    setOpen(false);
  }, []);

  return (
    <div className={cn("relative", className)} dir="rtl" onBlur={handleBlur}>
      <div className="relative">
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          onClick={() => {
            setOpen(!open);
            // Focus the input when opening
            if (!open && inputRef.current) {
              setTimeout(() => inputRef.current?.focus(), 50);
            }
          }}
          className={cn(
            "w-full justify-between px-3 py-2 h-auto min-h-10 border-[#dadce0] text-right",
            className
          )}
        >
          <div className="flex flex-wrap gap-1 items-center justify-end mr-1">
            {selectedValues.length > 0 ? (
              selectedValues.length <= 3 ? (
                // Show individual badges when 3 or fewer items selected
                selectedValues.map((option) => (
                  <Badge
                    key={option.value}
                    variant="secondary"
                    className="text-xs py-0.5 px-2 mr-1"
                  >
                    {option.label}
                    <button
                      className="mr-1 outline-none focus:outline-none"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemove(option.value);
                      }}
                      type="button"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))
              ) : (
                // Show count when more than 3 items selected
                <Badge variant="secondary" className="mr-1">
                  {selectedValues.length} נבחרו
                </Badge>
              )
            ) : (
              <span className="text-sm text-muted-foreground">
                {placeholder}
              </span>
            )}
          </div>
          <ChevronsUpDown className="h-4 w-4 opacity-50 shrink-0 ml-2" />
        </Button>

        {open && (
          <div className="absolute mt-1 w-full z-50 bg-white rounded-md border shadow-lg">
            <Command className="rounded-lg border shadow-md" dir="rtl">
              <div
                className="flex items-center border-b px-3"
                cmdk-input-wrapper=""
              >
                <input
                  ref={inputRef}
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  className="flex h-10 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50 text-right dir-rtl"
                  placeholder="חפש..."
                  dir="rtl"
                />
              </div>
              <CommandList>
                <CommandEmpty className="py-6 text-center text-sm">
                  {emptyMessage}
                </CommandEmpty>
                <CommandGroup className="max-h-64 overflow-auto px-1">
                  {filteredOptions.map((option) => {
                    const isSelected = selected.includes(option.value);
                    return (
                      <CommandItem
                        key={option.value}
                        onSelect={() => handleSelect(option)}
                        className={cn(
                          "flex flex-row-reverse justify-between px-2 py-2 cursor-pointer hover:bg-gray-100 aria-selected:bg-gray-100 text-right",
                          isSelected ? "bg-gray-50" : ""
                        )}
                      >
                        <div className="flex flex-row-reverse items-center justify-between w-full">
                          <span>{option.label}</span>
                          <Check
                            className={cn(
                              "h-4 w-4 ml-2",
                              isSelected ? "opacity-100" : "opacity-0"
                            )}
                          />
                        </div>
                      </CommandItem>
                    );
                  })}
                </CommandGroup>
              </CommandList>
            </Command>
          </div>
        )}
      </div>
    </div>
  );
}
