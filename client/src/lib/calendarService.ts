import { apiRequest } from "./queryClient";
import { formatDateInIsrael, formatTimeRangeInIsrael } from "./timeUtils";
import { Timeslot, Booking, ClientRuleWithDisplayName } from "@shared/schema";

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
  const url = new URL('/api/timeslots', window.location.origin);
  
  url.searchParams.append('start', startDate.toISOString());
  url.searchParams.append('end', endDate.toISOString());
  
  if (clientType && clientType !== 'all') {
    url.searchParams.append('type', clientType);
  }
  
  if (meetingType && meetingType !== 'all') {
    url.searchParams.append('meetingType', meetingType);
  }
  
  const response = await apiRequest('GET', url.toString());
  return response.json();
}

export async function fetchTimeslotById(id: number): Promise<Timeslot> {
  const response = await apiRequest('GET', `/api/timeslots/${id}`);
  return response.json();
}

export async function createBooking(bookingData: BookingFormData): Promise<Booking> {
  const response = await apiRequest('POST', '/api/bookings', bookingData);
  return response.json();
}

export async function syncCalendar(): Promise<void> {
  const response = await apiRequest('GET', '/api/sync-calendar');
  return response.json();
}

// Refresh client rules from Google Sheets
export async function refreshClientRules(): Promise<{ success: boolean; message: string; rules: ClientRuleWithDisplayName[] }> {
  const response = await apiRequest('GET', '/api/refresh-client-rules');
  return response.json();
}

// Helper functions for calendar views
export function groupTimeslotsByDay(timeslots: Timeslot[]): Record<string, Timeslot[]> {
  const grouped: Record<string, Timeslot[]> = {};
  
  timeslots.forEach(timeslot => {
    const date = new Date(timeslot.startTime);
    const dateKey = date.toISOString().split('T')[0];
    
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
  
  return formatTimeRangeInIsrael(start, end);
}

export function formatTimeslotDate(timeslot: Timeslot): string {
  const date = new Date(timeslot.startTime);
  return formatDateInIsrael(date);
}

export function getBookingConfirmationText(booking: Booking, timeslot: Timeslot): string {
  const dateStr = formatTimeslotDate(timeslot);
  const timeStr = formatTimeslot(timeslot);
  
  return `Your meeting has been scheduled for ${dateStr} at ${timeStr} (Israel Time).`;
}

export function getTimeslotPosition(timeslot: Timeslot, firstHour: number = 9): { top: number; height: number } {
  const start = new Date(timeslot.startTime);
  const end = new Date(timeslot.endTime);
  
  const startHour = start.getHours() + start.getMinutes() / 60;
  const endHour = end.getHours() + end.getMinutes() / 60;
  
  const top = (startHour - firstHour) * 64; // 64px per hour (16px * 4)
  const height = (endHour - startHour) * 64;
  
  return { top, height };
}

export async function fetchClientRules(): Promise<ClientRuleWithDisplayName[]> {
  const response = await apiRequest('GET', '/api/client-rules');
  return response.json();
}

// Fetch client meeting types with their durations (legacy format)
export async function fetchClientMeetingTypes(): Promise<Record<string, Record<string, number>>> {
  const response = await apiRequest('GET', '/api/client-meeting-types');
  return response.json();
}

// Interface for the new client data structure
export interface ClientData {
  clients: Array<{
    type: string;
    meetings: Record<string, number>;
  }>;
}

// Fetch client data in the new structure
export async function fetchClientData(): Promise<ClientData> {
  const response = await apiRequest('GET', '/api/client-data');
  return response.json();
}

// Client type labels with display names
let clientTypeDisplayNames: Record<string, string> = {
  'vip': 'VIP',
  'new': 'New Client',
  'quick': 'Quick Session',
  'all': 'All Clients'
};

// Function to initialize client display names
export async function initClientDisplayNames(): Promise<void> {
  try {
    const clientRules = await fetchClientRules();
    clientRules.forEach(rule => {
      if (rule.displayName) {
        clientTypeDisplayNames[rule.clientType] = rule.displayName;
      }
    });
    console.log("Client display names loaded:", clientTypeDisplayNames);
  } catch (error) {
    console.error("Failed to load client display names:", error);
  }
}

// Initialize display names when the module loads
initClientDisplayNames().catch(console.error);

export function getClientTypeLabel(clientType: string): string {
  return clientTypeDisplayNames[clientType] || 'Regular';
}
