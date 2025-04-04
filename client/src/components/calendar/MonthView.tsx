import {
  getClientTypeDisplayName,
  groupTimeslotsByDay,
} from "@/lib/calendarService";
import { getNowInIsrael } from "@/lib/timeUtils";
import { getDatesInMonth, isSameDay } from "@/lib/utils";
import { Timeslot } from "@shared/schema";
import { Info } from "lucide-react";
import { useMemo } from "react";

interface MonthViewProps {
  currentDate: Date;
  timeslots: Timeslot[];
  onSelectDate: (date: Date) => void;
  clientType?: string;
  viewMode: "admin" | "client";
}

export default function MonthView({
  currentDate,
  timeslots,
  onSelectDate,
  clientType,
  viewMode,
}: MonthViewProps) {
  const dates = useMemo(() => {
    return getDatesInMonth(currentDate.getFullYear(), currentDate.getMonth());
  }, [currentDate]);

  const timeslotsByDay = useMemo(() => {
    return groupTimeslotsByDay(timeslots);
  }, [timeslots]);

  const today = getNowInIsrael();
  const currentMonth = currentDate.getMonth();

  return (
    <div className="flex-1 overflow-auto">
      {!viewMode && (
        <div className="p-4">
          <div className="bg-white p-2 mb-2 border border-[#dadce0] rounded-lg">
            <div className="flex items-start gap-2">
              <Info size={16} className="text-[#5f6368] mt-0.5" />
              <div className="text-sm text-[#5f6368]">
                {clientType === "new_customer" ? (
                  <>
                    You are viewing available slots for new customers. Click on
                    any date to see available timeslots.
                  </>
                ) : (
                  <>
                    You are viewing the schedule as a{" "}
                    {getClientTypeDisplayName(clientType)} client. Only dates
                    with slots available for your client type are shown.
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
          const isToday = isSameDay(date, today);
          const dateStr = date.toISOString().split("T")[0];
          const dayTimeslots = timeslotsByDay[dateStr] || [];

          // Filter timeslots based on client type and admin status
          let filteredTimeslots;

          if (viewMode === "admin") {
            // Admin can see all or filter by client type
            filteredTimeslots =
              clientType && clientType !== "all"
                ? dayTimeslots.filter(
                    (ts) =>
                      ts.clientType === "all" ||
                      ts.clientType === clientType ||
                      (Array.isArray(ts.clientType) &&
                        ts.clientType.includes(clientType || "all"))
                  )
                : dayTimeslots;
          } else {
            // Regular users only see slots that match their client type
            filteredTimeslots = dayTimeslots.filter(
              (ts) =>
                ts.clientType === "all" ||
                ts.clientType === (clientType || "new_customer") ||
                (Array.isArray(ts.clientType) &&
                  ts.clientType.includes(clientType || "new_customer"))
            );
          }

          // Only available slots
          const availableSlots = filteredTimeslots.filter(
            (slot) => slot.isAvailable
          );

          const hasVipSlots = availableSlots.some(
            (slot) => slot.clientType === "vip"
          );
          const hasRegularSlots = availableSlots.some(
            (slot) => slot.clientType !== "vip"
          );

          return (
            <div
              key={index}
              className={`calendar-cell h-32 border-b border-r border-[#dadce0] p-2 ${
                !isCurrentMonth ? "bg-[#f8f9fa]" : ""
              } ${
                isToday ? "bg-[#e8f0fe]" : ""
              } hover:bg-[#f8f9fa] cursor-pointer`}
              onClick={() => onSelectDate(date)}
            >
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

              <div className="mt-1 text-xs text-[#5f6368]">
                {availableSlots.length > 0
                  ? `${availableSlots.length} ${
                      availableSlots.length === 1 ? "slot" : "slots"
                    } available`
                  : "No slots available"}
              </div>

              <div className="mt-1 space-y-1">
                {viewMode === "admin" && hasVipSlots && (
                  <div className="text-xs bg-[#fbbc04] text-[#202124] rounded-sm p-1">
                    VIP slots available
                  </div>
                )}

                {hasRegularSlots && (
                  <div className="text-xs bg-[#1a73e8] text-white rounded-sm p-1">
                    {viewMode === "admin"
                      ? "Regular slots available"
                      : "Slots available"}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
