import { fetchClientData } from "@/lib/calendarService";
import { cn } from "@/lib/utils";
import { Timeslot } from "@shared/schema";
import { useQuery } from "@tanstack/react-query";
import { Calendar, Clock, Phone, Users, Video } from "lucide-react";
import React, { useMemo } from "react";

// פונקציה ליצירת צבע עקבי מחרוזת (hash-based)
export function stringToColor(str: string): string {
  if (!str || typeof str !== "string") {
    return "#6366f1"; // Default indigo color
  }

  // רשימת צבעים בסיסיים עם ניגודיות גבוהה מאוד - צבעים חדים ושונים זה מזה
  const baseColors = [
    "#1a73e8", // כחול Google כהה
    "#ea4335", // אדום Google
    "#34a853", // ירוק Google
    "#fbbc04", // צהוב Google
    "#9c27b0", // סגול עמוק
    "#00bcd4", // טורקיז בהיר
    "#ff6d01", // כתום בוהק
    "#d81b60", // ורוד עמוק/פוקסיה
    "#3949ab", // אינדיגו כהה
    "#2e7d32", // ירוק יער
    "#c62828", // אדום חזק
    "#0277bd", // כחול בינוני
    "#f57c00", // כתום אש
    "#455a64", // כחול-אפור כהה
    "#6a1b9a", // סגול חזק
    "#4e342e", // חום כהה
    "#00695c", // טורקיז כהה
    "#558b2f", // ירוק זית
    "#ef6c00", // כתום חום
    "#0097a7", // ציאן כהה
  ];

  // יצירת hash מהמחרוזת
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0; // המרה ל-32bit integer
  }

  // בחירת צבע מרשימת הצבעים הקבועה או יצירת צבע אקראי מאוד מובחן
  if (Math.abs(hash) % 4 !== 0 || baseColors.length === 0) {
    // שימוש בשיטת הצבעים הקבועים (3/4 מהמקרים)
    const index = Math.abs(hash) % baseColors.length;
    return baseColors[index];
  } else {
    // יצירת צבע אקראי עם ערכי בהירות וריווי גבוהים (1/4 מהמקרים)
    // בחירת גוון שאינו קרוב לגוונים אחרים בסט הקבוע
    const hueOffset = (Math.abs(hash) % 12) * 30; // קפיצות של 30 מעלות לגוונים מובחנים
    const hue = hueOffset; // 0-360

    // שימוש בריווי ובהירות שיוצרים צבעים חזקים וברורים
    const saturation = 85 + (Math.abs(hash) % 15); // ריווי גבוה (85%-100%)
    const lightness = 40 + (Math.abs(hash >> 6) % 15); // בהירות מאוזנת (40%-55%)

    return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
  }
}

// Map client types to colors - מינימלי ומרחיב באופן דינמי
export const CLIENT_TYPE_COLORS: Record<string, string> = {
  all: "#6366f1", // indigo
  new_customer: "#1a73e8", // Blue
  "0": "#1a73e8", // לקוח חדש
  "1": "#ea4335", // פולי אחים
  "2": "#34a853", // מדריכים+
  "3": "#fbbc04", // מכירת עוגות
};

// Meeting type to icon mapping
export const MEETING_TYPE_ICONS: Record<string, React.ReactNode> = {
  טלפון: <Phone size={14} className="text-white" />,
  זום: <Video size={14} className="text-white" />,
  פגישה: <Users size={14} className="text-white" />,
};

// Meeting type to color and hebrew display name mapping
export const MEETING_TYPE_STYLES: Record<
  string,
  { color: string; name: string }
> = {
  טלפון: { color: "#34a853", name: "טלפון" },
  זום: { color: "#4285f4", name: "זום" },
  פגישה: { color: "#ea4335", name: "פגישה" },
  default: { color: "#8b5cf6", name: "" },
};

interface TimeSlotProps extends React.HTMLAttributes<HTMLDivElement> {
  timeslot: Timeslot;
  onClick?: () => void;
  activeClientTypes?: string[]; // Updated to accept an array of client types
  viewMode?: "admin" | "client"; // Add viewMode prop
}

export function TimeSlot({
  timeslot,
  onClick,
  className,
  activeClientTypes = [],
  viewMode = "admin", // Default to admin view
  ...props
}: TimeSlotProps) {
  // Fetch client data from the server
  const { data: clientData } = useQuery({
    queryKey: ["/api/client-data"],
    queryFn: fetchClientData,
    staleTime: 60000, // 1 minute
  });

  // Store element ref to measure height
  const slotRef = React.useRef<HTMLDivElement>(null);
  const [isCompact, setIsCompact] = React.useState(false);
  const [isUltraCompact, setIsUltraCompact] = React.useState(false);
  const [showTooltip, setShowTooltip] = React.useState(false);
  const isAdmin = viewMode === "admin";

  // Check height on mount and resize
  React.useEffect(() => {
    const checkHeight = () => {
      if (slotRef.current) {
        const height = slotRef.current.offsetHeight;
        setIsCompact(height < 85); // Switch to compact mode if height is less than 85px
        setIsUltraCompact(height < 50); // Switch to ultra-compact mode if height is less than 50px
      }
    };

    // Check height initially and on window resize
    checkHeight();
    window.addEventListener("resize", checkHeight);

    return () => window.removeEventListener("resize", checkHeight);
  }, []);

  // Check if "all" is included in client types or if the array is empty
  // Empty selection means "all"
  const hasAllClientType =
    activeClientTypes.length === 0 || activeClientTypes.includes("all");

  const isAvailable = timeslot.isAvailable;

  const startTime = new Date(timeslot.startTime);
  const endTime = new Date(timeslot.endTime);

  // Format the time range with 24-hour format
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString("he-IL", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  };

  // Ensure start time comes before end time in display
  const timeRangeStr = `${formatTime(startTime)} - ${formatTime(endTime)}`;

  // Calculate duration for display
  const durationMinutes = Math.round(
    (endTime.getTime() - startTime.getTime()) / (1000 * 60)
  );

  // Show exact remaining minutes if the timeslot was adjusted
  const displayDuration = timeslot.remainingMinutes || durationMinutes;

  const durationStr =
    displayDuration >= 60 * 12
      ? "Full Day Availability"
      : displayDuration >= 60
      ? `${Math.floor(displayDuration / 60)}h ${
          displayDuration % 60 > 0 ? `${displayDuration % 60}m` : ""
        }`
      : `${displayDuration}m`;

  // Parse meeting types
  const meetingTypesList = timeslot.meetingTypes
    .split(",")
    .map((type) => type.trim())
    .filter(Boolean);

  // Process client types to get unique display names without duplicates
  const clientTypes = useMemo(() => {
    let types: string[] = [];

    // When client type filters are active, use those client types for display
    if (!hasAllClientType) {
      // Use a Set to eliminate duplicates in a way compatible with older JavaScript
      const uniqueTypes = new Set<string>();
      activeClientTypes.forEach((type) => {
        if (type && type !== "all") {
          uniqueTypes.add(type);
        }
      });
      types = Array.from(uniqueTypes);
    } else if (timeslot.clientType !== "all") {
      // If no filter but timeslot has a specific client type
      types = [timeslot.clientType];
    } else {
      // When "all" is selected, show ribbons for all client types
      // Use client types from API data if available
      if (clientData?.clients && clientData.clients.length > 0) {
        types = clientData.clients.map((client) =>
          client.id !== undefined ? `${client.id}` : client.type
        );
      } else {
        // Fallback to basic types if no API data
        types = ["0", "1", "2", "3"];
      }
    }

    return types;
  }, [timeslot.clientType, activeClientTypes, hasAllClientType, clientData]);

  // Function to get client type display name
  const getClientTypeName = (type: string): string => {
    if (type === "all") return "כל הלקוחות";

    if (clientData?.clients) {
      // First try to match by ID if it's a numeric string
      if (!isNaN(Number(type))) {
        const client = clientData.clients.find((c) => c.id === Number(type));
        if (client) return client.type;
      }

      // Then try to match by type name
      const client = clientData.clients.find((c) => c.type === type);
      if (client) return client.type;
    }

    // Fallback for known types
    const fallbackNames: Record<string, string> = {
      "0": "לקוח חדש",
      "1": "פולי אחים",
      "2": "מדריכים+",
      "3": "מכירת עוגות",
      new_customer: "לקוח חדש",
    };

    return fallbackNames[type] || type;
  };

  // Function to get allowed meeting types for a client type
  const getAllowedMeetingTypes = (clientType: string): string[] => {
    if (clientType === "all") return ["טלפון", "זום", "פגישה"];

    if (clientData?.clients) {
      // Try to find client by ID if it's a numeric string
      if (!isNaN(Number(clientType))) {
        const client = clientData.clients.find(
          (c) => c.id === Number(clientType)
        );
        if (client && client.meetings) {
          return Object.keys(client.meetings);
        }
      }

      // Try to find client by type name
      const client = clientData.clients.find((c) => c.type === clientType);
      if (client && client.meetings) {
        return Object.keys(client.meetings);
      }
    }

    // Fallback for known client types
    const fallbackAllowedTypes: Record<string, string[]> = {
      "0": ["טלפון", "זום", "פגישה"], // לקוח חדש
      "1": ["טלפון", "פגישה"], // פולי אחים
      "2": ["טלפון", "זום"], // מדריכים+
      "3": ["טלפון", "פגישה"], // מכירת עוגות
      new_customer: ["טלפון", "זום", "פגישה"],
    };

    return fallbackAllowedTypes[clientType] || [];
  };

  // This ensures meeting types are properly displayed and filtered based on client type
  const filteredMeetingTypes = useMemo(() => {
    // If "all" client type is selected, show all meeting types
    if (hasAllClientType || activeClientTypes.includes("all")) {
      return meetingTypesList;
    }

    // Filter meeting types based on selected client types
    const allowedMeetingTypes = new Set<string>();

    // Add all meeting types allowed for each selected client type
    activeClientTypes.forEach((clientType) => {
      const allowedTypes = getAllowedMeetingTypes(clientType);
      allowedTypes.forEach((type) => allowedMeetingTypes.add(type));
    });

    // Only keep meeting types that are allowed for the selected client types
    return meetingTypesList.filter((type) => allowedMeetingTypes.has(type));
  }, [meetingTypesList, activeClientTypes, hasAllClientType, clientData]);

  // Build tooltip content for the timeslot
  const tooltipContent = useMemo(() => {
    const clientTypeNames = clientTypes
      .map((type) => getClientTypeName(type))
      .join(", ");
    const meetingTypeNames = filteredMeetingTypes
      .map((type) => MEETING_TYPE_STYLES[type]?.name || type)
      .join(", ");

    return (
      <div className="bg-black/80 text-white p-2 rounded-md text-xs shadow-lg z-50 max-w-[200px]">
        {/* Hebrew style time format (end - start) */}
        <div className="font-bold">
          {formatTime(endTime)} - {formatTime(startTime)}
        </div>
        <div>{durationStr}</div>
        {isAdmin && clientTypeNames && (
          <div className="mt-1">
            <span className="text-gray-300">Client:</span> {clientTypeNames}
          </div>
        )}
        <div className="mt-1">
          <span className="text-gray-300">Meeting:</span> {meetingTypeNames}
        </div>
      </div>
    );
  }, [
    formatTime,
    endTime,
    startTime,
    durationStr,
    clientTypes,
    filteredMeetingTypes,
    isAdmin,
  ]);

  const [tooltipPosition, setTooltipPosition] = React.useState({ x: 0, y: 0 });

  // Handle mouse events for custom tooltip
  const handleMouseEnter = (e: React.MouseEvent) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setTooltipPosition({
      x: rect.left + window.scrollX,
      y: rect.bottom + window.scrollY,
    });
    setShowTooltip(true);
  };

  const handleMouseLeave = () => {
    setShowTooltip(false);
  };

  // For ultra-compact view, determine the primary meeting type to show
  const primaryMeetingType = useMemo(() => {
    if (filteredMeetingTypes.length === 0) return null;
    // Prioritize phone calls for quick appointments, then Zoom, then in-person
    if (filteredMeetingTypes.includes("טלפון")) return "טלפון";
    if (filteredMeetingTypes.includes("זום")) return "זום";
    return filteredMeetingTypes[0];
  }, [filteredMeetingTypes]);

  // Get style for the primary meeting type
  const primaryMeetingStyle = primaryMeetingType
    ? MEETING_TYPE_STYLES[primaryMeetingType] || MEETING_TYPE_STYLES.default
    : MEETING_TYPE_STYLES.default;

  // For client type ribbon tooltip
  const [ribbonTooltip, setRibbonTooltip] = React.useState<{
    show: boolean;
    content: string;
    x: number;
    y: number;
  }>({
    show: false,
    content: "",
    x: 0,
    y: 0,
  });

  // Handle ribbon mouse events
  const handleRibbonMouseEnter = (
    e: React.MouseEvent,
    clientTypeName: string
  ) => {
    if (!isAdmin) return; // Only show in admin view

    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setRibbonTooltip({
      show: true,
      content: clientTypeName,
      x: rect.right + window.scrollX + 5,
      y: rect.top + window.scrollY + rect.height / 2,
    });

    // Prevent parent tooltip from showing
    e.stopPropagation();
  };

  const handleRibbonMouseLeave = (e: React.MouseEvent) => {
    setRibbonTooltip({ ...ribbonTooltip, show: false });
    e.stopPropagation();
  };

  // Format time for Hebrew style (end - start)
  const hebrewStyleTimeRange = `${formatTime(endTime)} - ${formatTime(
    startTime
  )}`;

  // Special ultra-compact single-line layout for very small slots
  if (isUltraCompact) {
    return (
      <>
        <div
          ref={slotRef}
          className={cn(
            "relative h-full w-full overflow-hidden rounded-lg border px-2 py-1 text-xs",
            isAvailable
              ? "border-green-200 bg-green-50"
              : "border-gray-200 bg-gray-50",
            "hover:border-blue-500 hover:bg-blue-50 cursor-pointer transition-colors",
            "flex items-center justify-between", // Changed to justify-between
            className
          )}
          onClick={onClick}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          {...props}
        >
          {/* Client type ribbon - thinner for ultra-compact */}
          <div className="absolute right-0 top-0 bottom-0 w-1.5">
            {clientTypes.length === 0 ? (
              <div
                className="absolute inset-0"
                style={{ backgroundColor: "#6366f1" }}
                onMouseEnter={
                  isAdmin
                    ? (e) => handleRibbonMouseEnter(e, "כל הלקוחות")
                    : undefined
                }
                onMouseLeave={isAdmin ? handleRibbonMouseLeave : undefined}
              />
            ) : (
              clientTypes.map((type, index) => {
                const color = CLIENT_TYPE_COLORS[type] || stringToColor(type);
                const name = getClientTypeName(type);
                const height =
                  clientTypes.length > 1
                    ? `${100 / clientTypes.length}%`
                    : "100%";
                const top =
                  clientTypes.length > 1
                    ? `${(index * 100) / clientTypes.length}%`
                    : "0";

                return (
                  <div
                    key={index}
                    style={{
                      position: "absolute",
                      top,
                      right: 0,
                      height,
                      width: "100%",
                      backgroundColor: color,
                    }}
                    onMouseEnter={
                      isAdmin
                        ? (e) => handleRibbonMouseEnter(e, name)
                        : undefined
                    }
                    onMouseLeave={isAdmin ? handleRibbonMouseLeave : undefined}
                  />
                );
              })
            )}
          </div>

          {/* Left side - Meeting type icon */}
          <div className="flex items-center justify-center z-10 ml-1">
            {primaryMeetingType && (
              <div
                className="flex items-center justify-center rounded-full p-1"
                style={{ backgroundColor: primaryMeetingStyle.color }}
              >
                {MEETING_TYPE_ICONS[primaryMeetingType] || (
                  <Calendar size={10} className="text-white" />
                )}
              </div>
            )}
          </div>

          {/* Right side - Time range in Hebrew style (end-start) */}
          <span className="text-xs font-medium truncate text-right pl-6 pr-3 z-10">
            {formatTime(endTime)} - {formatTime(startTime)}
          </span>
        </div>

        {/* Custom tooltip */}
        {showTooltip && (
          <div
            className="fixed pointer-events-none"
            style={{
              left: `${tooltipPosition.x}px`,
              top: `${tooltipPosition.y + 5}px`,
            }}
          >
            {tooltipContent}
          </div>
        )}

        {/* Client type ribbon tooltip */}
        {ribbonTooltip.show && (
          <div
            className="fixed pointer-events-none bg-black/80 text-white px-2 py-1 rounded-md text-xs shadow-lg z-50"
            style={{
              left: `${ribbonTooltip.x}px`,
              top: `${ribbonTooltip.y}px`,
              transform: "translateY(-50%)",
            }}
          >
            {ribbonTooltip.content}
          </div>
        )}
      </>
    );
  }

  return (
    <>
      <div
        ref={slotRef}
        className={cn(
          "relative h-full w-full overflow-hidden rounded-lg border px-3 py-2 text-xs",
          isAvailable
            ? "border-green-200 bg-green-50"
            : "border-gray-200 bg-gray-50",
          "hover:border-blue-500 hover:bg-blue-50 cursor-pointer transition-colors",
          "flex flex-col justify-between",
          isCompact && "py-1 px-2", // Use smaller padding for compact mode
          className
        )}
        onClick={onClick}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        {...props}
      >
        {/* Client type ribbons on right side */}
        <div className="absolute right-0 top-0 bottom-0 w-3">
          {clientTypes.length === 0 ? (
            <div
              className="absolute inset-0 client-type-ribbon"
              style={{ backgroundColor: "#6366f1" }}
              onMouseEnter={
                isAdmin
                  ? (e) => handleRibbonMouseEnter(e, "כל הלקוחות")
                  : undefined
              }
              onMouseLeave={isAdmin ? handleRibbonMouseLeave : undefined}
            />
          ) : (
            clientTypes.map((type, index) => {
              const color = CLIENT_TYPE_COLORS[type] || stringToColor(type);
              const name = getClientTypeName(type);
              const height =
                clientTypes.length > 1
                  ? `${100 / clientTypes.length}%`
                  : "100%";
              const top =
                clientTypes.length > 1
                  ? `${(index * 100) / clientTypes.length}%`
                  : "0";

              return (
                <div
                  key={index}
                  className="client-type-ribbon"
                  style={{
                    position: "absolute",
                    top,
                    right: 0,
                    height,
                    width: "100%",
                    backgroundColor: color,
                  }}
                  onMouseEnter={
                    isAdmin ? (e) => handleRibbonMouseEnter(e, name) : undefined
                  }
                  onMouseLeave={isAdmin ? handleRibbonMouseLeave : undefined}
                />
              );
            })
          )}
        </div>

        {/* Time range and duration - centered in card */}
        <div
          className={cn(
            "flex flex-col items-center justify-center text-center",
            isCompact ? "my-0" : "my-4" // Adjust margin for compact mode
          )}
        >
          <div className="flex items-center mb-1">
            <Clock
              size={isCompact ? 14 : 18}
              className="text-gray-600 shrink-0"
            />
            <span
              className={cn(
                "font-bold mx-1 text-gray-800",
                isCompact ? "text-xs" : "text-base mx-2.5" // Smaller text for compact mode
              )}
            >
              {/* Hebrew style time format (end - start) */}
              {formatTime(endTime)} - {formatTime(startTime)}
            </span>
          </div>
          {!isCompact && (
            <span className="text-gray-500 text-xs">{durationStr}</span>
          )}
        </div>

        {/* Meeting types as badges at bottom */}
        {filteredMeetingTypes.length > 0 &&
          filteredMeetingTypes[0] !== "all" && (
            <div
              className={cn(
                "flex flex-wrap gap-1 justify-center",
                isCompact ? "mt-0" : "mt-1 gap-2" // Adjust margin and gap for compact mode
              )}
            >
              {filteredMeetingTypes.map((type, index) => {
                const style =
                  MEETING_TYPE_STYLES[type] || MEETING_TYPE_STYLES.default;
                return (
                  <div
                    key={index}
                    className={cn(
                      "flex items-center rounded-full shadow-sm",
                      isCompact ? "px-1.5 py-0.5" : "px-2 py-1 gap-x-1" // Smaller padding for compact mode
                    )}
                    style={{ backgroundColor: style.color }}
                  >
                    <span className="flex items-center justify-center">
                      {MEETING_TYPE_ICONS[type] || (
                        <Calendar
                          size={isCompact ? 12 : 14}
                          className="text-white"
                        />
                      )}
                    </span>
                    {/* Only show text in non-compact mode */}
                    {!isCompact && (
                      <span className="text-white font-medium text-[11px]">
                        {style.name || type}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
      </div>

      {/* Custom tooltip */}
      {showTooltip && (
        <div
          className="fixed pointer-events-none z-50"
          style={{
            left: `${tooltipPosition.x}px`,
            top: `${tooltipPosition.y + 5}px`,
          }}
        >
          {tooltipContent}
        </div>
      )}

      {/* Client type ribbon tooltip */}
      {ribbonTooltip.show && (
        <div
          className="fixed pointer-events-none bg-black/80 text-white px-2 py-1 rounded-md text-xs shadow-lg z-50"
          style={{
            left: `${ribbonTooltip.x}px`,
            top: `${ribbonTooltip.y}px`,
            transform: "translateY(-50%)",
          }}
        >
          {ribbonTooltip.content}
        </div>
      )}
    </>
  );
}
