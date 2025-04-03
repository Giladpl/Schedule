import { cn } from "@/lib/utils";
import { Timeslot } from "@shared/schema";
import { Calendar, Clock, Phone, Users, Video } from "lucide-react";
import React from "react";

// Map client types to colors
export const CLIENT_TYPE_COLORS: Record<string, string> = {
  "מדריכים+": "#fbbc04", // Yellow
  מדריכים: "#3b82f6", // blue
  למתקדמים: "#10b981", // emerald
  למתחילים: "#ef4444", // red
  all: "#6366f1", // indigo
  vip: "#fbbc04", // Yellow
  new: "#1a73e8", // Blue
  quick: "#34a853", // Green
  "פולי אחים": "#34a853", // Green
  new_customer: "#1a73e8", // Blue
  default: "#8b5cf6", // violet
};

// Meeting type to icon mapping
const MEETING_TYPE_ICONS: Record<string, React.ReactNode> = {
  טלפון: <Phone size={14} className="text-blue-500" />,
  זום: <Video size={14} className="text-green-500" />,
  פגישה: <Users size={14} className="text-amber-500" />,
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
  const clientTypeColor =
    CLIENT_TYPE_COLORS[
      timeslot.clientType as keyof typeof CLIENT_TYPE_COLORS
    ] || CLIENT_TYPE_COLORS.default;
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
          className="text-xs px-1 py-0.5 rounded-full font-medium"
          style={{ backgroundColor: clientTypeColor, color: "white" }}
        >
          {timeslot.clientType}
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
        <div className="mt-1 flex flex-wrap gap-1">
          {meetingTypesList.map((type, index) => (
            <div
              key={index}
              className="flex items-center bg-gray-50 px-1.5 py-0.5 rounded text-[10px]"
              title={type}
            >
              <span className="mr-1">
                {MEETING_TYPE_ICONS[type] || (
                  <Calendar size={14} className="text-gray-500" />
                )}
              </span>
              <span className="text-gray-700">{type}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
