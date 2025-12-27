import { useQuery } from '@tanstack/react-query';
import { api } from '@/api';
import { QUERY_KEYS } from '@/lib/queryKeys';
import type { LevelConfig } from '@/shared/types/domain';

export const useLevelsConfig = () => {
    return useQuery<LevelConfig[]>({
        queryKey: QUERY_KEYS.LEVEL_CONFIGS_ALL,
        queryFn: () => api.levelsConfig.list(),
        staleTime: 10 * 60 * 1000, // 10 minutes
        gcTime: 30 * 60 * 1000, // 30 minutes
    });
};

export const useLevelConfig = (level: number) => {
    const { data: configs } = useLevelsConfig();
    return configs?.find((c) => c.level === level) || null;
};
