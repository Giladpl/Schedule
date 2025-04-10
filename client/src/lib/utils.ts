import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(date);
}

export function formatTime(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: 'numeric',
    hour12: true,
  }).format(date);
}

export function formatTimeRange(start: Date, end: Date): string {
  return `${formatTime(start)} - ${formatTime(end)}`;
}

export function formatDateRange(start: Date, end: Date): string {
  const startMonth = start.toLocaleString('en-US', { month: 'short' });
  const endMonth = end.toLocaleString('en-US', { month: 'short' });
  const startDay = start.getDate();
  const endDay = end.getDate();
  const year = start.getFullYear();

  if (startMonth === endMonth) {
    return `${startMonth} ${startDay} - ${endDay}, ${year}`;
  }

  return `${startMonth} ${startDay} - ${endMonth} ${endDay}, ${year}`;
}

export function getDayOfMonth(date: Date): number {
  return date.getDate();
}

export function getDayName(date: Date, short = true): string {
  return date.toLocaleString('en-US', { weekday: short ? 'short' : 'long' }).toUpperCase();
}

export function calculateDuration(start: Date, end: Date): number {
  return (end.getTime() - start.getTime()) / (1000 * 60); // Duration in minutes
}

export function isSameDay(d1: Date, d2: Date): boolean {
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  );
}

export function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

export function startOfWeek(date: Date): Date {
  const result = new Date(date);
  const day = result.getDay();
  result.setDate(result.getDate() - day);
  return result;
}

export function endOfWeek(date: Date): Date {
  const result = new Date(date);
  const day = result.getDay();
  result.setDate(result.getDate() + (6 - day));
  return result;
}

export function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

export function endOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}

export function startOfDay(date: Date): Date {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  return result;
}

export function endOfDay(date: Date): Date {
  const result = new Date(date);
  result.setHours(23, 59, 59, 999);
  return result;
}

export function getWeekDays(date: Date): Date[] {
  const start = startOfWeek(date);
  const days: Date[] = [];

  for (let i = 0; i < 7; i++) {
    days.push(addDays(start, i));
  }

  return days;
}

export function getHours(): string[] {
  const hours = [];
  for (let i = 9; i <= 17; i++) {
    hours.push(i < 12 ? `${i} AM` : i === 12 ? `${i} PM` : `${i - 12} PM`);
  }
  return hours;
}

export function getDatesInMonth(year: number, month: number): Date[] {
  const dates: Date[] = [];
  const firstDayOfMonth = new Date(year, month, 1);
  const lastDayOfMonth = new Date(year, month + 1, 0);

  // Add dates from previous month to fill the first week
  const firstDayOfWeek = firstDayOfMonth.getDay();
  for (let i = firstDayOfWeek; i > 0; i--) {
    const date = new Date(year, month, 1 - i);
    dates.push(date);
  }

  // Add all dates of the current month
  for (let day = 1; day <= lastDayOfMonth.getDate(); day++) {
    dates.push(new Date(year, month, day));
  }

  // Add dates from next month to fill the last week
  const lastDayOfWeek = lastDayOfMonth.getDay();
  for (let i = 1; i < 7 - lastDayOfWeek; i++) {
    dates.push(new Date(year, month + 1, i));
  }

  return dates;
}
