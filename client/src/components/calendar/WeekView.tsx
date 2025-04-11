import { useWindowSize } from "@/hooks/useWindowSize";
import { getClientTypeDisplayName } from "@/lib/calendarService";
import { getNowInIsrael } from "@/lib/timeUtils";
import { getDayName, getDayOfMonth } from "@/lib/utils";
import { Timeslot } from "@shared/schema";
import {
  endOfDay,
  format,
  isSameDay,
  isValid,
  isWithinInterval,
  startOfDay,
} from "date-fns";
import { Calendar, ChevronDown, Clock } from "lucide-react";
import React, { useEffect, useMemo, useState } from "react";
import {
  CLIENT_TYPE_COLORS,
  MEETING_TYPE_ICONS,
  MEETING_TYPE_STYLES,
  stringToColor,
  TimeSlot,
} from "../ui/time-slot";

// Meeting type colors
const MEETING_TYPE_COLORS: Record<string, string> = {
  טלפון: "#34a853", // Green
  זום: "#4285f4", // Blue
  פגישה: "#ea4335", // Red
  default: "#fbbc04", // Yellow
};

interface WeekViewProps {
  startDate: Date;
  timeslots: Timeslot[];
  onTimeslotClick?: (timeslot: Timeslot) => void;
  selectedMeetingTypes?: string[];
  activeClientTypes?: string[];
  viewMode?: "admin" | "client";
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
        <Clock size={16} className="text-[#5f6368] mt-0.5" />
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
  activeClientTypes = [],
  usePercentage,
}: {
  slots: Timeslot[];
  timeKey: string;
  top: string;
  height: string;
  onSelectTimeslot: (timeslot: Timeslot) => void;
  activeClientTypes?: string[];
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

  // Determine the effective client type to display - with support for multiple selected client types
  const displayClientType =
    activeClientTypes &&
    activeClientTypes.length > 0 &&
    !activeClientTypes.includes("all")
      ? activeClientTypes[0] // Use the first active client type for display purposes
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
                  activeClientTypes={activeClientTypes}
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
  meetingTypes: string[],
  clientTypes?: string[]
): Timeslot[] => {
  if (!isValid(date)) {
    console.error("Invalid date in getTimeslotsForDay:", date);
    return [];
  }

  console.log(
    `[Debug] getTimeslotsForDay for ${format(
      date,
      "yyyy-MM-dd"
    )}, Meeting Types: ${meetingTypes?.join(",") || "all"}, Client Types: ${
      clientTypes?.join(",") || "all"
    }`
  );

  // Check for valid parameters
  if (!timeslots || !Array.isArray(timeslots)) {
    console.error(
      `[Debug] getTimeslotsForDay received invalid timeslots:`,
      timeslots
    );
    return [];
  }

  // Empty selection means "all" - this is crucial to fix the issue
  if (!meetingTypes || meetingTypes.length === 0) {
    meetingTypes = ["all"];
  }

  if (!clientTypes || clientTypes.length === 0) {
    clientTypes = ["all"];
  }

  // Get start and end of the day
  try {
    const dayStart = startOfDay(date);
    const dayEnd = endOfDay(date);

    console.log(
      `[Debug] Day boundaries: ${dayStart.toISOString()} to ${dayEnd.toISOString()}`
    );

    // First filter timeslots that fall within this day
    let dayTimeslots = timeslots.filter((ts) => {
      const tsStart = new Date(ts.startTime);
      return isWithinInterval(tsStart, { start: dayStart, end: dayEnd });
    });

    console.log(
      `[Debug] Found ${dayTimeslots.length} timeslots within day ${format(
        date,
        "yyyy-MM-dd"
      )}`
    );

    const hasAllMeetingType = meetingTypes.includes("all");
    const hasAllClientType = clientTypes.includes("all");

    // No filtering if "all" is selected for both
    if (hasAllMeetingType && hasAllClientType) {
      return dayTimeslots;
    }

    // Apply OR logic filtering
    return dayTimeslots.filter((slot) => {
      // Client type match condition
      const matchesClientType =
        hasAllClientType ||
        slot.clientType === "all" ||
        (clientTypes && clientTypes.includes(slot.clientType));

      // Meeting type match condition
      let matchesMeetingType = hasAllMeetingType;
      if (!hasAllMeetingType) {
        const slotMeetingTypes = slot.meetingTypes
          .split(",")
          .map((t) => t.trim());
        matchesMeetingType = slotMeetingTypes.some((type) =>
          meetingTypes.includes(type)
        );
      }

      // OR logic: show if it matches EITHER client type OR meeting type
      return matchesClientType || matchesMeetingType;
    });
  } catch (error) {
    console.error("Error in getTimeslotsForDay:", error);
    return [];
  }
};

// Component for displaying the current time indicator
function CurrentTimeIndicator() {
  const [currentTime, setCurrentTime] = useState(getNowInIsrael());

  // Update current time every minute
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(getNowInIsrael());
    }, 60000); // Update every minute

    return () => clearInterval(interval);
  }, []);

  // Calculate position based on current time
  const currentHour = currentTime.getHours();
  const currentMinute = currentTime.getMinutes();

  // Calculate percentage for positioning (0-24h scale)
  const hourPercentage = ((currentHour - 7 + currentMinute / 60) / 16) * 100;

  return (
    <div
      className="absolute left-0 right-0 z-40 pointer-events-none"
      style={{
        top: `${hourPercentage}%`,
      }}
    >
      <div className="flex items-center">
        <div className="w-3 h-3 rounded-full bg-red-500 shadow-lg"></div>
        <div className="h-[2px] flex-grow bg-red-500"></div>
      </div>
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
  activeClientTypes = [],
  isAdmin,
  meetingType,
  cellHourHeight,
  usePercentage,
  isToday,
}: {
  day: Date;
  timeslots: Timeslot[] | Timeslot[][];
  onSelectTimeslot: (timeslot: Timeslot) => void;
  selectedDate: Date | null;
  onSelectDate?: (date: Date) => void;
  activeClientTypes?: string[];
  isAdmin?: boolean;
  meetingType?: string;
  cellHourHeight: number;
  usePercentage: boolean;
  isToday: boolean;
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

  // Ensure timeslots is properly processed as a flat array
  const flatTimeslots = useMemo(() => {
    if (!timeslots) return [];

    // Handle both types: Timeslot[] and Timeslot[][]
    if (Array.isArray(timeslots) && timeslots.length > 0) {
      // Check if it's already a flat array of Timeslot objects
      if (!Array.isArray(timeslots[0])) {
        return timeslots as Timeslot[];
      }
      // If it's a nested array, flatten it
      return (timeslots as Timeslot[][]).flat();
    }

    return [];
  }, [timeslots]);

  // Filter timeslots for this day only - use the filtered data from the API
  const dayTimeslots = useMemo(() => {
    return getTimeslotsForDay(
      day,
      flatTimeslots,
      meetingType ? [meetingType] : ["all"],
      activeClientTypes.length > 0 ? activeClientTypes : ["all"]
    );
  }, [flatTimeslots, day, meetingType, activeClientTypes]);

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

  // Current time indicator state
  const [currentTime, setCurrentTime] = useState(getNowInIsrael());

  // Update time every minute
  useEffect(() => {
    if (!isToday) return;

    const interval = setInterval(() => {
      setCurrentTime(getNowInIsrael());
    }, 60000);

    return () => clearInterval(interval);
  }, [isToday]);

  // Calculate time indicator position
  const timeIndicatorPosition = useMemo(() => {
    if (!isToday) return 0;

    const israelNow = currentTime;
    const hour = israelNow.getHours();
    const minutes = israelNow.getMinutes();

    // Only show if current time is within the displayed hours
    if (hour < START_HOUR || hour > END_HOUR) return -1;

    // Calculate position as percentage of daily timeline
    const hourFraction = hour - START_HOUR + minutes / 60;
    return (hourFraction / TOTAL_HOURS) * 100;
  }, [currentTime, isToday, START_HOUR, END_HOUR, TOTAL_HOURS]);

  // Calculate available height for the time grid
  const availableHeight = height - 180; // Approx header + info section height

  // Calculate adaptive hour height based on available space (min 48px, prefer 64px)
  const dayCellHourHeight = Math.max(
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
                          activeClientTypes={activeClientTypes}
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
                            activeClientTypes={activeClientTypes}
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
        <div className="text-center py-2 relative flex flex-col items-center justify-center h-[72px] ml-16">
          <div
            className={`text-sm font-medium mb-1 ${
              isSameDay(day, now) ? "text-[#1a73e8]" : "text-[#5f6368]"
            }`}
          >
            {getDayName(day)}
          </div>
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
                        activeClientTypes={activeClientTypes}
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
                              activeClientTypes={activeClientTypes}
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
                        activeClientTypes={activeClientTypes}
                      />
                    </div>
                  );
                }
              )}
            </div>
          </div>
        </div>

        {/* Time indicator - only for today */}
        {isToday && (
          <div
            className="absolute left-0 right-0 z-50 pointer-events-none"
            style={{
              top: `${
                ((currentTime.getHours() -
                  START_HOUR +
                  currentTime.getMinutes() / 60) /
                  TOTAL_HOURS) *
                100
              }%`,
            }}
          >
            <div className="flex items-center">
              <div className="w-3 h-3 rounded-full bg-red-500"></div>
              <div className="h-[2px] flex-grow bg-red-500"></div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function WeekView({
  startDate,
  timeslots,
  onTimeslotClick,
  selectedMeetingTypes = ["all"],
  activeClientTypes = ["all"],
  viewMode = "admin",
}: WeekViewProps) {
  const timeGridRef = React.useRef<HTMLDivElement>(null);
  const [globalHourHeight, setGlobalHourHeight] = useState(60); // Default hour height in pixels

  // Generate days of the week
  const days = useMemo(() => {
    const result = [];
    const currentDate = new Date(startDate);

    // Ensure startDate is valid, if not, use current date
    if (!isValid(currentDate)) {
      console.error("Invalid startDate provided:", startDate);
      const today = new Date();

      for (let i = 0; i < 7; i++) {
        const day = new Date(today);
        day.setDate(today.getDate() + i);
        result.push(day);
      }

      return result;
    }

    for (let i = 0; i < 7; i++) {
      const day = new Date(currentDate);
      day.setDate(currentDate.getDate() + i);
      if (!isValid(day)) {
        console.error("Invalid date generated:", day);
        continue;
      }
      result.push(day);
    }

    return result;
  }, [startDate]);

  // Hour labels from 7 AM to 10 PM
  const hourLabels = useMemo(() => {
    const labels = [];
    for (let i = 7; i <= 22; i++) {
      labels.push(`${i}:00`);
    }
    return labels;
  }, []);

  // Filter timeslots based on selected meeting types
  const filteredTimeslots = useMemo(() => {
    if (!timeslots || timeslots.length === 0) return [];

    let filtered = timeslots;

    // Empty selection means "all" - this is crucial to fix the issue
    const actualSelectedMeetingTypes =
      !selectedMeetingTypes || selectedMeetingTypes.length === 0
        ? ["all"]
        : selectedMeetingTypes;

    const actualClientTypes =
      !activeClientTypes || activeClientTypes.length === 0
        ? ["all"]
        : activeClientTypes;

    const hasAllMeetingType = actualSelectedMeetingTypes.includes("all");
    const hasAllClientType = actualClientTypes.includes("all");

    // Skip filtering if "all" is selected for both filters
    if (hasAllMeetingType && hasAllClientType) {
      return filtered;
    }

    // First, we need to determine which meeting types are allowed for the selected client types
    const allowedMeetingTypes = new Set<string>();

    // If "all" is selected for client types, all meeting types are allowed
    if (hasAllClientType) {
      allowedMeetingTypes.add("טלפון");
      allowedMeetingTypes.add("זום");
      allowedMeetingTypes.add("פגישה");
    } else {
      // Otherwise, only include meeting types that are compatible with the selected client types
      actualClientTypes.forEach((clientType) => {
        // Import CLIENT_ALLOWED_MEETING_TYPES and use it here
        // For now, hardcode the allowed meeting types
        if (clientType === "0" || clientType === "new_customer") {
          // לקוח חדש
          allowedMeetingTypes.add("טלפון");
          allowedMeetingTypes.add("זום");
          allowedMeetingTypes.add("פגישה");
        } else if (clientType === "1") {
          // פולי אחים
          allowedMeetingTypes.add("טלפון");
          allowedMeetingTypes.add("פגישה");
        } else if (clientType === "2") {
          // מדריכים+
          allowedMeetingTypes.add("טלפון");
          allowedMeetingTypes.add("זום");
        } else if (clientType === "3") {
          // מכירת עוגות
          allowedMeetingTypes.add("טלפון");
          allowedMeetingTypes.add("פגישה");
        }
      });
    }

    console.log(
      `[Debug] Allowed meeting types: ${Array.from(allowedMeetingTypes).join(
        ","
      )}`
    );

    // Filter by meeting types if specific meeting types are selected
    if (!hasAllMeetingType) {
      console.log(
        `[Debug] Filtering by meeting types: ${actualSelectedMeetingTypes.join(
          ","
        )}`
      );

      filtered = filtered.filter((ts) => {
        // Check if the timeslot has any of the selected meeting types (OR logic)
        const meetingTypeList = ts.meetingTypes.split(",").map((t) => t.trim());
        const hasSelectedType = meetingTypeList.some((type) =>
          actualSelectedMeetingTypes.includes(type)
        );

        if (!hasSelectedType) {
          console.log(
            `[Debug] Excluding timeslot - no matching meeting type: ${ts.meetingTypes}`
          );
        }

        return hasSelectedType;
      });

      console.log(
        `[Debug] After meeting type filtering: ${filtered.length} timeslots remaining`
      );
    }

    // Filter by client types if specific client types are selected
    if (!hasAllClientType) {
      console.log(
        `[Debug] Filtering by client types: ${actualClientTypes.join(",")}`
      );

      filtered = filtered.filter((ts) => {
        // First check if the timeslot is for the right client type
        const clientTypeMatch =
          ts.clientType === "all" ||
          actualClientTypes.includes(ts.clientType) ||
          (Array.isArray(ts.clientType) &&
            ts.clientType.some((ct) => actualClientTypes.includes(ct)));

        if (!clientTypeMatch) {
          return false;
        }

        // Then check if any of the timeslot's meeting types are allowed for the selected client types
        const meetingTypeList = ts.meetingTypes.split(",").map((t) => t.trim());
        const hasAllowedMeetingType = meetingTypeList.some((type) =>
          allowedMeetingTypes.has(type)
        );

        if (!hasAllowedMeetingType) {
          console.log(
            `[Debug] Excluding timeslot - no compatible meeting types: ${
              ts.meetingTypes
            } not in [${Array.from(allowedMeetingTypes).join(",")}]`
          );
        }

        return hasAllowedMeetingType;
      });

      console.log(
        `[Debug] After client type filtering: ${filtered.length} timeslots remaining`
      );
    }

    return filtered;
  }, [timeslots, selectedMeetingTypes, activeClientTypes]);

  // Group timeslots by day
  const dayTimeslots = useMemo(() => {
    const result: Record<string, Timeslot[]> = {};

    days.forEach((day) => {
      if (!isValid(day)) {
        console.error("Invalid day in days array:", day);
        return;
      }
      try {
        const dayStr = format(day, "yyyy-MM-dd");
        result[dayStr] = filteredTimeslots.filter((ts) => {
          try {
            const tsDate = new Date(ts.startTime);
            if (!isValid(tsDate)) {
              console.error("Invalid timeslot date:", ts.startTime);
              return false;
            }
            return format(tsDate, "yyyy-MM-dd") === dayStr;
          } catch (error) {
            console.error("Error processing timeslot:", ts, error);
            return false;
          }
        });
      } catch (error) {
        console.error("Error formatting day:", day, error);
      }
    });

    return result;
  }, [days, filteredTimeslots]);

  // Group overlapping timeslots
  const dayGroups = useMemo(() => {
    const result: Record<string, Timeslot[][]> = {};

    Object.keys(dayTimeslots).forEach((dayStr) => {
      const slots = dayTimeslots[dayStr];
      const groups: Timeslot[][] = [];

      // Sort by start time
      const sortedSlots = [...slots].sort(
        (a, b) =>
          new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
      );

      // Group timeslots with the exact same start and end times
      const timeGroups: Record<string, Timeslot[]> = {};

      sortedSlots.forEach((slot) => {
        const key = `${slot.startTime}-${slot.endTime}`;
        if (!timeGroups[key]) {
          timeGroups[key] = [];
        }
        timeGroups[key].push(slot);
      });

      // Add all groups to the result
      Object.values(timeGroups).forEach((group) => {
        if (group.length > 0) {
          groups.push(group);
        }
      });

      result[dayStr] = groups;
    });

    return result;
  }, [dayTimeslots]);

  // Get color based on meeting type
  const getMeetingTypeColor = (type: string): string => {
    return MEETING_TYPE_COLORS[type] || MEETING_TYPE_COLORS.default;
  };

  // Calculate the hour height based on the available space
  useEffect(() => {
    const calculateHourHeight = () => {
      if (timeGridRef.current) {
        const availableHeight = timeGridRef.current.clientHeight;
        const totalHours = hourLabels.length;
        const newHourHeight = Math.max(60, availableHeight / totalHours);
        setGlobalHourHeight(newHourHeight);
      }
    };

    calculateHourHeight();

    const resizeObserver = new ResizeObserver(calculateHourHeight);
    if (timeGridRef.current) {
      resizeObserver.observe(timeGridRef.current);
    }

    return () => {
      resizeObserver.disconnect();
    };
  }, [hourLabels.length]);

  // Generate timeslots for each day
  const weekTimeslots = days.map((day) =>
    getTimeslotsForDay(
      day,
      timeslots,
      selectedMeetingTypes,
      activeClientTypes || ["all"]
    )
  );

  // Calculate if each day is today's date
  const today = getNowInIsrael();
  const isToday = (date: Date) => {
    return isSameDay(date, today);
  };

  return (
    <div className="flex flex-col h-full" dir="rtl">
      <CalendarInfo isAdmin={viewMode === "admin"} />
      <div className="grid grid-cols-7 gap-0 border border-[#dadce0] flex-1 overflow-hidden">
        {days.map((day, i) => {
          if (!isValid(day)) {
            return (
              <div key={i} className="bg-red-50 p-2 text-red-500 text-xs">
                Invalid date error
              </div>
            );
          }

          let dayFormatStr;
          try {
            dayFormatStr = format(day, "yyyy-MM-dd");
          } catch (error) {
            console.error("Error formatting day:", day, error);
            dayFormatStr = "";
          }

          // Get timeslots for this day that match the meeting type filter
          let dayTimeslots: Timeslot[] = [];
          if (dayGroups[dayFormatStr]) {
            // Flatten the groups of timeslots for this day
            const allDayTimeslots = dayGroups[dayFormatStr].flat();

            // Filter by meeting type if needed
            if (
              selectedMeetingTypes.length > 0 &&
              selectedMeetingTypes.includes("all")
            ) {
              dayTimeslots = allDayTimeslots;
            } else {
              dayTimeslots = allDayTimeslots.filter((slot) => {
                // Check if this slot has the selected meeting type
                const meetingTypes =
                  slot.meetingTypes?.split(",").map((t) => t.trim()) || [];
                return meetingTypes.some((type) =>
                  selectedMeetingTypes.includes(type)
                );
              });
            }
          }

          return (
            <DaySchedule
              key={i}
              day={day}
              timeslots={dayTimeslots}
              onSelectTimeslot={onTimeslotClick || (() => {})}
              selectedDate={day}
              activeClientTypes={activeClientTypes || ["all"]}
              isAdmin={viewMode === "admin"}
              meetingType={selectedMeetingTypes.join(",")}
              cellHourHeight={globalHourHeight}
              usePercentage={true}
              isToday={isToday(day)}
            />
          );
        })}
      </div>
    </div>
  );
}
