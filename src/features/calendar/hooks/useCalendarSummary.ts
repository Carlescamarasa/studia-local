import { useQuery } from "@tanstack/react-query";
import { localDataClient } from "@/api/localDataClient";

interface CalendarDateRange {
    start: Date;
    end: Date;
}

export function useCalendarSummary(
    dateRange: CalendarDateRange,
    userId?: string | null,
    isEstu: boolean = true
) {
    return useQuery({
        queryKey: ['calendarSummary', dateRange.start.toISOString(), dateRange.end.toISOString(), isEstu ? userId : 'ALL'],
        queryFn: () => localDataClient.getCalendarSummary(
            dateRange.start,
            dateRange.end,
            isEstu ? (userId || "") : undefined
        ),
        placeholderData: (prev) => prev, // Keep previous data while fetching new month
        staleTime: 5 * 60 * 1000,
        refetchOnWindowFocus: false
    });
}
