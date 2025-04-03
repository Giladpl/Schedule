import React from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Timeslot } from "@shared/schema";
import { formatDateInIsrael, formatTimeRangeInIsrael } from "@/lib/timeUtils";

interface BookingDetails {
  name: string;
  email: string;
  phone?: string;
  meetingType?: string;
}

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  timeslot: Timeslot | null;
  bookingDetails: BookingDetails | null;
}

export default function ConfirmationModal({
  isOpen,
  onClose,
  timeslot,
  bookingDetails
}: ConfirmationModalProps) {
  if (!timeslot || !bookingDetails) return null;

  const startTime = new Date(timeslot.startTime);
  const endTime = new Date(timeslot.endTime);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="bg-white rounded-lg shadow-lg w-full max-w-md mx-4 p-6 text-center">
        <div className="w-16 h-16 bg-[#34a853] rounded-full flex items-center justify-center mx-auto mb-4">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="32"
            height="32"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-white text-3xl"
          >
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
        
        <h3 className="text-xl font-google-sans font-medium mb-2">Meeting Confirmed!</h3>
        <p className="text-[#5f6368] mb-6">
          Your meeting has been scheduled for {formatDateInIsrael(startTime)} at {formatTimeRangeInIsrael(startTime, endTime)} (Israel Time).
        </p>
        
        <div className="bg-[#f8f9fa] p-4 rounded-lg mb-6 text-left">
          <div className="flex items-center mb-2">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-[#1a73e8] mr-3 text-sm"
            >
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
            <div className="text-sm">
              <div className="font-medium">{formatDateInIsrael(startTime)}</div>
              <div className="text-[#5f6368]">{formatTimeRangeInIsrael(startTime, endTime)} (Israel Time)</div>
              {bookingDetails.meetingType && (
                <div className="text-[#5f6368] capitalize">Via: {bookingDetails.meetingType}</div>
              )}
            </div>
          </div>
          
          <div className="flex items-center">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-[#1a73e8] mr-3 text-sm"
            >
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
            <div className="text-sm">
              <div className="font-medium">{bookingDetails.name}</div>
              <div className="text-[#5f6368]">{bookingDetails.email}</div>
            </div>
          </div>
        </div>
        
        <p className="text-[#5f6368] mb-6">
          A confirmation email has been sent to your email address with all the details. You can add this event to your calendar using the links below.
        </p>
        
        <div className="flex flex-wrap justify-center gap-2 mb-6">
          <Button
            variant="outline"
            className="bg-white text-[#5f6368] font-medium border-[#dadce0] rounded-md hover:bg-[#f8f9fa] flex items-center"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              className="mr-2"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path d="M8.8 15.9l-4.2-4.2c-.3-.3-.8-.3-1.1 0s-.3.8 0 1.1l4.7 4.7c.3.3.8.3 1.1 0l9.9-9.9c.3-.3.3-.8 0-1.1s-.8-.3-1.1 0L8.8 15.9z" fill="#34A853" />
              <path d="M4.3 8.6c-.3.4-.6.8-.9 1.2v8.8c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2H7.5c-.5 0-1 .2-1.4.5l-1.8-1.8V8.6z" fill="#4285F4" />
              <path d="M19.4 4H8.5c-.5 0-1 .2-1.4.5l3.7 3.7L19.4 4z" fill="#FBBC04" />
              <path d="M8.5 4H7.5c-.5 0-1 .2-1.4.5l-1.8-1.8V7.4l4.1-3.4z" fill="#EA4335" />
            </svg>
            Google Calendar
          </Button>
          <Button
            variant="outline"
            className="bg-white text-[#5f6368] font-medium border-[#dadce0] rounded-md hover:bg-[#f8f9fa] flex items-center"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              className="mr-2"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path d="M7 4V2h10v2h3.008C21.108 4 22 4.892 22 5.992v14.016A1.995 1.995 0 0 1 20.008 22H3.992A1.995 1.995 0 0 1 2 20.008V5.992C2 4.892 2.892 4 3.992 4H7zm2 0h6V3H9v1zm-6 6V8h18v2H3zm0 4v6h18v-6H3zm6 3H5v-2h4v2zm6 0h-4v-2h4v2z" fill="#0078D4" />
            </svg>
            Outlook
          </Button>
          <Button
            variant="outline"
            className="bg-white text-[#5f6368] font-medium border-[#dadce0] rounded-md hover:bg-[#f8f9fa] flex items-center"
          >
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
              className="mr-2 text-[#5f6368]"
            >
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            iCal File
          </Button>
        </div>
        
        <Button
          onClick={onClose}
          className="bg-[#1a73e8] text-white font-medium border-transparent rounded-md hover:bg-blue-600 w-full"
        >
          Close
        </Button>
      </DialogContent>
    </Dialog>
  );
}
