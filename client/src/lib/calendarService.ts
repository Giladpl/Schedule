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
  // Use a relative URL to leverage the Vite proxy
  const url = new URL("/api/timeslots", window.location.origin);
  url.searchParams.append("start", startDate.toISOString());
  url.searchParams.append("end", endDate.toISOString());

  if (clientType) {
    url.searchParams.append("type", clientType);
  }

  if (meetingType) {
    url.searchParams.append("meetingType", meetingType);
  }

  console.log(`[Debug] Fetching timeslots: ${url.toString()}`);
  try {
    const response = await apiRequest<Timeslot[]>("GET", url.toString());
    console.log(`[Debug] Received ${response.length} timeslots`);
    return response;
  } catch (error) {
    console.error("[Debug] Error fetching timeslots:", error);
    throw error;
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
  console.log(`[Debug] Syncing calendar`);
  const response = await apiRequest<void>("GET", "/api/sync-calendar");
  console.log(`[Debug] Sync response:`, response);
  return response;
}

// Refresh client rules from Google Sheets
export interface ClientRule {
  type: string;
  meetings: Record<string, number>;
}

let clientRules: ClientRule[] = [];

export async function refreshClientRules(): Promise<ClientRule[]> {
  try {
    const data = await apiRequest<ClientData>("GET", "/api/client-data");
    clientRules = data.clients;
    console.log("Client rules loaded:", clientRules);
    return clientRules;
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
  return clientType;
}
