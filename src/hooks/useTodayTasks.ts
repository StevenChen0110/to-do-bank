import { useMemo } from 'react';
import { isTaskOnLocalDay } from '../lib/dates';
import { useAppStore } from '../store/useAppStore';

export function useTodayTasks() {
  const tasks = useAppStore((s) => s.tasks);

  return useMemo(() => {
    const today = new Date();
    return tasks.filter((task) => isTaskOnLocalDay(task, today));
  }, [tasks]);
}
