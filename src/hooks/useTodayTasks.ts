import { localDateString } from '../lib/dates';
import { useTasksForDay } from './useTasksForDay';

export function useTodayTasks() {
  return useTasksForDay(localDateString());
}
