import { useState } from 'react'
import { Trash2, Pencil, Menu } from 'lucide-react'
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
} from '@dnd-kit/core'
import {
  SortableContext,
  horizontalListSortingStrategy,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './ui/dropdown-menu'

function FixedTab({ label, isActive, onClick }) {
  return (
    <button
      className={`flex items-center gap-1 px-3 py-2 cursor-pointer whitespace-nowrap border-b-2 transition-colors ${
        isActive
          ? 'border-primary text-primary'
          : 'border-transparent text-muted-foreground hover:text-foreground'
      }`}
      onClick={onClick}
    >
      <span className={`text-xl ${isActive ? 'font-bold' : 'font-normal'}`}>{label}</span>
    </button>
  )
}

function SortableTab({ id, label, isActive, onClick, onDelete, onEditRequest }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id })
  const [open, setOpen] = useState(false)

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`flex items-center gap-1 px-3 py-2 border-b-2 whitespace-nowrap select-none cursor-grab transition-colors ${
        isActive
          ? 'border-primary text-primary'
          : 'border-transparent text-muted-foreground hover:text-foreground'
      } ${isDragging ? 'opacity-40' : ''}`}
      {...attributes}
      {...listeners}
      onClick={onClick}
    >
      <span className={`text-xl ${isActive ? 'font-bold' : 'font-normal'}`}>{label}</span>

      {isActive && (
        <DropdownMenu open={open} onOpenChange={setOpen}>
          <DropdownMenuTrigger asChild>
            <button
              className="text-muted-foreground hover:text-foreground ml-1 p-0.5 rounded"
              onClick={(e) => e.stopPropagation()}
              onPointerDown={(e) => e.stopPropagation()}
            >
              <Menu className="h-4 w-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="min-w-[140px]"
            onClick={(e) => e.stopPropagation()}
          >
            <DropdownMenuItem
              className="gap-2"
              onClick={() => { setOpen(false); onEditRequest() }}
            >
              <Pencil className="h-4 w-4" />
              Rename
            </DropdownMenuItem>
            <DropdownMenuItem
              className="gap-2 text-destructive focus:text-destructive"
              onClick={() => { setOpen(false); onDelete() }}
            >
              <Trash2 className="h-4 w-4" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  )
}

export default function SortableWatchlistTabs({ watchlists, activeIndex, onTabChange, onDelete, onReorder, onEditRequest }) {
  const [draggingId, setDraggingId] = useState(null)
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

  const handleDragEnd = ({ active, over }) => {
    setDraggingId(null)
    if (!over || active.id === over.id) return
    const oldIndex = watchlists.findIndex((w) => w.id === active.id)
    const newIndex = watchlists.findIndex((w) => w.id === over.id)
    onReorder(arrayMove(watchlists, oldIndex, newIndex))
  }

  const fixedWatchlists = watchlists.filter((w) => w.is_default)
  const customWatchlists = watchlists.filter((w) => !w.is_default)
  const draggingWatchlist = draggingId ? watchlists.find((w) => w.id === draggingId) : null

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={({ active }) => setDraggingId(active.id)}
      onDragEnd={handleDragEnd}
    >
      <div className="flex overflow-x-auto border-b border-border">
        {fixedWatchlists.map((wl) => {
          const index = watchlists.findIndex((w) => w.id === wl.id)
          return (
            <FixedTab
              key={wl.id}
              label={wl.name}
              isActive={index === activeIndex}
              onClick={() => onTabChange(index)}
            />
          )
        })}
        <SortableContext items={customWatchlists.map((w) => w.id)} strategy={horizontalListSortingStrategy}>
          {customWatchlists.map((wl) => {
            const index = watchlists.findIndex((w) => w.id === wl.id)
            return (
              <SortableTab
                key={wl.id}
                id={wl.id}
                label={wl.name}
                isActive={index === activeIndex}
                onClick={() => onTabChange(index)}
                onDelete={() => onDelete(wl)}
                onEditRequest={() => onEditRequest(wl)}
              />
            )
          })}
        </SortableContext>
      </div>
      <DragOverlay>
        {draggingWatchlist && (
          <div className="px-4 py-2 bg-secondary rounded shadow-lg">
            <span className="text-xl">{draggingWatchlist.name}</span>
          </div>
        )}
      </DragOverlay>
    </DndContext>
  )
}
