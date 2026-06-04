import { useMemo } from 'react';
import { parse } from 'date-fns';
import { isTaskOnLocalDay } from '../lib/dates';
import { useAppStore } from '../store/useAppStore';

export function useTasksForDay(dayKey: string) {
  const tasks = useAppStore((s) => s.tasks);

  return useMemo(() => {
    const day = parse(dayKey, 'yyyy-MM-dd', new Date());
    return tasks.filter(
      (task) => task.completedAt !== null && isTaskOnLocalDay(task, day),
    );
  }, [tasks, dayKey]);
}
