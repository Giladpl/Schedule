import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
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

export function MultiSelect({
  options,
  selected,
  onChange,
  placeholder = "בחר אפשרויות...",
  emptyMessage = "אין אפשרויות זמינות",
  className,
  disabled = false,
}: MultiSelectProps) {
  const [open, setOpen] = React.useState(false);

  const handleUnselect = (value: string) => {
    onChange(selected.filter((item) => item !== value));
  };

  const handleSelect = (value: string) => {
    if (selected.includes(value)) {
      handleUnselect(value);
    } else {
      onChange([...selected, value]);
    }
  };

  // Get labels for selected values
  const selectedLabels = selected.map((value) => {
    const option = options.find((option) => option.value === value);
    return option ? option.label : value;
  });

  // Handle RTL direction for the popover
  const containerRef = React.useRef<HTMLDivElement>(null);

  // Force the dropdown to stay in view
  React.useEffect(() => {
    if (!containerRef.current) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node) &&
        open
      ) {
        e.stopPropagation();
        setTimeout(() => setOpen(false), 100);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  return (
    <div ref={containerRef} className="w-full relative" dir="rtl">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className={cn(
              "w-full justify-between px-3 py-2 h-auto min-h-10 border-[#dadce0] text-right",
              className
            )}
            disabled={disabled}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setOpen(!open);
            }}
          >
            <div className="flex flex-wrap gap-1 items-center justify-end">
              {selected.length > 0 ? (
                selected.length <= 3 ? (
                  // Show individual badges when 3 or fewer items selected
                  selected.map((value) => {
                    const label = options.find(
                      (option) => option.value === value
                    )?.label;
                    return (
                      <Badge
                        key={value}
                        variant="secondary"
                        className="text-xs mr-1 py-0.5 px-2"
                      >
                        {label || value}
                        <button
                          className="mr-1 outline-none focus:outline-none"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleUnselect(value);
                          }}
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    );
                  })
                ) : (
                  // Show count when more than 3 items selected
                  <Badge variant="secondary" className="mr-1">
                    {selected.length} נבחרו
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
        </PopoverTrigger>
        <PopoverContent
          className="w-full p-0"
          align="start"
          side="bottom"
          style={{ zIndex: 100 }}
          sideOffset={5}
        >
          <Command dir="rtl" className="text-right">
            <CommandInput
              placeholder="חפש..."
              className="h-9 dir-rtl text-right"
            />
            <CommandEmpty className="text-right">{emptyMessage}</CommandEmpty>
            <CommandGroup className="max-h-64 overflow-auto">
              {options.map((option) => (
                <CommandItem
                  key={option.value}
                  value={option.value}
                  onSelect={(currentValue) => {
                    handleSelect(option.value);
                    // Keep the popover open after selection
                    setTimeout(() => setOpen(true), 10);
                  }}
                  className="text-right flex-row-reverse justify-between cursor-pointer"
                >
                  <span>{option.label}</span>
                  <Check
                    className={cn(
                      "ml-2 h-4 w-4",
                      selected.includes(option.value)
                        ? "opacity-100"
                        : "opacity-0"
                    )}
                  />
                </CommandItem>
              ))}
            </CommandGroup>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}
