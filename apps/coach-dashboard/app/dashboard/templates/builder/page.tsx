'use client';
import React, { useState } from 'react';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Plus } from 'lucide-react';

const SortableExercise = ({ id, name, target }: { id: string, name: string, target: string }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 100 : 'auto',
    opacity: isDragging ? 0.8 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="flex items-center gap-4 bg-gray-800 p-4 rounded-xl border border-gray-700 mb-2">
      <div {...attributes} {...listeners} className="cursor-grab text-gray-500 hover:text-white">
        <GripVertical size={20} />
      </div>
      <div>
        <h4 className="font-bold text-white">{name}</h4>
        <p className="text-sm text-gray-400">{target}</p>
      </div>
    </div>
  );
};

export default function TemplateBuilder() {
  const [exercises, setExercises] = useState([
    { id: '1', name: 'Barbell Squat', target: '3 sets x 8 reps @ RPE 8' },
    { id: '2', name: 'Romanian Deadlift', target: '3 sets x 10 reps @ RPE 7.5' },
    { id: '3', name: 'Bulgarian Split Squat', target: '3 sets x 12 reps @ RPE 8' },
  ]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = (event: any) => {
    const { active, over } = event;
    if (active.id !== over.id) {
      setExercises((items) => {
        const oldIndex = items.findIndex((i) => i.id === active.id);
        const newIndex = items.findIndex((i) => i.id === over.id);
        const newArray = [...items];
        const [movedItem] = newArray.splice(oldIndex, 1);
        newArray.splice(newIndex, 0, movedItem);
        return newArray;
      });
    }
  };

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white">Push Pull Legs V2</h1>
          <p className="text-gray-400 mt-1">Phase 1 • Week 1 • Day 1 (Legs)</p>
        </div>
        <button className="flex items-center gap-2 bg-green-500 hover:bg-green-600 text-black px-4 py-2 rounded-lg font-bold transition-colors">
          <Plus size={18} />
          Add Exercise
        </button>
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={exercises} strategy={verticalListSortingStrategy}>
            {exercises.map((ex) => (
              <SortableExercise key={ex.id} id={ex.id} name={ex.name} target={ex.target} />
            ))}
          </SortableContext>
        </DndContext>
      </div>
    </div>
  );
}
