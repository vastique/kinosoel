import { useState } from 'react'
import { BookmarkPlus, Bookmark, BookmarkCheck, Check, Plus } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu'
import { Input } from './ui/input'
import { Spinner } from './ui/spinner'

export default function WatchlistMenu({
  watchlists,
  movieWatchlistIds,
  inAnyList,
  onAdd,
  onRemove,
  onCreateAndAdd,
}) {
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')
  const [saving, setSaving] = useState(false)
  const [open, setOpen] = useState(false)

  const handleCreate = async () => {
    if (!newName.trim()) return
    setSaving(true)
    await onCreateAndAdd(newName.trim())
    setSaving(false)
    setNewName('')
    setCreating(false)
    setOpen(false)
  }

  const handleOpenChange = (v) => {
    setOpen(v)
    if (!v) { setCreating(false); setNewName('') }
  }

  return (
    <DropdownMenu open={open} onOpenChange={handleOpenChange}>
      <DropdownMenuTrigger asChild>
        <button
          onClick={(e) => e.stopPropagation()}
          className={`p-1.5 rounded transition-colors ${
            inAnyList
              ? 'bg-[#E50914] text-white hover:bg-[#c0070f]'
              : 'text-white hover:text-white/80'
          }`}
        >
          {inAnyList
            ? <BookmarkCheck className="h-4 w-4" />
            : <BookmarkPlus className="h-4 w-4" />}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        className="min-w-[200px] bg-[#1a1a1a]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-2 py-1 text-xs text-muted-foreground">Save to watchlist</div>
        <DropdownMenuSeparator />

        {watchlists.map((wl) => {
          const inList = movieWatchlistIds?.has(wl.id)
          return (
            <DropdownMenuItem
              key={wl.id}
              onClick={() => { inList ? onRemove(wl.id) : onAdd(wl.id); setOpen(false) }}
              className="flex items-center gap-2"
            >
              {inList
                ? <Bookmark className="h-4 w-4 text-primary shrink-0" />
                : <Bookmark className="h-4 w-4 text-muted-foreground shrink-0" />}
              <span className="flex-1">{wl.name}</span>
              {inList && <Check className="h-4 w-4 text-primary" />}
            </DropdownMenuItem>
          )
        })}

        <DropdownMenuSeparator />

        {creating ? (
          <div
            className="px-2 py-2 flex gap-2 items-center"
            onClick={(e) => e.stopPropagation()}
          >
            <Input
              size="sm"
              placeholder="List name"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => { e.stopPropagation(); if (e.key === 'Enter') handleCreate() }}
              autoFocus
              className="h-7 text-sm flex-1"
            />
            <button
              onClick={handleCreate}
              disabled={saving}
              className="text-primary hover:text-primary/80 disabled:opacity-50 shrink-0"
            >
              {saving ? <Spinner size="sm" /> : <Check className="h-4 w-4" />}
            </button>
          </div>
        ) : (
          <DropdownMenuItem onClick={(e) => { e.preventDefault(); setCreating(true) }} className="gap-2">
            <Plus className="h-4 w-4" />
            New list…
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
