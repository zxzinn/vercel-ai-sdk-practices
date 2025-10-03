# Supabase Setup Guide

## Quick Setup (4 steps)

1. **Enable Anonymous Sign-ins**
   - Go to **Authentication** → **Providers**
   - Enable **Anonymous sign-ins**

2. **Disable Captcha** (required for anonymous auth)
   - Go to **Authentication** → **Settings**
   - Scroll to **Bot and Abuse Protection**
   - Disable **Enable Captcha protection**

3. **Copy the SQL script**: Open `supabase/setup-storage-rls.sql`

4. **Run in SQL Editor**: Supabase Dashboard → SQL Editor → Paste → Run

Done! ✅

---

## What Gets Set Up

### Storage Bucket
- **Name**: `documents`
- **Access**: Private (RLS protected)
- **Size limit**: 10MB per file
- **File structure**: `{userId}/{documentId}/{filename}`

### RLS Policies

These policies ensure that:

- ✅ Users can only upload files to their own folder (`{userId}/...`)
- ✅ Users can only view their own files
- ✅ Users can only update/delete their own files
- ❌ Users cannot access other users' files

### File Path Structure

```
documents/
  {userId}/
    {documentId}/
      {filename}
```

Example:
```
documents/
  550e8400-e29b-41d4-a716-446655440000/
    abc123/
      document.pdf
```

## Anonymous Authentication

Anonymous users are automatically created on first visit and persisted across sessions via localStorage.

### User Lifecycle

- **Same user**: Closing browser, reopening tabs, device restarts
- **New user**: Clearing browser data, incognito mode, different devices

### Environment Variables

Required in `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
```

## Testing

1. **Start the app**:
   ```bash
   npm run dev
   ```

2. **Visit the app in browser**: `http://localhost:3000`
   - This automatically creates an anonymous user (check browser console for User ID)

3. **Test file upload**:
   - Use the app UI to upload files
   - Or use API with browser cookies:
   ```bash
   curl -X POST http://localhost:3000/api/rag/ingest \
     -F "files=@test.txt" \
     -H "Cookie: sb-xxx-auth-token=..."
   ```

4. **Verify RLS protection**:
   - Upload a file as User A
   - Clear browser data (becomes User B)
   - Try to access User A's file (should fail)

## Troubleshooting

### "Anonymous sign-ins are disabled"

**Error**: `anonymous_provider_disabled`

**Fix**: Enable anonymous sign-ins in Supabase Dashboard
1. Go to **Authentication** → **Providers**
2. Find **Anonymous** provider
3. Toggle **Enable**

### "captcha verification process failed"

**Error**: `captcha verification process failed`

**Fix**: Disable captcha for development
1. Go to **Authentication** → **Settings**
2. Scroll to **Bot and Abuse Protection**
3. Disable **Enable Captcha protection**

⚠️ **Production Note**: In production, consider re-enabling captcha and using rate limiting instead.

### Storage upload fails with "new row violates RLS policy"

- Ensure RLS policies are applied correctly
- Check that user is authenticated (not null)
- Verify file path matches `{userId}/...` pattern

### Anonymous user not persisting

- Check browser localStorage for `sb-*-auth-token` key
- Verify `NEXT_PUBLIC_SUPABASE_*` env vars are set
- Ensure cookies are enabled in browser
