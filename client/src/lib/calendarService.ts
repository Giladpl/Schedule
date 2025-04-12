import { Booking, ClientRuleWithDisplayName, Timeslot } from "@shared/schema";
import { endOfDay, endOfMonth, endOfWeek, startOfDay, startOfMonth, startOfWeek } from "date-fns";
import { apiRequest } from "./queryClient";
import {
    formatDateInIsrael,
    formatTimeInIsrael,
    formatTimeRangeInIsrael
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
  const controller = new AbortController();

  console.log(`Fetching timeslots: ${startDate.toISOString()} to ${endDate.toISOString()}`);

  try {
    // Format dates
    const formattedStartDate = startDate.toISOString();
    const formattedEndDate = endDate.toISOString();

    // Build the URL with query parameters
    const params = new URLSearchParams();
    params.append("start", formattedStartDate);
    params.append("end", formattedEndDate);

    // Add client type parameter if provided
    if (clientType) {
      params.append("type", clientType);
    }

    // Add meeting type parameter if provided
    if (meetingType) {
      params.append("meetingType", meetingType);
    }

    const url = `/api/timeslots?${params.toString()}`;
    console.log(`[Debug] Fetching timeslots from: ${url}`);

    // Make the API request
    const response = await apiRequest<Timeslot[]>(
      "GET",
      url,
      undefined,
      { signal: controller.signal }
    );

    console.log(`[Debug] Received ${response.length} timeslots from server`);

    return response;
  } catch (error) {
    console.error("[Debug] Error fetching timeslots:", error);
    throw error;
  } finally {
    controller.abort();
  }
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

  // First, list all timeslot IDs for debugging
  console.log(`Timeslot IDs being grouped: ${timeslots.map(ts => ts.id).join(', ')}`);

  timeslots.forEach((timeslot) => {
    try {
      // Ensure timeslot has valid dates
      const startDate = new Date(timeslot.startTime);
      const endDate = new Date(timeslot.endTime);

      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        console.error('Invalid date in timeslot:', timeslot);
        return; // Skip this timeslot
      }

      // Get the date key in YYYY-MM-DD format - IMPORTANT: Use consistent method to format dates
      // This is the source of the inconsistency with WeekView
      const startDay = startOfDay(startDate);
      const dateKey = startDay.toISOString().split('T')[0];

      // Initialize array if needed
      if (!grouped[dateKey]) {
        grouped[dateKey] = [];
      }

      // Add the timeslot to this day
      grouped[dateKey].push(timeslot);
      console.log(`Added timeslot ID=${timeslot.id} to date ${dateKey}`);

      // Handle multi-day timeslots - only if they span multiple calendar days
      const startDayTime = startDay.getTime();
      const endDayTime = endOfDay(endDate).getTime();

      // Only process multi-day logic if the event actually spans multiple days
      if (endDayTime > startDayTime + 24*60*60*1000) { // More than one day difference
        let currentDay = new Date(startDay);
        currentDay.setDate(currentDay.getDate() + 1); // Start with the next day

        // Iterate through the additional days
        while (currentDay.getTime() <= endDayTime) {
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

  // Debug: Show each day and its timeslot IDs
  Object.entries(grouped).forEach(([date, slots]) => {
    console.log(`Day ${date} has timeslots: ${slots.map(s => s.id).join(', ')}`);
  });

  return grouped;
}

/**
 * Ultimate consolidated filtering function that both weekly and monthly views MUST use
 * to ensure 100% consistent behavior.
 *
 * @param timeslots The full list of timeslots to filter
 * @param viewType The current view type ('week' or 'month')
 * @param currentDate The current date being viewed
 * @param clientTypes The active client types
 * @param meetingTypes The active meeting types
 * @param currentTime The current time for filtering (passed from parent)
 * @returns Filtered timeslots ready to be displayed
 */
export function filterCalendarTimeslots(
  timeslots: Timeslot[],
  viewType: "week" | "month",
  currentDate: Date,
  clientTypes: string[] = ["all"],
  meetingTypes: string[] = ["all"],
  currentTime: Date
): Timeslot[] {
  if (!timeslots || timeslots.length === 0) {
    console.log("No timeslots to filter");
    return [];
  }

  console.log(`[SHARED-FILTER] Starting filtering ${timeslots.length} timeslots for ${viewType} view`);
  console.log(`[SHARED-FILTER] Client types: ${clientTypes.join(', ')}`);
  console.log(`[SHARED-FILTER] Meeting types: ${meetingTypes.join(', ')}`);
  console.log(`[SHARED-FILTER] Current time: ${currentTime.toISOString()}`);

  // STEP 1: Determine date range based on view type
  const viewStart = viewType === "week"
    ? startOfDay(startOfWeek(currentDate))
    : startOfDay(startOfMonth(currentDate));

  const viewEnd = viewType === "week"
    ? endOfDay(endOfWeek(currentDate))
    : endOfDay(endOfMonth(currentDate));

  console.log(`[SHARED-FILTER] View date range: ${viewStart.toISOString()} to ${viewEnd.toISOString()}`);

  // STEP 2: First filter by availability and time restrictions
  const validTimeslots = timeslots.filter(slot => {
    try {
      // Skip unavailable slots
      if (!slot.isAvailable) {
        return false;
      }

      const slotStart = new Date(slot.startTime);
      const slotEnd = new Date(slot.endTime);

      // Skip invalid dates
      if (isNaN(slotStart.getTime()) || isNaN(slotEnd.getTime())) {
        console.error("[SHARED-FILTER] Invalid date in timeslot:", slot);
        return false;
      }

      // CRITICAL FILTER: Skip slots that have already ended
      if (slotEnd <= currentTime) {
        console.log(`[SHARED-FILTER] Filtering out past timeslot ${slot.id}: ends at ${slotEnd.toISOString()}`);
        return false;
      }

      // Check client type match - Using OR logic
      const hasAllClientType = clientTypes.includes("all");
      const clientTypeMatch =
        hasAllClientType ||
        slot.clientType === "all" ||
        clientTypes.includes(slot.clientType) ||
        (Array.isArray(slot.clientType) &&
          slot.clientType.some(ct => clientTypes.includes(ct)));

      if (!clientTypeMatch) {
        return false;
      }

      // Check meeting type match if applicable
      if (!meetingTypes.includes("all")) {
        // Parse slot.meetingTypes - could be a string array or a comma-separated string
        const slotMeetingTypes = Array.isArray(slot.meetingTypes)
          ? slot.meetingTypes
          : typeof slot.meetingTypes === 'string'
            ? slot.meetingTypes.split(',')
            : [];

        const meetingTypeMatch = slotMeetingTypes.some(mt =>
          meetingTypes.includes(mt.trim())
        );

        if (!meetingTypeMatch) {
          return false;
        }
      }

      return true;
    } catch (error) {
      console.error("[SHARED-FILTER] Error filtering timeslot:", error, slot);
      return false;
    }
  });

  console.log(`[SHARED-FILTER] After availability/time filtering: ${validTimeslots.length} timeslots`);

  // STEP 3: Then filter by view date range
  const viewFilteredTimeslots = validTimeslots.filter(slot => {
    const slotStart = new Date(slot.startTime);
    const slotEnd = new Date(slot.endTime);

    // Include if:
    // 1. The slot starts within the view period
    // 2. The slot ends within the view period
    // 3. The slot spans across the entire view period
    return (
      (slotStart >= viewStart && slotStart <= viewEnd) || // Starts within period
      (slotEnd >= viewStart && slotEnd <= viewEnd) ||    // Ends within period
      (slotStart <= viewStart && slotEnd >= viewEnd)     // Spans period
    );
  });

  console.log(`[SHARED-FILTER] Final filtered timeslots: ${viewFilteredTimeslots.length}`);

  // Debug log IDs of filtered timeslots
  if (viewFilteredTimeslots.length > 0) {
    console.log(`[SHARED-FILTER] Filtered timeslot IDs: ${viewFilteredTimeslots.map(ts => ts.id).join(', ')}`);
  }

  return viewFilteredTimeslots;
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
  firstHour: number = 7
): { top: number; height: number } {
  const start = new Date(timeslot.startTime);
  const end = new Date(timeslot.endTime);

  // If endTime is earlier than startTime, swap them for positioning
  const positionStart = start.getTime() < end.getTime() ? start : end;
  const positionEnd = start.getTime() < end.getTime() ? end : start;

  const startHour = positionStart.getHours() + positionStart.getMinutes() / 60;
  const endHour = positionEnd.getHours() + positionEnd.getMinutes() / 60;

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

/**
 * Shared function to fetch and process timeslots for both weekly and monthly views.
 * This ensures that both views use exactly the same data processing logic.
 */
export async function fetchAndProcessTimeslots(
  startDate: Date,
  endDate: Date,
  clientType: string = "all",
  meetingType: string = "all"
): Promise<Timeslot[]> {
  console.log(`Fetching timeslots from ${startDate.toISOString()} to ${endDate.toISOString()}`);

  try {
    // Format dates for API call
    const formattedStartDate = startDate.toISOString();
    const formattedEndDate = endDate.toISOString();

    // Build the API URL with client types parameter
    let url = `/api/timeslots?start=${encodeURIComponent(
      formattedStartDate
    )}&end=${encodeURIComponent(formattedEndDate)}`;

    // Add client type parameter if not "all"
    if (clientType !== "all") {
      url += `&type=${encodeURIComponent(clientType)}`;
    }

    // Add meeting type parameter if not "all"
    if (meetingType !== "all") {
      url += `&meetingType=${encodeURIComponent(meetingType)}`;
    }

    console.log("Fetching timeslots from:", url);

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();
    console.log(`Received ${data.length} timeslots from server`);

    return data;
  } catch (error) {
    console.error("Error in fetchAndProcessTimeslots:", error);
    throw error;
  }
}

/**
 * Filters timeslots based on the current view, dates, and client/meeting types
 * FIXED version that filters by start time to ensure consistent behavior
 */
export function filterTimeslots(
  timeslots: Timeslot[],
  view: "week" | "month",
  currentDate: Date,
  clientTypes: string[],
  meetingTypes: string[],
  currentTime: Date // Passing current time explicitly for consistent behavior
): Timeslot[] {
  if (!timeslots || timeslots.length === 0) return [];

  console.log(`SERVICE FILTERING with time: ${currentTime.toISOString()}`);
  console.log(`Current view: ${view}, date: ${currentDate.toISOString()}`);

  // Step 1: First filter out all invalid/unavailable/past timeslots
  const validTimeslots = timeslots.filter((slot: Timeslot) => {
    try {
      // Skip unavailable slots
      if (!slot.isAvailable) return false;

      // Skip slots with invalid dates
      const slotStart = new Date(slot.startTime);
      const slotEnd = new Date(slot.endTime);
      if (isNaN(slotStart.getTime()) || isNaN(slotEnd.getTime())) {
        return false;
      }

      // CRITICAL: Skip slots that have already started
      // This is the key fix - we're comparing against start time, not end time
      if (slotStart <= currentTime) {
        console.log(`Excluding past slot ${slot.id} - starts at ${slotStart.toISOString()}`);
        return false;
      }

      // Check client type match
      const hasAllClientType = clientTypes.includes("all");
      const clientTypeMatch =
        hasAllClientType ||
        slot.clientType === "all" ||
        clientTypes.includes(slot.clientType) ||
        (Array.isArray(slot.clientType) &&
          slot.clientType.some((ct: string) => clientTypes.includes(ct)));

      if (!clientTypeMatch) return false;

      // Check meeting type match
      if (!meetingTypes.includes("all")) {
        const slotMeetingTypes = Array.isArray(slot.meetingTypes)
          ? slot.meetingTypes
          : typeof slot.meetingTypes === "string"
            ? slot.meetingTypes.split(",")
            : [];

        const meetingTypeMatch = slotMeetingTypes.some((mt: string) =>
          meetingTypes.includes(mt.trim())
        );

        if (!meetingTypeMatch) return false;
      }

      return true;
    } catch (error) {
      console.error("Error in filtering:", error, slot);
      return false;
    }
  });

  console.log(`SERVICE FILTER: ${validTimeslots.length} timeslots passed basic filtering`);

  // Step 2: Filter by current view date range
  const viewStart = view === "week"
    ? startOfDay(startOfWeek(currentDate))
    : startOfDay(startOfMonth(currentDate));

  const viewEnd = view === "week"
    ? endOfDay(endOfWeek(currentDate))
    : endOfDay(endOfMonth(currentDate));

  console.log(`SERVICE FILTER: Current ${view} view range: ${viewStart.toISOString()} to ${viewEnd.toISOString()}`);

  // Apply date range filtering for current view
  const dateFilteredSlots = validTimeslots.filter((slot: Timeslot) => {
    const slotStart = new Date(slot.startTime);
    return (
      slotStart >= viewStart && slotStart <= viewEnd // Only consider start time for view range
    );
  });

  console.log(`SERVICE FILTER: ${dateFilteredSlots.length} slots in current ${view} view after date filtering`);

  if (dateFilteredSlots.length > 0) {
    console.log(`SERVICE FILTER: First slot in view: ID=${dateFilteredSlots[0].id}, ${new Date(dateFilteredSlots[0].startTime).toISOString()}`);
  }

  return dateFilteredSlots;
}
