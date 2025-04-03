import React, { useMemo } from "react";
import { Timeslot } from "@shared/schema";
import { TimeSlot, MEETING_TYPE_COLORS, CLIENT_TYPE_COLORS } from "@/components/ui/time-slot";
import { getDayName, getDayOfMonth, isSameDay } from "@/lib/utils";
import { getTimeslotPosition, getTimeslotDuration } from "@/lib/calendarService";
import { getNowInIsrael } from "@/lib/timeUtils";
import { Clock, Info } from "lucide-react";

interface WeekViewProps {
  weekDays: Date[];
  timeslots: Timeslot[];
  onSelectTimeslot: (timeslot: Timeslot) => void;
  selectedDate: Date | null;
}

// Simple info component instead of full legend
function CalendarInfo() {
  return (
    <div className="bg-white p-2 mb-2 border border-[#dadce0] rounded-lg">
      <div className="flex items-start gap-2">
        <Info size={16} className="text-[#5f6368] mt-0.5" />
        <div className="text-sm text-[#5f6368]">
          When multiple meeting types are available for a time slot, you'll see <strong>"X options available"</strong>. 
          Click on any slot to view and select your preferred meeting type.
        </div>
      </div>
    </div>
  );
}

// Group overlapping timeslots by hour to simplify the display
function groupTimeslotsByHour(dayTimeslots: Timeslot[]): Record<number, Timeslot[]> {
  const hourlySlots: Record<number, Timeslot[]> = {};
  
  dayTimeslots.forEach(timeslot => {
    const hour = new Date(timeslot.startTime).getHours();
    if (!hourlySlots[hour]) {
      hourlySlots[hour] = [];
    }
    hourlySlots[hour].push(timeslot);
  });
  
  return hourlySlots;
}

// Get a consolidated timeslot for display when there are multiple options in the same hour
function getHourConsolidatedTimeslot(slots: Timeslot[]): Timeslot {
  // Start with the first timeslot
  const baseSlot = slots[0];
  
  // If there's only one slot, return it directly
  if (slots.length === 1) return baseSlot;
  
  // Find the slot with the longest duration for better visualization
  let longestSlot = baseSlot;
  let longestDuration = 0;
  
  slots.forEach(slot => {
    const start = new Date(slot.startTime);
    const end = new Date(slot.endTime);
    const duration = (end.getTime() - start.getTime()) / (1000 * 60); // minutes
    
    if (duration > longestDuration) {
      longestDuration = duration;
      longestSlot = slot;
    }
  });
  
  // Collect all meeting types from all slots
  const allMeetingTypes = new Set<string>();
  slots.forEach(slot => {
    slot.meetingTypes.split(',').forEach(type => {
      if (type.trim()) {
        allMeetingTypes.add(type.trim());
      }
    });
  });
  
  // Return a modified slot with all meeting types and use the longest duration for display
  return {
    ...longestSlot,
    meetingTypes: Array.from(allMeetingTypes).join(',')
  };
}

export default function WeekView({
  weekDays,
  timeslots,
  onSelectTimeslot,
  selectedDate
}: WeekViewProps) {
  const hours = useMemo(() => {
    return Array.from({ length: 12 }, (_, i) => i + 9); // 9 AM to 8 PM
  }, []);

  const today = getNowInIsrael();

  // Group timeslots by day and then by hour
  const timeslotsByDay = useMemo(() => {
    const grouped: Record<string, Record<number, Timeslot[]>> = {};
    
    weekDays.forEach(day => {
      const dateStr = day.toISOString().split('T')[0];
      grouped[dateStr] = {};
    });
    
    timeslots.forEach(timeslot => {
      const date = new Date(timeslot.startTime);
      const dateStr = date.toISOString().split('T')[0];
      const hour = date.getHours();
      
      if (grouped[dateStr]) {
        if (!grouped[dateStr][hour]) {
          grouped[dateStr][hour] = [];
        }
        grouped[dateStr][hour].push(timeslot);
      }
    });
    
    return grouped;
  }, [weekDays, timeslots]);

  return (
    <div className="flex-1 flex flex-col overflow-auto">
      {/* Info section */}
      <CalendarInfo />
      
      <div className="flex border-b border-[#dadce0]">
        <div className="w-16 flex-shrink-0"></div>
        {weekDays.map((day, index) => (
          <div
            key={index}
            className={`flex-1 text-center py-3 ${
              isSameDay(day, today) ? "bg-[#e8f0fe]" : ""
            }`}
          >
            <div className={`text-sm font-medium ${
              isSameDay(day, today) ? "text-[#1a73e8]" : "text-[#5f6368]"
            }`}>
              {getDayName(day)}
            </div>
            <div className={`font-google-sans text-xl mt-1 ${
              isSameDay(day, today)
                ? "text-[#1a73e8] bg-[#1a73e8] bg-opacity-10 rounded-full w-10 h-10 flex items-center justify-center mx-auto"
                : ""
            }`}>
              {getDayOfMonth(day)}
            </div>
          </div>
        ))}
      </div>
      
      <div className="flex flex-1 relative">
        <div className="w-16 flex-shrink-0 border-r border-[#dadce0]">
          {hours.map((hour, index) => (
            <div key={index} className="h-16 text-right pr-2 text-xs text-[#5f6368] relative -top-2">
              {hour === 12 ? '12 PM' : hour < 12 ? `${hour} AM` : `${hour - 12} PM`}
            </div>
          ))}
        </div>
        
        <div className="flex-1 flex">
          {weekDays.map((day, dayIndex) => {
            const dateStr = day.toISOString().split('T')[0];
            const dayHourlySlots = timeslotsByDay[dateStr] || {};
            
            return (
              <div key={dayIndex} className="flex-1 border-r border-[#dadce0] relative">
                {/* Horizontal grid lines */}
                {hours.map((hour, index) => (
                  <div 
                    key={index} 
                    className="h-16 border-t border-[#dadce0]"
                  ></div>
                ))}
                
                {/* Time slots by hour - cleaner approach */}
                {hours.map((hour) => {
                  const hourSlots = dayHourlySlots[hour] || [];
                  if (hourSlots.length === 0) return null;
                  
                  // Create a single consolidated slot for display
                  const consolidatedSlot = getHourConsolidatedTimeslot(hourSlots);
                  
                  // Calculate the slot height based on the duration
                  const duration = getTimeslotDuration(consolidatedSlot);
                  
                  // For appointments, set height proportional to duration
                  // Minimum 20% height for very short appointments (15min)
                  // 60 min = 100% (full hour height), 90 min = 100% (max)
                  const heightPercentage = Math.min(100, Math.max(20, (duration / 60) * 100));
                  const slotHeight = Math.max(15, (heightPercentage / 100) * 62);
                  
                  return (
                    <div key={hour} style={{ 
                      position: 'absolute', 
                      top: `${(hour - 9) * 64 + 2}px`, 
                      left: '2px', 
                      right: '2px', 
                      height: `${slotHeight}px` 
                    }}>
                      <TimeSlot
                        timeslot={consolidatedSlot}
                        onClick={(slot) => {
                          // If multiple options, pass the slot with all meeting types for selection in modal
                          if (hourSlots.length > 1) {
                            onSelectTimeslot(consolidatedSlot);
                          } else {
                            onSelectTimeslot(slot);
                          }
                        }}
                      />
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
