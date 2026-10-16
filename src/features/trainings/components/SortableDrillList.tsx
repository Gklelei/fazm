"use client";

import { DndContext, closestCenter, KeyboardSensor, PointerSensor, TouchSensor, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Plus, X } from "lucide-react";
import { cn } from "@/lib/utils";

type Drill = { id: string; name: string };

function Row({ drill, index, onRemove }: { drill: Drill; index: number; onRemove: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: drill.id });
  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn("flex items-center gap-2 rounded-md border bg-background py-1 pr-1 pl-2", isDragging && "z-10 shadow-lg ring-2 ring-primary")}
    >
      <button
        type="button"
        {...attributes}
        {...listeners}
        aria-label={`Move ${drill.name}`}
        className="grid size-9 cursor-grab touch-none place-items-center text-muted-foreground hover:text-foreground"
      >
        <GripVertical className="size-4" />
      </button>
      <span className="tabular w-5 text-sm text-muted-foreground">{index + 1}</span>
      <span className="flex-1 text-sm">{drill.name}</span>
      <button type="button" onClick={onRemove} aria-label={`Remove ${drill.name}`} className="grid size-9 place-items-center text-muted-foreground hover:text-destructive">
        <X className="size-4" />
      </button>
    </li>
  );
}

/** Pick drills by tapping them, then drag the chosen ones into running order. */
export function SortableDrillList({
  availableDrills,
  selectedDrillIds,
  onChange,
}: {
  availableDrills: Drill[];
  selectedDrillIds: string[];
  onChange: (ids: string[]) => void;
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const chosen = selectedDrillIds.map((id) => availableDrills.find((d) => d.id === id)).filter((d): d is Drill => !!d);
  const left = availableDrills.filter((d) => !selectedDrillIds.includes(d.id));

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (over && active.id !== over.id) {
      onChange(arrayMove(selectedDrillIds, selectedDrillIds.indexOf(String(active.id)), selectedDrillIds.indexOf(String(over.id))));
    }
  };

  if (!availableDrills.length) return <p className="text-sm text-muted-foreground">No drills yet.</p>;

  return (
    <div className="space-y-3">
      {chosen.length > 0 && (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <SortableContext items={selectedDrillIds} strategy={verticalListSortingStrategy}>
            <ol className="space-y-1.5">
              {chosen.map((d, i) => (
                <Row key={d.id} drill={d} index={i} onRemove={() => onChange(selectedDrillIds.filter((id) => id !== d.id))} />
              ))}
            </ol>
          </SortableContext>
        </DndContext>
      )}
      {left.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {left.map((d) => (
            <button
              key={d.id}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => onChange([...selectedDrillIds, d.id])}
              className="inline-flex h-9 items-center gap-1 rounded-full border border-dashed px-3 text-sm hover:border-primary hover:bg-muted"
            >
              <Plus className="size-3.5" /> {d.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
