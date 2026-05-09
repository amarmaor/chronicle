'use client'

import { useState } from 'react'
import { deleteEntry } from './actions'

export default function DeleteEntryButton({ entryId }: { entryId: string }) {
  const [confirming, setConfirming] = useState(false)
  const [deleting, setDeleting] = useState(false)

  if (confirming) {
    return (
      <div className="flex items-center gap-3">
        <span className="text-sm text-gray-600">Delete this entry?</span>
        <button
          onClick={async () => {
            setDeleting(true)
            await deleteEntry(entryId)
          }}
          disabled={deleting}
          className="px-3 py-1.5 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
        >
          {deleting ? 'Deleting…' : 'Yes, delete'}
        </button>
        <button
          onClick={() => setConfirming(false)}
          className="px-3 py-1.5 border border-gray-300 text-sm font-medium text-gray-600 rounded-lg hover:bg-gray-50 transition-colors"
        >
          Cancel
        </button>
      </div>
    )
  }

  return (
    <button
      onClick={() => setConfirming(true)}
      className="px-3 py-1.5 border border-red-200 text-sm font-medium text-red-600 rounded-lg hover:bg-red-50 transition-colors"
    >
      Delete entry
    </button>
  )
}
