import { useQuery } from '@tanstack/react-query';
import { dashboardApi } from '@/services/api';

export function useDashboardStats() {
    return useQuery({
        queryKey: ['dashboard', 'stats'],
        queryFn: async () => {
            const response = await dashboardApi.getStats();
            return response.data.data;
        },
        staleTime: 60_000, // 1 minute
        refetchInterval: 120_000, // Auto-refresh every 2 minutes
    });
}

export function useDashboardCharts() {
    return useQuery({
        queryKey: ['dashboard', 'charts'],
        queryFn: async () => {
            const response = await dashboardApi.getCharts();
            return response.data.data;
        },
        staleTime: 60_000,
        refetchInterval: 120_000,
    });
}
