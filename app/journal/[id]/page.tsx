import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import DeleteEntryButton from './DeleteEntryButton'

interface Attachment {
  id: string
  filename: string
  content_type: string
  s3_key: string
}

const s3 = new S3Client({
  region: process.env.AWS_REGION!,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
})

export default async function EntryDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const { data: entry, error } = await supabase
    .from('journal_entries')
    .select('id, title, content, is_digest, created_at')
    .eq('id', id)
    .single()

  if (error || !entry) {
    notFound()
  }

  const { data: attachments } = await supabase
    .from('attachments')
    .select('id, filename, content_type, s3_key')
    .eq('entry_id', id)
    .order('created_at', { ascending: true })

  const rawAttachments: Attachment[] = attachments ?? []

  // Generate presigned GET URLs for each attachment (server component — AWS SDK is fine here)
  const entryAttachments = await Promise.all(
    rawAttachments.map(async (attachment) => {
      const command = new GetObjectCommand({
        Bucket: process.env.S3_BUCKET_NAME!,
        Key: attachment.s3_key,
      })
      const downloadUrl = await getSignedUrl(s3, command, { expiresIn: 3600 })
      return { ...attachment, downloadUrl }
    })
  )

  const formattedDate = new Date(entry.created_at).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <Link
          href="/journal"
          className="text-sm text-indigo-600 hover:underline"
        >
          ← Back to journal
        </Link>
        <DeleteEntryButton entryId={id} />
      </div>

      <article className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
        <div className="mb-4">
          {entry.is_digest && (
            <span className="inline-block mb-3 px-2 py-0.5 bg-indigo-600 text-white text-xs font-semibold rounded-full">
              Weekly Digest
            </span>
          )}
          <h1 className="text-2xl font-semibold text-gray-900">{entry.title}</h1>
          <p className="text-sm text-gray-400 mt-1">{formattedDate}</p>
        </div>

        <div className="prose prose-sm max-w-none text-gray-700 whitespace-pre-wrap leading-relaxed">
          {entry.content}
        </div>

        {entryAttachments.length > 0 && (
          <div className="mt-8 pt-6 border-t border-gray-100">
            <h2 className="text-sm font-semibold text-gray-700 mb-3">
              Attachments ({entryAttachments.length})
            </h2>
            <ul className="space-y-2">
              {entryAttachments.map((attachment) => (
                <li
                  key={attachment.id}
                  className="flex items-center gap-3 text-sm text-gray-600 bg-gray-50 rounded-lg px-3 py-2"
                >
                  <a
                    href={attachment.downloadUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium truncate text-indigo-600 hover:underline"
                  >
                    {attachment.filename}
                  </a>
                  <span className="shrink-0 text-xs text-gray-400">
                    {attachment.content_type}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </article>
    </div>
  )
}
