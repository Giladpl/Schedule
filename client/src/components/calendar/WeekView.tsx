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
import React, { useEffect, useMemo, useState } from "react";

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
  isAdmin?: boolean;
}

// Simple info component instead of full legend
function CalendarInfo({
  isAdmin = false,
  userType = "new_customer",
}: {
  isAdmin?: boolean;
  userType?: string;
}) {
  return (
    <div className="bg-white p-2 mb-2 border border-[#dadce0] rounded-lg">
      <div className="flex items-start gap-2">
        <Info size={16} className="text-[#5f6368] mt-0.5" />
        <div className="text-sm text-[#5f6368]">
          {isAdmin ? (
            <>
              Admin Panel: You can see all appointment slots and filter by
              client type.
            </>
          ) : (
            <>
              {userType === "new_customer" ? (
                <>
                  When multiple meeting types are available for a time slot,
                  you'll see <strong>"X options available"</strong>. Click on
                  any slot to view and select your preferred meeting type.
                </>
              ) : (
                <>
                  You are viewing the schedule as a{" "}
                  {getClientTypeDisplayName(userType)} client. Only slots
                  available for your client type are shown.
                </>
              )}
            </>
          )}
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
  usePercentage,
}: {
  slots: Timeslot[];
  timeKey: string;
  top: string;
  height: string;
  onSelectTimeslot: (timeslot: Timeslot) => void;
  activeClientType?: string;
  usePercentage: boolean;
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
        top: usePercentage ? top : `${top}px`,
        left: "2px",
        right: "2px",
        height: usePercentage ? height : `${height}px`,
        zIndex: expanded ? 50 : 10, // Higher z-index when expanded
        maxHeight: expanded ? "80vh" : "auto",
        overflow: expanded ? "auto" : "visible",
        boxShadow: expanded ? "0 4px 20px rgba(0, 0, 0, 0.1)" : "none",
      }}
      className={`${expanded ? "bg-white shadow-lg border rounded-lg" : ""}`}
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

// Filter timeslots for the day
const getTimeslotsForDay = (
  date: Date,
  timeslots: Timeslot[],
  meetingType: string
): Timeslot[] => {
  if (!timeslots) return [];

  // Simple date string comparison for better performance
  const dateString = date.toISOString().split("T")[0];

  // Filter by date first
  const dayTimeslots = timeslots.filter((slot) => {
    const slotDate = new Date(slot.startTime);
    const slotDateString = slotDate.toISOString().split("T")[0];
    return slotDateString === dateString;
  });

  // If no meeting type filter is applied, just return all timeslots for this day
  if (!meetingType || meetingType === "all") {
    return dayTimeslots;
  }

  // Otherwise, filter by meeting type
  return dayTimeslots.filter((slot) => {
    const slotTypes = slot.meetingTypes.split(",").map((t) => t.trim());
    return slotTypes.includes(meetingType);
  });
};

// Component for a day's schedule
function DaySchedule({
  day,
  timeslots,
  onSelectTimeslot,
  selectedDate,
  onSelectDate,
  clientType,
  isAdmin,
  meetingType,
}: {
  day: Date;
  timeslots: Timeslot[];
  onSelectTimeslot: (timeslot: Timeslot) => void;
  selectedDate: Date | null;
  onSelectDate?: (date: Date) => void;
  clientType?: string;
  isAdmin?: boolean;
  meetingType?: string;
}) {
  const { width, height } = useWindowSize();
  const isMobile = useMemo(() => {
    return width < 640;
  }, [width]);

  // Add a local ref for scrolling to the current time
  const timelineRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (timelineRef.current) {
      timelineRef.current.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }
  }, []);

  const now = getNowInIsrael();

  // Filter timeslots for this day only - use the filtered data from the API
  const dayTimeslots = useMemo(() => {
    return getTimeslotsForDay(day, timeslots, meetingType || "all");
  }, [timeslots, day, meetingType]);

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

  // Get grouped visible timeslots for rendering
  const visibleHourlySlots = groupTimeslotsByHour(dayTimeslots);

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

  const { width: globalWidth } = useWindowSize();
  const isSmallScreen = globalWidth < 1024; // Small screen breakpoint

  if (isMobile) {
    return (
      <div className="flex-1 flex flex-col h-full">
        <div className="px-2 flex-1 flex flex-col">
          <h2 className="text-lg font-bold mb-2 text-center">
            {`${getDayName(day)} ${getDayOfMonth(day)}`}
          </h2>

          <div className="relative flex-1">
            {/* Fixed content container without scrolling */}
            <div className="absolute inset-0">
              {/* Content container */}
              <div style={{ height: "100%", position: "relative" }}>
                {/* Time markers */}
                <div
                  className="absolute left-0 top-0 bottom-0 w-16 border-r border-gray-200 bg-white"
                  style={{ zIndex: 30 }}
                >
                  {hours.map((hour, index) => (
                    <div
                      key={index}
                      className="flex items-center bg-white"
                      style={{ height: `${100 / TOTAL_HOURS}%` }}
                    >
                      <div className="w-16 text-xs text-gray-500 px-2 py-1 font-medium text-right">
                        {`${hour}:00`}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Grid lines */}
                <div className="absolute left-16 right-0 top-0 bottom-0">
                  {hours.map((hour, index) => (
                    <div
                      key={index}
                      className="border-t border-gray-200"
                      style={{ height: `${100 / TOTAL_HOURS}%` }}
                    ></div>
                  ))}
                </div>

                {/* Render timeslots for the day */}
                {Object.entries(visibleHourlySlots).map(
                  ([timeKey, slots], groupIdx) => {
                    const firstSlot = slots[0];
                    const startTime = new Date(firstSlot.startTime);
                    const endTime = new Date(firstSlot.endTime);
                    const startHourFraction =
                      startTime.getHours() + startTime.getMinutes() / 60;
                    const endHourFraction =
                      endTime.getHours() + endTime.getMinutes() / 60;

                    // Calculate position as percentage of total visible hours
                    const startPercent =
                      ((startHourFraction - START_HOUR) / TOTAL_HOURS) * 100;
                    const heightPercent =
                      ((endHourFraction - startHourFraction) / TOTAL_HOURS) *
                      100;

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
                          top={`${startPercent}%`}
                          height={`${heightPercent}%`}
                          onSelectTimeslot={onSelectTimeslot}
                          activeClientType={clientType}
                          usePercentage={true}
                        />
                      );
                    } else {
                      return (
                        <div
                          key={timeKey}
                          style={{
                            position: "absolute",
                            top: `${startPercent}%`,
                            left: "18px",
                            right: "2px",
                            height: `${heightPercent}%`,
                            zIndex: 20,
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
                  }
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // DESKTOP VIEW
  return (
    <div className="flex-1 flex flex-col h-full">
      {/* Day header */}
      <div
        className="flex-shrink-0 border-b border-[#dadce0] bg-white"
        style={{ zIndex: 40, position: "relative" }}
      >
        <div
          className={`text-center py-3 relative ${
            isSameDay(day, now) ? "bg-[#e8f0fe]" : ""
          }`}
        >
          <div
            className={`text-sm font-medium ${
              isSameDay(day, now) ? "text-[#1a73e8]" : "text-[#5f6368]"
            }`}
          >
            {getDayName(day)}
          </div>
          <div className="flex justify-center items-center mt-1">
            <div
              className={`${
                isSameDay(day, now)
                  ? "text-[#1a73e8] bg-[#1a73e8] bg-opacity-10 rounded-full"
                  : ""
              } w-10 h-10 flex items-center justify-center font-google-sans text-xl`}
            >
              {getDayOfMonth(day)}
            </div>
          </div>
        </div>
      </div>

      {/* Time grid - redesigned to remove scrolling and make everything visible */}
      <div className="flex-1 relative">
        {/* Fixed content without scrolling */}
        <div className="absolute inset-0">
          {/* Content container with all hours visible */}
          <div style={{ height: "100%", position: "relative" }}>
            {/* Hour markers */}
            <div
              className="w-16 absolute left-0 top-0 bottom-0 border-r border-[#dadce0] bg-white"
              style={{ zIndex: 30 }}
            >
              {hours.map((hour, index) => (
                <div
                  key={index}
                  className="text-right pr-2 text-xs text-[#5f6368] font-medium bg-white"
                  style={{
                    height: `${100 / TOTAL_HOURS}%`,
                    position: "relative",
                    paddingTop: "4px",
                  }}
                >
                  {`${hour}:00`}
                </div>
              ))}
            </div>

            {/* Grid and timeslots */}
            <div className="ml-16 absolute left-0 right-0 top-0 bottom-0 border-r border-[#dadce0]">
              {/* Horizontal grid lines */}
              {hours.map((hour, index) => (
                <div
                  key={index}
                  className="border-t border-[#dadce0]"
                  style={{ height: `${100 / TOTAL_HOURS}%` }}
                ></div>
              ))}

              {/* Render the timeslots */}
              {Object.entries(visibleHourlySlots).map(
                ([timeKey, slots], groupIdx) => {
                  const firstSlot = slots[0];
                  const startTime = new Date(firstSlot.startTime);
                  const endTime = new Date(firstSlot.endTime);
                  const startHourFraction =
                    startTime.getHours() + startTime.getMinutes() / 60;
                  const endHourFraction =
                    endTime.getHours() + endTime.getMinutes() / 60;

                  // Calculate position as percentage of total visible hours
                  const startPercent =
                    ((startHourFraction - START_HOUR) / TOTAL_HOURS) * 100;
                  const heightPercent =
                    ((endHourFraction - startHourFraction) / TOTAL_HOURS) * 100;

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
                        top={`${startPercent}%`}
                        height={`${heightPercent}%`}
                        onSelectTimeslot={onSelectTimeslot}
                        activeClientType={clientType}
                        usePercentage={true}
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
                          top: `${startPercent}%`,
                          left: "2px",
                          right: "2px",
                          height: `${heightPercent}%`,
                          zIndex: 20,
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
                        top: `${startPercent}%`,
                        left: "2px",
                        right: "2px",
                        height: `${heightPercent}%`,
                        zIndex: 20,
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

export default function WeekView({
  weekDays,
  timeslots,
  onSelectTimeslot,
  selectedDate,
  onSelectDate,
  clientType = "all",
  isAdmin = false,
  meetingType = "all",
}: WeekViewProps & { meetingType?: string }) {
  // Clear any potentially duplicated container refs
  const containerRef = React.useRef<HTMLDivElement>(null);

  // Calculate available height for the time grid
  const [availableHeight, setAvailableHeight] = useState<number>(600);
  const { width, height } = useWindowSize();

  useEffect(() => {
    // Calculate available height
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      // Set the available height, minus some padding for headers, etc.
      setAvailableHeight(Math.max(window.innerHeight - rect.top - 40, 400));
    }
  }, [width, height]);

  // Use a fixed hour range for consistency
  const startHour = 7; // 7 AM
  const endHour = 22; // 10 PM
  const totalHours = endHour - startHour;

  // Adapt hour height based on available space
  const hourHeight = availableHeight / totalHours;

  // Pre-filter all timeslots by meeting type if specified - this is crucial for correct filtering
  const filteredTimeslots = useMemo(() => {
    if (meetingType && meetingType !== "all") {
      return timeslots.filter((slot) =>
        slot.meetingTypes.split(",").some((t) => t.trim() === meetingType)
      );
    }
    return timeslots;
  }, [timeslots, meetingType]);

  return (
    <div
      ref={containerRef}
      className="flex-1 flex flex-col h-full overflow-hidden"
    >
      <CalendarInfo isAdmin={isAdmin} />
      <div className="grid grid-cols-7 gap-0 border border-[#dadce0] flex-1 overflow-hidden">
        {weekDays.map((day, i) => (
          <DaySchedule
            key={i}
            day={day}
            timeslots={filteredTimeslots}
            onSelectTimeslot={onSelectTimeslot}
            selectedDate={selectedDate}
            onSelectDate={onSelectDate}
            clientType={clientType}
            isAdmin={isAdmin}
            meetingType={meetingType}
          />
        ))}
      </div>
    </div>
  );
}
