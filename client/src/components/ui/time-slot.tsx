import React from "react";
import { cn } from "@/lib/utils";
import { Timeslot } from "@shared/schema";
import { formatTimeslot, getTimeslotDuration } from "@/lib/calendarService";
import { Clock, Phone, Video, Users } from "lucide-react";

interface TimeSlotProps {
  timeslot: Timeslot;
  onClick: (timeslot: Timeslot) => void;
  style?: React.CSSProperties;
  className?: string;
}

// Meeting type color mapping with proper icons (using strings for icon names to avoid JSX issues)
export const MEETING_TYPE_COLORS: Record<string, { color: string; icon: string }> = {
  'טלפון': { color: '#34a853', icon: '📞' }, // Phone - Green
  'זום': { color: '#4285f4', icon: '💻' },   // Zoom - Blue
  'פגישה': { color: '#ea4335', icon: '🏢' }  // In-person - Red
};

// Client type color mapping
export const CLIENT_TYPE_COLORS = {
  'vip': '#fbbc04',       // Yellow
  'new': '#1a73e8',       // Blue
  'all': '#1a73e8',       // Blue
  'quick': '#34a853',     // Green
  'פולי אחים': '#34a853', // Green
  'מדריכים+': '#fbbc04',  // Yellow
  'new_customer': '#1a73e8' // Blue
};

export function TimeSlot({ timeslot, onClick, style, className }: TimeSlotProps) {
  const clientTypeColor = CLIENT_TYPE_COLORS[timeslot.clientType] || '#dadce0';
  const isAvailable = timeslot.isAvailable;
  
  // Get all meeting types for this timeslot
  const meetingTypes = timeslot.meetingTypes.split(',').map(type => type.trim()).filter(Boolean);
  
  // Get the duration for this timeslot
  const durationMinutes = getTimeslotDuration(timeslot);
  // Check if this is a short appointment (15 min)
  const isShortAppointment = durationMinutes <= 15;
  
  // Handle click on the timeslot
  const handleClick = () => {
    if (isAvailable) {
      onClick(timeslot);
    }
  };
  
  // Determine time range display for the timeslot
  const timeDisplay = formatTimeslot(timeslot);
  
  return (
    <div
      className={cn(
        "time-slot relative rounded-lg p-2 border transition-all duration-200 hover:shadow cursor-pointer",
        "border-l-4",
        isShortAppointment ? "border-dashed border-amber-600" : "",
        !isAvailable ? "unavailable opacity-50 cursor-not-allowed bg-[#f1f3f4]" : "bg-white border-[#dadce0] hover:bg-[#f8f9fa]",
        isShortAppointment && isAvailable ? "bg-amber-50" : "",
        className
      )}
      style={{
        ...style,
        borderLeftColor: clientTypeColor,
        height: '100%', // Fill the container height
        boxSizing: 'border-box'
      }}
      onClick={handleClick}
    >
      {/* Time display */}
      <div className="text-sm font-medium text-[#202124] mb-1 flex items-center">
        <Clock size={14} className="mr-1 text-[#5f6368]" /> {timeDisplay}
        {isShortAppointment && (
          <span className="ml-2 text-xs font-medium px-1 py-0.5 bg-amber-100 text-amber-800 rounded">
            Short
          </span>
        )}
      </div>
      
      {/* Show meeting type count */}
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          {meetingTypes.length > 0 && (
            <div className="flex gap-1 items-center">
              {meetingTypes.length > 1 ? (
                <span className="text-xs font-medium text-[#1a73e8]">
                  {meetingTypes.length} options available
                </span>
              ) : (
                <>
                  {meetingTypes.map((type, index) => {
                    const typeInfo = MEETING_TYPE_COLORS[type] || { color: '#9aa0a6', icon: '❓' };
                    return (
                      <div key={index} className="flex items-center">
                        <span className="mr-1" style={{ color: typeInfo.color }}>{typeInfo.icon}</span>
                        <span 
                          className="px-1 rounded text-xs" 
                          style={{ backgroundColor: typeInfo.color, color: 'white' }}
                        >
                          {type}
                        </span>
                      </div>
                    );
                  })}
                </>
              )}
            </div>
          )}
        </div>
        <span className={cn(
          "text-xs ml-auto",
          isShortAppointment ? "font-bold text-amber-600" : "text-[#5f6368]"
        )}>
          {durationMinutes} min
        </span>
      </div>
    </div>
  );
}
