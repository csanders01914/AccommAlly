'use client';

import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react';
import {
 format,
 startOfMonth,
 endOfMonth,
 eachDayOfInterval,
 isSameMonth,
 isSameDay,
 isToday,
 startOfWeek,
 endOfWeek,
 addMonths,
 subMonths
} from 'date-fns';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';

interface CalendarEvent {
 id: string;
 start: string;
 type: 'meeting' | 'task' | 'call';
}

const TYPE_COLORS = {
 meeting: 'bg-primary-500',
 task: 'bg-success',
 call: 'bg-warning',
};

export function MiniCalendarWidget() {
 const router = useRouter();
 const [currentMonth, setCurrentMonth] = useState(new Date());
 const [events, setEvents] = useState<CalendarEvent[]>([]);
 const [loading, setLoading] = useState(true);

 const startDate = startOfWeek(startOfMonth(currentMonth));
 const endDate = endOfWeek(endOfMonth(currentMonth));

 const calendarDays = eachDayOfInterval({
 start: startDate,
 end: endDate,
 });

 const fetchEvents = useCallback(async () => {
 try {
 const res = await fetch(
 `/api/calendar/events?start=${startDate.toISOString()}&end=${endDate.toISOString()}`
 );
 if (res.ok) {
 const data = await res.json();
 setEvents(data.events || []);
 }
 } catch (error) {
 console.error('Failed to fetch calendar events:', error);
 } finally {
 setLoading(false);
 }
 }, [startDate.toISOString(), endDate.toISOString()]);

 useEffect(() => {
 fetchEvents();
 }, [fetchEvents]);

 const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
 const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));

 const getEventsForDay = (day: Date) => {
 const dayEvents = events.filter(e => isSameDay(new Date(e.start), day));
 const types = new Set(dayEvents.map(e => e.type));
 return {
 count: dayEvents.length,
 types: Array.from(types) as ('meeting' | 'task' | 'call')[]
 };
 };

 return (
 <div className="flex flex-col h-full">
 <div className="p-4 border-b border-border flex items-center justify-between">
 <h3
 onClick={() => router.push('/calendar')}
 className="font-semibold text-text-primary flex items-center gap-2 cursor-pointer hover:text-primary-600 transition-colors"
 >
 <CalendarIcon className="w-4 h-4 text-primary-500" />
 {format(currentMonth, 'MMMM yyyy')}
 </h3>
 <div className="flex gap-1">
 <button onClick={prevMonth} className="p-1 hover:bg-surface-raised rounded text-text-secondary">
 <ChevronLeft className="w-4 h-4" />
 </button>
 <button onClick={nextMonth} className="p-1 hover:bg-surface-raised rounded text-text-secondary">
 <ChevronRight className="w-4 h-4" />
 </button>
 </div>
 </div>

 <div className="p-4 flex-1">
 {/* Legend */}
 <div className="flex items-center justify-center gap-3 mb-3 text-[10px]">
 <div className="flex items-center gap-1">
 <div className="w-2 h-2 rounded-full bg-primary-500" />
 <span className="text-text-muted">Meeting</span>
 </div>
 <div className="flex items-center gap-1">
 <div className="w-2 h-2 rounded-full bg-success" />
 <span className="text-text-muted">Task</span>
 </div>
 <div className="flex items-center gap-1">
 <div className="w-2 h-2 rounded-full bg-warning" />
 <span className="text-text-muted">Call</span>
 </div>
 </div>

 <div className="grid grid-cols-7 gap-1 text-center text-xs mb-2 text-text-muted font-medium">
 <div>Su</div><div>Mo</div><div>Tu</div><div>We</div><div>Th</div><div>Fr</div><div>Sa</div>
 </div>
 <div className="grid grid-cols-7 gap-1 text-center text-sm">
 {calendarDays.map((day, idx) => {
 const isCurrentMonth = isSameMonth(day, currentMonth);
 const isCurrentDay = isToday(day);
 const dayEvents = getEventsForDay(day);

 return (
 <div
 key={idx}
 onClick={() => router.push('/calendar')}
 className={cn(
 "p-1.5 rounded-lg relative transition-colors cursor-pointer",
 !isCurrentMonth && "text-text-muted/40",
 isCurrentMonth && !isCurrentDay && "text-text-secondary hover:bg-surface-raised",
 isCurrentDay && "bg-primary-500 text-white hover:bg-primary-600 font-bold shadow-sm"
 )}
 >
 <span className="relative z-10">{format(day, 'd')}</span>

 {/* Event dots */}
 {dayEvents.count > 0 && (
 <div className="absolute bottom-0.5 left-1/2 -translate-x-1/2 flex gap-0.5">
 {dayEvents.types.slice(0, 3).map((type, i) => (
 <span
 key={i}
 className={cn(
 "w-1.5 h-1.5 rounded-full",
 isCurrentDay ? "bg-white/80" : TYPE_COLORS[type]
 )}
 />
 ))}
 </div>
 )}
 </div>
 );
 })}
 </div>
 </div>
 </div>
 );
}
