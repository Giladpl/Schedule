import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import {
  fetchClientData,
  getClientTypeDisplayName,
  refreshClientRules,
  type ClientRule,
} from "@/lib/calendarService";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Phone, RefreshCcw, Users, Video } from "lucide-react";
import { useEffect, useState } from "react";

interface SidebarProps {
  clientType: string;
  onClientTypeChange: (type: string) => void;
  meetingType: string;
  onMeetingTypeChange: (value: string) => void;
}

export default function Sidebar({
  clientType,
  onClientTypeChange,
  meetingType,
  onMeetingTypeChange,
}: SidebarProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [clients, setClients] = useState<ClientRule[]>([]);

  // Fetch client data (this contains both client types and their available meeting types)
  const { data: clientData, isLoading: isLoadingClientData } = useQuery({
    queryKey: ["/api/client-data"],
    queryFn: fetchClientData,
  });

  // Mutation for refreshing client rules from Google Sheets
  const { mutate: refreshRules, isPending: isRefreshing } = useMutation({
    mutationFn: refreshClientRules,
    onSuccess: (data) => {
      // Invalidate all related queries to refresh data
      queryClient.invalidateQueries({ queryKey: ["/api/client-rules"] });
      queryClient.invalidateQueries({
        queryKey: ["/api/client-meeting-types"],
      });
      queryClient.invalidateQueries({ queryKey: ["/api/client-data"] });

      toast({
        title: "Client Rules Refreshed",
        description: `Successfully updated ${data.rules.length} client rules from Google Sheets.`,
        variant: "default",
      });
    },
    onError: (error) => {
      console.error("Error refreshing client rules:", error);
      toast({
        title: "Error",
        description: "Failed to refresh client rules from Google Sheets.",
        variant: "destructive",
      });
    },
  });

  useEffect(() => {
    if (clientData) {
      setClients(clientData.clients);
    }
  }, [clientData]);

  const handleRefresh = async () => {
    refreshRules();
  };

  const handleTypeChange = (type: string) => {
    if (type === clientType) {
      return type;
    }
    onClientTypeChange(type);
    return type;
  };

  // Get available meeting types for the selected client type
  const getAvailableMeetingTypes = (): string[] => {
    if (!clientData?.clients) return [];

    // If "all" is selected, return all unique meeting types
    if (clientType === "all") {
      const allTypesSet = new Set<string>();
      clientData.clients.forEach((client) => {
        Object.keys(client.meetings).forEach((type) => {
          allTypesSet.add(type);
        });
      });
      return Array.from(allTypesSet);
    }

    // Find the selected client
    const selectedClient = clientData.clients.find(
      (client) => client.type === clientType
    );
    if (!selectedClient) return [];

    // Return only the meeting types available for this client
    return Object.keys(selectedClient.meetings);
  };

  // When client type changes, we need to reset the meeting type selection
  // if the current selection isn't available for the new client type
  useEffect(() => {
    if (!clientData) return;

    const availableMeetingTypes = getAvailableMeetingTypes();
    if (meetingType !== "all" && !availableMeetingTypes.includes(meetingType)) {
      // Reset to "all" if current meeting type isn't available for this client
      onMeetingTypeChange("all");
    }
  }, [clientType, meetingType, onMeetingTypeChange, clientData]);

  // Get display names for meeting types
  const getMeetingTypeDisplayName = (type: string): string => {
    // Use the exact display name from the data
    return type;
  };

  const clientTypeLabel = getClientTypeDisplayName(clientType);

  return (
    <div className="hidden md:block w-64 border-r border-[#dadce0] p-4 py-8">
      <div className="mb-8">
        <h2 className="text-sm font-medium text-[#5f6368] mb-4">CLIENT TYPE</h2>
        {isLoadingClientData ? (
          <div className="space-y-2">
            <Skeleton className="h-6 w-full" />
            <Skeleton className="h-6 w-full" />
            <Skeleton className="h-6 w-full" />
          </div>
        ) : (
          <RadioGroup
            value={clientType}
            onValueChange={handleTypeChange}
            className="space-y-2"
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="all" id="all" className="text-[#1a73e8]" />
              <Label htmlFor="all">{getClientTypeDisplayName("all")}</Label>
            </div>
            {clients.map((client) => (
              <div key={client.type} className="flex items-center space-x-2">
                <RadioGroupItem
                  value={client.type}
                  id={client.type}
                  className="text-[#1a73e8]"
                />
                <Label htmlFor={client.type}>
                  {getClientTypeDisplayName(client.type)}
                </Label>
              </div>
            ))}
          </RadioGroup>
        )}
      </div>

      <div className="mb-8">
        <h2 className="text-sm font-medium text-[#5f6368] mb-4">
          MEETING TYPE
        </h2>
        {isLoadingClientData ? (
          <div className="space-y-2">
            <Skeleton className="h-6 w-full" />
            <Skeleton className="h-6 w-full" />
          </div>
        ) : (
          <RadioGroup
            value={meetingType}
            onValueChange={onMeetingTypeChange}
            className="space-y-2"
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem
                value="all"
                id="meeting-all"
                className="text-[#1a73e8]"
              />
              <Label htmlFor="meeting-all">All Types</Label>
            </div>

            {getAvailableMeetingTypes().map((type) => (
              <div key={type} className="flex items-center space-x-2">
                <RadioGroupItem
                  value={type}
                  id={`meeting-${type}`}
                  className="text-[#1a73e8]"
                />
                <Label htmlFor={`meeting-${type}`}>
                  {getMeetingTypeDisplayName(type)}
                </Label>
              </div>
            ))}
          </RadioGroup>
        )}
      </div>

      <div className="mb-8">
        <h2 className="text-sm font-medium text-[#5f6368] mb-4">LEGEND</h2>
        <div className="space-y-3">
          <h3 className="text-xs font-medium text-[#5f6368]">Meeting Types:</h3>
          <div className="flex items-center">
            <div className="w-5 h-5 bg-[#34a853] rounded-sm mr-3 flex items-center justify-center text-white">
              <Phone size={14} />
            </div>
            <span className="text-sm">טלפון (Phone)</span>
          </div>
          <div className="flex items-center">
            <div className="w-5 h-5 bg-[#4285f4] rounded-sm mr-3 flex items-center justify-center text-white">
              <Video size={14} />
            </div>
            <span className="text-sm">זום (Zoom)</span>
          </div>
          <div className="flex items-center">
            <div className="w-5 h-5 bg-[#ea4335] rounded-sm mr-3 flex items-center justify-center text-white">
              <Users size={14} />
            </div>
            <span className="text-sm">פגישה (In-person)</span>
          </div>

          <h3 className="text-xs font-medium text-[#5f6368] mt-3">
            Client Types:
          </h3>
          <div className="flex items-center">
            <div className="w-4 h-4 border-l-4 border-l-[#1a73e8] bg-white rounded-sm mr-3"></div>
            <span className="text-sm">Regular Client</span>
          </div>
          <div className="flex items-center">
            <div className="w-4 h-4 border-l-4 border-l-[#fbbc04] bg-white rounded-sm mr-3"></div>
            <span className="text-sm">VIP Client</span>
          </div>
          <div className="flex items-center">
            <div className="w-4 h-4 border-l-4 border-l-[#34a853] bg-white rounded-sm mr-3"></div>
            <span className="text-sm">Quick Session</span>
          </div>
        </div>
      </div>

      <div>
        <h2 className="text-sm font-medium text-[#5f6368] mb-4">
          ADMIN CONTROLS
        </h2>
        <Button
          variant="outline"
          size="sm"
          className="w-full flex items-center justify-center gap-2 border-[#dadce0] text-[#5f6368] hover:bg-[#f1f3f4] hover:text-[#1a73e8]"
          onClick={handleRefresh}
          disabled={isRefreshing}
        >
          <RefreshCcw className="h-3.5 w-3.5" />
          {isRefreshing ? "Refreshing..." : "Refresh Client Rules"}
        </Button>
        <p className="text-xs text-muted-foreground mt-2">
          Updates client rules from Google Sheets
        </p>
      </div>
    </div>
  );
}
