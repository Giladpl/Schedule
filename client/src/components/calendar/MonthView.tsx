import {
  getClientTypeDisplayName,
  groupTimeslotsByDay,
} from "@/lib/calendarService";
import { getNowInIsrael } from "@/lib/timeUtils";
import { getDatesInMonth, isSameDay } from "@/lib/utils";
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

  // Group timeslots by day in useMemo to improve performance
  const timeslotsByDay = useMemo(() => {
    console.log(
      `Organizing ${timeslots.length} timeslots by day for month view`
    );

    // Use strict timeslot filtering before grouping to ensure consistency
    const validTimeslots = timeslots.filter((slot) => {
      // Ensure the slot is available
      if (!slot.isAvailable) return false;

      // Check for client type match
      const hasAllClientType = activeClientTypes.includes("all");
      const clientTypeMatch =
        hasAllClientType ||
        slot.clientType === "all" ||
        activeClientTypes.includes(slot.clientType) ||
        (Array.isArray(slot.clientType) &&
          slot.clientType.some((ct) => activeClientTypes.includes(ct)));

      if (!clientTypeMatch) return false;

      // Check if the timeslot is in the past
      const startTime = new Date(slot.startTime);
      if (startTime < now && !isSameDay(startTime, now)) {
        return false;
      }

      return true;
    });

    console.log(
      `After pre-filtering: ${validTimeslots.length} valid timeslots for month view`
    );
    return groupTimeslotsByDay(validTimeslots);
  }, [timeslots, activeClientTypes, now]);

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
          const dateStr = date.toISOString().split("T")[0];
          const dayTimeslots = timeslotsByDay[dateStr] || [];

          // We've already pre-filtered the timeslots, so just use them directly
          const filteredTimeslots = dayTimeslots;

          // Skip further filtering since we did it earlier
          // Just ensure slots for the current day are not in the past
          const activeTimeslots = isToday
            ? filteredTimeslots.filter((slot) => {
                const startTime = new Date(slot.startTime);
                return startTime >= now;
              })
            : filteredTimeslots;

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

          return (
            <div
              key={index}
              className={`calendar-cell h-32 border-b border-r border-[#dadce0] p-2 ${
                !isCurrentMonth ? "bg-[#f8f9fa]" : ""
              } ${
                isToday ? "bg-[#e8f0fe]" : ""
              } hover:bg-[#f8f9fa] cursor-pointer relative`}
              onClick={() => onSelectDate(date)}
            >
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
                  {/* Meeting type indicators */}
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
