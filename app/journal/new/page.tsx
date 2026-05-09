'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function NewEntryPage() {
  const router = useRouter()
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [files, setFiles] = useState<File[]>([])
  const [loading, setLoading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files ? Array.from(e.target.files) : []
    setFiles(selected)
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setUploadProgress(null)
    setLoading(true)

    const contentValue = content.trim()
    if (!contentValue) {
      setError('Content cannot be blank.')
      setLoading(false)
      return
    }

    try {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        setError('You must be signed in to create an entry.')
        setLoading(false)
        return
      }

      // Step 1: Insert the journal entry and get the new entry id
      const { data: entry, error: insertError } = await supabase
        .from('journal_entries')
        .insert({
          user_id: user.id,
          title: title.trim(),
          content: contentValue,
          is_digest: false,
        })
        .select('id')
        .single()

      if (insertError || !entry) {
        setError(insertError?.message ?? 'Failed to save entry.')
        setLoading(false)
        return
      }

      // Step 2: Upload each selected file
      if (files.length > 0) {
        for (let i = 0; i < files.length; i++) {
          const file = files[i]
          setUploadProgress(`Uploading ${i + 1} of ${files.length} files…`)

          // Get presigned PUT URL from our API
          const uploadRes = await fetch('/api/upload', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              filename: file.name,
              contentType: file.type,
              entryId: entry.id,
            }),
          })

          if (!uploadRes.ok) {
            const errData = await uploadRes.json().catch(() => ({}))
            setError(
              `Upload failed for "${file.name}": ${errData.error ?? uploadRes.statusText}. Your entry was saved.`
            )
            setLoading(false)
            setUploadProgress(null)
            router.push('/journal')
            return
          }

          const { presignedUrl, s3Key } = await uploadRes.json()

          // PUT the file directly to S3
          const s3Res = await fetch(presignedUrl, {
            method: 'PUT',
            headers: { 'Content-Type': file.type },
            body: file,
          })

          if (!s3Res.ok) {
            setError(
              `S3 upload failed for "${file.name}". Your entry was saved.`
            )
            setLoading(false)
            setUploadProgress(null)
            router.push('/journal')
            return
          }

          // Insert attachment record in Supabase
          const { error: attachmentError } = await supabase
            .from('attachments')
            .insert({
              entry_id: entry.id,
              s3_key: s3Key,
              filename: file.name,
              content_type: file.type,
            })

          if (attachmentError) {
            // Non-fatal: the file is in S3 but metadata wasn't saved
            console.error('Failed to save attachment metadata:', attachmentError.message)
          }
        }
      }

      setUploadProgress(null)
      router.push('/journal')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.')
      setLoading(false)
      setUploadProgress(null)
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
            ref={fileInputRef}
            id="attachments"
            type="file"
            multiple
            onChange={handleFileChange}
            className="block w-full text-sm text-gray-500 file:mr-3 file:py-1.5 file:px-3 file:border file:border-gray-200 file:rounded-lg file:text-sm file:font-medium file:bg-gray-100 file:cursor-pointer cursor-pointer"
          />
          {files.length > 0 && (
            <ul className="mt-2 space-y-1">
              {files.map((file, idx) => (
                <li key={idx} className="text-xs text-gray-500">
                  {file.name}
                </li>
              ))}
            </ul>
          )}
        </div>

        {uploadProgress && (
          <p className="text-sm text-indigo-600 bg-indigo-50 rounded-lg px-3 py-2">
            {uploadProgress}
          </p>
        )}

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
            {loading ? (uploadProgress ?? 'Saving…') : 'Save entry'}
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
