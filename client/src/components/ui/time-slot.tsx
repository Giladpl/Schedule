import { getClientTypeDisplayName } from "@/lib/calendarService";
import { cn } from "@/lib/utils";
import { Timeslot } from "@shared/schema";
import { Calendar, Clock, Phone, Users, Video } from "lucide-react";
import React, { useMemo } from "react";

// פונקציה ליצירת צבע עקבי מחרוזת (hash-based)
export function stringToColor(str: string): string {
  // רשימת צבעים בסיסיים בהירים עם ניגודיות טובה
  const baseColors = [
    "#4285F4", // כחול גוגל
    "#EA4335", // אדום גוגל
    "#FBBC05", // צהוב גוגל
    "#34A853", // ירוק גוגל
    "#8E24AA", // סגול
    "#0097A7", // טורקיז
    "#F57C00", // כתום
    "#C2185B", // ורוד
    "#7CB342", // ירוק בהיר
    "#5E35B1", // סגול כהה
    "#E53935", // אדום בהיר
    "#43A047", // ירוק בינוני
    "#1E88E5", // כחול בינוני
    "#00ACC1", // טורקיז בהיר
    "#039BE5", // כחול בהיר
    "#E91E63", // ורוד בהיר
  ];

  // יצירת hash פשוט מהמחרוזת
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0; // המרה ל-32bit integer
  }

  // בחירת צבע מהרשימה לפי ה-hash
  const index = Math.abs(hash) % baseColors.length;
  return baseColors[index];
}

// Map client types to colors - מינימלי ומרחיב באופן דינמי
export const CLIENT_TYPE_COLORS: Record<string, string> = {
  all: "#6366f1", // indigo
  new_customer: "#1a73e8", // Blue
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
}

export function TimeSlot({
  timeslot,
  onClick,
  className,
  ...props
}: TimeSlotProps) {
  // בחירת צבע לסוג לקוח - אם לא קיים, צור באופן דינמי
  const clientTypeColor = useMemo(() => {
    return (
      CLIENT_TYPE_COLORS[timeslot.clientType] ||
      stringToColor(timeslot.clientType)
    );
  }, [timeslot.clientType]);

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
  const durationStr =
    durationMinutes >= 60 * 12
      ? "Full Day Availability"
      : durationMinutes >= 60
      ? `${Math.floor(durationMinutes / 60)}h ${
          durationMinutes % 60 > 0 ? `${durationMinutes % 60}m` : ""
        }`
      : `${durationMinutes}m`;

  // Parse meeting types
  const meetingTypesList = timeslot.meetingTypes
    .split(",")
    .map((type) => type.trim())
    .filter(Boolean);

  // Get client display name
  const clientDisplayName = getClientTypeDisplayName(timeslot.clientType);

  return (
    <div
      className={cn(
        "relative h-full w-full overflow-hidden rounded-lg border px-2 py-1 text-xs",
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
      {/* Client type badge */}
      <div className="absolute top-1 right-1">
        <span
          className="text-xs px-2 py-0.5 rounded-md font-medium shadow-sm"
          style={{ backgroundColor: clientTypeColor, color: "white" }}
        >
          {clientDisplayName}
        </span>
      </div>

      {/* Time range and duration */}
      <div className="pt-6 flex flex-col">
        <div className="flex items-center">
          <Clock size={14} className="mr-1 text-gray-500" />
          <span className="font-semibold">{timeRangeStr}</span>
        </div>
        <span className="text-gray-600 text-[10px] mt-1">{durationStr}</span>
      </div>

      {/* Meeting types as icons */}
      {meetingTypesList.length > 0 && meetingTypesList[0] !== "all" && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {meetingTypesList.map((type, index) => {
            const style =
              MEETING_TYPE_STYLES[type] || MEETING_TYPE_STYLES.default;
            return (
              <div
                key={index}
                className="flex items-center px-2 py-1 rounded-full text-[10px]"
                style={{ backgroundColor: style.color }}
                title={type}
              >
                <span className="mr-1">
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
