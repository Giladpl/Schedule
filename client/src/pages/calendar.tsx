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

  // Instead of using the URL path to determine admin mode, use a state variable
  // This allows toggling between views without changing URLs
  const [viewMode, setViewMode] = useState<"admin" | "client">("admin");

  // Always set isAdmin to true - the admin permission is always there
  const isAdmin = true;

  // Determine client type based on query params or default to new_customer for regular users
  const queryType = searchParams.get("type");
  const [clientType, setClientType] = useState<string>(
    viewMode === "admin" ? queryType || "all" : queryType || "new_customer"
  );

  // Add a useEffect to fetch client data for matching clientType
  const [fullClientType, setFullClientType] = useState<string | null>(null);

  // Fetch client data to match short codes to full client types
  const { data: clientData } = useQuery({
    queryKey: ["/api/client-data"],
    queryFn: fetchClientData,
    staleTime: 60000, // 1 minute
  });

  // Match client types dynamically based on query param
  useEffect(() => {
    if (clientData?.clients && queryType && viewMode === "client") {
      let matchedClient = null;

      // First try to match by numeric ID if queryType is a number
      if (!isNaN(parseInt(queryType))) {
        const numericId = parseInt(queryType);
        matchedClient = clientData.clients.find(
          (client) => client.id === numericId
        );
      }

      // If no match by ID, try exact match by type name
      if (!matchedClient) {
        matchedClient = clientData.clients.find(
          (client) => client.type === queryType
        );
      }

      // Legacy fallback: first letter matching (for backward compatibility)
      if (!matchedClient && queryType.length === 1) {
        matchedClient = clientData.clients.find((client) =>
          client.type.startsWith(queryType)
        );
      }

      if (matchedClient) {
        // Update fullClientType but keep clientType as the query parameter for URL maintenance
        setFullClientType(matchedClient.type);
      } else {
        // Set fullClientType to queryType as fallback to ensure filtering still works
        setFullClientType(queryType);
      }
    } else if (!queryType || viewMode === "admin") {
      setFullClientType(null);
    }
  }, [clientData, queryType, viewMode]);

  // Add a new effect to update document title based on client type
  useEffect(() => {
    if (viewMode === "client" && fullClientType) {
      document.title = `Schedule - ${getClientTypeDisplayName(fullClientType)}`;
    } else if (viewMode === "client" && queryType) {
      document.title = `Schedule - ${getClientTypeDisplayName(queryType)}`;
    } else if (viewMode === "admin") {
      document.title = "Admin Panel - Schedule";
    } else {
      document.title = "Schedule Appointment";
    }
  }, [viewMode, queryType, fullClientType]);

  // Update client type when view mode changes
  useEffect(() => {
    setClientType(viewMode === "admin" ? "all" : queryType || "new_customer");
  }, [viewMode, queryType]);

  const [meetingType, setMeetingType] = useState<string>("all");
  const [isSyncing, setIsSyncing] = useState(false);

  // Calculate date ranges based on current date
  const weekDays = getWeekDays(currentDate);

  // Calculate start and end dates for the current view
  const startDate =
    view === "week" ? startOfWeek(currentDate) : startOfMonth(currentDate);
  const endDate =
    view === "week" ? endOfWeek(currentDate) : endOfMonth(currentDate);

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

  // Add handler for toggling between admin and client views
  const handleViewModeToggle = () => {
    // Toggle between admin and client view
    setViewMode(viewMode === "admin" ? "client" : "admin");
    console.log(
      "Toggled view mode to:",
      viewMode === "admin" ? "client" : "admin"
    );
  };

  // Fetch timeslots
  const {
    data: timeslots = [],
    isLoading,
    refetch,
    error,
  } = useQuery({
    queryKey: [
      "timeslots",
      {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        clientType: fullClientType || clientType,
        meetingType,
      },
    ],
    queryFn: async () => {
      try {
        // Use full client type if we've mapped a single letter to a full client name
        const typeParam = fullClientType || clientType;

        // Construct the API URL
        const apiUrl = `/api/timeslots?start=${encodeURIComponent(
          startDate.toISOString()
        )}&end=${encodeURIComponent(endDate.toISOString())}${
          typeParam ? `&type=${encodeURIComponent(typeParam)}` : ""
        }${
          meetingType !== "all"
            ? `&meetingType=${encodeURIComponent(meetingType)}`
            : ""
        }`;

        console.log("Fetching timeslots from:", apiUrl);

        const response = await fetch(apiUrl);
        if (!response.ok) {
          throw new Error(`API request failed with status ${response.status}`);
        }

        const data = await response.json();
        console.log(`Received ${data.length} timeslots from API`);

        return data;
      } catch (error) {
        console.error("Error fetching timeslots:", error);
        throw error;
      }
    },
    // Disable background refetching to improve performance
    refetchOnWindowFocus: false,
    staleTime: 1000 * 60 * 5, // 5 minutes - reduce API calls
  });

  // Error handling
  useEffect(() => {
    if (error) {
      console.error("Error from React Query:", error);
      toast({
        title: "Error Loading Calendar",
        description:
          "Failed to load timeslots. Please try refreshing the page.",
        variant: "destructive",
      });
    }
  }, [error, toast]);

  // Booking mutations
  const { mutate, isPending: isBooking } = useMutation({
    mutationFn: createBooking,
    onSuccess: (data) => {
      setBookingModalOpen(false);
      setBookingDetails(data);
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
  const handleClientTypeChange = (value: string) => {
    if (!isAdmin) return; // Only admins can change client type directly

    setClientType(value);

    // Update URL with wouter navigation
    if (value === "all") {
      navigate(viewMode === "admin" ? "/admin" : "/calendar");
    } else {
      navigate(
        `${viewMode === "admin" ? "/admin" : "/calendar"}?type=${value}`
      );
    }
  };

  // Handle meeting type change
  const handleMeetingTypeChange = (value: string) => {
    setMeetingType(value);
  };

  return (
    <div className="flex flex-col h-full">
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

      <main className="flex-1 flex overflow-hidden h-full">
        <Sidebar
          clientType={clientType}
          onClientTypeChange={handleClientTypeChange}
          meetingType={meetingType}
          onMeetingTypeChange={handleMeetingTypeChange}
          isAdmin={isAdmin}
          viewMode={viewMode}
        />

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
            weekDays={weekDays}
            timeslots={timeslots}
            onSelectTimeslot={handleSelectTimeslot}
            selectedDate={currentDate}
            onSelectDate={handleSelectDate}
            clientType={fullClientType || clientType}
            isAdmin={isAdmin}
            meetingType={meetingType}
            viewMode={viewMode}
          />
        ) : (
          <MonthView
            currentDate={currentDate}
            timeslots={timeslots}
            onSelectDate={handleSelectDate}
            clientType={fullClientType || clientType}
            viewMode={viewMode}
          />
        )}
      </main>

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
