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
}

export function TimeSlot({
  timeslot,
  onClick,
  className,
  activeClientTypes = [],
  ...props
}: TimeSlotProps) {
  // Fetch client data from the server
  const { data: clientData } = useQuery({
    queryKey: ["/api/client-data"],
    queryFn: fetchClientData,
    staleTime: 60000, // 1 minute
  });

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

  return (
    <div
      className={cn(
        "relative h-full w-full overflow-hidden rounded-lg border px-3 py-2.5 text-xs",
        isAvailable
          ? "border-green-200 bg-green-50"
          : "border-gray-200 bg-gray-50",
        "hover:border-blue-500 hover:bg-blue-50 cursor-pointer transition-colors",
        "flex flex-col justify-between",
        className
      )}
      onClick={onClick}
      {...props}
    >
      {/* Client type ribbons on right side */}
      <div className="absolute right-0 top-0 bottom-0 w-3">
        {clientTypes.length === 0 ? (
          <div
            className="absolute inset-0 client-type-ribbon"
            style={{ backgroundColor: "#6366f1" }}
            data-tooltip="כל הלקוחות"
          />
        ) : (
          clientTypes.map((type, index) => {
            const color = CLIENT_TYPE_COLORS[type] || stringToColor(type);
            const name = getClientTypeName(type);
            const height =
              clientTypes.length > 1 ? `${100 / clientTypes.length}%` : "100%";
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
                data-tooltip={name}
              />
            );
          })
        )}
      </div>

      {/* Time range and duration - centered in card */}
      <div className="flex flex-col items-center justify-center my-4 text-center">
        <div className="flex items-center mb-1">
          <Clock size={18} className="text-gray-600 shrink-0" />
          <span className="font-bold text-base mx-2.5 text-gray-800">
            {timeRangeStr}
          </span>
        </div>
        <span className="text-gray-500 text-xs">{durationStr}</span>
      </div>

      {/* Meeting types as badges at bottom */}
      {filteredMeetingTypes.length > 0 && filteredMeetingTypes[0] !== "all" && (
        <div className="flex flex-wrap gap-2 justify-center mt-1">
          {filteredMeetingTypes.map((type, index) => {
            const style =
              MEETING_TYPE_STYLES[type] || MEETING_TYPE_STYLES.default;
            return (
              <div
                key={index}
                className="flex items-center px-2 py-1 rounded-full text-[11px] shadow-sm gap-x-1"
                style={{ backgroundColor: style.color }}
                title={type}
              >
                <span className="flex items-center justify-center">
                  {MEETING_TYPE_ICONS[type] || (
                    <Calendar size={14} className="text-white" />
                  )}
                </span>
                <span className="text-white font-medium">
                  {style.name || type}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
