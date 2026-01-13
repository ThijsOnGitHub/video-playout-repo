import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RefreshCw, Calendar, Info, Check } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { getCompanyWebcastStreams, getCompanyWebcastPlayerId } from "@/server/functions/companywebcast";
import { cn } from "@/lib/utils";

interface CompanyWebcastStream {
  id: string;
  webcastCode: string;
  title: string;
  description: string;
  scheduledStart: string; // /Date(timestamp)/
  status: number;
  tags: string[];
}

interface StreamSelectorProps {
  onStreamSelect: (stream: {
    webcastId: string;
    webcastCode: string;
    title: string;
    scheduledStart: string; // ISO format
  }) => void;
  currentWebcastId?: string;
  customer?: string;
}

export function StreamSelector({ onStreamSelect, currentWebcastId, customer = "gemeentekrimpenerwaard" }: StreamSelectorProps) {
  const [selectedStreamId, setSelectedStreamId] = useState<string | undefined>(currentWebcastId);

  // Use TanStack Query to fetch streams
  const {
    data: streams = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["companywebcast-streams", customer],
    queryFn: () => getCompanyWebcastStreams({ data: { customer } }),
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 2,
  });

  const handleSelectStream = async () => {
    if (!selectedStreamId) return;

    const stream = streams.find((s: CompanyWebcastStream) => s.id === selectedStreamId);
    if (!stream) return;

    // Parse the /Date(timestamp)/ format
    const scheduledDate = parseScheduledStart(stream.scheduledStart);
    if (!scheduledDate) {
      console.error("Invalid date format:", stream.scheduledStart);
      return;
    }

    try {
      // Fetch the real player ID using the webcast code
      const data = await getCompanyWebcastPlayerId({
        data: {
          customer,
          code: stream.webcastCode,
        },
      });

      // Convert to local datetime-local format (YYYY-MM-DDTHH:mm) without timezone
      // The scheduledDate is already in the correct timezone from the API
      const year = scheduledDate.getFullYear();
      const month = String(scheduledDate.getMonth() + 1).padStart(2, '0');
      const day = String(scheduledDate.getDate()).padStart(2, '0');
      const hours = String(scheduledDate.getHours()).padStart(2, '0');
      const minutes = String(scheduledDate.getMinutes()).padStart(2, '0');
      const localDateTimeString = `${year}-${month}-${day}T${hours}:${minutes}`;

      onStreamSelect({
        webcastId: data.playerId,
        webcastCode: stream.webcastCode,
        title: stream.title,
        scheduledStart: localDateTimeString,
      });
    } catch (error) {
      console.error("[StreamSelector] Error fetching player ID:", error);
      alert("Kon player ID niet ophalen");
    }
  };

  const selectedStream = streams.find((s: CompanyWebcastStream) => s.id === selectedStreamId);

  // Helper to parse and format the /Date(timestamp)/ format
  const parseScheduledStart = (scheduledStart: string): Date | null => {
    const match = scheduledStart.match(/\/Date\((\d+)\)\//);
    if (!match) return null;
    return new Date(parseInt(match[1], 10));
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Beschikbare Streams
        </CardTitle>
        <CardDescription>Kies een raadsvergadering uit de beschikbare streams</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            {isLoading ? "Bezig met laden..." : `${streams.length} stream${streams.length !== 1 ? 's' : ''} gevonden`}
          </div>
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isLoading} title="Ververs streams">
            <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
          </Button>
        </div>

        {error && <div className="text-sm text-red-500">{error instanceof Error ? error.message : "Fout bij het ophalen van streams"}</div>}

        {streams.length === 0 && !isLoading && (
          <div className="text-center py-8 text-muted-foreground">
            Geen live of aankomende streams gevonden
          </div>
        )}

        {streams.length > 0 && (
          <div className="space-y-2">
            {streams.map((stream: CompanyWebcastStream) => {
              const scheduledDate = parseScheduledStart(stream.scheduledStart);
              const isSelected = selectedStreamId === stream.id;

              return (
                <button
                  key={stream.id}
                  onClick={() => setSelectedStreamId(stream.id)}
                  disabled={isLoading}
                  className={cn(
                    "w-full text-left p-3 rounded-lg border-2 transition-colors",
                    "hover:bg-muted/50 disabled:opacity-50 disabled:cursor-not-allowed",
                    isSelected ? "border-primary bg-primary/5" : "border-border"
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="font-medium flex items-center gap-2">
                        {stream.title}
                        {isSelected && <Check className="h-4 w-4 text-primary flex-shrink-0" />}
                      </div>
                      {scheduledDate && (
                        <div className="text-sm text-muted-foreground mt-1">
                          {formatDate(scheduledDate)}
                        </div>
                      )}
                      {stream.description && (
                        <div className="text-sm text-muted-foreground mt-1 line-clamp-2">
                          {stream.description}
                        </div>
                      )}
                      {stream.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {stream.tags.slice(0, 3).map((tag, idx) => (
                            <span key={idx} className="text-xs px-2 py-0.5 bg-muted rounded">
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {selectedStreamId && (
          <Button onClick={handleSelectStream} disabled={isLoading} className="w-full">
            Stream selecteren en inplannen
          </Button>
        )}

      </CardContent>
    </Card>
  );
}
