import {
  CLIENT_TYPE_COLORS,
  MEETING_TYPE_ICONS,
  MEETING_TYPE_STYLES,
  TimeSlot,
  stringToColor,
} from "@/components/ui/time-slot";
import { getClientTypeDisplayName } from "@/lib/calendarService";
import { getNowInIsrael } from "@/lib/timeUtils";
import { getDayName, getDayOfMonth, isSameDay } from "@/lib/utils";
import { Timeslot } from "@shared/schema";
import { Calendar, ChevronDown, Info } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

// Add a useWindowSize hook to track screen size
function useWindowSize() {
  const [windowSize, setWindowSize] = useState({
    width: typeof window !== "undefined" ? window.innerWidth : 0,
    height: typeof window !== "undefined" ? window.innerHeight : 0,
  });

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Handler to call on window resize
    const handleResize = () => {
      // Set window width/height to state
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    // Add event listener
    window.addEventListener("resize", handleResize);

    // Call handler right away so state gets updated with initial window size
    handleResize();

    // Remove event listener on cleanup
    return () => window.removeEventListener("resize", handleResize);
  }, []); // Empty array ensures that effect is only run on mount and unmount

  return windowSize;
}

interface WeekViewProps {
  weekDays: Date[];
  timeslots: Timeslot[];
  onSelectTimeslot: (timeslot: Timeslot) => void;
  selectedDate: Date | null;
  onSelectDate?: (date: Date) => void; // Add optional onSelectDate prop
  clientType?: string; // Add clientType prop
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
  activeClientType,
}: {
  slots: Timeslot[];
  timeKey: string;
  top: number;
  height: number;
  onSelectTimeslot: (timeslot: Timeslot) => void;
  activeClientType?: string;
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

  // Determine the effective client type to display (either the filtered type or the slot's type)
  const displayClientType =
    activeClientType && activeClientType !== "all"
      ? activeClientType
      : clientTypes[0] || "all";

  // Get client display name
  const clientDisplayName = getClientTypeDisplayName(displayClientType);
  const clientColor =
    CLIENT_TYPE_COLORS[displayClientType] || stringToColor(displayClientType);

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
                    className="text-[10px] px-1.5 py-0.5 rounded-md text-white font-medium"
                    style={{
                      backgroundColor:
                        CLIENT_TYPE_COLORS[type] || stringToColor(type),
                    }}
                  >
                    {getClientTypeDisplayName(type)}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Footer with meeting types */}
          <div className="flex justify-center gap-1 p-2 border-t border-blue-200 bg-blue-50 rounded-b-lg">
            {meetingTypes.map((type, idx) => {
              const style =
                MEETING_TYPE_STYLES[type] || MEETING_TYPE_STYLES.default;
              return (
                <div
                  key={idx}
                  className="flex items-center px-2 py-1 rounded-full text-[10px]"
                  style={{ backgroundColor: style.color }}
                  title={type}
                >
                  <span className="mr-1">
                    {MEETING_TYPE_ICONS[type] || (
                      <Calendar size={10} className="text-white" />
                    )}
                  </span>
                  <span className="text-white font-medium">
                    {style.name || type}
                  </span>
                </div>
              );
            })}
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
                  activeClientType={activeClientType}
                />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Component for a day's schedule
function DaySchedule({
  day,
  timeslots,
  onSelectTimeslot,
  selectedDate,
  onSelectDate,
  clientType,
}: {
  day: Date;
  timeslots: Timeslot[];
  onSelectTimeslot: (timeslot: Timeslot) => void;
  selectedDate: Date | null;
  onSelectDate?: (date: Date) => void;
  clientType?: string;
}) {
  const { width, height } = useWindowSize();
  const isMobile = width < 768; // Mobile breakpoint
  const isSmallScreen = width < 1024; // Small screen breakpoint

  // Fixed hour range - from 7 AM to 10 PM (7-22)
  const START_HOUR = 7;
  const END_HOUR = 22;
  const TOTAL_HOURS = END_HOUR - START_HOUR + 1;

  // Calculate available height for the time grid
  const availableHeight = height - 180; // Approx header + info section height

  // Calculate adaptive hour height based on available space (min 48px, prefer 64px)
  const hourHeight = Math.max(
    48,
    Math.min(64, Math.floor(availableHeight / TOTAL_HOURS))
  );

  const hours = useMemo(() => {
    return Array.from({ length: TOTAL_HOURS }, (_, i) => i + START_HOUR);
  }, []);

  const today = getNowInIsrael();

  // Filter timeslots for this day only
  const dayTimeslots = useMemo(() => {
    return timeslots.filter((slot) => {
      const slotDate = new Date(slot.startTime);
      return (
        slotDate.getDate() === day.getDate() &&
        slotDate.getMonth() === day.getMonth() &&
        slotDate.getFullYear() === day.getFullYear()
      );
    });
  }, [timeslots, day]);

  // Group timeslots by their exact start/end times
  const groupedByTime = useMemo(() => {
    const groups: Record<string, Timeslot[]> = {};
    dayTimeslots.forEach((slot) => {
      const key = `${slot.startTime}_${slot.endTime}`;
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(slot);
    });
    return groups;
  }, [dayTimeslots]);

  if (isMobile) {
    return (
      <div className="flex-1 flex flex-col h-full">
        <div className="px-2 flex-1 flex flex-col">
          <h2 className="text-lg font-bold mb-2">
            {`${getDayName(day)} ${getDayOfMonth(day)}`}
          </h2>

          <div className="relative flex-1 overflow-auto hide-scrollbar">
            {/* Time markers */}
            <div className="absolute left-0 top-0 bottom-0 w-16 z-10">
              {hours.map((hour, index) => (
                <div
                  key={index}
                  className="flex items-center"
                  style={{ height: `${hourHeight}px` }}
                >
                  <div className="w-16 text-xs text-gray-500 z-10 bg-white bg-opacity-90 px-2 py-1 sticky left-0 font-medium">
                    {`${hour}:00`}
                  </div>
                </div>
              ))}
            </div>

            {/* Grid lines */}
            <div className="absolute left-16 right-0 top-0">
              {hours.map((hour, index) => (
                <div
                  key={index}
                  className="border-t border-gray-200"
                  style={{ height: `${hourHeight}px` }}
                ></div>
              ))}
            </div>

            {/* Render timeslots for the day */}
            {Object.entries(groupedByTime).map(([timeKey, slots], groupIdx) => {
              const firstSlot = slots[0];
              const startTime = new Date(firstSlot.startTime);
              const endTime = new Date(firstSlot.endTime);
              const startHourFraction =
                startTime.getHours() + startTime.getMinutes() / 60;
              const endHourFraction =
                endTime.getHours() + endTime.getMinutes() / 60;
              const top = (startHourFraction - START_HOUR) * hourHeight;
              const height = (endHourFraction - startHourFraction) * hourHeight;

              // Only show if within visible range
              if (
                startHourFraction >= END_HOUR + 1 ||
                endHourFraction <= START_HOUR
              )
                return null;

              if (slots.length > 1) {
                return (
                  <ExpandableTimeslots
                    key={timeKey}
                    slots={slots}
                    timeKey={timeKey}
                    top={top}
                    height={height}
                    onSelectTimeslot={onSelectTimeslot}
                    activeClientType={clientType}
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
                      activeClientType={clientType}
                    />
                  </div>
                );
              }
            })}
          </div>
        </div>
      </div>
    );
  }

  // DESKTOP VIEW
  return (
    <div className="flex-1 flex flex-col h-full">
      {/* Day header */}
      <div className="border-b border-[#dadce0] flex-shrink-0 relative z-10">
        <div
          className={`text-center py-3 calendar-column ${
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
      </div>

      {/* Time grid */}
      <div className="flex-1 relative overflow-hidden">
        {/* Create a fixed container with scrolling */}
        <div className="absolute inset-0 overflow-auto hide-scrollbar">
          {/* Content container with proper height to ensure scrolling */}
          <div
            style={{
              minHeight: "100%",
              /* Set a minimum width to ensure all columns are visible */
              minWidth: "100%",
              /* Full content height based on hour count and height */
              height: `${hourHeight * TOTAL_HOURS + 20}px`,
            }}
          >
            {/* Hour markers */}
            <div className="w-16 absolute left-0 top-0 border-r border-[#dadce0] bg-white z-10 sticky">
              {hours.map((hour, index) => (
                <div
                  key={index}
                  className="text-right pr-2 text-xs text-[#5f6368] font-medium"
                  style={{
                    height: `${hourHeight}px`,
                    paddingTop: "4px",
                  }}
                >
                  {`${hour}:00`}
                </div>
              ))}
            </div>

            {/* Grid and timeslots */}
            <div className="ml-16 absolute right-0 top-0 border-r border-[#dadce0] calendar-column">
              {/* Horizontal grid lines */}
              {hours.map((hour, index) => (
                <div
                  key={index}
                  className="border-t border-[#dadce0]"
                  style={{ height: `${hourHeight}px` }}
                ></div>
              ))}

              {/* Render the timeslots */}
              {Object.entries(groupedByTime).map(
                ([timeKey, slots], groupIdx) => {
                  const firstSlot = slots[0];
                  const startTime = new Date(firstSlot.startTime);
                  const endTime = new Date(firstSlot.endTime);
                  const startHourFraction =
                    startTime.getHours() + startTime.getMinutes() / 60;
                  const endHourFraction =
                    endTime.getHours() + endTime.getMinutes() / 60;
                  const top = (startHourFraction - START_HOUR) * hourHeight;
                  const height =
                    (endHourFraction - startHourFraction) * hourHeight;

                  // Only show if within visible range
                  if (
                    startHourFraction >= END_HOUR + 1 ||
                    endHourFraction <= START_HOUR
                  )
                    return null;

                  // For small screens or many options, use the expandable component
                  if (slots.length > 1 && (isSmallScreen || slots.length > 3)) {
                    return (
                      <ExpandableTimeslots
                        key={timeKey}
                        slots={slots}
                        timeKey={timeKey}
                        top={top}
                        height={height}
                        onSelectTimeslot={onSelectTimeslot}
                        activeClientType={clientType}
                      />
                    );
                  }

                  // For larger screens with 2-3 options, show side by side
                  if (slots.length > 1) {
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
                              activeClientType={clientType}
                            />
                          </div>
                        ))}
                      </div>
                    );
                  }

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
                        activeClientType={clientType}
                      />
                    </div>
                  );
                }
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function WeekView({
  weekDays,
  timeslots,
  onSelectTimeslot,
  selectedDate,
  onSelectDate,
  clientType,
}: WeekViewProps) {
  const { width } = useWindowSize();
  const isMobile = width < 768; // Mobile breakpoint
  const isSmallScreen = width < 1024; // Small screen breakpoint

  const today = getNowInIsrael();

  // To correctly handle Saturday slots
  const hasSaturday = weekDays.some((day) => day.getDay() === 6);

  if (isMobile) {
    // Mobile view implementation
    const [activeDate, setActiveDate] = useState<Date>(selectedDate || today);

    useEffect(() => {
      if (selectedDate) {
        setActiveDate(selectedDate);
      }
    }, [selectedDate]);

    const handleDateSelect = (date: Date) => {
      setActiveDate(date);
      if (onSelectDate) {
        onSelectDate(date);
      }
    };

    return (
      <div className="flex-1 flex flex-col h-full">
        <CalendarInfo />

        {/* Mobile date selector */}
        <div className="flex overflow-x-auto hide-scrollbar py-2">
          {weekDays.map((day, i) => (
            <div
              key={i}
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

        {/* Mobile day content */}
        <DaySchedule
          day={activeDate}
          timeslots={timeslots}
          onSelectTimeslot={onSelectTimeslot}
          selectedDate={selectedDate}
          onSelectDate={onSelectDate}
          clientType={clientType}
        />
      </div>
    );
  }

  // Desktop view
  return (
    <div className="h-full w-full flex flex-col">
      <CalendarInfo />
      <div className="flex-1 flex overflow-hidden">
        {weekDays.map((day, index) => (
          <div key={index} className="flex-1 min-w-0 min-h-0 overflow-hidden">
            <DaySchedule
              day={day}
              timeslots={timeslots}
              onSelectTimeslot={onSelectTimeslot}
              selectedDate={selectedDate}
              onSelectDate={onSelectDate}
              clientType={clientType}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
