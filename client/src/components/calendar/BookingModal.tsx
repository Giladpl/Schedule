import React, { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Timeslot, ClientRuleWithDisplayName } from "@shared/schema";
import { formatDateInIsrael, formatTimeRangeInIsrael } from "@/lib/timeUtils";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { bookingFormSchema } from "@shared/schema";
import { getClientTypeLabel, fetchClientRules, fetchClientData } from "@/lib/calendarService";
import { useQuery } from "@tanstack/react-query";

interface BookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  timeslot: Timeslot | null;
  onBookingSubmit: (formData: z.infer<typeof bookingFormSchema>) => void;
  isSubmitting: boolean;
}

export default function BookingModal({
  isOpen,
  onClose,
  timeslot,
  onBookingSubmit,
  isSubmitting
}: BookingModalProps) {
  // Fetch client data
  const { data: clientData } = useQuery({
    queryKey: ['/api/client-data'],
    queryFn: fetchClientData,
    enabled: !!timeslot
  });
  
  // Get the available meeting types for this client type
  let allowedMeetingTypes: string[] = [];
  
  if (timeslot && clientData?.clients) {
    console.log("Client data:", JSON.stringify(clientData));
    console.log("Looking for client type:", timeslot.clientType);
    console.log("Timeslot meeting types:", timeslot.meetingTypes);
    
    // Get the meeting types specified in the timeslot
    const timeslotMeetingTypes = timeslot.meetingTypes ? timeslot.meetingTypes.split(',').map(t => t.trim()) : [];
    
    // Find the client from the client data
    const client = clientData.clients.find(c => c.type === timeslot.clientType);
    
    if (client) {
      console.log(`Found client for type ${timeslot.clientType}:`, JSON.stringify(client));
      
      // Get the meeting types for this client (only where duration > 0 AND in the timeslot's allowed types)
      allowedMeetingTypes = Object.entries(client.meetings)
        .filter(([type, duration]) => 
          duration > 0 && 
          (timeslotMeetingTypes.length === 0 || timeslotMeetingTypes.includes(type))
        )
        .map(([type]) => type);
      
      console.log(`Filtered meeting types for ${timeslot.clientType}:`, allowedMeetingTypes);
      console.log(`All client meeting types with durations:`, JSON.stringify(client.meetings));
      console.log(`Timeslot allowed meeting types:`, timeslotMeetingTypes);
    } else if (timeslot.clientType === 'all') {
      console.log("Processing 'all' client type");
      // For 'all' client type, gather all meeting types that match the timeslot's allowed types
      const allMeetingTypes = new Set<string>();
      clientData.clients.forEach(client => {
        Object.entries(client.meetings)
          .filter(([type, duration]) => 
            duration > 0 && 
            (timeslotMeetingTypes.length === 0 || timeslotMeetingTypes.includes(type))
          )
          .forEach(([type]) => {
            allMeetingTypes.add(type);
          });
      });
      allowedMeetingTypes = Array.from(allMeetingTypes);
      console.log("All gathered meeting types:", allowedMeetingTypes);
    } else {
      console.warn(`Client type ${timeslot.clientType} not found in client data`);
    }
    
    console.log(`Final allowed meeting types for ${timeslot.clientType}:`, allowedMeetingTypes);
  }
  
  const form = useForm<z.infer<typeof bookingFormSchema>>({
    resolver: zodResolver(bookingFormSchema),
    defaultValues: {
      timeslotId: timeslot?.id || 0,
      name: "",
      email: "",
      phone: "",
      notes: "",
      meetingType: "",
      duration: 0 // Will be dynamically set based on client data
    },
  });

  // Update the form when timeslot or client data changes
  React.useEffect(() => {
    if (timeslot) {
      form.setValue('timeslotId', timeslot.id);
      
      // If we have client data, update the meeting type and duration
      if (clientData?.clients && allowedMeetingTypes.length > 0) {
        // Pre-select the first available meeting type
        const firstMeetingType = allowedMeetingTypes[0];
        form.setValue('meetingType', firstMeetingType);
        
        // Get the duration for the selected meeting type
        const client = clientData.clients.find(c => c.type === timeslot.clientType);
        if (client && client.meetings[firstMeetingType] && client.meetings[firstMeetingType] > 0) {
          const duration = client.meetings[firstMeetingType];
          form.setValue('duration', duration);
          console.log(`Initial: Set duration for ${firstMeetingType} to ${duration} minutes (client: ${timeslot.clientType})`);
        } else if (timeslot.clientType === 'all') {
          // For 'all' client type, use the first client's duration for this meeting type
          const anyClientWithThisMeetingType = clientData.clients.find(
            c => c.meetings[firstMeetingType] && c.meetings[firstMeetingType] > 0
          );
          if (anyClientWithThisMeetingType) {
            const duration = anyClientWithThisMeetingType.meetings[firstMeetingType];
            form.setValue('duration', duration);
            console.log(`Initial: Set duration for ${firstMeetingType} to ${duration} minutes (from client ${anyClientWithThisMeetingType.type})`);
          }
        }
      }
    }
  }, [timeslot, form, clientData, allowedMeetingTypes]);

  // Handle meeting type change
  // Fixed meeting type change handler
  const handleMeetingTypeChange = (meetingType: string) => {
    console.log(`Meeting type changed to: ${meetingType}`);
    
    // Update the form value first
    form.setValue('meetingType', meetingType, { shouldValidate: true });
    
    if (!clientData?.clients || !timeslot) {
      console.log("No client data or timeslot available");
      return;
    }

    // Find the client matching the timeslot's clientType
    const client = clientData.clients.find(c => c.type === timeslot.clientType);
    console.log(`Found client for ${timeslot.clientType}:`, client);
    
    // Update duration based on selected meeting type
    let duration = 0;
    
    if (client && client.meetings && client.meetings[meetingType] && client.meetings[meetingType] > 0) {
      // Set the duration for the selected meeting type
      duration = client.meetings[meetingType];
      console.log(`Set duration for ${meetingType} to ${duration} minutes`);
    } else if (timeslot.clientType === 'all') {
      // For 'all' client type, find any client that offers this meeting type with a duration > 0
      const anyClientWithThisMeetingType = clientData.clients.find(
        c => c.meetings && c.meetings[meetingType] && c.meetings[meetingType] > 0
      );
      
      if (anyClientWithThisMeetingType) {
        duration = anyClientWithThisMeetingType.meetings[meetingType];
        console.log(`Set duration for ${meetingType} to ${duration} minutes (from client ${anyClientWithThisMeetingType.type})`);
      } else {
        console.log(`No client found with meeting type: ${meetingType}`);
        return; // Don't update if no valid duration found
      }
    } else {
      console.log(`Client ${timeslot.clientType} doesn't have meeting type: ${meetingType}`);
      return; // Don't update if no valid client/meeting type combination
    }
    
    // Finally update the duration
    if (duration > 0) {
      form.setValue('duration', duration, { shouldValidate: true });
    }
  };

  const onSubmit = (data: z.infer<typeof bookingFormSchema>) => {
    onBookingSubmit(data);
  };

  if (!timeslot) return null;

  const startTime = new Date(timeslot.startTime);
  const endTime = new Date(timeslot.endTime);
  
  // Get the current dynamic duration based on the selected meeting type
  const currentDuration = form.watch('duration');
  const clientType = getClientTypeLabel(timeslot.clientType);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="bg-white rounded-lg shadow-lg w-full max-w-md mx-4">
        <DialogHeader>
          <DialogTitle className="text-xl font-google-sans font-medium">Book a Meeting</DialogTitle>
        </DialogHeader>
        
        <div className="px-6 py-4">
          <div className="mb-6">
            <div className="flex items-center mb-4">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-[#1a73e8] mr-3"
              >
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
              <div>
                <div className="font-medium">{formatDateInIsrael(startTime)}</div>
                <div className="text-[#5f6368]">{formatTimeRangeInIsrael(startTime, endTime)} (Israel Time)</div>
              </div>
            </div>
            
            <div className="flex items-center mb-2">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-[#1a73e8] mr-3"
              >
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
              <div>
                <div className="font-medium">{currentDuration} Minutes</div>
                <div className="text-[#5f6368]">{clientType} Appointment</div>
              </div>
            </div>
          </div>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[#5f6368]">Name*</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        className="border-[#dadce0] rounded-md focus:ring-2 focus:ring-[#1a73e8] focus:border-transparent"
                      />
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
                    <FormLabel className="text-[#5f6368]">Email*</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="email"
                        className="border-[#dadce0] rounded-md focus:ring-2 focus:ring-[#1a73e8] focus:border-transparent"
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
                    <FormLabel className="text-[#5f6368]">Phone</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="tel"
                        className="border-[#dadce0] rounded-md focus:ring-2 focus:ring-[#1a73e8] focus:border-transparent"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              {allowedMeetingTypes.length > 0 && (
                <FormField
                  control={form.control}
                  name="meetingType"
                  render={({ field }) => (
                    <FormItem className="space-y-3">
                      <FormLabel className="text-[#5f6368]">Meeting Type*</FormLabel>
                      <FormControl>
                        <RadioGroup
                          onValueChange={handleMeetingTypeChange}
                          value={field.value}
                          className="flex flex-col space-y-1"
                        >
                          {allowedMeetingTypes.map(type => (
                            <div key={type} className="flex items-center space-x-2">
                              <RadioGroupItem value={type} id={`meeting-type-${type}`} className="text-[#1a73e8]" />
                              <Label htmlFor={`meeting-type-${type}`} className="capitalize">
                                {type}
                              </Label>
                            </div>
                          ))}
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
              
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[#5f6368]">Additional Notes</FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        rows={3}
                        className="border-[#dadce0] rounded-md focus:ring-2 focus:ring-[#1a73e8] focus:border-transparent"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="border-t border-[#dadce0] pt-4 mt-6 flex justify-end">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onClose}
                  className="bg-white text-[#5f6368] font-medium border-[#dadce0] rounded-md mr-2 hover:bg-[#f8f9fa]"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-[#1a73e8] text-white font-medium border-transparent rounded-md hover:bg-blue-600"
                >
                  {isSubmitting ? "Confirming..." : "Confirm Booking"}
                </Button>
              </div>
            </form>
          </Form>
        </div>
      </DialogContent>
    </Dialog>
  );
}