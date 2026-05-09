import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'

interface JournalEntry {
  id: string
  title: string
  content: string
  is_digest: boolean
  created_at: string
}

interface AttachmentRow { entry_id: string }

export default async function JournalPage() {
  const supabase = await createClient()

  const { data: entries, error } = await supabase
    .from('journal_entries')
    .select('id, title, content, is_digest, created_at')
    .order('created_at', { ascending: false })

  if (error) {
    return (
      <main className="p-6">
        <p role="alert" className="text-sm text-red-600">
          Could not load entries. Please try again.
        </p>
      </main>
    )
  }

  const journalEntries: JournalEntry[] = entries ?? []

  // Fetch attachment counts for all entries
  let attachmentCounts: Record<string, number> = {}
  if (journalEntries.length > 0) {
    const entryIds = journalEntries.map((e) => e.id)
    const { data: attachments } = await supabase
      .from('attachments')
      .select('entry_id')
      .in('entry_id', entryIds)

    if (attachments) {
      attachmentCounts = (attachments as AttachmentRow[] ?? []).reduce<Record<string, number>>(
        (acc, row) => {
          acc[row.entry_id] = (acc[row.entry_id] ?? 0) + 1
          return acc
        },
        {}
      )
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">My Journal</h1>
        <Link
          href="/journal/new"
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors"
        >
          + New Entry
        </Link>
      </div>

      {journalEntries.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <p className="text-lg font-medium mb-1">No entries yet.</p>
          <p className="text-sm">
            Write your first one!{' '}
            <Link href="/journal/new" className="text-indigo-500 hover:underline">
              Start writing
            </Link>
          </p>
        </div>
      ) : (
        <ul className="space-y-4">
          {journalEntries.map((entry) => {
            const formattedDate = new Date(entry.created_at).toLocaleDateString(
              'en-US',
              { year: 'numeric', month: 'long', day: 'numeric' }
            )
            const attachCount = attachmentCounts[entry.id] ?? 0

            if (entry.is_digest) {
              return (
                <li key={entry.id}>
                  <Link href={`/journal/${entry.id}`} className="block">
                    <div className="bg-indigo-50 border-2 border-indigo-200 rounded-xl p-5 hover:border-indigo-400 transition-colors">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="inline-block px-2 py-0.5 bg-indigo-600 text-white text-xs font-semibold rounded-full">
                          Weekly Digest
                        </span>
                      </div>
                      <h2 className="text-lg font-semibold text-indigo-900">
                        {entry.title}
                      </h2>
                      <p className="text-sm text-indigo-600 mt-1">{formattedDate}</p>
                    </div>
                  </Link>
                </li>
              )
            }

            return (
              <li key={entry.id}>
                <Link href={`/journal/${entry.id}`} className="block">
                  <div className="bg-white border border-gray-200 rounded-xl p-5 hover:border-indigo-300 hover:shadow-sm transition-all">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <h2 className="text-base font-semibold text-gray-900 truncate">
                          {entry.title}
                        </h2>
                        <p className="text-sm text-gray-400 mt-0.5">{formattedDate}</p>
                        {entry.content && (
                          <p className="text-sm text-gray-600 mt-2 line-clamp-2">
                            {entry.content}
                          </p>
                        )}
                      </div>
                      {attachCount > 0 && (
                        <span className="shrink-0 text-xs text-gray-400 bg-gray-100 rounded-full px-2 py-0.5">
                          {attachCount} {attachCount === 1 ? 'file' : 'files'}
                        </span>
                      )}
                    </div>
                  </div>
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
