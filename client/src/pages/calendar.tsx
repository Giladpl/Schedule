import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useLocation } from "wouter";

import { BookingModal } from "@/components/calendar/BookingModal";
import CalendarHeader from "@/components/calendar/CalendarHeader";
import ConfirmationModal from "@/components/calendar/ConfirmationModal";
import MonthView from "@/components/calendar/MonthView";
import Sidebar from "@/components/calendar/Sidebar";
import WeekView from "@/components/calendar/WeekView";

import {
  createBooking,
  fetchAndProcessTimeslots,
  fetchClientData,
  getClientTypeDisplayName,
  syncCalendar,
} from "@/lib/calendarService";
import { getNowInIsrael } from "@/lib/timeUtils";
import {
  addDays,
  endOfMonth,
  endOfWeek,
  getWeekDays,
  startOfMonth,
  startOfWeek,
} from "@/lib/utils";
import { bookingFormSchema, Timeslot } from "@shared/schema";
import { z } from "zod";

// Define the client interface based on the actual API response
interface ClientRuleFromAPI {
  type: string;
  meetings: Record<string, number>;
  id?: number; // Add optional ID field from server
  [key: string]: any;
}

export default function Calendar() {
  const [location, navigate] = useLocation();
  const searchParams = new URLSearchParams(window.location.search);
  const { toast } = useToast();

  // States - initialize with today's date
  const [currentDate, setCurrentDate] = useState<Date>(getNowInIsrael());
  const [view, setView] = useState<"week" | "month">("week");
  const [selectedTimeslot, setSelectedTimeslot] = useState<Timeslot | null>(
    null
  );
  const [bookingModalOpen, setBookingModalOpen] = useState<boolean>(false);
  const [confirmationModalOpen, setConfirmationModalOpen] =
    useState<boolean>(false);
  const [bookingDetails, setBookingDetails] = useState<{
    name: string;
    email: string;
    phone?: string;
    meetingType?: string;
  } | null>(null);

  // Update the state to use arrays for multiple selection
  const [viewMode, setViewMode] = useState<"admin" | "client">("admin");
  const isAdmin = true;

  // Extract type from URL
  const queryType = searchParams.get("type");
  // Change clientType to be an array for multiple selection
  const [clientTypes, setClientTypes] = useState<string[]>(
    viewMode === "admin"
      ? queryType
        ? [queryType]
        : ["all"]
      : queryType
      ? [queryType]
      : ["new_customer"]
  );

  // Update fullClientType to also be an array
  const [fullClientTypes, setFullClientTypes] = useState<string[]>([]);

  // Change meetingType to be an array for multiple selection
  const [meetingTypes, setMeetingTypes] = useState<string[]>(["all"]);
  const [isSyncing, setIsSyncing] = useState(false);

  // Calculate date ranges based on current date
  const weekDays = getWeekDays(currentDate);

  // Calculate start and end dates for the current view
  const startDate =
    view === "week" ? startOfWeek(currentDate) : startOfMonth(currentDate);
  const endDate =
    view === "week" ? endOfWeek(currentDate) : endOfMonth(currentDate);

  // Fetch client data to match short codes to full client types
  const { data: clientData } = useQuery({
    queryKey: ["/api/client-data"],
    queryFn: fetchClientData,
    staleTime: 60000, // 1 minute
  });

  // Match client types dynamically based on query param
  useEffect(() => {
    if (clientData?.clients && queryType) {
      let matchedClients: Array<{ id?: number; type: string }> = [];

      // Parse multiple client types from URL if separated by commas
      const queryTypes = queryType.split(",");

      queryTypes.forEach((type) => {
        // First try to match by numeric ID if type is a number
        if (!isNaN(parseInt(type))) {
          const numericId = parseInt(type);
          const matchedClient = clientData.clients.find(
            (client) => client.id === numericId
          );

          if (matchedClient) {
            console.log(
              `[Debug] Matched by numeric ID ${numericId} to client: ${matchedClient.type}`
            );
            matchedClients.push(matchedClient);
          }
        } else {
          // If no match by ID, try exact match by type name
          const matchedClient = clientData.clients.find(
            (client) => client.type === type
          );

          if (matchedClient) {
            console.log(
              `[Debug] Matched by name to client: ${matchedClient.type} (ID: ${matchedClient.id})`
            );
            matchedClients.push(matchedClient);
          } else if (type.length === 1) {
            // Legacy fallback: first letter matching (for backward compatibility)
            const matchedByLetter = clientData.clients.find((client) =>
              client.type.startsWith(type)
            );

            if (matchedByLetter) {
              console.log(
                `[Debug] Matched by first letter to client: ${matchedByLetter.type} (ID: ${matchedByLetter.id})`
              );
              matchedClients.push(matchedByLetter);
            }
          }
        }
      });

      if (matchedClients.length > 0) {
        // Set client types using IDs when available
        setClientTypes(
          matchedClients.map((client) =>
            client.id !== undefined ? `${client.id}` : client.type
          )
        );

        // Set full client types for API calls
        setFullClientTypes(matchedClients.map((client) => client.type));
      } else {
        // No matches found, use queryType as is
        console.log(
          `[Debug] No matches found for queryTypes: ${queryTypes.join(
            ","
          )}, using as is`
        );
        setClientTypes(queryTypes);
        setFullClientTypes(queryTypes);
      }
    } else if (viewMode === "admin" && !queryType) {
      // Admin view with no query type should default to "all"
      setClientTypes(["all"]);
      setFullClientTypes([]);
    } else if (viewMode === "client" && !queryType) {
      // Client view with no query type should default to new_customer
      // Try to find new_customer ID
      if (clientData?.clients) {
        const newCustomerClient = clientData.clients.find(
          (client) => client.type === "new_customer"
        );
        if (newCustomerClient && newCustomerClient.id !== undefined) {
          setClientTypes([`${newCustomerClient.id}`]);
          setFullClientTypes(["new_customer"]);
        } else {
          setClientTypes(["new_customer"]);
          setFullClientTypes(["new_customer"]);
        }
      } else {
        setClientTypes(["new_customer"]);
        setFullClientTypes(["new_customer"]);
      }
    }
  }, [clientData, queryType, viewMode]);

  // Add a new effect to update document title based on client types
  useEffect(() => {
    if (viewMode === "client" && fullClientTypes.length > 0) {
      document.title = `Schedule - ${fullClientTypes
        .map((type) => getClientTypeDisplayName(type))
        .join(", ")}`;
    } else if (
      viewMode === "client" &&
      clientTypes.length > 0 &&
      clientTypes[0] !== "all"
    ) {
      document.title = `Schedule - ${clientTypes
        .map((type) => getClientTypeDisplayName(type))
        .join(", ")}`;
    } else if (viewMode === "admin") {
      document.title = "Admin Panel - Schedule";
    } else {
      document.title = "Schedule Appointment";
    }
  }, [viewMode, clientTypes, fullClientTypes]);

  // Fix the handleViewModeToggle function to properly toggle between views
  const handleViewModeToggle = () => {
    // Toggle between admin and client views
    const newViewMode = viewMode === "admin" ? "client" : "admin";
    setViewMode(newViewMode);

    // Update client type based on the new view mode
    setClientTypes(
      newViewMode === "admin"
        ? ["all"]
        : queryType
        ? [queryType]
        : ["new_customer"]
    );

    console.log(`View mode changed to: ${newViewMode}`);
  };

  // Fetch timeslots from API with the specified date range and client types
  // IMPORTANT: Use the shared fetchAndProcessTimeslots function for both views
  const {
    data: timeslots = [],
    isLoading,
    error: apiError,
  } = useQuery({
    queryKey: ["timeslots", startDate, endDate, clientTypes, meetingTypes],
    queryFn: async () => {
      console.log(
        `Fetching timeslots for ${view} view from ${startDate.toISOString()} to ${endDate.toISOString()}`
      );
      console.log(`Client types: ${clientTypes.join(", ")}`);
      console.log(`Meeting types: ${meetingTypes.join(", ")}`);

      try {
        // Use the shared function for both weekly and monthly views
        return await fetchAndProcessTimeslots(
          startDate,
          endDate,
          clientTypes.includes("all") ? "all" : clientTypes[0],
          meetingTypes.includes("all") ? "all" : meetingTypes[0]
        );
      } catch (error) {
        console.error("Error fetching timeslots:", error);
        throw error;
      }
    },
    staleTime: 60000, // 1 minute
    refetchOnWindowFocus: false,
  });

  console.log(`Received ${timeslots?.length || 0} timeslots for ${view} view`);

  if (timeslots && timeslots.length > 0) {
    // Log the first few timeslots for debugging
    console.log(`Sample timeslots for ${view} view:`);
    timeslots.slice(0, Math.min(2, timeslots.length)).forEach((slot, i) => {
      console.log(
        `Slot ${i}: ID=${slot.id}, Start=${new Date(
          slot.startTime
        ).toISOString()}, Types=${slot.meetingTypes}`
      );
    });
  }

  // Error handling for timeslots API
  useEffect(() => {
    if (apiError) {
      console.error("API Error:", apiError);
      toast({
        title: "Error",
        description: "Failed to load timeslots. Please try again later.",
        variant: "destructive",
      });
    }
  }, [apiError, toast]);

  // Loading state for booking form submission
  const { mutate, isPending: isBooking } = useMutation({
    mutationFn: createBooking,
    onSuccess: (data: Booking) => {
      // Close booking modal
      setBookingModalOpen(false);

      // Store booking details for confirmation
      setBookingDetails({
        name: data.name,
        email: data.email,
        phone: data.phone ?? undefined,
        meetingType: data.meetingType,
      });
      setConfirmationModalOpen(true);

      // Refetch timeslots to update availability
      queryClient.invalidateQueries({ queryKey: ["timeslots"] });
    },
    onError: (error) => {
      console.error("Error creating booking:", error);
      toast({
        title: "Booking Error",
        description: "Failed to create booking. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Navigation handlers
  const goToNextPeriod = () => {
    if (view === "week") {
      setCurrentDate((prev) => addDays(prev, 7));
    } else {
      setCurrentDate(
        (prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1)
      );
    }
  };

  const goToPreviousPeriod = () => {
    if (view === "week") {
      setCurrentDate((prev) => addDays(prev, -7));
    } else {
      setCurrentDate(
        (prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1)
      );
    }
  };

  const goToToday = () => {
    setCurrentDate(getNowInIsrael());
  };

  const isPreviousDisabled = () => {
    const today = getNowInIsrael();
    if (view === "week") {
      return startOfWeek(currentDate) <= startOfWeek(today);
    } else {
      return (
        currentDate.getFullYear() < today.getFullYear() ||
        (currentDate.getFullYear() === today.getFullYear() &&
          currentDate.getMonth() <= today.getMonth())
      );
    }
  };

  // Handle timeslot selection
  const handleSelectTimeslot = (timeslot: Timeslot) => {
    setSelectedTimeslot(timeslot);
    setBookingModalOpen(true);
  };

  // Handle date selection in month view
  const handleSelectDate = (date: Date) => {
    setCurrentDate(date);
    setView("week");
  };

  // Handle form submission
  const handleBookingSubmit = (formData: z.infer<typeof bookingFormSchema>) => {
    mutate(formData);
  };

  // Handle client type change - only allowed for admin
  const handleClientTypeChange = (values: string[]) => {
    if (!isAdmin) return; // Only admins can change client type directly

    console.log(`[Debug] User selected client types: ${values.join(", ")}`);

    // If the values array is empty, default to "all"
    if (values.length === 0) {
      values = ["all"];
    }
    // Check if "all" is added while other options exist
    else if (values.includes("all") && values.length > 1) {
      // If current selection doesn't include "all" but new selection does, just use "all"
      if (!clientTypes.includes("all")) {
        values = ["all"];
      }
      // If current selection includes "all" and user selects another type, remove "all"
      else {
        values = values.filter((v) => v !== "all");
      }
    }

    // Force update client types state
    setClientTypes(values);

    // When client types change, we should update fullClientTypes accordingly
    const hasAllClientType = values.includes("all");

    if (hasAllClientType) {
      setFullClientTypes([]);
    } else {
      // For non-"all" values, attempt to find matching client data
      if (clientData?.clients) {
        const newFullClientTypes: string[] = [];

        values.forEach((value) => {
          // First try to match by ID
          const numericId = !isNaN(parseInt(value))
            ? parseInt(value)
            : undefined;

          // Find the client by ID or type name directly
          const matchedClient =
            numericId !== undefined
              ? clientData.clients.find((client) => client.id === numericId)
              : clientData.clients.find((client) => client.type === value);

          if (matchedClient) {
            // Use the client.type directly from the matched client, which is the raw value from the server
            newFullClientTypes.push(matchedClient.type);
            console.log(
              `[Debug] Matched client: ${matchedClient.type} (ID: ${matchedClient.id})`
            );
          } else {
            // If not found, use the raw value
            newFullClientTypes.push(value);
            console.log(
              `[Debug] Using direct value as fullClientType: ${value}`
            );
          }
        });

        setFullClientTypes(newFullClientTypes);
      } else {
        // If no client data available, use the raw values
        setFullClientTypes(values);
      }
    }

    // Update URL with wouter navigation
    if (values.length === 1 && values[0] === "all") {
      navigate(viewMode === "admin" ? "/admin" : "/calendar");
    } else {
      // Join all selected values with commas for the URL
      navigate(
        `${
          viewMode === "admin" ? "/admin" : "/calendar"
        }?type=${encodeURIComponent(values.join(","))}`
      );
    }

    // Force refetch timeslots with the new client types
    queryClient.invalidateQueries({ queryKey: ["timeslots"] });
  };

  // Handle meeting type change
  const handleMeetingTypeChange = (values: string[]) => {
    // If the values array is empty, default to "all"
    if (values.length === 0) {
      values = ["all"];
    }
    // Check if "all" is added while other options exist
    else if (values.includes("all") && values.length > 1) {
      // If current selection doesn't include "all" but new selection does, just use "all"
      if (!meetingTypes.includes("all")) {
        values = ["all"];
      }
      // If current selection includes "all" and user selects another type, remove "all"
      else {
        values = values.filter((v) => v !== "all");
      }
    }

    setMeetingTypes(values);

    // Force refetch timeslots with the new meeting types
    queryClient.invalidateQueries({ queryKey: ["timeslots"] });
  };

  // Sync calendar on component mount
  useEffect(() => {
    const syncGoogleCalendar = async () => {
      setIsSyncing(true);
      try {
        await syncCalendar();
        console.log("Calendar synced successfully");
      } catch (error) {
        console.error("Error syncing calendar:", error);
        toast({
          title: "Sync Error",
          description:
            "Failed to sync with Google Calendar. You may see outdated events.",
          variant: "destructive",
        });
      } finally {
        setIsSyncing(false);
      }
    };

    syncGoogleCalendar();
  }, [toast]);

  return (
    <div className="h-full flex flex-col" dir="rtl">
      <CalendarHeader
        currentViewStart={startDate}
        currentViewEnd={endDate}
        onPrevious={goToPreviousPeriod}
        onNext={goToNextPeriod}
        onToday={goToToday}
        currentView={view}
        onViewChange={setView}
        isPreviousDisabled={isPreviousDisabled()}
        isAdmin={isAdmin}
        onViewModeToggle={handleViewModeToggle}
        currentViewMode={viewMode}
      />

      <div className="flex flex-1 overflow-hidden">
        <Sidebar
          clientTypes={clientTypes}
          onClientTypeChange={handleClientTypeChange}
          meetingTypes={meetingTypes}
          onMeetingTypeChange={handleMeetingTypeChange}
          isAdmin={viewMode === "admin"}
          viewMode={viewMode}
        />

        <div className="flex-1 overflow-auto">
          {isLoading ? (
            <div className="flex-1 flex items-center justify-center">
              <svg
                className="animate-spin -ml-1 mr-3 h-8 w-8 text-[#1a73e8]"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
              <p className="text-[#5f6368]">Loading calendar...</p>
            </div>
          ) : view === "week" ? (
            <WeekView
              startDate={startDate}
              timeslots={timeslots}
              onTimeslotClick={handleSelectTimeslot}
              selectedMeetingTypes={meetingTypes}
              activeClientTypes={clientTypes}
              viewMode={viewMode}
            />
          ) : (
            <MonthView
              currentDate={currentDate}
              timeslots={timeslots}
              onSelectDate={handleSelectDate}
              activeClientTypes={clientTypes}
              viewMode={viewMode}
            />
          )}
        </div>
      </div>

      {/* Booking Modal */}
      <BookingModal
        open={bookingModalOpen}
        onClose={() => setBookingModalOpen(false)}
        timeslot={selectedTimeslot}
        onSubmit={handleBookingSubmit}
        isPending={isBooking}
      />

      {/* Confirmation Modal */}
      <ConfirmationModal
        isOpen={confirmationModalOpen}
        onClose={() => setConfirmationModalOpen(false)}
        bookingDetails={bookingDetails}
        timeslot={selectedTimeslot}
      />
    </div>
  );
}
