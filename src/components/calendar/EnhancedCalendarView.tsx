'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
    format, startOfMonth, endOfMonth, startOfWeek, endOfWeek,
    eachDayOfInterval, addMonths, subMonths, isSameMonth,
    isSameDay, isToday, addDays, addWeeks, subWeeks,
    startOfDay, endOfDay, eachHourOfInterval, setHours
} from 'date-fns';
import {
    ChevronLeft, ChevronRight, Plus, Calendar, List,
    LayoutGrid, Clock, Phone, Users, MapPin, X
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useRouter, useSearchParams } from 'next/navigation';

// Types
interface CalendarEvent {
    id: string;
    title: string;
    start: string;
    end: string;
    allDay: boolean;
    type: 'meeting' | 'task' | 'call';
    color: string;
    description?: string;
    location?: string;
    caseNumber?: string;
    priority?: string;
    status?: string;
}

type ViewType = 'month' | 'week' | 'day' | 'agenda';

const VIEW_OPTIONS: { value: ViewType; label: string; icon: React.ReactNode }[] = [
    { value: 'month', icon: <LayoutGrid className="w-4 h-4" />, label: 'Month' },
    { value: 'week', icon: <Calendar className="w-4 h-4" />, label: 'Week' },
    { value: 'day', icon: <Clock className="w-4 h-4" />, label: 'Day' },
    { value: 'agenda', icon: <List className="w-4 h-4" />, label: 'Agenda' },
];

const TYPE_COLORS = {
    meeting: { bg: 'bg-blue-500/20', border: 'border-blue-500', text: 'text-blue-400', icon: Users },
    task: { bg: 'bg-purple-500/20', border: 'border-purple-500', text: 'text-purple-400', icon: Calendar },
    call: { bg: 'bg-red-500/20', border: 'border-red-500', text: 'text-red-400', icon: Phone },
};

export function EnhancedCalendarView() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [currentDate, setCurrentDate] = useState(new Date());
    const [view, setView] = useState<ViewType>('month');
    const [events, setEvents] = useState<CalendarEvent[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [createDate, setCreateDate] = useState<Date | null>(null);

    // Fetch events
    const fetchEvents = useCallback(async () => {
        setLoading(true);
        try {
            let start: Date, end: Date;

            if (view === 'month') {
                start = startOfWeek(startOfMonth(currentDate));
                end = endOfWeek(endOfMonth(currentDate));
            } else if (view === 'week') {
                start = startOfWeek(currentDate);
                end = endOfWeek(currentDate);
            } else if (view === 'day') {
                start = startOfDay(currentDate);
                end = endOfDay(currentDate);
            } else {
                // Agenda: next 30 days
                start = startOfDay(currentDate);
                end = addDays(start, 30);
            }

            const res = await fetch(
                `/api/calendar/events?start=${start.toISOString()}&end=${end.toISOString()}`
            );

            if (res.ok) {
                const data = await res.json();
                setEvents(data.events || []);
            }
        } catch (error) {
            console.error('Failed to fetch events:', error);
        } finally {
            setLoading(false);
        }
    }, [currentDate, view]);

    useEffect(() => {
        fetchEvents();
    }, [fetchEvents]);

    // Handle URL Actions
    useEffect(() => {
        if (searchParams?.get('action') === 'new') {
            setCreateDate(new Date());
            setShowCreateModal(true);
            router.replace('/calendar', { scroll: false });
        }
    }, [searchParams, router]);

    // Navigation
    const goToToday = () => setCurrentDate(new Date());

    const goPrev = () => {
        if (view === 'month') setCurrentDate(subMonths(currentDate, 1));
        else if (view === 'week') setCurrentDate(subWeeks(currentDate, 1));
        else setCurrentDate(addDays(currentDate, -1));
    };

    const goNext = () => {
        if (view === 'month') setCurrentDate(addMonths(currentDate, 1));
        else if (view === 'week') setCurrentDate(addWeeks(currentDate, 1));
        else setCurrentDate(addDays(currentDate, 1));
    };

    // Get events for a specific day
    const getEventsForDay = (date: Date) => {
        return events.filter(e => isSameDay(new Date(e.start), date));
    };

    // Header title based on view
    const getHeaderTitle = () => {
        if (view === 'month') return format(currentDate, 'MMMM yyyy');
        if (view === 'week') {
            const weekStart = startOfWeek(currentDate);
            const weekEnd = endOfWeek(currentDate);
            return `${format(weekStart, 'MMM d')} - ${format(weekEnd, 'MMM d, yyyy')}`;
        }
        if (view === 'day') return format(currentDate, 'EEEE, MMMM d, yyyy');
        return 'Upcoming Events';
    };

    return (
        <div className="h-full flex flex-col bg-gray-900">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700">
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1">
                        <button
                            onClick={goPrev}
                            className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
                        >
                            <ChevronLeft className="w-5 h-5" />
                        </button>
                        <button
                            onClick={goNext}
                            className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
                        >
                            <ChevronRight className="w-5 h-5" />
                        </button>
                    </div>
                    <button
                        onClick={goToToday}
                        className="px-3 py-1.5 text-sm bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
                    >
                        Today
                    </button>
                    <h2 className="text-xl font-semibold">{getHeaderTitle()}</h2>
                </div>

                <div className="flex items-center gap-3">
                    {/* View Selector */}
                    <div className="flex bg-gray-800 rounded-lg p-1">
                        {VIEW_OPTIONS.map(opt => (
                            <button
                                key={opt.value}
                                onClick={() => setView(opt.value)}
                                className={cn(
                                    "flex items-center gap-2 px-3 py-1.5 rounded-md text-sm transition-colors",
                                    view === opt.value
                                        ? "bg-blue-600 text-white"
                                        : "text-gray-400 hover:text-white"
                                )}
                            >
                                {opt.icon}
                                <span className="hidden sm:inline">{opt.label}</span>
                            </button>
                        ))}
                    </div>

                    {/* Create Button */}
                    <button
                        onClick={() => { setCreateDate(new Date()); setShowCreateModal(true); }}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
                    >
                        <Plus className="w-4 h-4" />
                        <span className="hidden sm:inline">New Event</span>
                    </button>
                </div>
            </div>

            {/* Legend */}
            <div className="flex items-center gap-4 px-4 py-2 border-b border-gray-700/50 text-sm">
                {Object.entries(TYPE_COLORS).map(([type, colors]) => {
                    const Icon = colors.icon;
                    return (
                        <div key={type} className="flex items-center gap-1.5">
                            <div className={cn("w-3 h-3 rounded-full", colors.bg, colors.border, "border")} />
                            <span className={colors.text}>{type.charAt(0).toUpperCase() + type.slice(1)}</span>
                        </div>
                    );
                })}
            </div>

            {/* Calendar Content */}
            <div className="flex-1 overflow-auto">
                {loading ? (
                    <div className="flex items-center justify-center h-full">
                        <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full" />
                    </div>
                ) : (
                    <>
                        {view === 'month' && (
                            <MonthView
                                currentDate={currentDate}
                                events={events}
                                onDayClick={(date) => { setCreateDate(date); setShowCreateModal(true); }}
                                onEventClick={setSelectedEvent}
                            />
                        )}
                        {view === 'week' && (
                            <WeekView
                                currentDate={currentDate}
                                events={events}
                                onEventClick={setSelectedEvent}
                                onSlotClick={(date) => { setCreateDate(date); setShowCreateModal(true); }}
                            />
                        )}
                        {view === 'day' && (
                            <DayView
                                currentDate={currentDate}
                                events={events}
                                onEventClick={setSelectedEvent}
                                onSlotClick={(date) => { setCreateDate(date); setShowCreateModal(true); }}
                            />
                        )}
                        {view === 'agenda' && (
                            <AgendaView
                                events={events}
                                onEventClick={setSelectedEvent}
                            />
                        )}
                    </>
                )}
            </div>

            {/* Event Detail Modal */}
            {selectedEvent && (
                <EventDetailModal
                    event={selectedEvent}
                    onClose={() => setSelectedEvent(null)}
                    onRefresh={fetchEvents}
                />
            )}

            {/* Create Event Modal */}
            {showCreateModal && (
                <CreateEventModal
                    initialDate={createDate}
                    onClose={() => setShowCreateModal(false)}
                    onCreated={() => { setShowCreateModal(false); fetchEvents(); }}
                />
            )}
        </div>
    );
}

// Month View Component
function MonthView({
    currentDate,
    events,
    onDayClick,
    onEventClick
}: {
    currentDate: Date;
    events: CalendarEvent[];
    onDayClick: (date: Date) => void;
    onEventClick: (event: CalendarEvent) => void;
}) {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const calendarStart = startOfWeek(monthStart);
    const calendarEnd = endOfWeek(monthEnd);
    const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

    const getEventsForDay = (date: Date) => {
        return events.filter(e => isSameDay(new Date(e.start), date));
    };

    return (
        <div className="h-full flex flex-col">
            {/* Day Headers */}
            <div className="grid grid-cols-7 border-b border-gray-700">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                    <div key={day} className="py-2 text-center text-sm text-gray-400 font-medium">
                        {day}
                    </div>
                ))}
            </div>

            {/* Day Grid */}
            <div className="flex-1 grid grid-cols-7 grid-rows-6">
                {days.map((day, idx) => {
                    const dayEvents = getEventsForDay(day);
                    const isCurrentMonth = isSameMonth(day, currentDate);

                    return (
                        <div
                            key={idx}
                            onClick={() => onDayClick(day)}
                            className={cn(
                                "border-b border-r border-gray-700/50 p-1 min-h-[100px] cursor-pointer hover:bg-gray-800/50 transition-colors",
                                !isCurrentMonth && "bg-gray-900/50"
                            )}
                        >
                            <div className={cn(
                                "text-sm font-medium mb-1 w-7 h-7 flex items-center justify-center rounded-full",
                                isToday(day) && "bg-blue-600 text-white",
                                !isToday(day) && !isCurrentMonth && "text-gray-600",
                                !isToday(day) && isCurrentMonth && "text-gray-300"
                            )}>
                                {format(day, 'd')}
                            </div>
                            <div className="space-y-0.5 overflow-hidden">
                                {dayEvents.slice(0, 3).map(event => {
                                    const colors = TYPE_COLORS[event.type];
                                    return (
                                        <div
                                            key={event.id}
                                            onClick={(e) => { e.stopPropagation(); onEventClick(event); }}
                                            className={cn(
                                                "text-xs px-1.5 py-0.5 rounded truncate cursor-pointer",
                                                colors.bg, colors.text, "border-l-2", colors.border
                                            )}
                                        >
                                            {event.title}
                                        </div>
                                    );
                                })}
                                {dayEvents.length > 3 && (
                                    <div className="text-xs text-gray-500 px-1">
                                        +{dayEvents.length - 3} more
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

// Week View Component
function WeekView({
    currentDate,
    events,
    onEventClick,
    onSlotClick
}: {
    currentDate: Date;
    events: CalendarEvent[];
    onEventClick: (event: CalendarEvent) => void;
    onSlotClick: (date: Date) => void;
}) {
    const weekStart = startOfWeek(currentDate);
    const weekDays = eachDayOfInterval({ start: weekStart, end: addDays(weekStart, 6) });
    const hours = Array.from({ length: 14 }, (_, i) => i + 7); // 7am to 8pm

    const getEventsForDayHour = (day: Date, hour: number) => {
        return events.filter(e => {
            const eventStart = new Date(e.start);
            return isSameDay(eventStart, day) && eventStart.getHours() === hour;
        });
    };

    return (
        <div className="h-full overflow-auto">
            <div className="min-w-[800px]">
                {/* Day Headers */}
                <div className="grid grid-cols-8 border-b border-gray-700 sticky top-0 bg-gray-900 z-10">
                    <div className="py-2 px-2 text-sm text-gray-500">Time</div>
                    {weekDays.map(day => (
                        <div key={day.toISOString()} className="py-2 text-center">
                            <div className="text-sm text-gray-400">{format(day, 'EEE')}</div>
                            <div className={cn(
                                "text-lg font-semibold",
                                isToday(day) ? "text-blue-400" : "text-white"
                            )}>
                                {format(day, 'd')}
                            </div>
                        </div>
                    ))}
                </div>

                {/* Time Grid */}
                {hours.map(hour => (
                    <div key={hour} className="grid grid-cols-8 border-b border-gray-700/30">
                        <div className="py-2 px-2 text-xs text-gray-500 text-right pr-3">
                            {format(setHours(new Date(), hour), 'h a')}
                        </div>
                        {weekDays.map(day => {
                            const slotEvents = getEventsForDayHour(day, hour);
                            const slotDate = setHours(day, hour);

                            return (
                                <div
                                    key={`${day.toISOString()}-${hour}`}
                                    onClick={() => onSlotClick(slotDate)}
                                    className="border-l border-gray-700/30 min-h-[50px] p-0.5 hover:bg-gray-800/30 cursor-pointer"
                                >
                                    {slotEvents.map(event => {
                                        const colors = TYPE_COLORS[event.type];
                                        return (
                                            <div
                                                key={event.id}
                                                onClick={(e) => { e.stopPropagation(); onEventClick(event); }}
                                                className={cn(
                                                    "text-xs px-1.5 py-1 rounded mb-0.5 cursor-pointer",
                                                    colors.bg, colors.text, "border-l-2", colors.border
                                                )}
                                            >
                                                <div className="font-medium truncate">{event.title}</div>
                                                <div className="text-[10px] opacity-70">
                                                    {format(new Date(event.start), 'h:mm a')}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            );
                        })}
                    </div>
                ))}
            </div>
        </div>
    );
}

// Day View Component
function DayView({
    currentDate,
    events,
    onEventClick,
    onSlotClick
}: {
    currentDate: Date;
    events: CalendarEvent[];
    onEventClick: (event: CalendarEvent) => void;
    onSlotClick: (date: Date) => void;
}) {
    const hours = Array.from({ length: 14 }, (_, i) => i + 7);

    const getEventsForHour = (hour: number) => {
        return events.filter(e => {
            const eventStart = new Date(e.start);
            return isSameDay(eventStart, currentDate) && eventStart.getHours() === hour;
        });
    };

    return (
        <div className="h-full overflow-auto">
            {hours.map(hour => {
                const hourEvents = getEventsForHour(hour);
                const slotDate = setHours(currentDate, hour);

                return (
                    <div key={hour} className="flex border-b border-gray-700/30">
                        <div className="w-20 py-3 px-3 text-sm text-gray-500 text-right flex-shrink-0">
                            {format(setHours(new Date(), hour), 'h a')}
                        </div>
                        <div
                            onClick={() => onSlotClick(slotDate)}
                            className="flex-1 min-h-[60px] p-1 hover:bg-gray-800/30 cursor-pointer border-l border-gray-700/30"
                        >
                            {hourEvents.map(event => {
                                const colors = TYPE_COLORS[event.type];
                                const Icon = colors.icon;
                                return (
                                    <div
                                        key={event.id}
                                        onClick={(e) => { e.stopPropagation(); onEventClick(event); }}
                                        className={cn(
                                            "flex items-center gap-2 px-3 py-2 rounded-lg mb-1 cursor-pointer",
                                            colors.bg, "border-l-4", colors.border
                                        )}
                                    >
                                        <Icon className={cn("w-4 h-4", colors.text)} />
                                        <div className="flex-1 min-w-0">
                                            <div className={cn("font-medium", colors.text)}>{event.title}</div>
                                            <div className="text-xs text-gray-400">
                                                {format(new Date(event.start), 'h:mm a')} - {format(new Date(event.end), 'h:mm a')}
                                                {event.location && ` • ${event.location}`}
                                            </div>
                                        </div>
                                        {event.caseNumber && (
                                            <span className="text-xs bg-gray-700 px-2 py-0.5 rounded">
                                                {event.caseNumber}
                                            </span>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

// Agenda View Component
function AgendaView({
    events,
    onEventClick
}: {
    events: CalendarEvent[];
    onEventClick: (event: CalendarEvent) => void;
}) {
    // Group events by date
    const groupedEvents = events.reduce((acc, event) => {
        const dateKey = format(new Date(event.start), 'yyyy-MM-dd');
        if (!acc[dateKey]) acc[dateKey] = [];
        acc[dateKey].push(event);
        return acc;
    }, {} as Record<string, CalendarEvent[]>);

    const sortedDates = Object.keys(groupedEvents).sort();

    if (sortedDates.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-gray-400">
                <Calendar className="w-16 h-16 mb-4 opacity-50" />
                <p className="text-lg">No upcoming events</p>
                <p className="text-sm">Click "New Event" to create one</p>
            </div>
        );
    }

    return (
        <div className="p-4 space-y-6">
            {sortedDates.map(dateKey => {
                const date = new Date(dateKey);
                const dayEvents = groupedEvents[dateKey];

                return (
                    <div key={dateKey}>
                        <div className="flex items-center gap-3 mb-3">
                            <div className={cn(
                                "w-12 h-12 rounded-lg flex flex-col items-center justify-center",
                                isToday(date) ? "bg-blue-600" : "bg-gray-700"
                            )}>
                                <span className="text-xs uppercase">{format(date, 'EEE')}</span>
                                <span className="text-lg font-bold">{format(date, 'd')}</span>
                            </div>
                            <div>
                                <div className="font-medium">{format(date, 'EEEE')}</div>
                                <div className="text-sm text-gray-400">{format(date, 'MMMM d, yyyy')}</div>
                            </div>
                        </div>

                        <div className="space-y-2 ml-15">
                            {dayEvents.map(event => {
                                const colors = TYPE_COLORS[event.type];
                                const Icon = colors.icon;

                                return (
                                    <div
                                        key={event.id}
                                        onClick={() => onEventClick(event)}
                                        className={cn(
                                            "flex items-center gap-3 p-3 rounded-lg cursor-pointer hover:bg-gray-800/50",
                                            colors.bg, "border-l-4", colors.border
                                        )}
                                    >
                                        <Icon className={cn("w-5 h-5 flex-shrink-0", colors.text)} />
                                        <div className="flex-1 min-w-0">
                                            <div className={cn("font-medium", colors.text)}>{event.title}</div>
                                            <div className="text-sm text-gray-400 flex items-center gap-2">
                                                <Clock className="w-3 h-3" />
                                                {event.allDay ? 'All day' : `${format(new Date(event.start), 'h:mm a')} - ${format(new Date(event.end), 'h:mm a')}`}
                                                {event.location && (
                                                    <>
                                                        <MapPin className="w-3 h-3 ml-2" />
                                                        {event.location}
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                        {event.caseNumber && (
                                            <span className="text-xs bg-gray-700 px-2 py-1 rounded">
                                                Case: {event.caseNumber}
                                            </span>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

// Event Detail Modal
function EventDetailModal({
    event,
    onClose,
    onRefresh
}: {
    event: CalendarEvent;
    onClose: () => void;
    onRefresh: () => void;
}) {
    const colors = TYPE_COLORS[event.type];
    const Icon = colors.icon;

    const handleDelete = async () => {
        if (!confirm('Are you sure you want to delete this event?')) return;

        try {
            let endpoint = '';
            if (event.type === 'meeting') endpoint = `/api/meetings/${event.id}`;
            else if (event.type === 'task') endpoint = `/api/tasks/${event.id}`;
            // Calls typically aren't deleted via calendar

            if (endpoint) {
                await fetch(endpoint, { method: 'DELETE' });
                onRefresh();
                onClose();
            }
        } catch (error) {
            console.error('Failed to delete:', error);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
            <div
                className="bg-gray-800 rounded-xl w-full max-w-md mx-4 overflow-hidden"
                onClick={e => e.stopPropagation()}
            >
                <div className={cn("p-4 flex items-center gap-3", colors.bg)}>
                    <Icon className={cn("w-6 h-6", colors.text)} />
                    <h3 className={cn("text-lg font-semibold flex-1", colors.text)}>{event.title}</h3>
                    <button onClick={onClose} className="p-1 hover:bg-gray-700/50 rounded">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-4 space-y-3">
                    <div className="flex items-center gap-2 text-gray-300">
                        <Clock className="w-4 h-4 text-gray-500" />
                        {event.allDay ? (
                            <span>All day • {format(new Date(event.start), 'MMMM d, yyyy')}</span>
                        ) : (
                            <span>
                                {format(new Date(event.start), 'MMMM d, yyyy • h:mm a')} - {format(new Date(event.end), 'h:mm a')}
                            </span>
                        )}
                    </div>

                    {event.location && (
                        <div className="flex items-center gap-2 text-gray-300">
                            <MapPin className="w-4 h-4 text-gray-500" />
                            {event.location}
                        </div>
                    )}

                    {event.caseNumber && (
                        <div className="flex items-center gap-2 text-gray-300">
                            <Calendar className="w-4 h-4 text-gray-500" />
                            Case: {event.caseNumber}
                        </div>
                    )}

                    {event.description && (
                        <div className="pt-2 border-t border-gray-700">
                            <p className="text-gray-400 text-sm">{event.description}</p>
                        </div>
                    )}

                    {event.priority && (
                        <div className="flex items-center gap-2">
                            <span className={cn(
                                "text-xs px-2 py-0.5 rounded",
                                event.priority === 'URGENT' || event.priority === 'HIGH'
                                    ? "bg-red-500/20 text-red-400"
                                    : "bg-gray-700 text-gray-400"
                            )}>
                                {event.priority}
                            </span>
                            {event.status && (
                                <span className="text-xs px-2 py-0.5 rounded bg-gray-700 text-gray-400">
                                    {event.status}
                                </span>
                            )}
                        </div>
                    )}
                </div>

                <div className="p-4 border-t border-gray-700 flex gap-2">
                    {event.type !== 'call' && (
                        <button
                            onClick={handleDelete}
                            className="px-4 py-2 bg-red-600/20 text-red-400 hover:bg-red-600/30 rounded-lg text-sm"
                        >
                            Delete
                        </button>
                    )}
                    <button
                        onClick={onClose}
                        className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
}

// Create Event Modal
function CreateEventModal({
    initialDate,
    onClose,
    onCreated
}: {
    initialDate: Date | null;
    onClose: () => void;
    onCreated: () => void;
}) {
    const [eventType, setEventType] = useState<'meeting' | 'task'>('meeting');
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [location, setLocation] = useState('');
    const [startDate, setStartDate] = useState(format(initialDate || new Date(), "yyyy-MM-dd'T'HH:mm"));
    const [endDate, setEndDate] = useState(format(addDays(initialDate || new Date(), 0).setHours((initialDate || new Date()).getHours() + 1), "yyyy-MM-dd'T'HH:mm"));
    const [allDay, setAllDay] = useState(false);
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title) return;

        setLoading(true);
        try {
            const endpoint = eventType === 'meeting' ? '/api/meetings' : '/api/tasks';
            const body = eventType === 'meeting'
                ? {
                    title,
                    description,
                    location,
                    startTime: new Date(startDate).toISOString(),
                    endTime: new Date(endDate).toISOString(),
                    allDay
                }
                : {
                    title,
                    description,
                    dueDate: new Date(startDate).toISOString(),
                    startTime: new Date(startDate).toISOString(),
                    endTime: new Date(endDate).toISOString(),
                    priority: 'MEDIUM',
                    category: 'MEETING'
                };

            const res = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });

            if (res.ok) {
                onCreated();
            }
        } catch (error) {
            console.error('Failed to create event:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
            <div
                className="bg-gray-800 rounded-xl w-full max-w-md mx-4 overflow-hidden"
                onClick={e => e.stopPropagation()}
            >
                <div className="p-4 border-b border-gray-700 flex items-center justify-between">
                    <h3 className="text-lg font-semibold">New Event</h3>
                    <button onClick={onClose} className="p-1 hover:bg-gray-700 rounded">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-4 space-y-4">
                    {/* Event Type */}
                    <div className="flex gap-2">
                        <button
                            type="button"
                            onClick={() => setEventType('meeting')}
                            className={cn(
                                "flex-1 py-2 rounded-lg text-sm transition-colors",
                                eventType === 'meeting'
                                    ? "bg-blue-600 text-white"
                                    : "bg-gray-700 text-gray-400"
                            )}
                        >
                            <Users className="w-4 h-4 inline mr-2" />
                            Meeting
                        </button>
                        <button
                            type="button"
                            onClick={() => setEventType('task')}
                            className={cn(
                                "flex-1 py-2 rounded-lg text-sm transition-colors",
                                eventType === 'task'
                                    ? "bg-purple-600 text-white"
                                    : "bg-gray-700 text-gray-400"
                            )}
                        >
                            <Calendar className="w-4 h-4 inline mr-2" />
                            Task
                        </button>
                    </div>

                    {/* Title */}
                    <input
                        type="text"
                        placeholder="Event title"
                        value={title}
                        onChange={e => setTitle(e.target.value)}
                        className="w-full px-4 py-2 bg-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                        required
                    />

                    {/* All Day Toggle */}
                    <label className="flex items-center gap-2 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={allDay}
                            onChange={e => setAllDay(e.target.checked)}
                            className="w-4 h-4 rounded"
                        />
                        <span className="text-sm text-gray-300">All day event</span>
                    </label>

                    {/* Date/Time */}
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="text-xs text-gray-400 mb-1 block">Start</label>
                            <input
                                type={allDay ? "date" : "datetime-local"}
                                value={allDay ? startDate.split('T')[0] : startDate}
                                onChange={e => setStartDate(allDay ? e.target.value + 'T09:00' : e.target.value)}
                                className="w-full px-3 py-2 bg-gray-700 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                            />
                        </div>
                        <div>
                            <label className="text-xs text-gray-400 mb-1 block">End</label>
                            <input
                                type={allDay ? "date" : "datetime-local"}
                                value={allDay ? endDate.split('T')[0] : endDate}
                                onChange={e => setEndDate(allDay ? e.target.value + 'T17:00' : e.target.value)}
                                className="w-full px-3 py-2 bg-gray-700 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                            />
                        </div>
                    </div>

                    {/* Location (meetings only) */}
                    {eventType === 'meeting' && (
                        <input
                            type="text"
                            placeholder="Location (optional)"
                            value={location}
                            onChange={e => setLocation(e.target.value)}
                            className="w-full px-4 py-2 bg-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                    )}

                    {/* Description */}
                    <textarea
                        placeholder="Description (optional)"
                        value={description}
                        onChange={e => setDescription(e.target.value)}
                        rows={3}
                        className="w-full px-4 py-2 bg-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                    />

                    <button
                        type="submit"
                        disabled={loading || !title}
                        className="w-full py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg font-medium transition-colors"
                    >
                        {loading ? 'Creating...' : 'Create Event'}
                    </button>
                </form>
            </div>
        </div>
    );
}
