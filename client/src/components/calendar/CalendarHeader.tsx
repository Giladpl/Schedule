import React from "react";
import { Button } from "@/components/ui/button";
import { formatDateRange } from "@/lib/utils";

interface CalendarHeaderProps {
  currentViewStart: Date;
  currentViewEnd: Date;
  onPrevious: () => void;
  onNext: () => void;
  onToday: () => void;
  currentView: 'week' | 'month';
  onViewChange: (view: 'week' | 'month') => void;
}

export default function CalendarHeader({
  currentViewStart,
  currentViewEnd,
  onPrevious,
  onNext,
  onToday,
  currentView,
  onViewChange
}: CalendarHeaderProps) {
  return (
    <header className="border-b border-[#dadce0] py-4 px-6 flex justify-between items-center sticky top-0 bg-white z-10">
      <div className="flex items-center">
        <h1 className="text-xl font-medium text-[#202124] font-google-sans">Meeting Scheduler</h1>
        <div className="ml-6 hidden md:flex">
          <Button
            variant="ghost"
            onClick={() => onViewChange('week')}
            className={`px-4 py-2 text-sm rounded-md hover:bg-[#f1f3f4] ${
              currentView === 'week' ? 'text-[#1a73e8] font-medium' : 'text-[#5f6368]'
            }`}
          >
            Week
          </Button>
          <Button
            variant="ghost"
            onClick={() => onViewChange('month')}
            className={`px-4 py-2 text-sm rounded-md hover:bg-[#f1f3f4] ${
              currentView === 'month' ? 'text-[#1a73e8] font-medium' : 'text-[#5f6368]'
            }`}
          >
            Month
          </Button>
        </div>
      </div>
      
      <div className="flex items-center">
        <div className="mr-6 flex items-center">
          <span className="text-sm text-[#5f6368] mr-2">Time Zone:</span>
          <div className="relative inline-block">
            <Button variant="ghost" className="flex items-center text-sm font-medium text-[#3c4043] hover:text-[#1a73e8] p-0">
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
              <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          </Button>
        </div>
      </div>
    </header>
  );
}
