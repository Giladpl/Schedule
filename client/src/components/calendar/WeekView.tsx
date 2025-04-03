import { TimeSlot } from "@/components/ui/time-slot";
import { getNowInIsrael } from "@/lib/timeUtils";
import { getDayName, getDayOfMonth, isSameDay } from "@/lib/utils";
import { Timeslot } from "@shared/schema";
import { Calendar, ChevronDown, Info, Phone, Users, Video } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

// Meeting type to icon mapping
const MEETING_TYPE_ICONS: Record<string, React.ReactNode> = {
  טלפון: <Phone size={14} />,
  זום: <Video size={14} />,
  פגישה: <Users size={14} />,
};

// Add a useWindowSize hook to track screen size
function useWindowSize() {
  const [windowSize, setWindowSize] = useState({
    width: typeof window !== "undefined" ? window.innerWidth : 0,
    height: typeof window !== "undefined" ? window.innerHeight : 0,
  });

  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleResize = () => {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    window.addEventListener("resize", handleResize);
    handleResize(); // Call once to set initial size
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return windowSize;
}

interface WeekViewProps {
  weekDays: Date[];
  timeslots: Timeslot[];
  onSelectTimeslot: (timeslot: Timeslot) => void;
  selectedDate: Date | null;
  onSelectDate?: (date: Date) => void; // Add optional onSelectDate prop
}

// Simple info component instead of full legend
function CalendarInfo() {
  return (
    <div className="bg-white p-2 mb-2 border border-[#dadce0] rounded-lg">
      <div className="flex items-start gap-2">
        <Info size={16} className="text-[#5f6368] mt-0.5" />
        <div className="text-sm text-[#5f6368]">
          When multiple meeting types are available for a time slot, you'll see{" "}
          <strong>"X options available"</strong>. Click on any slot to view and
          select your preferred meeting type.
        </div>
      </div>
    </div>
  );
}

// Group overlapping timeslots by hour to simplify the display
function groupTimeslotsByHour(
  dayTimeslots: Timeslot[]
): Record<number, Timeslot[]> {
  const hourlySlots: Record<number, Timeslot[]> = {};

  dayTimeslots.forEach((timeslot) => {
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

  slots.forEach((slot) => {
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
  slots.forEach((slot) => {
    slot.meetingTypes.split(",").forEach((type) => {
      if (type.trim()) {
        allMeetingTypes.add(type.trim());
      }
    });
  });

  // Return a modified slot with all meeting types and use the longest duration for display
  return {
    ...longestSlot,
    meetingTypes: Array.from(allMeetingTypes).join(","),
  };
}

// Component for expanded view of multiple timeslots
function ExpandableTimeslots({
  slots,
  timeKey,
  top,
  height,
  onSelectTimeslot,
}: {
  slots: Timeslot[];
  timeKey: string;
  top: number;
  height: number;
  onSelectTimeslot: (timeslot: Timeslot) => void;
}) {
  const [expanded, setExpanded] = useState(false);

  const toggleExpand = (e: React.MouseEvent) => {
    e.stopPropagation();
    setExpanded(!expanded);
  };

  const startTime = new Date(slots[0].startTime);
  const endTime = new Date(slots[0].endTime);

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString("he-IL", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false, // Ensure 24-hour format
    });
  };

  // Calculate duration for a nicer display
  const durationMinutes = Math.round(
    (endTime.getTime() - startTime.getTime()) / (1000 * 60)
  );
  const durationStr =
    durationMinutes >= 60
      ? `${Math.floor(durationMinutes / 60)}h ${
          durationMinutes % 60 > 0 ? `${durationMinutes % 60}m` : ""
        }`
      : `${durationMinutes}m`;

  // Collect all unique client types
  const clientTypes = Array.from(new Set(slots.map((slot) => slot.clientType)));

  // Collect all unique meeting types
  const meetingTypes = Array.from(
    new Set(
      slots.flatMap((slot) =>
        slot.meetingTypes
          .split(",")
          .map((type) => type.trim())
          .filter(Boolean)
      )
    )
  );

  return (
    <div
      key={timeKey}
      style={{
        position: "absolute",
        top: `${top}px`,
        left: "2px",
        right: "2px",
        height: expanded ? "auto" : `${height}px`,
        zIndex: expanded ? 20 : 10,
      }}
      className={`${
        expanded ? "bg-white shadow-lg border rounded-lg expanded-timeslot" : ""
      }`}
    >
      {!expanded ? (
        <div
          className="h-full bg-blue-50 border border-blue-200 rounded-lg flex flex-col justify-between cursor-pointer hover:bg-blue-100 transition-colors"
          onClick={toggleExpand}
        >
          {/* Header with time */}
          <div className="bg-blue-100 px-3 py-1.5 rounded-t-lg border-b border-blue-200">
            <div className="font-bold text-blue-700 text-center">
              {formatTime(startTime)} - {formatTime(endTime)}
            </div>
            <div className="text-xs text-blue-600 text-center">
              {durationStr}
            </div>
          </div>

          <div className="flex-grow flex flex-col justify-center p-2">
            {/* Center content - options count */}
            <div className="text-center mb-2">
              <div className="bg-white bg-opacity-60 px-2 py-1 rounded-full inline-flex items-center">
                <span className="text-sm font-medium text-blue-800 mr-1">
                  {slots.length}
                </span>
                <span className="text-xs text-blue-600">options</span>
                <ChevronDown size={12} className="ml-1 text-blue-500" />
              </div>
            </div>

            {/* Client types */}
            {clientTypes.length > 0 && (
              <div className="flex flex-wrap justify-center gap-1 mb-2">
                {clientTypes.map((type, idx) => (
                  <span
                    key={idx}
                    className="text-[10px] px-1.5 py-0.5 bg-white bg-opacity-70 rounded-full"
                  >
                    {type}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Footer with meeting types */}
          <div className="flex justify-center gap-1 p-2 border-t border-blue-200 bg-blue-50 rounded-b-lg">
            {meetingTypes.map((type, idx) => (
              <div
                key={idx}
                className="flex items-center bg-white px-2 py-1 rounded-full text-[10px] shadow-sm"
                title={type}
              >
                <span className="mr-1">
                  {MEETING_TYPE_ICONS[type] || <Calendar size={10} />}
                </span>
                <span>{type}</span>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="p-3">
          <div className="flex justify-between items-center mb-3 border-b pb-2">
            <div>
              <span className="font-bold text-blue-800">
                {formatTime(startTime)} - {formatTime(endTime)}
              </span>
              <div className="text-xs text-gray-500">{durationStr}</div>
            </div>
            <button
              onClick={toggleExpand}
              className="text-xs px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
            >
              Close
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[60vh] overflow-y-auto">
            {slots.map((timeslot, slotIdx) => (
              <div
                key={`${timeKey}_${slotIdx}`}
                className="border border-gray-200 rounded-lg hover:border-blue-300 transition-colors"
              >
                <TimeSlot
                  timeslot={timeslot}
                  onClick={() => {
                    onSelectTimeslot(timeslot);
                    setExpanded(false);
                  }}
                />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function WeekView({
  weekDays,
  timeslots,
  onSelectTimeslot,
  selectedDate,
  onSelectDate,
}: WeekViewProps) {
  const { width } = useWindowSize();
  const isMobile = width < 768; // Mobile breakpoint
  const isSmallScreen = width < 1024; // Small screen breakpoint

  const hours = useMemo(() => {
    return Array.from({ length: 17 }, (_, i) => i + 6); // 6 AM to 10 PM (extended from 8 PM)
  }, []);

  const today = getNowInIsrael();

  // Group timeslots by day and then by hour
  const timeslotsByDay = useMemo(() => {
    const grouped: Record<string, Record<number, Timeslot[]>> = {};

    // Initialize all days with empty objects
    weekDays.forEach((day) => {
      const dateStr = day.toISOString().split("T")[0];
      grouped[dateStr] = {};
    });

    // Group timeslots by day and hour
    timeslots.forEach((timeslot) => {
      const date = new Date(timeslot.startTime);
      const dateStr = date.toISOString().split("T")[0];
      const hour = date.getHours();

      // Check if this date is in our current week view
      if (grouped[dateStr]) {
        if (!grouped[dateStr][hour]) {
          grouped[dateStr][hour] = [];
        }
        grouped[dateStr][hour].push(timeslot);
      }
    });

    return grouped;
  }, [weekDays, timeslots]);

  // MOBILE VIEW
  if (isMobile) {
    // For mobile, default to today or selectedDate if provided
    const [activeDate, setActiveDate] = useState<Date>(selectedDate || today);

    // When selected date changes from parent, update our internal state
    useEffect(() => {
      if (selectedDate) {
        setActiveDate(selectedDate);
      }
    }, [selectedDate]);

    // Handle date selection in mobile view
    const handleDateSelect = (date: Date) => {
      setActiveDate(date);
      if (onSelectDate) {
        onSelectDate(date);
      }
    };

    return (
      <div className="flex-1 flex flex-col overflow-auto">
        <CalendarInfo />

        {/* Single day view for mobile */}
        <div className="flex overflow-x-auto hide-scrollbar py-2">
          {weekDays.map((day, index) => (
            <div
              key={index}
              className={`flex-shrink-0 px-3 py-2 mx-1 rounded-full cursor-pointer ${
                isSameDay(day, activeDate)
                  ? "bg-blue-500 text-white"
                  : "bg-gray-100"
              }`}
              onClick={() => handleDateSelect(day)}
            >
              <div className="text-center">
                <div className="text-xs font-medium">{getDayName(day)}</div>
                <div className="text-lg font-bold">{getDayOfMonth(day)}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Timeline for selected day */}
        <div className="mt-4 px-2">
          <h2 className="text-lg font-bold mb-2">
            {`${getDayName(activeDate)} ${getDayOfMonth(activeDate)}`}
          </h2>

          <div className="relative">
            {hours.map((hour, index) => (
              <div key={index} className="flex border-t border-gray-200 py-1">
                <div className="w-16 text-xs text-gray-500 py-2">
                  {`${hour}:00`}
                </div>
                <div className="flex-1 min-h-8"></div>
              </div>
            ))}

            {/* Render timeslots for the selected day */}
            {(() => {
              const dateStr = activeDate.toISOString().split("T")[0];
              const dayTimeslots = timeslots.filter((slot) => {
                const slotDate = new Date(slot.startTime)
                  .toISOString()
                  .split("T")[0];
                return slotDate === dateStr;
              });

              // Group by exact start/end times
              const groupedByTime: Record<string, Timeslot[]> = {};
              dayTimeslots.forEach((slot) => {
                const key = `${slot.startTime}_${slot.endTime}`;
                if (!groupedByTime[key]) {
                  groupedByTime[key] = [];
                }
                groupedByTime[key].push(slot);
              });

              return Object.entries(groupedByTime).map(
                ([timeKey, slots], groupIdx) => {
                  const firstSlot = slots[0];
                  const startTime = new Date(firstSlot.startTime);
                  const endTime = new Date(firstSlot.endTime);
                  const startHour =
                    startTime.getHours() + startTime.getMinutes() / 60;
                  const endHour =
                    endTime.getHours() + endTime.getMinutes() / 60;
                  const top = (startHour - 6) * 64;
                  const height = (endHour - startHour) * 64;

                  if (startHour >= 23 || endHour <= 6) return null;

                  if (slots.length > 1) {
                    return (
                      <ExpandableTimeslots
                        key={timeKey}
                        slots={slots}
                        timeKey={timeKey}
                        top={top}
                        height={height}
                        onSelectTimeslot={onSelectTimeslot}
                      />
                    );
                  } else {
                    return (
                      <div
                        key={timeKey}
                        style={{
                          position: "absolute",
                          top: `${top}px`,
                          left: "18px",
                          right: "2px",
                          height: `${height}px`,
                          zIndex: 10,
                        }}
                      >
                        <TimeSlot
                          timeslot={firstSlot}
                          onClick={() => onSelectTimeslot(firstSlot)}
                        />
                      </div>
                    );
                  }
                }
              );
            })()}
          </div>
        </div>
      </div>
    );
  }

  // DESKTOP VIEW with responsive adjustments
  return (
    <div className="flex-1 flex flex-col overflow-auto">
      {/* Info section */}
      <CalendarInfo />

      <div className="flex border-b border-[#dadce0]">
        <div className="w-16 flex-shrink-0"></div>
        {weekDays.map((day, index) => (
          <div
            key={index}
            className={`flex-1 text-center py-3 calendar-column ${
              isSameDay(day, today) ? "bg-[#e8f0fe]" : ""
            }`}
          >
            <div
              className={`text-sm font-medium ${
                isSameDay(day, today) ? "text-[#1a73e8]" : "text-[#5f6368]"
              }`}
            >
              {getDayName(day)}
            </div>
            <div
              className={`font-google-sans text-xl mt-1 ${
                isSameDay(day, today)
                  ? "text-[#1a73e8] bg-[#1a73e8] bg-opacity-10 rounded-full w-10 h-10 flex items-center justify-center mx-auto"
                  : ""
              }`}
            >
              {getDayOfMonth(day)}
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-1 relative">
        <div className="w-16 flex-shrink-0 border-r border-[#dadce0]">
          {hours.map((hour, index) => (
            <div
              key={index}
              className="h-16 text-right pr-2 text-xs text-[#5f6368] relative -top-2"
            >
              {`${hour}:00`}
            </div>
          ))}
        </div>

        <div className="flex-1 flex">
          {weekDays.map((day, dayIndex) => {
            const dateStr = day.toISOString().split("T")[0];
            const dayHourlySlots = timeslotsByDay[dateStr] || {};

            return (
              <div
                key={dayIndex}
                className="flex-1 border-r border-[#dadce0] relative calendar-column"
              >
                {/* Horizontal grid lines */}
                {hours.map((hour, index) => (
                  <div
                    key={index}
                    className="h-16 border-t border-[#dadce0]"
                  ></div>
                ))}

                {/* Render timeslots */}
                {(() => {
                  // Filter timeslots for this day
                  const dayTimeslots = timeslots.filter((slot) => {
                    const slotDate = new Date(slot.startTime)
                      .toISOString()
                      .split("T")[0];
                    return slotDate === dateStr;
                  });

                  // Group timeslots by their exact start/end times
                  const groupedByTime: Record<string, Timeslot[]> = {};
                  dayTimeslots.forEach((slot) => {
                    const key = `${slot.startTime}_${slot.endTime}`;
                    if (!groupedByTime[key]) {
                      groupedByTime[key] = [];
                    }
                    groupedByTime[key].push(slot);
                  });

                  // Render each group
                  return Object.entries(groupedByTime).map(
                    ([timeKey, slots], groupIdx) => {
                      // Use the first slot for position calculations
                      const firstSlot = slots[0];
                      const startTime = new Date(firstSlot.startTime);
                      const endTime = new Date(firstSlot.endTime);
                      const startHour =
                        startTime.getHours() + startTime.getMinutes() / 60;
                      const endHour =
                        endTime.getHours() + endTime.getMinutes() / 60;
                      const top = (startHour - 6) * 64;
                      const height = (endHour - startHour) * 64;

                      // Only render if the slot falls within our visible hours
                      if (startHour >= 23 || endHour <= 6) return null;

                      // For small screens, use the expandable component when multiple slots
                      if (slots.length > 1 && isSmallScreen) {
                        return (
                          <ExpandableTimeslots
                            key={timeKey}
                            slots={slots}
                            timeKey={timeKey}
                            top={top}
                            height={height}
                            onSelectTimeslot={onSelectTimeslot}
                          />
                        );
                      }

                      // For larger screens or single slots, show in grid
                      if (slots.length > 1) {
                        const MAX_VISIBLE_SLOTS = 3; // Maximum number of slots to show side by side
                        const showExpandable = slots.length > MAX_VISIBLE_SLOTS;

                        // If we have too many options, use the expandable view even on large screens
                        if (showExpandable) {
                          return (
                            <ExpandableTimeslots
                              key={timeKey}
                              slots={slots}
                              timeKey={timeKey}
                              top={top}
                              height={height}
                              onSelectTimeslot={onSelectTimeslot}
                            />
                          );
                        }

                        // Otherwise, display side by side (up to MAX_VISIBLE_SLOTS)
                        return (
                          <div
                            key={timeKey}
                            style={{
                              position: "absolute",
                              top: `${top}px`,
                              left: "2px",
                              right: "2px",
                              height: `${height}px`,
                              zIndex: 10,
                              display: "flex",
                              gap: "4px",
                            }}
                          >
                            {slots.map((timeslot, slotIdx) => (
                              <div
                                key={`${timeKey}_${slotIdx}`}
                                className="flex-1 border border-gray-200 rounded-lg shadow-sm"
                                style={{
                                  backgroundColor:
                                    slotIdx % 2 === 0
                                      ? "rgba(249, 250, 251, 0.5)"
                                      : "white",
                                }}
                              >
                                <TimeSlot
                                  timeslot={timeslot}
                                  onClick={() => onSelectTimeslot(timeslot)}
                                  className="h-full"
                                />
                              </div>
                            ))}
                          </div>
                        );
                      } else {
                        // Single option, render normally
                        return (
                          <div
                            key={timeKey}
                            style={{
                              position: "absolute",
                              top: `${top}px`,
                              left: "2px",
                              right: "2px",
                              height: `${height}px`,
                              zIndex: 10,
                            }}
                          >
                            <TimeSlot
                              timeslot={firstSlot}
                              onClick={() => onSelectTimeslot(firstSlot)}
                            />
                          </div>
                        );
                      }
                    }
                  );
                })()}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
