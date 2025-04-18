import {
  getClientTypeDisplayName,
  groupTimeslotsByDay,
} from "@/lib/calendarService";
import { getNowInIsrael } from "@/lib/timeUtils";
import { getDatesInMonth, isSameDay, startOfDay } from "@/lib/utils";
import { Timeslot } from "@shared/schema";
import { Info } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

interface MonthViewProps {
  currentDate: Date;
  timeslots: Timeslot[];
  onSelectDate: (date: Date) => void;
  activeClientTypes?: string[];
  viewMode: "admin" | "client";
}

export default function MonthView({
  currentDate,
  timeslots,
  onSelectDate,
  activeClientTypes = ["all"],
  viewMode,
}: MonthViewProps) {
  // Track current time for real-time updates
  const [now, setNow] = useState<Date>(getNowInIsrael());

  // Update current time every minute
  useEffect(() => {
    const interval = setInterval(() => {
      setNow(getNowInIsrael());
    }, 60000);

    return () => clearInterval(interval);
  }, []);

  const dates = useMemo(() => {
    return getDatesInMonth(currentDate.getFullYear(), currentDate.getMonth());
  }, [currentDate]);

  // Group timeslots by day in useMemo to improve performance - Match WeekView logic exactly
  const timeslotsByDay = useMemo(() => {
    console.log(`Monthly view processing ${timeslots.length} timeslots`);

    // IMPORTANT: We now use the pre-filtered timeslots from the parent component
    // No additional filtering needed - the filtering is already done in calendar.tsx
    const filteredTimeslots = timeslots;

    console.log(
      `MonthView: Processing ${filteredTimeslots.length} timeslots from parent component`
    );

    // Print all Saturday timeslots to ensure they're included
    const saturdaySlots = filteredTimeslots.filter((slot) => {
      const date = new Date(slot.startTime);
      return date.getDay() === 6; // 6 = Saturday
    });

    console.log(
      `MonthView: Found ${saturdaySlots.length} Saturday slots in the provided timeslots`
    );

    saturdaySlots.forEach((slot) => {
      console.log(
        `MonthView Saturday slot: ID=${slot.id}, Start=${new Date(
          slot.startTime
        ).toISOString()}`
      );
    });

    // Now group the timeslots by day
    const grouped = groupTimeslotsByDay(filteredTimeslots);

    // Add debug log to check final result
    Object.entries(grouped).forEach(([dateKey, slots]) => {
      console.log(`MonthView - Date ${dateKey} has ${slots.length} timeslots`);

      // Check if we have Saturday slots in the results
      const dayDate = new Date(dateKey);
      const isSaturday = dayDate.getDay() === 6;

      if (isSaturday) {
        console.log(`MonthView: Saturday ${dateKey} has ${slots.length} slots`);
        const slotIds = slots.map((s) => s.id).join(", ");
        console.log(`MonthView: Saturday slot IDs: ${slotIds}`);
      }
    });

    return grouped;
  }, [timeslots, now]);

  const currentMonth = currentDate.getMonth();

  // Check if "all" is included in client types
  const hasAllClientType =
    activeClientTypes.length === 0 || activeClientTypes.includes("all");

  // Get client type display name for the view
  const clientTypeDisplayText = useMemo(() => {
    if (hasAllClientType) {
      return "all clients";
    }

    if (activeClientTypes.length === 1) {
      return getClientTypeDisplayName(activeClientTypes[0]);
    }

    return activeClientTypes
      .map((type) => getClientTypeDisplayName(type))
      .join(", ");
  }, [activeClientTypes, hasAllClientType]);

  // Group timeslots by meeting type
  const timeslotsByMeetingType = useMemo(() => {
    const result: Record<string, Record<string, Timeslot[]>> = {};

    Object.entries(timeslotsByDay).forEach(([dateStr, daySlots]) => {
      result[dateStr] = {};

      daySlots.forEach((slot) => {
        const meetingTypes = slot.meetingTypes.split(",").map((t) => t.trim());

        meetingTypes.forEach((type) => {
          if (!type) return;

          if (!result[dateStr][type]) {
            result[dateStr][type] = [];
          }

          result[dateStr][type].push(slot);
        });
      });
    });

    return result;
  }, [timeslotsByDay]);

  return (
    <div className="flex-1 overflow-auto">
      {!viewMode && (
        <div className="p-4">
          <div className="bg-white p-2 mb-2 border border-[#dadce0] rounded-lg">
            <div className="flex items-start gap-2">
              <Info size={16} className="text-[#5f6368] mt-0.5" />
              <div className="text-sm text-[#5f6368]">
                {activeClientTypes.includes("new_customer") &&
                activeClientTypes.length === 1 ? (
                  <>
                    You are viewing available slots for new customers. Click on
                    any date to see available timeslots.
                  </>
                ) : (
                  <>
                    You are viewing the schedule for {clientTypeDisplayText}.
                    Only dates with slots available for your selected client
                    types are shown.
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-7 bg-[#f8f9fa] text-center py-2 border-b border-[#dadce0]">
        {["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"].map((day, index) => (
          <div key={index} className="text-sm font-medium text-[#5f6368]">
            {day}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 grid-rows-6 h-full">
        {dates.map((date, index) => {
          const isCurrentMonth = date.getMonth() === currentMonth;
          const isToday = isSameDay(date, now);

          // IMPORTANT: This must match exactly how dates are formatted in groupTimeslotsByDay
          const startDay = startOfDay(date);
          const dateStr = startDay.toISOString().split("T")[0];

          // Get timeslots for this day - these have ALREADY been filtered by filterTimeslots
          const dayTimeslots = timeslotsByDay[dateStr] || [];

          // DEBUG: Log available timeslots for important dates
          if (dayTimeslots.length > 0) {
            console.log(
              `MonthView cell for ${dateStr} has ${
                dayTimeslots.length
              } timeslots (IDs: ${dayTimeslots
                .map((slot) => slot.id)
                .join(", ")})`
            );
            dayTimeslots.forEach((slot) => {
              console.log(
                `  Slot ${slot.id}: ${new Date(
                  slot.startTime
                ).toLocaleTimeString()} - ${new Date(
                  slot.endTime
                ).toLocaleTimeString()}`
              );
            });
          }

          // NO additional filtering - we use ALL timeslots for this day
          // This ensures exact consistency with the weekly view
          const activeTimeslots = dayTimeslots;

          // Count available slots by meeting type
          const meetingTypeCounts: Record<string, number> = {};
          activeTimeslots.forEach((slot) => {
            const types = slot.meetingTypes.split(",").map((t) => t.trim());
            types.forEach((type) => {
              if (!type) return;
              meetingTypeCounts[type] = (meetingTypeCounts[type] || 0) + 1;
            });
          });

          const meetingTypes = Object.keys(meetingTypeCounts);
          const hasPhoneMeetings = meetingTypes.includes("טלפון");
          const hasZoomMeetings = meetingTypes.includes("זום");
          const hasInPersonMeetings = meetingTypes.includes("פגישה");

          const totalSlots = activeTimeslots.length;

          // Check if any timeslots are currently active
          const hasActiveSlots = activeTimeslots.some((slot) => {
            const startTime = new Date(slot.startTime);
            const endTime = new Date(slot.endTime);
            const nowTime = now.getTime();
            return (
              startTime.getTime() <= nowTime && endTime.getTime() >= nowTime
            );
          });

          // Check if this is a Saturday (special handling)
          const isSaturday = date.getDay() === 6;

          return (
            <div
              key={index}
              className={`calendar-cell h-32 border-b border-r border-[#dadce0] p-2 ${
                !isCurrentMonth ? "bg-[#f8f9fa]" : ""
              } ${isToday ? "bg-[#e8f0fe]" : ""} ${
                isSaturday ? "bg-blue-50" : ""
              } hover:bg-[#f8f9fa] cursor-pointer relative`}
              onClick={() => onSelectDate(date)}
            >
              {/* Saturday indicator */}
              {isSaturday && (
                <div className="absolute right-0 top-0 w-0 h-0 border-t-8 border-r-8 border-t-transparent border-r-blue-200"></div>
              )}

              {/* Current time indicator for today */}
              {isToday && (
                <div className="absolute left-0 w-0.5 top-0 bottom-0 bg-[#ea4335]"></div>
              )}

              {/* Currently active meeting indicator */}
              {hasActiveSlots && isToday && (
                <div className="absolute left-0 top-0 right-0 h-0.5 bg-[#ea4335]"></div>
              )}

              <div className="flex justify-between items-center">
                <div
                  className={`${
                    isCurrentMonth
                      ? isToday
                        ? "text-[#1a73e8] font-medium rounded-full bg-[#1a73e8] bg-opacity-10 w-6 h-6 flex items-center justify-center"
                        : "text-[#202124]"
                      : "text-[#80868b]"
                  } text-sm`}
                >
                  {date.getDate()}
                </div>

                {isToday && (
                  <div className="text-xs text-[#ea4335] font-medium">
                    {now.toLocaleTimeString("he-IL", {
                      hour: "2-digit",
                      minute: "2-digit",
                      hour12: false,
                    })}
                  </div>
                )}
              </div>

              <div className="mt-1 text-xs text-[#5f6368]">
                {totalSlots > 0
                  ? `${totalSlots} ${
                      totalSlots === 1 ? "slot" : "slots"
                    } available`
                  : "No slots available"}
              </div>

              {totalSlots > 0 && (
                <div className="mt-1 space-y-1">
                  {/* Meeting type indicators - only show for compatible client types */}
                  {hasInPersonMeetings && (
                    <div className="text-xs bg-[#ea4335] text-white rounded-sm p-0.5 px-1">
                      {meetingTypeCounts["פגישה"]} in-person
                    </div>
                  )}
                  {hasZoomMeetings && (
                    <div className="text-xs bg-[#4285f4] text-white rounded-sm p-0.5 px-1">
                      {meetingTypeCounts["זום"]} zoom
                    </div>
                  )}
                  {hasPhoneMeetings && (
                    <div className="text-xs bg-[#34a853] text-white rounded-sm p-0.5 px-1">
                      {meetingTypeCounts["טלפון"]} phone
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
