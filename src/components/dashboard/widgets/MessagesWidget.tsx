'use client';

import { useRouter } from 'next/navigation';
import { MessageSquare, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface MessageProps {
    id: string;
    sender: string;
    content: string;
    time: string; // ISO string
    unread: boolean;
}

interface MessagesWidgetProps {
    messages: MessageProps[];
}

export function MessagesWidget({ messages }: MessagesWidgetProps) {
    const router = useRouter();
    const unreadCount = messages.filter(m => m.unread).length;

    const formatTime = (iso: string) => {
        const date = new Date(iso);
        const now = new Date();
        const diff = now.getTime() - date.getTime();

        // Less than 24h
        if (diff < 1000 * 60 * 60 * 24) {
            return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
        }
        return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    };

    return (
        <div className="flex flex-col h-full">
            <div className="p-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between bg-gradient-to-r from-purple-50 to-transparent dark:from-purple-900/10">
                <h3
                    onClick={() => router.push('/messages')}
                    className="font-semibold text-gray-900 dark:text-white flex items-center gap-2 cursor-pointer hover:text-purple-600 transition-colors"
                >
                    <MessageSquare className="w-4 h-4 text-purple-600" />
                    Messages
                </h3>
                {unreadCount > 0 && (
                    <span className="w-5 h-5 bg-purple-100 text-purple-600 rounded-full text-xs flex items-center justify-center font-bold">
                        {unreadCount}
                    </span>
                )}
            </div>

            <div className="p-2 flex-1 overflow-y-auto space-y-1 custom-scrollbar">
                {messages.length > 0 ? messages.map(msg => (
                    <div
                        key={msg.id}
                        onClick={() => router.push('/messages')}
                        className={cn(
                            "p-3 rounded-lg cursor-pointer transition-colors border border-transparent",
                            msg.unread
                                ? "bg-purple-50 dark:bg-purple-900/10 border-purple-100 dark:border-purple-800/30"
                                : "hover:bg-gray-50 dark:hover:bg-gray-800"
                        )}
                    >
                        <div className="flex justify-between items-center mb-1">
                            <span className={cn(
                                "text-sm font-medium",
                                msg.unread ? "text-gray-900 dark:text-white" : "text-gray-700 dark:text-gray-300"
                            )}>
                                {msg.sender}
                            </span>
                            <span className="text-[10px] text-gray-400 whitespace-nowrap ml-2">
                                {formatTime(msg.time)}
                            </span>
                        </div>
                        <p className={cn(
                            "text-xs line-clamp-2",
                            msg.unread ? "text-gray-700 dark:text-gray-200" : "text-gray-500 dark:text-gray-400"
                        )}>
                            {msg.content}
                        </p>
                    </div>
                )) : (
                    <div className="text-center py-8 text-gray-400 text-sm">
                        No new messages
                    </div>
                )}
            </div>

            <div className="p-3 border-t border-gray-100 dark:border-gray-800 mt-auto">
                <button
                    onClick={() => router.push('/messages')}
                    className="text-xs font-medium text-purple-600 hover:text-purple-700 w-full text-center flex items-center justify-center gap-1"
                >
                    Inbox <ChevronRight className="w-3 h-3" />
                </button>
            </div>
        </div>
    );
}
