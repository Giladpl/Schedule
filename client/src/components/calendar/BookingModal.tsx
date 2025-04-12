import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CLIENT_TYPE_COLORS } from "@/components/ui/time-slot";
import { useToast } from "@/hooks/use-toast";
import { bookAppointment, BookingFormData } from "@/lib/bookingService";
import { fetchClientData } from "@/lib/calendarService";
import { formatDate, formatTime } from "@/lib/utils";
import { zodResolver } from "@hookform/resolvers/zod";
import { bookingFormSchema, Timeslot } from "@shared/schema";
import { useQuery } from "@tanstack/react-query";
import { Calendar, Clock, Phone, Users, Video } from "lucide-react";
import React, { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import * as z from "zod";

// Meeting type to icon mapping
const MEETING_TYPE_ICONS: Record<string, JSX.Element> = {
  טלפון: <Phone className="h-5 w-5" />,
  זום: <Video className="h-5 w-5" />,
  פגישה: <Users className="h-5 w-5" />,
  default: <Clock className="h-5 w-5" />,
};

// Duration to display text mapping
const formatDuration = (minutes: number): string => {
  if (minutes < 60) {
    return `${minutes} minutes`;
  } else if (minutes === 60) {
    return "1 hour";
  } else {
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    if (remainingMinutes === 0) {
      return `${hours} hours`;
    } else {
      return `${hours}.${(remainingMinutes / 60) * 10} hours`;
    }
  }
};

type FormData = z.infer<typeof bookingFormSchema>;

interface BookingModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: FormData) => void;
  timeslot: Timeslot | null;
  isPending: boolean;
}

export function BookingModal({
  open,
  onClose,
  onSubmit: submitCallback,
  timeslot,
  isPending,
}: BookingModalProps) {
  const { toast } = useToast();
  const [selectedMeetingType, setSelectedMeetingType] = useState<string>("");
  const [selectedTimeSegment, setSelectedTimeSegment] = useState<Date | null>(
    null
  );
  const [timeSegments, setTimeSegments] = useState<Date[]>([]);

  // Read client type from URL to handle "all" timeslots better
  const searchParams = new URLSearchParams(window.location.search);
  const queryType = searchParams.get("type");
  const activeClientType = queryType ? queryType.split(",")[0] : "all";

  // Fetch meeting types from the API
  const { data: clientData } = useQuery({
    queryKey: ["/api/client-data"],
    queryFn: fetchClientData,
  });

  const meetingTypes = useMemo(() => {
    if (!clientData?.meetingTypes) return [];
    return clientData.meetingTypes;
  }, [clientData]);

  const form = useForm<FormData>({
    resolver: zodResolver(bookingFormSchema),
    defaultValues: {
      notes: "",
      phone: "",
    },
  });

  // When timeslot changes, reset form and update available meeting types
  useEffect(() => {
    if (timeslot) {
      form.reset();
      // Reset selections
      setSelectedMeetingType("");
      setSelectedTimeSegment(null);
      setTimeSegments([]);
    }
  }, [timeslot, form]);

  // When meeting type changes, recalculate time segments
  useEffect(() => {
    if (!timeslot || !selectedMeetingType) {
      setTimeSegments([]);
      setSelectedTimeSegment(null);
      return;
    }

    const startTime = new Date(timeslot.startTime);
    const endTime = new Date(timeslot.endTime);

    // Calculate total duration in minutes
    const totalMinutes = (endTime.getTime() - startTime.getTime()) / 1000 / 60;

    // If the slot is exactly 15 minutes or less, no need for segments
    if (totalMinutes <= 15) {
      setTimeSegments([startTime]);
      return;
    }

    // Get the duration based on both client type and meeting type
    let segmentDuration = 30; // Default fallback duration

    if (clientData?.clients) {
      // Determine which client type to use
      const effectiveClientType =
        timeslot.clientType === "all" ? activeClientType : timeslot.clientType;

      // Find the client based on effective client type
      const clientTypeId = !isNaN(Number(effectiveClientType))
        ? Number(effectiveClientType)
        : undefined;

      const client = clientData.clients.find(
        (c) =>
          (clientTypeId !== undefined && c.id === clientTypeId) ||
          c.type === effectiveClientType
      );

      // If client has this meeting type, use its duration
      if (client && client.meetings && client.meetings[selectedMeetingType]) {
        segmentDuration = client.meetings[selectedMeetingType];
        console.log(
          `[Debug] Using duration for booking: ${segmentDuration} minutes for ${client.type}`
        );
      } else {
        // Fallback to global meeting types
        const meetingTypeInfo = meetingTypes.find(
          (type) => type.name === selectedMeetingType
        );

        if (meetingTypeInfo) {
          segmentDuration = meetingTypeInfo.duration;
        }
      }
    } else {
      // Fallback to global meeting types
      const meetingTypeInfo = meetingTypes.find(
        (type) => type.name === selectedMeetingType
      );

      if (meetingTypeInfo) {
        segmentDuration = meetingTypeInfo.duration;
      }
    }

    // Calculate how many segments we can fit
    const segments: Date[] = [];
    const segmentCount = Math.floor(totalMinutes / segmentDuration);

    for (let i = 0; i < segmentCount; i++) {
      const segmentStart = new Date(startTime);
      segmentStart.setMinutes(startTime.getMinutes() + i * segmentDuration);
      segments.push(segmentStart);
    }

    setTimeSegments(segments);

    // Select the first segment by default
    if (segments.length > 0) {
      setSelectedTimeSegment(segments[0]);
      form.setValue("startTime", segments[0]);
    }
  }, [
    selectedMeetingType,
    timeslot,
    meetingTypes,
    clientData,
    activeClientType,
  ]);

  const handleSubmit = async (values: FormData) => {
    if (!timeslot || !selectedMeetingType) return;

    // Make sure we have the selected meeting type
    values.meetingType = selectedMeetingType;

    // Get the duration using client type and meeting type
    let duration = 30; // Default fallback

    if (clientData?.clients) {
      // Determine which client type to use
      const effectiveClientType =
        timeslot.clientType === "all" ? activeClientType : timeslot.clientType;

      // Find the client based on effective client type
      const clientTypeId = !isNaN(Number(effectiveClientType))
        ? Number(effectiveClientType)
        : undefined;

      const client = clientData.clients.find(
        (c) =>
          (clientTypeId !== undefined && c.id === clientTypeId) ||
          c.type === effectiveClientType
      );

      // If client has this meeting type, use its duration
      if (client && client.meetings && client.meetings[selectedMeetingType]) {
        duration = client.meetings[selectedMeetingType];
        console.log(
          `[Debug] Using duration for booking: ${duration} minutes for ${client.type}`
        );
      } else {
        // Fallback to global meeting types
        const meetingTypeInfo = meetingTypes.find(
          (type) => type.name === selectedMeetingType
        );

        if (meetingTypeInfo) {
          duration = meetingTypeInfo.duration;
        }
      }
    } else {
      // Fallback to global meeting types
      const meetingTypeInfo = meetingTypes.find(
        (type) => type.name === selectedMeetingType
      );

      if (meetingTypeInfo) {
        duration = meetingTypeInfo.duration;
      }
    }

    values.duration = duration;

    // Add the timeslot ID
    values.timeslotId = timeslot.id;

    // Add the start time if we selected a segment
    if (selectedTimeSegment && timeSegments.length > 0) {
      values.startTime = selectedTimeSegment;
    }

    try {
      await bookAppointment(values as BookingFormData);

      toast({
        title: "Appointment booked successfully",
        description: `Your ${selectedMeetingType} appointment has been scheduled for ${formatDate(
          selectedTimeSegment as Date
        )} at ${formatTime(selectedTimeSegment as Date)}`,
      });

      submitCallback(values);
      onClose();
    } catch (error) {
      console.error("Error booking appointment:", error);
      toast({
        title: "Error",
        description: "Failed to book appointment. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Get colors for client types
  const clientTypeColor = timeslot
    ? CLIENT_TYPE_COLORS[
        timeslot.clientType as keyof typeof CLIENT_TYPE_COLORS
      ] || CLIENT_TYPE_COLORS.default
    : "#8b5cf6";

  if (!timeslot) return null;

  const startDate = new Date(timeslot.startTime);
  const endDate = new Date(timeslot.endTime);

  // If endTime is earlier than startTime, it's likely an error in the data
  // In that case, swap them for display purposes only
  const displayStartDate =
    startDate.getTime() < endDate.getTime() ? startDate : endDate;
  const displayEndDate =
    startDate.getTime() < endDate.getTime() ? endDate : startDate;

  // Parse meeting types from the timeslot string
  const timeslotMeetingTypes = timeslot.meetingTypes
    .split(",")
    .map((type) => type.trim())
    .filter(Boolean);

  // Filter meeting types based on client type (for all slots including Saturday slots)
  const availableMeetingTypes = useMemo(() => {
    // For "all" client type, show all meeting types from the timeslot
    if (timeslot.clientType === "all" && activeClientType === "all") {
      return timeslotMeetingTypes;
    }

    // Determine which client type to use
    const effectiveClientType =
      timeslot.clientType === "all" ? activeClientType : timeslot.clientType;

    // Get allowed meeting types for this client type
    const getAllowedMeetingTypes = (clientType: string): string[] => {
      if (clientType === "all") return ["טלפון", "זום", "פגישה"];

      if (clientData?.clients) {
        // Try to find client by ID if it's a numeric string
        if (!isNaN(Number(clientType))) {
          const client = clientData.clients.find(
            (c) => c.id === Number(clientType)
          );
          if (client && client.meetings) {
            return Object.keys(client.meetings);
          }
        }

        // Try to find client by type name
        const client = clientData.clients.find((c) => c.type === clientType);
        if (client && client.meetings) {
          return Object.keys(client.meetings);
        }
      }

      // Fallback for known client types
      const fallbackAllowedTypes: Record<string, string[]> = {
        "0": ["טלפון", "זום", "פגישה"], // לקוח חדש
        "1": ["טלפון", "פגישה"], // פולי אחים
        "2": ["טלפון", "זום"], // מדריכים+
        "3": ["טלפון", "פגישה"], // מכירת עוגות
        new_customer: ["טלפון", "זום", "פגישה"],
      };

      return fallbackAllowedTypes[clientType] || [];
    };

    // Get allowed meeting types for this client type
    const allowedTypes = getAllowedMeetingTypes(effectiveClientType);

    // Only keep meeting types that are both in the timeslot AND allowed for this client type
    return timeslotMeetingTypes.filter((type) => allowedTypes.includes(type));
  }, [timeslotMeetingTypes, timeslot.clientType, activeClientType, clientData]);

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">
            Book Appointment
          </DialogTitle>
          <DialogDescription>
            {formatDate(displayStartDate)} • {formatTime(displayStartDate)} -{" "}
            {formatTime(displayEndDate)}
          </DialogDescription>
        </DialogHeader>

        <div className="mb-4">
          <div className="flex flex-col gap-2">
            <div className="bg-gray-50 p-3 rounded-lg mb-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center text-lg font-medium">
                    <Calendar className="h-5 w-5 mr-2 text-blue-600" />
                    {formatDate(displayStartDate)}
                  </div>
                  <div className="flex items-center text-gray-600 mt-1">
                    <Clock className="h-4 w-4 mr-2" />
                    {formatTime(displayStartDate)} -{" "}
                    {formatTime(displayEndDate)}
                  </div>
                </div>
                <div className="flex items-center">
                  <span
                    className="px-2 py-1 text-sm font-medium rounded-full text-white"
                    style={{ backgroundColor: clientTypeColor }}
                  >
                    {timeslot.clientType}
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <Label className="text-base font-medium block mb-2">
                  Select Meeting Type
                </Label>
                <div className="grid grid-cols-2 gap-2">
                  {availableMeetingTypes.map((type, index) => {
                    // Get duration based on client type and meeting type
                    let duration = 30; // Default fallback

                    if (clientData?.clients) {
                      // Determine which client type to use
                      const effectiveClientType =
                        timeslot.clientType === "all"
                          ? activeClientType
                          : timeslot.clientType;

                      // Find the client based on effective client type
                      const clientTypeId = !isNaN(Number(effectiveClientType))
                        ? Number(effectiveClientType)
                        : undefined;

                      // Try to find by ID first, then by type name
                      const client = clientData.clients.find(
                        (c) =>
                          (clientTypeId !== undefined &&
                            c.id === clientTypeId) ||
                          c.type === effectiveClientType
                      );

                      // If client found and has the meeting type, use its duration
                      if (client && client.meetings && client.meetings[type]) {
                        duration = client.meetings[type];
                        console.log(
                          `[Debug] UI showing duration: ${duration} for ${client.type} - ${type}`
                        );
                      } else {
                        // Fallback to global meeting types
                        const typeInfo = meetingTypes.find(
                          (t) => t.name === type
                        );
                        if (typeInfo) {
                          duration = typeInfo.duration;
                        }
                      }
                    } else {
                      // Fallback to global meeting types
                      const typeInfo = meetingTypes.find(
                        (t) => t.name === type
                      );
                      if (typeInfo) {
                        duration = typeInfo.duration;
                      }
                    }

                    return (
                      <Button
                        key={index}
                        type="button"
                        variant={
                          selectedMeetingType === type ? "default" : "outline"
                        }
                        className={`flex items-center justify-start gap-2 h-auto py-3 ${
                          selectedMeetingType === type
                            ? "bg-primary text-primary-foreground"
                            : ""
                        }`}
                        onClick={() => {
                          setSelectedMeetingType(type);
                          form.setValue("meetingType", type);
                        }}
                      >
                        {React.isValidElement(MEETING_TYPE_ICONS[type]) ? (
                          MEETING_TYPE_ICONS[type]
                        ) : (
                          <span className="text-current">
                            {/* Fallback to default icon */}
                          </span>
                        )}
                        <div className="flex flex-col items-start">
                          <span>{type}</span>
                          <span className="text-xs opacity-70">
                            {formatDuration(duration)}
                          </span>
                        </div>
                      </Button>
                    );
                  })}
                </div>
              </div>

              {selectedMeetingType && timeSegments.length > 0 && (
                <div>
                  <Label className="text-base font-medium block mb-2">
                    Select Time
                  </Label>
                  <div className="grid grid-cols-3 gap-2">
                    {timeSegments.map((segment, index) => (
                      <Button
                        key={index}
                        type="button"
                        variant={
                          selectedTimeSegment?.getTime() === segment.getTime()
                            ? "default"
                            : "outline"
                        }
                        className={
                          selectedTimeSegment?.getTime() === segment.getTime()
                            ? "bg-primary text-primary-foreground"
                            : ""
                        }
                        onClick={() => {
                          setSelectedTimeSegment(segment);
                          form.setValue("startTime", segment);
                        }}
                      >
                        {formatTime(segment)}
                      </Button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="space-y-4"
          >
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Your name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      placeholder="your@email.com"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Phone (optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="+1 (555) 000-0000" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes (optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Any additional information"
                      className="min-h-[80px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={
                  !selectedMeetingType || !selectedTimeSegment || isPending
                }
              >
                {isPending ? "Booking..." : "Book Appointment"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
