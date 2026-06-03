import { useMemo } from 'react';
import { isSameDay, parseISO, startOfDay } from 'date-fns';
import { useAppStore } from '../store/useAppStore';

export function useTodayTasks() {
  const tasks = useAppStore((s) => s.tasks);

  return useMemo(() => {
    const today = startOfDay(new Date());
    return tasks.filter((task) =>
      isSameDay(parseISO(task.scheduledDate), today),
    );
  }, [tasks]);
}
