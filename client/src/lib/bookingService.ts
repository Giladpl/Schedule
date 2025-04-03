import { Booking } from "@shared/schema";
import { apiRequest } from "./queryClient";

// Type for the booking form
export interface BookingFormData {
  timeslotId: number;
  name: string;
  email: string;
  phone?: string;
  notes?: string;
  meetingType: string;
  duration: number;
  startTime?: Date;
}

/**
 * Book an appointment by creating a booking
 */
export async function bookAppointment(
  bookingData: BookingFormData
): Promise<Booking> {
  console.log(`[Debug] Booking appointment:`, bookingData);

  // If we have a startTime, include it in the request
  const requestData = {
    ...bookingData,
    startTime: bookingData.startTime
      ? bookingData.startTime.toISOString()
      : undefined,
  };

  try {
    const response = await apiRequest<Booking>(
      "POST",
      "/api/bookings",
      requestData
    );
    console.log(`[Debug] Booking response:`, response);
    return response;
  } catch (error) {
    console.error("[Debug] Error booking appointment:", error);
    throw error;
  }
}
