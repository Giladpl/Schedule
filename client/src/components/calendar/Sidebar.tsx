import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { fetchClientData } from "@/lib/calendarService";
import { useQuery } from "@tanstack/react-query";
import { RefreshCcw } from "lucide-react";
import { useMemo } from "react";

// Default meeting types if we can't fetch them from server
const DEFAULT_MEETING_TYPES = ["טלפון", "זום", "פגישה"];

interface SidebarProps {
  clientType: string;
  onClientTypeChange: (value: string) => void;
  meetingType: string;
  onMeetingTypeChange: (value: string) => void;
  isAdmin?: boolean;
  viewMode?: "admin" | "client";
}

export default function Sidebar({
  clientType,
  onClientTypeChange,
  meetingType,
  onMeetingTypeChange,
  isAdmin = false,
  viewMode = "admin",
}: SidebarProps) {
  // Fetch client data from API
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["/api/client-data"],
    queryFn: fetchClientData,
    staleTime: 60000, // 1 minute
  });

  // Function to get available meeting types based on client type
  const availableMeetingTypes = useMemo((): string[] => {
    // Default meeting types as fallback
    if (!data || !data.clients || data.clients.length === 0) {
      return DEFAULT_MEETING_TYPES;
    }

    // If 'all' is selected and user is admin, return all meeting types
    if (clientType === "all" && viewMode === "admin") {
      return Array.isArray(data.meetingTypes)
        ? data.meetingTypes
        : DEFAULT_MEETING_TYPES;
    }

    // Try to find the selected client
    let selectedClient = null;

    // First try to match by type name
    selectedClient = data.clients.find((client) => client.type === clientType);

    // Then try to match by numeric ID if clientType is a number
    if (!selectedClient && !isNaN(parseInt(clientType))) {
      const numericId = parseInt(clientType);
      selectedClient = data.clients.find((client) => client.id === numericId);
    }

    // Legacy fallback: try first letter matching (for backward compatibility)
    if (!selectedClient && clientType.length === 1) {
      selectedClient = data.clients.find((client) =>
        client.type.startsWith(clientType)
      );
    }

    // If a matching client is found, return its meeting types
    if (selectedClient && selectedClient.meetings) {
      return Object.keys(selectedClient.meetings);
    }

    // Fallback to all meeting types
    return Array.isArray(data.meetingTypes)
      ? data.meetingTypes
      : DEFAULT_MEETING_TYPES;
  }, [data, clientType, viewMode]);

  // Only show client type selector for admins
  return (
    <div className="w-64 border-r border-[#dadce0] p-4 h-full overflow-auto shrink-0 hidden md:block">
      <Card className="mb-6 border-0 shadow-none">
        <CardHeader className="p-0 pb-2">
          <h2 className="text-lg font-medium text-[#3c4043]">סינון פגישות</h2>
        </CardHeader>
        <CardContent className="p-0 space-y-4">
          {viewMode === "admin" && (
            <div className="space-y-1.5">
              <Label
                htmlFor="clientType"
                className="text-sm font-medium text-[#5f6368]"
              >
                סוג לקוח
              </Label>
              <Select
                value={clientType}
                onValueChange={onClientTypeChange}
                disabled={isLoading}
              >
                <SelectTrigger
                  id="clientType"
                  className="w-full border-[#dadce0]"
                >
                  <SelectValue placeholder="בחר סוג לקוח" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectLabel>סוג לקוח</SelectLabel>
                    <SelectItem value="all">הכל</SelectItem>
                    {data?.clients?.map((client) => (
                      <SelectItem
                        key={client.id !== undefined ? client.id : client.type}
                        value={
                          client.id !== undefined ? `${client.id}` : client.type
                        }
                      >
                        {client.type}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-1.5">
            <Label
              htmlFor="meetingType"
              className="text-sm font-medium text-[#5f6368]"
            >
              סוג פגישה
            </Label>
            <Select
              value={meetingType}
              onValueChange={onMeetingTypeChange}
              disabled={isLoading}
            >
              <SelectTrigger
                id="meetingType"
                className="w-full border-[#dadce0]"
              >
                <SelectValue placeholder="בחר סוג פגישה" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectLabel>סוג פגישה</SelectLabel>
                  <SelectItem value="all">הכל</SelectItem>
                  {availableMeetingTypes.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card className="border-0 shadow-none">
        <CardHeader className="p-0 pb-2">
          <h2 className="text-lg font-medium text-[#3c4043]">זמני פעילות</h2>
        </CardHeader>
        <CardContent className="p-0 text-sm text-[#5f6368]">
          <p className="mb-3">ימים א-ה: 9:00-17:00</p>
          <p className="mb-3">יום ו: 9:00-13:00</p>
          <p>שבת: סגור</p>
        </CardContent>
      </Card>

      <div className="mt-6">
        {isAdmin && (
          <Button
            variant="outline"
            className="w-full text-[#1a73e8] border-[#dadce0] hover:bg-[#f1f3f4] mb-4"
            onClick={() => refetch()}
            disabled={isLoading}
          >
            <RefreshCcw className="h-3.5 w-3.5 mr-2" />
            {isLoading ? "מרענן..." : "רענן נתוני לקוחות"}
          </Button>
        )}

        <Button
          variant="outline"
          className="w-full text-[#1a73e8] border-[#dadce0] hover:bg-[#f1f3f4]"
          onClick={() => {
            window.open("https://calendly.com/support", "_blank");
          }}
        >
          צור קשר לתמיכה
        </Button>
      </div>
    </div>
  );
}
