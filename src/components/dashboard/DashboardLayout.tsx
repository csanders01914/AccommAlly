'use client';

import React, { useState, useEffect } from 'react';
import {
 DndContext,
 closestCenter,
 KeyboardSensor,
 PointerSensor,
 useSensor,
 useSensors,
 DragOverlay,
} from '@dnd-kit/core';
import {
 arrayMove,
 SortableContext,
 sortableKeyboardCoordinates,
 rectSortingStrategy,
} from '@dnd-kit/sortable';
import { SortableWidget } from './SortableWidget';

interface DashboardLayoutProps {
 children: React.ReactNode[]; // Expected to be array of components with 'key' props matching widget IDs
 onLayoutChange?: (newOrder: string[]) => void;
 savedOrder?: string[];
}

export function DashboardLayout({ children, onLayoutChange, savedOrder = [] }: DashboardLayoutProps) {
 // Map children to IDs
 const itemsMap = React.Children.toArray(children).reduce((acc: any, child: any) => {
 if (child.key) acc[child.key] = child;
 return acc;
 }, {});

 const allIds = Object.keys(itemsMap);

 // Initialize state with saved order or default
 const [items, setItems] = useState<string[]>(() => {
 if (savedOrder.length > 0) {
 // Merge saved order with any new IDs specific to current children
 const combined = [...new Set([...savedOrder, ...allIds])].filter(id => allIds.includes(id));
 return combined;
 }
 return allIds;
 });

 const [activeId, setActiveId] = useState<string | null>(null);

 const sensors = useSensors(
 useSensor(PointerSensor),
 useSensor(KeyboardSensor, {
 coordinateGetter: sortableKeyboardCoordinates,
 })
 );

 useEffect(() => {
 if (onLayoutChange) {
 onLayoutChange(items);
 }
 }, [items, onLayoutChange]);

 const handleDragStart = (event: any) => {
 setActiveId(event.active.id);
 };

 const handleDragEnd = (event: any) => {
 const { active, over } = event;

 if (active.id !== over?.id) {
 setItems((items) => {
 const oldIndex = items.indexOf(active.id);
 const newIndex = items.indexOf(over.id);
 return arrayMove(items, oldIndex, newIndex);
 });
 }

 setActiveId(null);
 };

 return (
 <DndContext
 sensors={sensors}
 collisionDetection={closestCenter}
 onDragStart={handleDragStart}
 onDragEnd={handleDragEnd}
 >
 <SortableContext items={items} strategy={rectSortingStrategy}>
 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 auto-rows-[400px]">
 {items.map((id) => (
 <SortableWidget key={id} id={id}>
 {itemsMap[id]}
 </SortableWidget>
 ))}
 </div>
 </SortableContext>

 {/* Overlay for smooth dragging visual */}
 <DragOverlay>
 {activeId ? (
 <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl opacity-90 border-2 border-blue-500 h-full overflow-hidden">
 {itemsMap[activeId]}
 </div>
 ) : null}
 </DragOverlay>
 </DndContext>
 );
}
