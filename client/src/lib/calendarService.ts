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
  id?: number; // Add numeric ID from server
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

  if (!timeslots || timeslots.length === 0) {
    console.log('No timeslots to group by day');
    return grouped;
  }

  console.log(`Grouping ${timeslots.length} timeslots by day`);

  // IMPORTANT: We are only grouping, not filtering at this point
  // All filtering should be done before calling this function
  // This ensures consistency between monthly and weekly views

  timeslots.forEach((timeslot) => {
    try {
      // Ensure timeslot has valid dates
      const startDate = new Date(timeslot.startTime);
      const endDate = new Date(timeslot.endTime);

      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        console.error('Invalid date in timeslot:', timeslot);
        return; // Skip this timeslot
      }

      // Get the date key in YYYY-MM-DD format - consistent across the application
      const dateKey = startDate.toISOString().split('T')[0];

      // Initialize array if needed
      if (!grouped[dateKey]) {
        grouped[dateKey] = [];
      }

      // Add the timeslot to this day
      grouped[dateKey].push(timeslot);
      console.log(`Added timeslot ID=${timeslot.id} to date ${dateKey}`);

      // Handle multi-day timeslots - only if they span multiple calendar days
      const startDay = new Date(startDate);
      startDay.setHours(0, 0, 0, 0);

      const endDay = new Date(endDate);
      endDay.setHours(0, 0, 0, 0);

      // Only process multi-day logic if the event actually spans multiple days
      if (endDay.getTime() > startDay.getTime()) {
        let currentDay = new Date(startDay);
        currentDay.setDate(currentDay.getDate() + 1); // Start with the next day

        // Iterate through the additional days
        while (currentDay.getTime() <= endDay.getTime()) {
          const currentDateKey = currentDay.toISOString().split('T')[0];

          // Setup containers if needed
          if (!grouped[currentDateKey]) {
            grouped[currentDateKey] = [];
          }

          // Add the same timeslot to this day too
          grouped[currentDateKey].push(timeslot);
          console.log(`Added multi-day timeslot ID=${timeslot.id} to additional date ${currentDateKey}`);

          // Move to next day
          currentDay.setDate(currentDay.getDate() + 1);
        }
      }
    } catch (error) {
      console.error('Error processing timeslot in groupTimeslotsByDay:', error, timeslot);
    }
  });

  // Summarize the results
  const totalGroupedTimeslots = Object.values(grouped).flat().length;
  console.log(`Grouped ${timeslots.length} timeslots into ${Object.keys(grouped).length} days (${totalGroupedTimeslots} total entries)`);

  return grouped;
}

/**
 * Shared function for filtering timeslots that works exactly the same for both weekly and monthly views.
 * This ensures consistent behavior between different calendar views.
 */
export function filterTimeslots(
  timeslots: Timeslot[],
  currentTime: Date,
  activeClientTypes: string[] = ["all"]
): Timeslot[] {
  console.log(`Filtering ${timeslots.length} timeslots`);

  if (!timeslots || timeslots.length === 0) {
    return [];
  }

  // First, ensure Saturday slots are always available
  const processedTimeslots = timeslots.map(slot => {
    const startDate = new Date(slot.startTime);
    const isSaturday = startDate.getDay() === 6; // 6 is Saturday

    if (isSaturday) {
      // Clone the slot to avoid modifying the original
      return { ...slot, isAvailable: true };
    }

    return slot;
  });

  // Log how many Saturday slots were made available
  const saturdaySlots = processedTimeslots.filter(
    slot => new Date(slot.startTime).getDay() === 6
  );

  if (saturdaySlots.length > 0) {
    console.log(`Made ${saturdaySlots.length} Saturday slots available`);
    saturdaySlots.forEach(slot => {
      console.log(`Saturday slot ID=${slot.id}, Start=${new Date(slot.startTime).toLocaleTimeString()}, End=${new Date(slot.endTime).toLocaleTimeString()}`);
    });
  }

  // Then apply the standard filtering criteria
  return processedTimeslots.filter(slot => {
    try {
      // 1. Skip unavailable slots (except Saturdays, which were made available above)
      if (!slot.isAvailable) {
        return false;
      }

      // 2. Check client type match
      const hasAllClientType = activeClientTypes.includes("all");
      const clientTypeMatch =
        hasAllClientType ||
        slot.clientType === "all" ||
        activeClientTypes.includes(slot.clientType) ||
        (Array.isArray(slot.clientType) &&
          slot.clientType.some((ct) => activeClientTypes.includes(ct)));

      if (!clientTypeMatch) {
        return false;
      }

      // 3. Skip slots with invalid dates
      const startTime = new Date(slot.startTime);
      const endTime = new Date(slot.endTime);

      if (isNaN(startTime.getTime()) || isNaN(endTime.getTime())) {
        console.error("Invalid date in timeslot:", slot);
        return false;
      }

      // 4. Skip slots that have completely ended
      if (endTime < currentTime) {
        console.log(`Filtering out past timeslot (ID=${slot.id}): ends at ${endTime.toISOString()}, current time is ${currentTime.toISOString()}`);
        return false;
      }

      return true;
    } catch (error) {
      console.error("Error filtering timeslot:", error, slot);
      return false;
    }
  });
}

/**
 * Helper function to check if a timeslot should be shown based on filtering criteria.
 * Used by both weekly and monthly views to ensure consistency.
 */
export function shouldShowTimeslot(
  timeslot: Timeslot,
  currentTime: Date,
  activeClientTypes: string[] = ["all"]
): boolean {
  try {
    // Special handling for Saturday slots
    const startDate = new Date(timeslot.startTime);
    const isSaturday = startDate.getDay() === 6; // 6 is Saturday

    // Saturday slots are always available
    if (isSaturday) {
      return true;
    }

    // 1. Skip unavailable slots
    if (!timeslot.isAvailable) {
      return false;
    }

    // 2. Check client type match
    const hasAllClientType = activeClientTypes.includes("all");
    const clientTypeMatch =
      hasAllClientType ||
      timeslot.clientType === "all" ||
      activeClientTypes.includes(timeslot.clientType) ||
      (Array.isArray(timeslot.clientType) &&
        timeslot.clientType.some((ct) => activeClientTypes.includes(ct)));

    if (!clientTypeMatch) {
      return false;
    }

    // 3. Skip slots with invalid dates
    const startTime = new Date(timeslot.startTime);
    const endTime = new Date(timeslot.endTime);

    if (isNaN(startTime.getTime()) || isNaN(endTime.getTime())) {
      console.error("Invalid date in timeslot:", timeslot);
      return false;
    }

    // 4. Skip slots that have completely ended
    if (endTime < currentTime) {
      console.log(`Filtering out past timeslot (ID=${timeslot.id}): ends at ${endTime.toISOString()}, current time is ${currentTime.toISOString()}`);
      return false;
    }

    return true;
  } catch (error) {
    console.error("Error checking if timeslot should be shown:", error, timeslot);
    return false;
  }
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

// Cache for client type mappings from the API
let clientTypeCache: Record<string, string> = {
  all: "כל הלקוחות",
};

// Standard client type mapping for fallback
const standardClientTypes: Record<string, string> = {
  "0": "לקוח חדש",
  "1": "פולי אחים",
  "2": "מדריכים+",
  "3": "מכירת עוגות",
};

// Fetch client data in the new structure
export async function fetchClientData(): Promise<ClientData> {
  try {
    const data = await apiRequest<ClientData>("GET", "/api/client-data");

    // Reset the cache, keeping only the 'all' value
    clientTypeCache = {
      all: "כל הלקוחות",
    };

    // Populate the client type cache when we fetch client data
    if (data && data.clients) {
      data.clients.forEach((client) => {
        if (client.id !== undefined) {
          // Map numeric ID to display name
          clientTypeCache[`${client.id}`] = client.type;
        }
        // Also store the name mapping in case it's passed directly
        clientTypeCache[client.type] = client.type;
      });
    } else {
      // If we couldn't fetch data, use standard mappings as fallback
      Object.entries(standardClientTypes).forEach(([id, name]) => {
        clientTypeCache[id] = name;
      });
    }

    return data;
  } catch (error) {
    console.error("[Debug] Error fetching client data:", error);

    // In case of error, use standard mappings
    Object.entries(standardClientTypes).forEach(([id, name]) => {
      clientTypeCache[id] = name;
    });

    // Return a minimal data structure
    return {
      clients: Object.entries(standardClientTypes).map(([id, type]) => ({
        id: parseInt(id),
        type,
        meetings: {},
      })),
      meetingTypes: [
        { name: "טלפון", duration: 15 },
        { name: "זום", duration: 30 },
        { name: "פגישה", duration: 45 },
      ],
    };
  }
}

// Client type display names
export function getClientTypeDisplayName(clientType: string): string {
  // If it's in our cache, use that first
  if (clientTypeCache[clientType]) {
    return clientTypeCache[clientType];
  }

  // Next try the standard mappings for numeric IDs
  if (standardClientTypes[clientType]) {
    return standardClientTypes[clientType];
  }

  // Last resort - common display names or the original
  const commonDisplayNames: Record<string, string> = {
    all: "כל הלקוחות",
    new_customer: "לקוח חדש",
  };

  // Return a display name or the original if no mapping exists
  return commonDisplayNames[clientType] || clientType;
}
