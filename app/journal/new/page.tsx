'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function NewEntryPage() {
  const router = useRouter()
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const contentValue = content.trim()
    if (!contentValue) {
      setError('Content cannot be blank.')
      setLoading(false)
      return
    }

    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        setError('You must be signed in to create an entry.')
        setLoading(false)
        return
      }

      const { error: insertError } = await supabase
        .from('journal_entries')
        .insert({
          user_id: user.id,
          title: title.trim(),
          content: contentValue,
          is_digest: false,
        })

      if (insertError) {
        setError(insertError.message)
        setLoading(false)
        return
      }

      router.push('/journal')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.')
      setLoading(false)
    }
  }

  return (
    <div>
      <div className="mb-6">
        <Link
          href="/journal"
          className="text-sm text-indigo-600 hover:underline"
        >
          ← Back to journal
        </Link>
      </div>

      <h1 className="text-2xl font-semibold text-gray-900 mb-6">New Entry</h1>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label
            htmlFor="title"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Title
          </label>
          <input
            id="title"
            type="text"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            placeholder="Give your entry a title…"
          />
        </div>

        <div>
          <label
            htmlFor="content"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Content
          </label>
          <textarea
            id="content"
            required
            rows={8}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-y"
            placeholder="What's on your mind today?"
          />
        </div>

        <div>
          <label
            htmlFor="attachments"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Attachments{' '}
            <span className="font-normal text-gray-400">(optional)</span>
          </label>
          <input
            id="attachments"
            type="file"
            multiple
            disabled
            className="block w-full text-sm text-gray-400 file:mr-3 file:py-1.5 file:px-3 file:border file:border-gray-200 file:rounded-lg file:text-sm file:font-medium file:bg-gray-100 cursor-not-allowed opacity-60"
          />
          <p className="text-xs text-gray-400 mt-1">File uploads will be enabled in the next step.</p>
        </div>

        {error && (
          <p
            role="alert"
            className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2"
          >
            {error}
          </p>
        )}

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={loading}
            className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors"
          >
            {loading ? 'Saving…' : 'Save entry'}
          </button>
          <Link
            href="/journal"
            className="px-5 py-2 border border-gray-300 text-sm font-medium text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  )
}
