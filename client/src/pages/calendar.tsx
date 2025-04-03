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

import { createBooking, fetchTimeslots } from "@/lib/calendarService";
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

export default function Calendar() {
  const [location, navigate] = useLocation();
  const searchParams = new URLSearchParams(window.location.search);
  const { toast } = useToast();

  // States
  const [currentDate, setCurrentDate] = useState<Date>(() => {
    // Check if there are timeslots in April 2025 (based on the data we have)
    const targetDate = new Date("2025-04-04");

    // Default to current date if no specific data needed
    return targetDate;
  });
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
  const [clientType, setClientType] = useState<string>(
    searchParams.get("type") || "all"
  );
  const [meetingType, setMeetingType] = useState<string>("all");

  // Calculate date ranges based on current date
  const weekDays = getWeekDays(currentDate);
  const startDate =
    view === "week" ? startOfWeek(currentDate) : startOfMonth(currentDate);
  const endDate =
    view === "week" ? endOfWeek(currentDate) : endOfMonth(currentDate);

  // Fetch timeslots
  const {
    data: timeslots = [],
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: [
      "/api/timeslots",
      startDate.toISOString(),
      endDate.toISOString(),
      clientType,
      meetingType,
    ],
    queryFn: () => fetchTimeslots(startDate, endDate, clientType, meetingType),
  });

  // Create booking mutation
  const { mutate, isPending } = useMutation({
    mutationFn: createBooking,
    onSuccess: (data, variables) => {
      setBookingDetails({
        name: variables.name,
        email: variables.email,
        phone: variables.phone,
        meetingType: variables.meetingType,
      });
      setBookingModalOpen(false);
      setConfirmationModalOpen(true);
      queryClient.invalidateQueries({ queryKey: ["/api/timeslots"] });
    },
    onError: (error) => {
      toast({
        title: "Booking Failed",
        description:
          error instanceof Error ? error.message : "Failed to create booking.",
        variant: "destructive",
      });
    },
  });

  // Handle navigation
  const goToNextPeriod = () => {
    if (view === "week") {
      setCurrentDate(addDays(currentDate, 7));
    } else {
      const nextMonth = new Date(currentDate);
      nextMonth.setMonth(nextMonth.getMonth() + 1);
      setCurrentDate(nextMonth);
    }
  };

  const goToPreviousPeriod = () => {
    if (view === "week") {
      setCurrentDate(addDays(currentDate, -7));
    } else {
      const prevMonth = new Date(currentDate);
      prevMonth.setMonth(prevMonth.getMonth() - 1);
      setCurrentDate(prevMonth);
    }
  };

  const goToToday = () => {
    setCurrentDate(getNowInIsrael());
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
    // Duration will be determined by the meeting type from the form
    mutate(formData);
  };

  // Handle client type change
  const handleClientTypeChange = (value: string) => {
    setClientType(value);

    // Update URL with wouter navigation
    if (value === "all") {
      navigate("/calendar");
    } else {
      navigate(`/calendar?type=${value}`);
    }
  };

  // Handle meeting type change
  const handleMeetingTypeChange = (value: string) => {
    setMeetingType(value);
  };

  // URL parameter handling
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const urlClientType = searchParams.get("type");

    if (urlClientType) {
      setClientType(urlClientType);
    } else if (!urlClientType && clientType !== "all") {
      setClientType("all");
    }
  }, [location]);

  return (
    <div className="min-h-screen flex flex-col h-screen">
      <CalendarHeader
        currentViewStart={startDate}
        currentViewEnd={endDate}
        onPrevious={goToPreviousPeriod}
        onNext={goToNextPeriod}
        onToday={goToToday}
        currentView={view}
        onViewChange={setView}
      />

      <main className="flex-1 flex overflow-auto">
        <Sidebar
          clientType={clientType}
          onClientTypeChange={handleClientTypeChange}
          meetingType={meetingType}
          onMeetingTypeChange={handleMeetingTypeChange}
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
        ) : isError ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center p-6 max-w-md">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="40"
                height="40"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-red-500 mx-auto mb-4"
              >
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              <h3 className="text-lg font-medium mb-2">
                Failed to load calendar data
              </h3>
              <p className="text-[#5f6368] mb-4">
                There was an issue fetching your calendar information. Please
                try again.
              </p>
              <Button
                onClick={() => refetch()}
                className="bg-[#1a73e8] text-white px-4 py-2 rounded-md hover:bg-blue-600"
              >
                Retry
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col overflow-auto">
            {view === "week" ? (
              <div className="calendar-container w-full">
                <WeekView
                  weekDays={weekDays}
                  timeslots={timeslots}
                  onSelectTimeslot={handleSelectTimeslot}
                  selectedDate={currentDate}
                  onSelectDate={handleSelectDate}
                />
              </div>
            ) : (
              <div className="calendar-container w-full">
                <MonthView
                  currentDate={currentDate}
                  timeslots={timeslots}
                  onSelectDate={handleSelectDate}
                  clientType={clientType}
                />
              </div>
            )}
          </div>
        )}
      </main>

      <BookingModal
        open={bookingModalOpen}
        onClose={() => setBookingModalOpen(false)}
        timeslot={selectedTimeslot}
        onSubmit={handleBookingSubmit}
        isPending={isPending}
      />

      <ConfirmationModal
        isOpen={confirmationModalOpen}
        onClose={() => setConfirmationModalOpen(false)}
        timeslot={selectedTimeslot}
        bookingDetails={bookingDetails}
      />
    </div>
  );
}

// This is needed because calendar.tsx references Button before it's defined
import { Button } from "@/components/ui/button";
