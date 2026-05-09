import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { createClient } from '@/lib/supabase/server'

const s3 = new S3Client({
  region: process.env.AWS_REGION!,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
})

export async function POST(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: { filename?: string; contentType?: string; entryId?: string; fileSize?: number }
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { filename, contentType, entryId, fileSize } = body

  if (!filename || !contentType || !entryId) {
    return Response.json(
      { error: 'filename, contentType, and entryId are required' },
      { status: 400 }
    )
  }

  const ALLOWED_TYPES = new Set([
    'image/jpeg', 'image/png', 'image/gif', 'image/webp',
    'application/pdf',
    'text/plain',
  ])
  if (!ALLOWED_TYPES.has(contentType)) {
    return Response.json({ error: 'File type not allowed' }, { status: 400 })
  }

  const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10 MB
  if (!fileSize || fileSize > MAX_FILE_SIZE) {
    return Response.json({ error: 'File too large (max 10 MB)' }, { status: 400 })
  }

  const { error: entryError } = await supabase
    .from('journal_entries')
    .select('id')
    .eq('id', entryId)
    .eq('user_id', user.id)
    .single()

  if (entryError) {
    return Response.json({ error: 'Entry not found' }, { status: 404 })
  }

  const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, '_')
  const s3Key = `${user.id}/${entryId}/${Date.now()}-${safeName}`

  const command = new PutObjectCommand({
    Bucket: process.env.S3_BUCKET_NAME!,
    Key: s3Key,
    ContentType: contentType,
  })

  const presignedUrl = await getSignedUrl(s3, command, { expiresIn: 60 })

  return Response.json({ presignedUrl, s3Key })
}
