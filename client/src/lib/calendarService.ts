import { Booking, ClientRuleWithDisplayName, Timeslot } from "@shared/schema";
import { apiRequest } from "./queryClient";
import {
  formatDateInIsrael,
  formatTimeInIsrael,
  formatTimeRangeInIsrael,
} from "./timeUtils";

// Type for the booking form
export interface BookingFormData {
  timeslotId: number;
  name: string;
  email: string;
  phone?: string;
  notes?: string;
  meetingType: string;
  duration: number;
}

// Functions to interact with the API
export async function fetchTimeslots(
  startDate: Date,
  endDate: Date,
  clientType?: string,
  meetingType?: string
): Promise<Timeslot[]> {
  // Use a relative URL to leverage the Vite proxy, but make sure we're hitting the proper backend
  const url = new URL("/api/timeslots", window.location.origin);
  url.searchParams.append("start", startDate.toISOString());
  url.searchParams.append("end", endDate.toISOString());

  if (clientType && clientType !== "all") {
    url.searchParams.append("type", clientType);
  }

  if (meetingType && meetingType !== "all") {
    url.searchParams.append("meetingType", meetingType);
  }

  console.log(`[Debug] Calendar making API request to: ${url.toString()}`);
  console.log(
    `[Debug] Date range ${startDate.toISOString()} to ${endDate.toISOString()} includes Saturday: ${checkDateRangeContainsSaturday(
      startDate,
      endDate
    )}`
  );
  console.log(
    `[Debug] Filters: clientType=${clientType || "all"}, meetingType=${
      meetingType || "all"
    }`
  );

  // Check date range for Saturday
  const containsSaturday = checkDateRangeContainsSaturday(startDate, endDate);
  console.log(`[Debug] Saturday dates in range:`);
  const saturdayDates = getSaturdaysInRange(startDate, endDate);
  saturdayDates.forEach((date) => {
    console.log(`[Debug] Saturday: ${date.toISOString()}`);
  });

  // This ensures we don't include querystring directly in the URL
  // Make a clean request string using the Vite proxy
  const backendUrl = `${window.location.origin}/api/timeslots${url.search}`;
  console.log(`[Debug] Fetching timeslots: ${backendUrl}`);

  try {
    // Create an AbortController to timeout the request if it takes too long
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      console.log("[Debug] Fetch request timeout after 15 seconds");
      controller.abort();
    }, 15000);

    const response = await apiRequest<Timeslot[]>(
      "GET",
      url.toString(),
      undefined,
      {
        signal: controller.signal,
      }
    );

    clearTimeout(timeoutId);

    console.log(`[Debug] Received ${response.length} timeslots`);

    // Check for Saturday timeslots in the response
    const saturdayTimeslots = response.filter((slot) => {
      const date = new Date(slot.startTime);
      return date.getDay() === 6;
    });

    console.log(
      `[Debug] Saturday timeslots in response: ${saturdayTimeslots.length}`
    );

    if (saturdayTimeslots.length > 0) {
      console.log("[Debug] Saturday timeslots found in response:");
      saturdayTimeslots.forEach((slot, i) => {
        console.log(
          `[Debug]   ${i + 1}. ${new Date(
            slot.startTime
          ).toISOString()} - ID: ${slot.id}`
        );
      });
    } else if (containsSaturday) {
      console.log(
        "[Debug] No Saturday timeslots were returned despite Saturday being in the date range"
      );

      // Get all Saturdays in the requested range
      const saturdaysInRange = getSaturdaysInRange(startDate, endDate);
      console.log(
        `[Debug] Found ${saturdaysInRange.length} Saturdays in date range`
      );

      // Enhanced WORKAROUND: If we don't get Saturday events but we know they should exist,
      // try a direct API call with special Saturday-specific parameters
      try {
        console.log("[Debug] Trying direct Saturday timeslot request");

        // For each Saturday in the range, try to fetch timeslots for just that day
        let allSaturdayTimeslots: Timeslot[] = [];

        for (const saturday of saturdaysInRange) {
          // Create a start date at 00:00 and end date at 23:59:59 for just this Saturday
          const saturdayStart = new Date(saturday);
          saturdayStart.setHours(0, 0, 0, 0);

          const saturdayEnd = new Date(saturday);
          saturdayEnd.setHours(23, 59, 59, 999);

          console.log(
            `[Debug] Fetching timeslots specifically for Saturday: ${saturdayStart.toISOString()} to ${saturdayEnd.toISOString()}`
          );

          // First try the regular URL with the Vite proxy
          const saturdayUrl = new URL("/api/timeslots", window.location.origin);
          saturdayUrl.searchParams.append("start", saturdayStart.toISOString());
          saturdayUrl.searchParams.append("end", saturdayEnd.toISOString());

          try {
            const saturdayResponse = await apiRequest<Timeslot[]>(
              "GET",
              saturdayUrl.toString(),
              undefined,
              { signal: controller.signal }
            );

            if (saturdayResponse && saturdayResponse.length > 0) {
              console.log(
                `[Debug] Found ${saturdayResponse.length} Saturday timeslots`
              );
              allSaturdayTimeslots = [
                ...allSaturdayTimeslots,
                ...saturdayResponse,
              ];
            }
          } catch (satError) {
            console.log(
              `[Debug] Error fetching Saturday timeslots via proxy: ${satError}`
            );

            // If that fails, try direct backend call
            try {
              const directBackendUrl = "http://localhost:3000/api/timeslots";
              const params = new URLSearchParams();
              params.append("start", saturdayStart.toISOString());
              params.append("end", saturdayEnd.toISOString());

              const directResponse = await fetch(
                `${directBackendUrl}?${params.toString()}`
              );
              if (directResponse.ok) {
                const saturdayEvents = await directResponse.json();
                if (saturdayEvents && saturdayEvents.length > 0) {
                  console.log(
                    `[Debug] Found ${saturdayEvents.length} Saturday events directly from backend`
                  );
                  allSaturdayTimeslots = [
                    ...allSaturdayTimeslots,
                    ...saturdayEvents,
                  ];
                }
              }
            } catch (directError) {
              console.error(
                "[Debug] Direct backend call for Saturday failed:",
                directError
              );
            }
          }
        }

        // Merge Saturday timeslots with regular response
        if (allSaturdayTimeslots.length > 0) {
          console.log(
            `[Debug] Adding ${allSaturdayTimeslots.length} Saturday timeslots to response`
          );

          // Ensure we don't have duplicates
          const existingIds = new Set(response.map((slot) => slot.id));
          const newSaturdayTimeslots = allSaturdayTimeslots.filter(
            (slot) => !existingIds.has(slot.id)
          );

          if (newSaturdayTimeslots.length > 0) {
            console.log(
              `[Debug] Adding ${newSaturdayTimeslots.length} new Saturday timeslots`
            );
            return [...response, ...newSaturdayTimeslots];
          }
        }
      } catch (error) {
        console.error("[Debug] Error in Saturday timeslot recovery:", error);
      }
    }

    if (response.length === 0) {
      console.log(
        `[Debug] Empty timeslots response. Verify server is returning data for this date range.`
      );

      // If we have Saturday in the range but no results, try to sync again
      if (containsSaturday) {
        console.log(
          "[Debug] Date range contains Saturday but no timeslots returned - consider re-syncing with Google Calendar"
        );
      }
    } else {
      console.log(`[Debug] First timeslot: ${JSON.stringify(response[0])}`);
      console.log(
        `[Debug] Date range in response: ${new Date(
          response[0].startTime
        ).toISOString()} to ${new Date(
          response[response.length - 1].endTime
        ).toISOString()}`
      );

      // Verify that the response includes all days in the date range
      const daysInRange = Math.ceil(
        (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
      );
      const uniqueDays = new Set<string>();

      response.forEach((slot) => {
        const date = new Date(slot.startTime);
        uniqueDays.add(
          `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`
        );
      });

      console.log(
        `[Debug] Date range covers ${daysInRange} days, response includes timeslots for ${uniqueDays.size} unique days`
      );
    }

    return response;
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      console.error("[Debug] Fetch timeslots request timed out");
      return []; // Return empty array on timeout
    }
    console.error("[Debug] Error fetching timeslots:", error);
    throw error;
  }
}

// Helper function to check if date range contains Saturday
function checkDateRangeContainsSaturday(
  startDate: Date,
  endDate: Date
): boolean {
  const dayMs = 24 * 60 * 60 * 1000;
  let currentDate = new Date(startDate);
  const endMs = endDate.getTime();

  while (currentDate.getTime() <= endMs) {
    if (currentDate.getDay() === 6) {
      // 6 = Saturday
      return true;
    }
    currentDate = new Date(currentDate.getTime() + dayMs);
  }

  return false;
}

// Helper function to get all Saturdays in a date range
function getSaturdaysInRange(startDate: Date, endDate: Date): Date[] {
  const saturdays: Date[] = [];
  const dayMs = 24 * 60 * 60 * 1000;
  let currentDate = new Date(startDate);
  const endMs = endDate.getTime();

  while (currentDate.getTime() <= endMs) {
    if (currentDate.getDay() === 6) {
      // 6 = Saturday
      saturdays.push(new Date(currentDate));
    }
    currentDate = new Date(currentDate.getTime() + dayMs);
  }

  return saturdays;
}

export async function fetchTimeslotById(id: number): Promise<Timeslot> {
  console.log(`[Debug] Fetching timeslot by ID: ${id}`);
  const response = await apiRequest<Timeslot>("GET", `/api/timeslots/${id}`);
  console.log(`[Debug] Timeslot response:`, response);
  return response;
}

export async function createBooking(
  bookingData: BookingFormData
): Promise<Booking> {
  console.log(`[Debug] Creating booking:`, bookingData);
  const response = await apiRequest<Booking>(
    "POST",
    "/api/bookings",
    bookingData
  );
  console.log(`[Debug] Booking response:`, response);
  return response;
}

export async function syncCalendar(): Promise<void> {
  console.log(`[Debug] Syncing calendar with Google`);
  try {
    const response = await apiRequest<{
      success: boolean;
      timeslotCount: number;
      message?: string;
    }>("GET", "/api/sync-calendar");

    if (response.success) {
      console.log(
        `[Debug] Calendar synced successfully. Timeslots count: ${response.timeslotCount}`
      );
    } else {
      console.error(
        `[Debug] Calendar sync response indicated failure: ${
          response.message || "No message provided"
        }`
      );
      throw new Error(
        `Calendar sync failed: ${response.message || "Unknown error"}`
      );
    }
  } catch (error) {
    console.error(`[Debug] Error syncing calendar:`, error);
    throw error;
  }
}

// Refresh client rules from Google Sheets
export interface ClientRule {
  type: string;
  meetings: Record<string, number>;
}

let clientRules: ClientRule[] = [];

export async function refreshClientRules(): Promise<{
  rules: ClientRule[];
  message: string;
}> {
  try {
    // Make a POST request to the refresh endpoint
    const response = await apiRequest<{ rules: ClientRule[]; message: string }>(
      "POST",
      "/api/refresh-client-rules"
    );

    // Update the local cache
    clientRules = response.rules;
    console.log("Client rules refreshed from Google Sheets:", response.message);

    return response;
  } catch (error) {
    console.error("Error refreshing client rules:", error);
    throw error;
  }
}

// Helper functions for calendar views
export function groupTimeslotsByDay(
  timeslots: Timeslot[]
): Record<string, Timeslot[]> {
  const grouped: Record<string, Timeslot[]> = {};

  timeslots.forEach((timeslot) => {
    const date = new Date(timeslot.startTime);
    const dateKey = date.toISOString().split("T")[0];

    if (!grouped[dateKey]) {
      grouped[dateKey] = [];
    }

    grouped[dateKey].push(timeslot);
  });

  return grouped;
}

export function getTimeslotDuration(timeslot: Timeslot): number {
  const start = new Date(timeslot.startTime);
  const end = new Date(timeslot.endTime);

  return (end.getTime() - start.getTime()) / (1000 * 60); // Duration in minutes
}

export function formatTimeslot(timeslot: Timeslot): string {
  const start = new Date(timeslot.startTime);
  const end = new Date(timeslot.endTime);

  // Get duration in minutes
  const durationMinutes = (end.getTime() - start.getTime()) / (1000 * 60);

  // For very long timeslots (>5 hours), make the end time more prominent
  if (durationMinutes > 300) {
    return `${formatTimeInIsrael(start)} - ${formatTimeInIsrael(end)}`;
  }

  return formatTimeRangeInIsrael(start, end);
}

export function formatTimeslotDate(timeslot: Timeslot): string {
  const date = new Date(timeslot.startTime);
  return formatDateInIsrael(date);
}

export function getBookingConfirmationText(
  booking: Booking,
  timeslot: Timeslot
): string {
  const dateStr = formatTimeslotDate(timeslot);
  const timeStr = formatTimeslot(timeslot);

  return `Your meeting has been scheduled for ${dateStr} at ${timeStr} (Israel Time).`;
}

export function getTimeslotPosition(
  timeslot: Timeslot,
  firstHour: number = 9
): { top: number; height: number } {
  const start = new Date(timeslot.startTime);
  const end = new Date(timeslot.endTime);

  const startHour = start.getHours() + start.getMinutes() / 60;
  const endHour = end.getHours() + end.getMinutes() / 60;

  const top = (startHour - firstHour) * 64; // 64px per hour (16px * 4)
  const height = (endHour - startHour) * 64;

  return { top, height };
}

export async function fetchClientRules(): Promise<ClientRuleWithDisplayName[]> {
  return apiRequest<ClientRuleWithDisplayName[]>("GET", "/api/client-rules");
}

// Fetch client meeting types with their durations (legacy format)
export async function fetchClientMeetingTypes(): Promise<
  Record<string, Record<string, number>>
> {
  return apiRequest<Record<string, Record<string, number>>>(
    "GET",
    "/api/client-meeting-types"
  );
}

// Interface for the new client data structure
export interface ClientData {
  clients: ClientRule[];
  meetingTypes: Array<{
    name: string;
    duration: number;
  }>;
}

// Fetch client data in the new structure
export async function fetchClientData(): Promise<ClientData> {
  return apiRequest<ClientData>("GET", "/api/client-data");
}

// Client type display names
export function getClientTypeDisplayName(clientType: string): string {
  // שימוש במינימום שמות נפוצים לתרגום ואחרת להשתמש בשם המקורי
  const commonDisplayNames: Record<string, string> = {
    all: "כל הלקוחות",
    new_customer: "לקוח חדש",
  };

  // להחזיר שם תצוגה מותאם או את שם הלקוח המקורי אם אין מיפוי
  return commonDisplayNames[clientType] || clientType;
}
