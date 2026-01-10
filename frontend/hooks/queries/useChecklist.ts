import { useQuery } from '@tanstack/react-query';
import { checklistService } from '../../services/api';

export const useChecklist = (itineraryId: string) => {
  return useQuery({
    queryKey: ['checklist', itineraryId],
    queryFn: () => checklistService.getChecklist(itineraryId),
    enabled: !!itineraryId,
  });
};
