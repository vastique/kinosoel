import { useState } from 'react'
import { Box, Typography, IconButton, Menu, MenuItem, ListItemIcon, ListItemText } from '@mui/material'
import DeleteIcon from '@mui/icons-material/Delete'
import EditIcon from '@mui/icons-material/Edit'
import MenuIcon from '@mui/icons-material/Menu'
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

function FixedTab({ label, isActive, onClick }) {
  return (
    <Box
      sx={{
        display: 'flex', alignItems: 'center', gap: 0.5,
        px: 1.5, py: 1, cursor: 'pointer', whiteSpace: 'nowrap',
        borderBottom: isActive ? '2px solid' : '2px solid transparent',
        borderColor: isActive ? 'primary.main' : 'transparent',
        color: isActive ? 'primary.main' : 'text.secondary',
        '&:hover': { color: 'text.primary' },
      }}
      onClick={onClick}
    >
      <Typography sx={{ fontSize: 20, fontWeight: isActive ? 700 : 400 }}>{label}</Typography>
    </Box>
  )
}

function SortableTab({ id, label, isActive, onClick, onDelete, onEditRequest }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id })
  const [menuAnchor, setMenuAnchor] = useState(null)

  const openMenu = (e) => { e.stopPropagation(); setMenuAnchor(e.currentTarget) }
  const closeMenu = () => setMenuAnchor(null)

  return (
    <Box
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      sx={{
        display: 'flex', alignItems: 'center', gap: 0.5,
        px: 1.5, py: 1,
        borderBottom: isActive ? '2px solid' : '2px solid transparent',
        borderColor: isActive ? 'primary.main' : 'transparent',
        color: isActive ? 'primary.main' : 'text.secondary',
        opacity: isDragging ? 0.4 : 1,
        userSelect: 'none',
        cursor: 'grab',
        '&:hover': { color: 'text.primary', cursor: 'grab' },
        whiteSpace: 'nowrap',
      }}
      {...attributes}
      {...listeners}
      onClick={onClick}
    >
      <Typography sx={{ fontSize: 20, fontWeight: isActive ? 700 : 400 }}>{label}</Typography>
      {isActive && (
        <>
          <IconButton
            size="small"
            sx={{ color: '#666', p: 0.2, ml: 0.5, '&:hover': { color: 'text.primary' } }}
            onClick={openMenu}
            onPointerDown={(e) => e.stopPropagation()}
          >
            <MenuIcon sx={{ fontSize: 16 }} />
          </IconButton>
          <Menu
            anchorEl={menuAnchor}
            open={Boolean(menuAnchor)}
            onClose={closeMenu}
            onClick={(e) => e.stopPropagation()}
            slotProps={{ paper: { sx: { minWidth: 140 } } }}
          >
            <MenuItem onClick={() => { closeMenu(); onEditRequest() }}>
              <ListItemIcon><EditIcon fontSize="small" /></ListItemIcon>
              <ListItemText>Rename</ListItemText>
            </MenuItem>
            <MenuItem onClick={() => { closeMenu(); onDelete() }} sx={{ color: 'error.main' }}>
              <ListItemIcon><DeleteIcon fontSize="small" color="error" /></ListItemIcon>
              <ListItemText>Delete</ListItemText>
            </MenuItem>
          </Menu>
        </>
      )}
    </Box>
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
    const reordered = arrayMove(watchlists, oldIndex, newIndex)
    onReorder(reordered)
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
      <Box sx={{ display: 'flex', overflowX: 'auto', borderBottom: 1, borderColor: 'divider' }}>
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
      </Box>
      <DragOverlay>
        {draggingWatchlist && (
          <Box sx={{ px: 2, py: 1, bgcolor: '#2a2a2a', borderRadius: 1, boxShadow: 4 }}>
            <Typography sx={{ fontSize: 20 }}>{draggingWatchlist.name}</Typography>
          </Box>
        )}
      </DragOverlay>
    </DndContext>
  )
}
