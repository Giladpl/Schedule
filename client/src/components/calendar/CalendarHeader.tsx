import { Button } from "@/components/ui/button";
import { formatDateRange } from "@/lib/utils";
import { useEffect, useRef, useState } from "react";

interface CalendarHeaderProps {
  currentViewStart: Date;
  currentViewEnd: Date;
  onPrevious: () => void;
  onNext: () => void;
  onToday: () => void;
  currentView: "week" | "month";
  onViewChange: (view: "week" | "month") => void;
  isPreviousDisabled?: boolean;
  isAdmin?: boolean;
  onViewModeToggle?: () => void;
}

export default function CalendarHeader({
  currentViewStart,
  currentViewEnd,
  onPrevious,
  onNext,
  onToday,
  currentView,
  onViewChange,
  isPreviousDisabled = false,
  isAdmin = false,
  onViewModeToggle,
}: CalendarHeaderProps) {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const settingsRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        settingsRef.current &&
        !settingsRef.current.contains(event.target as Node)
      ) {
        setSettingsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  return (
    <header className="border-b border-[#dadce0] py-4 px-6 flex justify-between items-center sticky top-0 bg-white z-10">
      <div className="flex items-center">
        <h1 className="text-xl font-medium text-[#202124] font-google-sans">
          {isAdmin ? "Admin Panel" : "Meeting Scheduler"}
        </h1>
        <div className="ml-6 hidden md:flex">
          <Button
            variant="ghost"
            onClick={() => onViewChange("week")}
            className={`px-4 py-2 text-sm rounded-md hover:bg-[#f1f3f4] ${
              currentView === "week"
                ? "text-[#1a73e8] font-medium"
                : "text-[#5f6368]"
            }`}
          >
            Week
          </Button>
          <Button
            variant="ghost"
            onClick={() => onViewChange("month")}
            className={`px-4 py-2 text-sm rounded-md hover:bg-[#f1f3f4] ${
              currentView === "month"
                ? "text-[#1a73e8] font-medium"
                : "text-[#5f6368]"
            }`}
          >
            Month
          </Button>
        </div>
      </div>

      <div className="flex items-center space-x-4">
        {/* Navigation Controls */}
        <div className="flex items-center space-x-2 mr-4">
          <Button
            variant="outline"
            size="sm"
            onClick={onToday}
            className="text-sm text-[#1a73e8] border-[#dadce0] hover:bg-[#f1f3f4] px-3"
          >
            Today
          </Button>

          <div className="flex border rounded overflow-hidden">
            <Button
              variant="ghost"
              size="icon"
              onClick={onPrevious}
              disabled={isPreviousDisabled}
              className={`h-9 w-9 rounded-none border-r border-[#dadce0] hover:bg-[#f1f3f4] ${
                isPreviousDisabled ? "opacity-30 cursor-not-allowed" : ""
              }`}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-[#5f6368]"
              >
                <path d="m15 18-6-6 6-6" />
              </svg>
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={onNext}
              className="h-9 w-9 rounded-none hover:bg-[#f1f3f4]"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-[#5f6368]"
              >
                <path d="m9 18 6-6-6-6" />
              </svg>
            </Button>
          </div>
        </div>

        {/* Current date range display */}
        <div className="font-medium text-[#3c4043] mr-4">
          {formatDateRange(currentViewStart, currentViewEnd)}
        </div>

        <div className="mr-6 flex items-center">
          <span className="text-sm text-[#5f6368] mr-2">Time Zone:</span>
          <div className="relative inline-block">
            <Button
              variant="ghost"
              className="flex items-center text-sm font-medium text-[#3c4043] hover:text-[#1a73e8] p-0"
            >
              <span>Israel (Asia/Jerusalem)</span>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="ml-1"
              >
                <path d="m6 9 6 6 6-6" />
              </svg>
            </Button>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <Button
            variant="ghost"
            size="icon"
            className="p-2 rounded-full hover:bg-[#f1f3f4]"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-[#5f6368]"
            >
              <circle cx="12" cy="12" r="10" />
              <path d="M12 16v-4" />
              <path d="M12 8h.01" />
            </svg>
          </Button>

          {/* Settings Dropdown */}
          <div className="relative" ref={settingsRef}>
            <Button
              variant="ghost"
              size="icon"
              className="p-2 rounded-full hover:bg-[#f1f3f4]"
              onClick={() => setSettingsOpen(!settingsOpen)}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-[#5f6368]"
              >
                <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            </Button>

            {settingsOpen && (
              <div className="absolute left-1/2 transform -translate-x-1/2 mt-2 w-48 bg-white rounded-md shadow-lg z-50 overflow-hidden">
                <div className="py-1">
                  {isAdmin && (
                    <button
                      onClick={() => {
                        onViewModeToggle?.();
                        setSettingsOpen(false);
                      }}
                      className="w-full text-right px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-600"
                    >
                      {window.location.pathname === "/admin"
                        ? "מעבר לתצוגת לקוחות"
                        : "מעבר לתצוגת אדמין"}
                    </button>
                  )}
                  <button className="w-full text-right px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                    הגדרות
                  </button>
                  <button className="w-full text-right px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                    עזרה
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
