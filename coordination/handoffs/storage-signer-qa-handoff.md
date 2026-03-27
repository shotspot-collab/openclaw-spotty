# QA Handoff: Storage Signer/Service Abstraction

**Date:** 2026-03-25
**Workstream:** Signed upload/download lifecycle (Workstream 3)
**Slice:** C - Storage signer/service abstraction

## Summary

Implemented the core storage signer abstraction layer for ShotSpot's signed upload/download lifecycle. This provides a clean separation between the application code and AWS S3, enabling both cloud (S3) and local development workflows.

## Changes Made

### New Files
- `apps/api/src/services/media.test.ts` - 14 unit tests for the storage abstraction

### Existing Files Modified
- None (the abstraction already existed in `media.ts`, tests were added)

## Architecture

### Interfaces Defined

1. **`StorageUploadSigner`** - Issues signed URLs for photo uploads
   - Method: `issueUploadUrls(inputs: UploadUrlInput[]): Promise<UploadUrlResult[]>`
   - Supports batch upload URL generation
   - Content-type constraints enforced at S3 level

2. **`MediaDeliveryService`** - Issues signed URLs for photo delivery
   - Method: `issuePreviewUrl(input: DeliveryUrlInput): Promise<string>`
   - Method: `issueDownloadUrl(input: DeliveryUrlInput): Promise<string>`
   - Preview URLs for gallery viewing
   - Download URLs with attachment disposition

### Implementations

1. **`S3StorageUploadSigner`** / **`S3MediaDeliveryService`**
   - Production implementation using AWS SDK
   - Presigned URLs with 1-hour expiration
   - Configured via environment variables:
     - `AWS_REGION`
     - `AWS_ACCESS_KEY_ID`
     - `AWS_SECRET_ACCESS_KEY`
     - `S3_MEDIA_BUCKET_NAME`

2. **`LocalStubStorageUploadSigner`** / **`LocalStubMediaDeliveryService`**
   - Development implementation (no AWS required)
   - Returns mock URLs for local testing
   - Automatically used when AWS env vars are not set

## Test Coverage

14 unit tests covering:
- Local stub implementations (upload URL generation, preview, download)
- Empty array handling
- URL encoding of special characters in keys
- Interface contract verification
- S3 constructor configuration
- Content type acceptance
- Interface segregation (clean separation between upload and delivery)

## Integration Points

The abstraction is already integrated into:
- `apps/api/src/app.ts` - Conditional instantiation based on env vars
- `apps/api/src/routes/photographers.ts` - Upload URL endpoint (`POST /api/photographers/me/uploads/urls`)
- `apps/api/src/routes/types.ts` - Dependency injection types

## QA Notes

### What to Test
1. **Upload URL endpoint** - Verify photographers can get signed upload URLs
2. **Environment fallback** - With no AWS env vars, local stubs should work
3. **Key handling** - Special characters in filenames should be URL-encoded

### Known Limitations
- S3 implementations are not directly tested (would require AWS credentials/mocking)
- Actual S3 upload/download flows are not yet integrated end-to-end
- Photo registration still uses inline data URLs (next slice will address this)

### Regression Risks
- Low - this is additive functionality with local stub fallbacks
- Existing photo flows continue to work via local stubs

## Local S3 Testing

To test with real S3 storage locally (instead of local stubs), configure these environment variables in `apps/api/.env`:

```bash
# Required AWS credentials for S3 mode
AWS_REGION=us-east-2                    # Your AWS region
AWS_ACCESS_KEY_ID=AKIA...               # Your AWS access key
AWS_SECRET_ACCESS_KEY=...               # Your AWS secret key
S3_MEDIA_BUCKET_NAME=your-bucket-name   # Your S3 bucket for media storage
```

**How it works:**
- When ALL four S3 environment variables are set, `app.ts` automatically instantiates `S3StorageUploadSigner` and `S3MediaDeliveryService`
- If any are missing, it falls back to `LocalStubStorageUploadSigner` and `LocalStubMediaDeliveryService`

**Verification:**
1. Set all four S3 env vars
2. Start the API server
3. Call `POST /api/photographers/me/uploads/urls` - should return real S3 presigned URLs (starting with `https://{bucket}.s3.{region}.amazonaws.com/...`)
4. Without S3 env vars, you'll get mock URLs (`http://localhost:3000/mock-upload?key=...`)

**Note:** The S3 bucket should already exist and the AWS credentials need `s3:PutObject` and `s3:GetObject` permissions.

## Next Steps

1. **Slice D:** Reconcile registration contract around storage keys vs delivery URLs
2. **Slice E:** Server-controlled signed download issuance constraints
3. **Slice F:** UI validation after contract changes

## Related Files

- `apps/api/src/services/media.ts` - Main implementation
- `apps/api/src/services/media.test.ts` - Unit tests
- `apps/api/src/app.ts` - Dependency wiring
- `apps/api/src/routes/photographers.ts` - Upload URL endpoint
