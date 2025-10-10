# Supabase Storage Setup for Image Generation

This guide walks through setting up Supabase Storage for the AI-generated image feature.

## 1. Create Storage Bucket

Follow these steps in Supabase Dashboard:

### Step 1: Create Bucket
1. Go to Supabase Dashboard
2. Select your project
3. Navigate to Storage (left sidebar)
4. Click "New bucket"
5. Configure:
   - **Name**: `generated-images`
   - **Public bucket**: ✅ **Check this** (or use Signed URLs if you prefer private bucket)
   - **File size limit**: 10 MB (optional)
   - **Allowed MIME types**: `image/png`, `image/webp`, `image/jpeg` (optional)

### Step 2: Set up RLS (Row Level Security) Policies

Run this SQL in the SQL Editor:

```sql
-- Allow anon key to upload images to generated-images bucket
CREATE POLICY "Allow anon uploads to generated-images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'generated-images');

-- Allow anon key to read images (for Signed URLs or public access)
CREATE POLICY "Allow anon to read generated images"
ON storage.objects FOR SELECT
USING (bucket_id = 'generated-images');

-- Optional: Allow deletion (if cleanup functionality is needed)
CREATE POLICY "Allow users to delete their images"
ON storage.objects FOR DELETE
USING (bucket_id = 'generated-images');
```

### Step 3: Verify Setup

Check in Supabase Dashboard → Storage → Policies:
- ✅ Allow anon uploads to generated-images (INSERT)
- ✅ Allow anon to read generated images (SELECT)

## 2. Test Upload

Manually test in Supabase Dashboard:
1. Storage → generated-images → Upload file
2. After upload, click the image → Get URL
3. Open the URL in a browser to verify access

## 3. Environment Variables

Add to `.env.local` (use NEXT_PUBLIC_ prefix):

```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
```

**Important Notes:**
- Use `NEXT_PUBLIC_` prefix to make these variables accessible on server-side
- These variables are defined in `src/lib/env.ts`
- Anon key is a safe public key that can be exposed on client-side
- These are already set if you're using Supabase for PostgreSQL

## 4. Bucket Configuration (Optional)

### Auto-cleanup Old Images (Optional)

Set up lifecycle policy to auto-delete images older than 30 days:

```sql
-- Note: Must be configured via Supabase Storage API, not SQL
-- Available in Supabase Dashboard → Storage → Settings
```

### CDN Acceleration (Optional)

Supabase automatically provides CDN. Public URL format:
```
https://<project-ref>.supabase.co/storage/v1/object/public/generated-images/<filename>
```

### Signed URLs vs Public URLs

The implementation supports both approaches:

**Public URLs (default in code):**
- ✅ Permanent access
- ✅ Shorter URLs
- ✅ Better CDN caching
- ⚠️ Anyone with the URL can access
- ⚠️ Requires public bucket

**Signed URLs (alternative):**
- ✅ More secure with signature verification
- ✅ Time-limited (expires after set duration)
- ✅ Works with private buckets
- ⚠️ Longer URLs (includes token)
- ⚠️ URLs expire (not ideal for conversation history)

To switch to Signed URLs, modify `src/lib/tools/image/generate-image.ts`:

```typescript
// Replace getPublicUrl() with:
const { data: signedUrlData } = await supabase.storage
  .from(BUCKET_NAME)
  .createSignedUrl(filename, 3600); // 3600 seconds = 1 hour

return {
  url: signedUrlData.signedUrl,
  // ...
};
```

## Troubleshooting

### Issue: Upload fails with "Access denied"
**Solution**: Verify RLS policies are correctly configured

### Issue: Image URL inaccessible
**Solution**:
1. Confirm bucket is set to public (or RLS policy allows SELECT)
2. Check if Signed URL has expired (if using signed URLs)
3. Verify environment variables are correctly set

### Issue: Exceeded storage quota
**Solution**:
1. Delete old images
2. Upgrade Supabase plan
3. Use external CDN (Cloudflare R2, AWS S3)

## Architecture

```
User Request → AI Chat API → OpenAI DALL-E 3
                ↓
         Generate Image (base64)
                ↓
         Upload to Supabase Storage
                ↓
         Return Public/Signed URL
                ↓
         Display in Chat UI
```

The image generation tool is integrated at:
- Tool: `src/lib/tools/image/generate-image.ts`
- API: `src/app/api/chat/route.ts` (line 173)
- UI: `src/app/chat/[[...conversationId]]/page.tsx` (lines 570-620)
