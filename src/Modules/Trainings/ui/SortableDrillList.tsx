"use client";

import React, { useMemo } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, X } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";

interface DrillType {
  id: string;
  name: string;
}

interface SortableDrillListProps {
  availableDrills: DrillType[];
  selectedDrillIds: string[];
  onChange: (ids: string[]) => void;
}

function SortableItem({
  id,
  drill,
  onRemove,
}: {
  id: string;
  drill: DrillType;
  onRemove: (id: string) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-2 p-2 border rounded-md mb-2 bg-background shadow-sm ${
        isDragging ? "opacity-50 ring-2 ring-primary" : ""
      }`}
    >
      <div
        {...attributes}
        {...listeners}
        className="cursor-move text-muted-foreground hover:text-foreground touch-none"
      >
        <GripVertical className="h-4 w-4" />
      </div>
      <span className="flex-1 text-sm">{drill.name}</span>
      <button
        type="button"
        onClick={() => onRemove(id)}
        className="text-muted-foreground hover:text-destructive transition-colors p-1"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

export function SortableDrillList({
  availableDrills,
  selectedDrillIds,
  onChange,
}: SortableDrillListProps) {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const selectedDrills = useMemo(() => {
    return selectedDrillIds
      .map((id) => availableDrills.find((d) => d.id === id))
      .filter(Boolean) as DrillType[];
  }, [availableDrills, selectedDrillIds]);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = selectedDrillIds.indexOf(active.id as string);
      const newIndex = selectedDrillIds.indexOf(over.id as string);
      const newOrder = arrayMove(selectedDrillIds, oldIndex, newIndex);
      onChange(newOrder);
    }
  };

  const handleToggle = (drillId: string, checked: boolean) => {
    if (checked) {
      onChange([...selectedDrillIds, drillId]);
    } else {
      onChange(selectedDrillIds.filter((id) => id !== drillId));
    }
  };

  return (
    <div className="space-y-4">
      {/* Selection Box */}
      <div className="p-3 border rounded-md bg-muted/20 max-h-48 overflow-y-auto space-y-2">
        <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">
          Available Drills
        </p>
        {availableDrills.map((drill) => (
          <label
            key={drill.id}
            className="flex items-center gap-2 text-sm cursor-pointer"
          >
            <Checkbox
              checked={selectedDrillIds.includes(drill.id)}
              onCheckedChange={(checked) => handleToggle(drill.id, !!checked)}
            />
            <span>{drill.name}</span>
          </label>
        ))}
        {availableDrills.length === 0 && (
          <span className="text-sm text-red-500">
            No drills available. Please contact admin.
          </span>
        )}
      </div>

      {/* Drag and Drop Reordering Area */}
      {selectedDrillIds.length > 0 && (
        <div className="p-3 border rounded-md bg-muted/10">
          <p className="text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-wide">
            Session Sequence (Drag to Recorder)
          </p>
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={selectedDrillIds}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-1">
                {selectedDrills.map((drill) => (
                  <SortableItem
                    key={drill.id}
                    id={drill.id}
                    drill={drill}
                    onRemove={(id) => handleToggle(id, false)}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        </div>
      )}
    </div>
  );
}
