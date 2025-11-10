# R2 Media CDN

Cloudflare Worker for secure, time-limited access to media files stored in Cloudflare R2.

## Purpose

The R2 Media CDN worker provides:

- Secure, signed URLs for media file access
- Time-limited access tokens (expiration-based)
- Support for Range requests (video/audio streaming)
- CORS headers for cross-origin access
- Environment-based bucket selection (dev/prod)

## Stack

- **Runtime**: Cloudflare Workers
- **Language**: TypeScript
- **Storage**: Cloudflare R2 (object storage)
- **Deployment**: Cloudflare Workers (via Wrangler)

## Architecture

### Request Flow

1. Client requests signed URL from backend
2. Backend generates HMAC token with expiration
3. Client requests file from CDN worker with token
4. Worker validates token and expiration
5. Worker serves file from R2 bucket

### Security

- **HMAC-SHA256**: Token signing using shared secret
- **Expiration**: Time-limited access (exp parameter)
- **Token Validation**: Verifies token matches expected signature
- **Environment Isolation**: Separate buckets for dev/prod

### URL Format

```
https://cdn.example.com/{objectKey}?exp={timestamp}&token={hmac}&env={dev|prod}
```

## Codebase Organization

```
src/
└── index.ts          # Worker entry point
wrangler.toml         # Cloudflare Workers configuration
```

### Worker Handler

- `handleRequest()` - Main request handler
- `hmacSha256Hex()` - HMAC signature generation
- `toHex()` - Buffer to hex string conversion

## Features

- **Signed URLs**: HMAC-based token authentication
- **Range Requests**: Support for HTTP Range headers (video/audio streaming)
- **HEAD Requests**: Support for HEAD requests (metadata only)
- **CORS**: Pre-configured CORS headers
- **Environment Selection**: Choose dev or prod bucket via query param
- **Error Handling**: Proper error responses for invalid requests

## Deployment

```bash
# Install dependencies
npm install

# Deploy to Cloudflare
npm run deploy

# Local development
npm run dev
```

## Environment Variables

Configured in Cloudflare Workers dashboard:

- `CDN_SIGNING_SECRET` - Shared secret for HMAC signing
- `R2_MEDIA_DEV` - R2 bucket binding (dev)
- `R2_MEDIA_PROD` - R2 bucket binding (prod)

## Usage

### Generating Signed URLs (Backend)

```typescript
const exp = Math.floor(Date.now() / 1000) + 3600; // 1 hour
const payload = `${objectKey}|${exp}`;
const token = await hmacSha256Hex(secret, payload);
const url = `https://cdn.example.com/${objectKey}?exp=${exp}&token=${token}&env=prod`;
```

### Accessing Files (Client)

```typescript
// Simple GET request
const response = await fetch(signedUrl);

// Range request for streaming
const response = await fetch(signedUrl, {
  headers: {
    Range: 'bytes=0-1023',
  },
});
```

## Security Considerations

- Tokens expire automatically (check `exp` parameter)
- Tokens are single-use (no replay protection, but expiration limits risk)
- Secret must be kept secure (only backend should generate tokens)
- Environment parameter allows bucket isolation
