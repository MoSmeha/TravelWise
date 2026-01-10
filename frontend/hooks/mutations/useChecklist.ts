import { useMutation, useQueryClient } from '@tanstack/react-query';
import { checklistService } from '../../services/api';

export const useToggleChecklistItem = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ itemId, isChecked }: { itemId: string; isChecked: boolean }) => 
      checklistService.updateChecklistItemStatus(itemId, isChecked),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['checklist'] });
    },
  });
};

export const useAddChecklistItem = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ itineraryId, item, category }: { itineraryId: string; item: string; category?: string }) => 
      checklistService.addChecklistItem(itineraryId, item, category),
    onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['checklist'] });
    },
  });
};
