import { fetchClientData } from "@/lib/calendarService";
import { cn } from "@/lib/utils";
import { Timeslot } from "@shared/schema";
import { useQuery } from "@tanstack/react-query";
import { Calendar, Clock, Phone, Users, Video } from "lucide-react";
import React, { useMemo } from "react";
import { createPortal } from "react-dom";

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
  // Hebrew names
  "לקוח חדש": "#9c27b0", // Purple
  "פולי אחים": "#2196f3", // Blue
  "מדריכים+": "#ff9800", // Orange
  "מכירת עוגות": "#4caf50", // Green

  // English equivalents
  new_customer: "#9c27b0", // Purple - same as לקוח חדש

  // Numeric IDs
  "0": "#9c27b0", // לקוח חדש - Purple
  "1": "#2196f3", // פולי אחים - Blue
  "2": "#ff9800", // מדריכים+ - Orange
  "3": "#4caf50", // מכירת עוגות - Green

  // Special values
  all: "#607d8b", // Gray-Blue
  default: "#9e9e9e", // Gray
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
  { color: string; name: string; icon: any }
> = {
  טלפון: { color: "#34a853", name: "טלפון", icon: Phone },
  זום: { color: "#4285f4", name: "זום", icon: Video },
  פגישה: { color: "#ea4335", name: "פגישה", icon: Users },
  default: { color: "#fbbc04", name: "", icon: null },
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
  // Add state for tooltip visibility
  const [showTooltip, setShowTooltip] = React.useState(false);
  const [tooltipPosition, setTooltipPosition] = React.useState({
    x: 0,
    y: 0,
    isBelow: false,
  });

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

  // Mouse handlers for tooltip
  const handleMouseEnter = (e: React.MouseEvent) => {
    const rect = slotRef.current?.getBoundingClientRect();
    if (rect) {
      // Calculate if there's enough space above, otherwise show below
      const spaceAbove = rect.top > 150;

      setTooltipPosition({
        x: rect.left + rect.width / 2, // Center of the timeslot
        y: spaceAbove ? rect.top : rect.bottom,
        isBelow: !spaceAbove,
      });
      setShowTooltip(true);
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    // No longer update position on mouse move
  };

  const handleMouseLeave = () => {
    setShowTooltip(false);
  };

  // Check if "all" is included in client types or if the array is empty
  // Empty selection means "all"
  const hasAllClientType =
    activeClientTypes.length === 0 || activeClientTypes.includes("all");

  const isAvailable = timeslot.isAvailable;

  const startTime = new Date(timeslot.startTime);
  const endTime = new Date(timeslot.endTime);

  // In component, check for this specific pattern:
  // If endTime is earlier than startTime, it's likely an error in the data,
  // In that case, swap them for display purposes only
  const displayStartTime =
    startTime.getTime() < endTime.getTime() ? startTime : endTime;
  const displayEndTime =
    startTime.getTime() < endTime.getTime() ? endTime : startTime;

  // Format the time range with 24-hour format
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString("he-IL", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  };

  // Calculate duration for display
  const durationMinutes = Math.round(
    (endTime.getTime() - startTime.getTime()) / (1000 * 60)
  );

  // Show exact remaining minutes if the timeslot was adjusted
  const displayDuration = timeslot.remainingMinutes || durationMinutes;

  // Calculate remaining time from now
  const now = new Date();
  const remainingMinutes = Math.max(
    0,
    Math.floor((endTime.getTime() - now.getTime()) / (1000 * 60))
  );

  // Flag for timeslots that are ending soon (less than 20 minutes left)
  const isEndingSoon = remainingMinutes > 0 && remainingMinutes < 20;

  const durationStr =
    displayDuration >= 60 * 12
      ? "Full Day Availability"
      : displayDuration >= 60
      ? `${Math.floor(displayDuration / 60)}h ${
          displayDuration % 60 > 0 ? `${displayDuration % 60}m` : ""
        }`
      : `${displayDuration}m`;

  // Special remaining time string for timeslots ending soon
  const remainingTimeStr =
    remainingMinutes > 0
      ? remainingMinutes === 1
        ? "דקה אחרונה"
        : `${remainingMinutes} דקות נותרו`
      : "";

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
      // When "all" is selected, only show client types that support the meeting types in this timeslot
      const meetingTypesList = timeslot.meetingTypes
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);

      // Check each client type to see if it supports any of the meeting types in this timeslot
      if (clientData?.clients && clientData.clients.length > 0) {
        const applicableClientTypes = new Set<string>();

        clientData.clients.forEach((client) => {
          // For each meeting type in the timeslot
          const clientSupportsAnyMeetingType = meetingTypesList.some(
            (meetingType) => {
              // Check if this client supports this meeting type
              return (
                client.meetings &&
                Object.keys(client.meetings).includes(meetingType)
              );
            }
          );

          // If this client supports any of the meeting types, add it to the set
          if (clientSupportsAnyMeetingType) {
            applicableClientTypes.add(
              client.id !== undefined ? `${client.id}` : client.type
            );
          }
        });

        types = Array.from(applicableClientTypes);
      } else {
        // Fallback to basic types if no API data - we'll filter these later
        types = ["0", "1", "2", "3"];
      }
    }

    return types;
  }, [
    timeslot.clientType,
    timeslot.meetingTypes,
    activeClientTypes,
    hasAllClientType,
    clientData,
  ]);

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
      // Numeric IDs as strings
      "0": ["טלפון", "זום", "פגישה"], // לקוח חדש
      "1": ["טלפון", "פגישה"], // פולי אחים
      "2": ["טלפון", "זום"], // מדריכים+
      "3": ["טלפון", "פגישה"], // מכירת עוגות

      // Hebrew names
      "לקוח חדש": ["טלפון", "זום", "פגישה"],
      "פולי אחים": ["טלפון", "פגישה"],
      "מדריכים+": ["טלפון", "זום"],
      "מכירת עוגות": ["טלפון", "פגישה"],

      // English name
      new_customer: ["טלפון", "זום", "פגישה"],

      // Special case
      all: ["טלפון", "זום", "פגישה"],
    };

    return fallbackAllowedTypes[clientType] || [];
  };

  // This function filters client types to only include ones that support any meeting types in the timeslot
  const compatibleClientTypes = useMemo(() => {
    // Get meeting types from the timeslot
    const meetingTypesList = timeslot.meetingTypes
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    // If there are no meeting types, return all client types
    if (meetingTypesList.length === 0) {
      return clientTypes;
    }

    // Filter client types to only include those that support the meeting types
    return clientTypes.filter((clientType) => {
      const allowedMeetingTypes = getAllowedMeetingTypes(clientType);
      // Check if any of the timeslot's meeting types are supported by this client
      return meetingTypesList.some((mt) => allowedMeetingTypes.includes(mt));
    });
  }, [clientTypes, timeslot.meetingTypes, getAllowedMeetingTypes]);

  // This ensures meeting types are properly displayed and filtered based on client type
  const filteredMeetingTypes = useMemo(() => {
    // Get the list of client types we should check against
    const clientTypesToCheck =
      hasAllClientType || activeClientTypes.includes("all")
        ? (clientData?.clients || []).map(
            (client) => client.id?.toString() || client.type
          )
        : activeClientTypes;

    // Enhanced debugging logs
    console.log(
      `[Debug-DETAILED] TimeSlot ID ${timeslot.id}: Starting filtering process`
    );
    console.log(
      `[Debug-DETAILED] TimeSlot ID ${
        timeslot.id
      }: Client types to check: ${clientTypesToCheck.join(", ")}`
    );
    console.log(
      `[Debug-DETAILED] TimeSlot ID ${
        timeslot.id
      }: Available meeting types in timeslot: ${meetingTypesList.join(", ")}`
    );
    console.log(
      `[Debug-DETAILED] TimeSlot ID ${timeslot.id}: timeslot.clientType = ${timeslot.clientType}`
    );
    console.log(
      `[Debug-DETAILED] TimeSlot ID ${
        timeslot.id
      }: activeClientTypes = ${activeClientTypes.join(", ")}`
    );

    // If the timeslot is specific to a client type (not "all"), respect that limitation
    if (timeslot.clientType !== "all") {
      // For timeslots with a specific client type, only show meeting types for that client
      const allowedTypes = getAllowedMeetingTypes(timeslot.clientType);
      console.log(
        `[Debug-DETAILED] TimeSlot ID ${
          timeslot.id
        }: Timeslot has specific client type ${
          timeslot.clientType
        }, allowed meeting types: ${allowedTypes.join(", ")}`
      );

      // Check if this specific client type is compatible with selected client types
      const isCompatibleWithSelectedTypes =
        hasAllClientType ||
        activeClientTypes.includes(timeslot.clientType) ||
        timeslot.clientType === "all";

      console.log(
        `[Debug-DETAILED] TimeSlot ID ${timeslot.id}: Is timeslot client type compatible with selection? ${isCompatibleWithSelectedTypes}`
      );

      // Filter meeting types to those allowed for this specific client type
      const filteredTypes = meetingTypesList.filter((type) =>
        allowedTypes.includes(type)
      );
      console.log(
        `[Debug-DETAILED] TimeSlot ID ${
          timeslot.id
        }: Filtered meeting types for specific client: ${filteredTypes.join(
          ", "
        )}`
      );
      return filteredTypes;
    }

    if (clientTypesToCheck.length === 0) {
      console.log(
        `[Debug-DETAILED] TimeSlot ID ${timeslot.id}: No client types to check, showing all meeting types`
      );
      return meetingTypesList; // Fallback if no client types are available
    }

    // FIXED: Completely rewritten filtering logic to ensure proper OR behavior

    // Get all meeting types from the timeslot
    const timeslotMeetingTypes = new Set(meetingTypesList);

    // Create a set to track which meeting types are supported by any client type
    const supportedMeetingTypes = new Set<string>();

    // Detailed logging for each client type's meeting types
    console.log(
      `[Debug-DETAILED] TimeSlot ID ${timeslot.id}: === Client Types and Their Meeting Types: ===`
    );
    clientTypesToCheck.forEach((clientType) => {
      const allowedTypes = getAllowedMeetingTypes(clientType);
      console.log(
        `[Debug-DETAILED] TimeSlot ID ${
          timeslot.id
        }: Client type ${clientType} allows meeting types: ${allowedTypes.join(
          ", "
        )}`
      );

      // Log intersection with timeslot meeting types
      const intersection = allowedTypes.filter((type) =>
        timeslotMeetingTypes.has(type)
      );
      console.log(
        `[Debug-DETAILED] TimeSlot ID ${
          timeslot.id
        }: Client type ${clientType} intersection with timeslot: ${intersection.join(
          ", "
        )}`
      );

      // Add each allowed type to our set of supported meeting types
      allowedTypes.forEach((type) => {
        if (timeslotMeetingTypes.has(type)) {
          supportedMeetingTypes.add(type);
        }
      });
    });

    // Convert the set back to an array, maintaining the original order from meetingTypesList
    const result = meetingTypesList.filter((type) =>
      supportedMeetingTypes.has(type)
    );
    console.log(
      `[Debug-DETAILED] TimeSlot ID ${
        timeslot.id
      }: Final filtered meeting types: ${result.join(", ")}`
    );
    console.log(
      `[Debug-DETAILED] TimeSlot ID ${timeslot.id}: Will timeslot be hidden? ${
        result.length === 0
      }`
    );
    return result;
  }, [
    meetingTypesList,
    activeClientTypes,
    hasAllClientType,
    clientData,
    timeslot.clientType,
    getAllowedMeetingTypes,
  ]);

  // Skip rendering completely if there are no allowed meeting types for this client type selection
  // This effectively hides timeslots that aren't applicable to the selected client types
  if (filteredMeetingTypes.length === 0) {
    console.log(
      `[Debug-HIDDEN] TimeSlot ${
        timeslot.id
      }: HIDING timeslot. Client types: ${activeClientTypes.join(
        ", "
      )}, Meeting types in slot: ${meetingTypesList.join(", ")}`
    );
    return null;
  }

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

  // Create tooltip content with RTL support
  const tooltipContent = (
    <div className="flex flex-col gap-3 p-0" dir="rtl">
      {/* Time and duration */}
      <div className="text-right flex items-start w-full">
        <div className="pr-1 pl-3 pt-0.5">
          <Clock size={18} className="text-blue-400 shrink-0" />
        </div>
        <div className="flex-1 font-bold leading-tight">
          {formatTime(displayStartTime)} - {formatTime(displayEndTime)}
          <div className="text-gray-300 text-xs font-normal mt-1">
            {durationStr}
          </div>
        </div>
      </div>

      {/* Client Types */}
      {isAdmin && clientTypes.length > 0 && (
        <div className="text-right flex items-start w-full mt-2">
          <div className="pr-1 pl-3 pt-0.5">
            <Users size={18} className="text-blue-400 shrink-0" />
          </div>
          <div className="flex-1 font-bold leading-tight">
            {/* Show client types with meeting type information */}
            {clientTypes.map((type, index) => {
              const clientName = getClientTypeName(type);
              const allowedTypes = getAllowedMeetingTypes(type);
              const supportedMeetingTypes = meetingTypesList.filter((mt) =>
                allowedTypes.includes(mt)
              );

              return (
                <div key={type} className={index > 0 ? "mt-1" : ""}>
                  <span>{clientName}</span>
                  {supportedMeetingTypes.length > 0 && (
                    <span className="text-xs text-gray-300 block">
                      ({supportedMeetingTypes.join(", ")})
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Meeting Types */}
      {filteredMeetingTypes.length > 0 && (
        <div className="text-right flex items-start w-full mt-2">
          <div className="pr-1 pl-3 pt-0.5">
            <Calendar size={18} className="text-blue-400 shrink-0" />
          </div>
          <div className="flex-1 font-bold leading-tight">
            {filteredMeetingTypes
              .map((type) => MEETING_TYPE_STYLES[type]?.name || type)
              .join(", ")}
          </div>
        </div>
      )}
    </div>
  );

  // Calculate tooltip position relative to viewport
  const getTooltipPosition = () => {
    const rect = slotRef.current?.getBoundingClientRect();
    if (!rect) return {};

    // Position tooltip based on available space
    if (tooltipPosition.isBelow) {
      // Position below the slot, centered horizontally with the slot
      return {
        left: rect.left + rect.width / 2,
        top: tooltipPosition.y + 10,
        transform: "translateX(-50%)",
      };
    } else {
      // Position above the slot, centered horizontally with the slot
      return {
        left: rect.left + rect.width / 2,
        top: tooltipPosition.y - 10,
        transform: "translateX(-50%) translateY(-100%)",
      };
    }
  };

  // Calculate tooltip arrow position and style
  const getTooltipArrowStyle = () => {
    if (tooltipPosition.isBelow) {
      // Arrow pointing up
      return {
        position: "absolute" as const,
        left: "50%",
        top: "-6px",
        transform: "translateX(-50%)",
        width: 0,
        height: 0,
        borderLeft: "6px solid transparent",
        borderRight: "6px solid transparent",
        borderBottom: "6px solid #111827",
      };
    } else {
      // Arrow pointing down
      return {
        position: "absolute" as const,
        left: "50%",
        bottom: "-6px",
        transform: "translateX(-50%)",
        width: 0,
        height: 0,
        borderLeft: "6px solid transparent",
        borderRight: "6px solid transparent",
        borderTop: "6px solid #111827",
      };
    }
  };

  // Special ultra-compact single-line layout for very small slots
  if (isUltraCompact) {
    return (
      <>
        {showTooltip &&
          createPortal(
            <div
              dir="rtl"
              className="fixed z-[99999] bg-[#111827] text-white rounded-md text-xs shadow-lg pointer-events-none
                      border border-gray-700 transition-all duration-200 pr-3 pl-4 py-4"
              style={{
                ...getTooltipPosition(),
                minWidth: "220px",
                maxWidth: "280px",
                opacity: 1,
                animationName: "fadeIn",
                animationDuration: "0.2s",
              }}
            >
              {tooltipContent}
              <div style={getTooltipArrowStyle()} />
            </div>,
            document.body
          )}
        <div
          ref={slotRef}
          className={cn(
            "relative h-full w-full overflow-hidden rounded-lg border px-2 py-1 text-xs",
            isAvailable
              ? isEndingSoon
                ? "border-orange-300 bg-orange-50" // Ending soon highlight
                : "border-green-200 bg-green-50"
              : "border-gray-200 bg-gray-50",
            "hover:border-blue-500 hover:bg-blue-50 cursor-pointer transition-colors",
            "flex items-center justify-center", // Changed to center content
            className
          )}
          onClick={onClick}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          dir="rtl"
          {...props}
        >
          {/* Client type ribbon - thinner for ultra-compact */}
          <div className="absolute right-0 top-0 bottom-0 w-1.5 pointer-events-none">
            {compatibleClientTypes.length === 0 ? (
              <div
                className="absolute inset-0"
                style={{ backgroundColor: "#6366f1" }}
              />
            ) : (
              compatibleClientTypes.map((type, index) => {
                const color = CLIENT_TYPE_COLORS[type] || stringToColor(type);
                const height =
                  compatibleClientTypes.length > 1
                    ? `${100 / compatibleClientTypes.length}%`
                    : "100%";
                const top =
                  compatibleClientTypes.length > 1
                    ? `${(index * 100) / compatibleClientTypes.length}%`
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
                  />
                );
              })
            )}
          </div>

          {/* Time info */}
          <div className="flex flex-col items-center justify-center z-10 px-5">
            {/* Show time or remaining minutes based on whether timeslot is ending soon */}
            {isEndingSoon ? (
              <span className="text-orange-600 font-bold">
                {remainingTimeStr}
              </span>
            ) : displayStartTime.getTime() === displayEndTime.getTime() ||
              Math.abs(displayEndTime.getTime() - displayStartTime.getTime()) <
                15 * 60 * 1000 ? (
              <span>נותרו {durationStr}</span>
            ) : (
              <span>
                {formatTime(displayStartTime)} - {formatTime(displayEndTime)}
              </span>
            )}
            <span className="text-gray-500 text-[10px]">{durationStr}</span>
          </div>

          {/* Meeting type icon */}
          {primaryMeetingType && (
            <div className="flex items-center justify-center z-10">
              <div
                className="flex items-center justify-center rounded-full p-1"
                style={{ backgroundColor: primaryMeetingStyle.color }}
              >
                {primaryMeetingStyle.icon ? (
                  React.createElement(primaryMeetingStyle.icon, {
                    size: 10,
                    className: "text-white",
                  })
                ) : (
                  <Calendar size={10} className="text-white" />
                )}
              </div>
            </div>
          )}
        </div>
      </>
    );
  }

  return (
    <>
      {showTooltip &&
        createPortal(
          <div
            dir="rtl"
            className="fixed z-[99999] bg-[#111827] text-white rounded-md text-xs shadow-lg pointer-events-none
                    border border-gray-700 transition-all duration-200 px-5 py-4"
            style={{
              ...getTooltipPosition(),
              minWidth: "220px",
              maxWidth: "280px",
              opacity: 1,
              animationName: "fadeIn",
              animationDuration: "0.2s",
            }}
          >
            {tooltipContent}
            <div style={getTooltipArrowStyle()} />
          </div>,
          document.body
        )}
      <div
        ref={slotRef}
        className={cn(
          "relative h-full w-full overflow-hidden rounded-lg border px-3 py-2 text-xs",
          isAvailable
            ? isEndingSoon
              ? "border-orange-300 bg-orange-50" // Ending soon highlight
              : "border-green-200 bg-green-50"
            : "border-gray-200 bg-gray-50",
          "hover:border-blue-500 hover:bg-blue-50 cursor-pointer transition-colors",
          "flex flex-col items-center", // Changed to center items
          isCompact && "py-1 px-2", // Use smaller padding for compact mode
          className
        )}
        onClick={onClick}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        dir="rtl"
        {...props}
      >
        {/* Client type ribbons on right side */}
        <div className="absolute right-0 top-0 bottom-0 w-3 pointer-events-none">
          {compatibleClientTypes.length === 0 ? (
            <div
              className="absolute inset-0 pointer-events-none"
              style={{ backgroundColor: "#6366f1" }}
            />
          ) : (
            compatibleClientTypes.map((type, index) => {
              const color = CLIENT_TYPE_COLORS[type] || stringToColor(type);
              const height =
                compatibleClientTypes.length > 1
                  ? `${100 / compatibleClientTypes.length}%`
                  : "100%";
              const top =
                compatibleClientTypes.length > 1
                  ? `${(index * 100) / compatibleClientTypes.length}%`
                  : "0";

              return (
                <div
                  key={index}
                  className="pointer-events-none"
                  style={{
                    position: "absolute",
                    top,
                    right: 0,
                    height,
                    width: "100%",
                    backgroundColor: color,
                  }}
                />
              );
            })
          )}
        </div>

        {/* Time range and duration - centered */}
        <div
          className={cn(
            "flex flex-col items-center justify-center text-center w-full", // Changed to center-aligned
            isCompact ? "my-0" : "my-4" // Adjust margin for compact mode
          )}
        >
          <div className="flex items-center mb-1 justify-center">
            <span
              className={cn(
                "font-bold ml-1", // Changed margin left for Hebrew
                isEndingSoon ? "text-orange-600" : "text-gray-800",
                isCompact ? "text-xs" : "text-base" // Smaller text for compact mode
              )}
            >
              {/* Show time or remaining minutes based on whether timeslot is ending soon */}
              {isEndingSoon
                ? remainingTimeStr
                : /* Modified to show start-end format despite RTL context */
                displayStartTime.getTime() === displayEndTime.getTime() ||
                  Math.abs(
                    displayEndTime.getTime() - displayStartTime.getTime()
                  ) <
                    15 * 60 * 1000
                ? `נותרו ${durationStr}` // "X time left" for very short or identical times
                : `${formatTime(displayStartTime)} - ${formatTime(
                    displayEndTime
                  )}`}
            </span>
            <Clock
              size={isCompact ? 14 : 18}
              className={cn(
                "shrink-0",
                isEndingSoon ? "text-orange-600" : "text-gray-600"
              )}
            />
          </div>
          {!isCompact && (
            <span
              className={cn(
                "text-xs",
                isEndingSoon ? "text-orange-500 font-medium" : "text-gray-500"
              )}
            >
              {isEndingSoon
                ? formatTime(displayEndTime)
                : displayStartTime.getTime() === displayEndTime.getTime() ||
                  Math.abs(
                    displayEndTime.getTime() - displayStartTime.getTime()
                  ) <
                    15 * 60 * 1000
                ? formatTime(displayEndTime) // Show end time for very short durations
                : durationStr}
            </span>
          )}
        </div>

        {/* Meeting types as badges at bottom - centered */}
        {filteredMeetingTypes.length > 0 &&
          filteredMeetingTypes[0] !== "all" && (
            <div
              className={cn(
                "flex flex-wrap gap-1 justify-center w-full", // Changed to center-aligned
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
                    {/* Only show text in non-compact mode */}
                    {!isCompact && (
                      <span className="text-white font-medium text-[11px]">
                        {style.name || type}
                      </span>
                    )}
                    <span className="flex items-center justify-center">
                      {style.icon ? (
                        React.createElement(style.icon, {
                          size: isCompact ? 12 : 14,
                          className: "text-white",
                        })
                      ) : (
                        <Calendar
                          size={isCompact ? 12 : 14}
                          className="text-white"
                        />
                      )}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
      </div>
    </>
  );
}
