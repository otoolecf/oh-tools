# OTP Connection Mode Setup

This guide explains how to set up the OTP (One-Time Passcode) connection mode for the Clipboard Transfer tool using Cloudflare Workers.

## What is OTP Mode?

OTP mode provides an easier way to connect devices using human-memorable codes instead of QR codes or long URLs. The process works like this:

1. **Device A** creates a session and gets a code like `happy-tiger-runs`
2. **Device B** enters that code to join
3. **Device B** gets a second code like `clever-bird-soars` 
4. **Device A** enters the second code to complete the connection
5. Devices are now connected peer-to-peer for secure file/clipboard sharing

## Benefits

- **Easier**: No QR scanning or URL copying needed
- **Memorable**: Uses human-readable phrases like "happy-tiger-runs"
- **Secure**: Data is encrypted before being stored temporarily
- **Private**: Server never sees your actual data, just encrypted blobs
- **Cost-effective**: Very cheap on Cloudflare's free tier

## Setup Instructions

### 1. Deploy the Cloudflare Worker

1. Install Wrangler CLI:
   ```bash
   npm install -g wrangler
   ```

2. Login to Cloudflare:
   ```bash
   wrangler login
   ```

3. Create KV namespaces:
   ```bash
   # For temporary storage
   wrangler kv:namespace create "TEMP_STORAGE_KV"
   wrangler kv:namespace create "TEMP_STORAGE_KV" --preview
   
   # For rate limiting
   wrangler kv:namespace create "RATE_LIMIT_KV"  
   wrangler kv:namespace create "RATE_LIMIT_KV" --preview
   ```

4. Update `wrangler.toml` with your namespace IDs:
   ```toml
   [[kv_namespaces]]
   binding = "TEMP_STORAGE_KV"
   id = "your-actual-namespace-id"
   preview_id = "your-actual-preview-id"
   
   [[kv_namespaces]]
   binding = "RATE_LIMIT_KV"
   id = "your-actual-rate-limit-id"
   preview_id = "your-actual-rate-limit-preview-id"
   ```

5. Deploy the worker:
   ```bash
   wrangler deploy
   ```

6. Note your worker URL (e.g., `https://otoolebox-signaling.your-subdomain.workers.dev`)

### 2. Update the Frontend

1. Edit `script.js` and update the `otpServerUrl`:
   ```javascript
   this.otpServerUrl = 'https://your-actual-worker-url.workers.dev';
   ```

2. That's it! The OTP mode should now work.

## How It Works Technically

### Security Model

1. **Encryption**: WebRTC offer/answer data is encrypted with the passcode before being stored
2. **One-time use**: Data is deleted immediately after retrieval
3. **Expiration**: All data expires after 15 minutes automatically
4. **Rate limiting**: Prevents brute force attacks (10 requests/minute, 50/hour per IP)
5. **No logging**: Server doesn't log connection data or track users

### API Endpoints

- `POST /temp/{passcode}` - Store encrypted data
- `GET /temp/{passcode}` - Retrieve and delete data

### Data Flow

```
Device A                    Server                     Device B
--------                    ------                     --------
1. Generate offer      →    
2. Encrypt with code   →    Store encrypted offer  →    
3. Show code to user   →                            →   Enter code
                       ←    Retrieve offer         ←    
                       ←    Generate answer        ←    
                       ←    Encrypt with new code  ←    Store encrypted answer
Enter final code       →    Retrieve answer        ←    Show final code
Complete connection    ←                           ←    
```

## Cost Estimates

**Cloudflare Workers pricing:**
- Free tier: 100,000 requests/day
- Paid: $5/month for 10M requests

**Usage estimates:**
- Light use (100 connections/day): **FREE**
- Moderate (1,000 connections/day): **FREE**  
- Heavy (10,000 connections/day): ~**$5-10/month**

Each connection uses ~4 requests (store offer, get offer, store answer, get answer).

## Troubleshooting

### "Failed to store connection data"
- Check that your worker URL is correct in `script.js`
- Verify KV namespaces are properly configured
- Check Cloudflare dashboard for worker errors

### "Connection code not found"
- Codes expire after 15 minutes
- Codes are one-time use only
- Check for typos (codes are case-insensitive)

### Rate limiting errors
- Wait a minute and try again
- Default limits: 10 requests/minute, 50/hour per IP

## Fallback

If OTP mode isn't working, users can always switch back to "Direct Sharing" mode, which works without any server and provides maximum privacy.

## Development

### Option 1: Quick Local Testing (Recommended)

For easy local testing without setting up Cloudflare:

1. **Start the mock server:**
   ```bash
   cd /path/to/clipboard-transfer
   node mock-server.js
   ```

2. **Start your web server:**
   ```bash
   # From the project root directory
   python -m http.server 8000
   # OR
   npx serve .
   # OR however you usually serve your site
   ```

3. **Test the flow:**
   - Open two browser tabs to `http://localhost:8000/clipboard-transfer/`
   - In both tabs, select "Simple Codes (human-memorable)" mode
   - Tab 1: Create Session → get first code (e.g., `happy-tiger-runs`)
   - Tab 2: Join Session → enter first code → get second code (e.g., `clever-bird-soars`)
   - Tab 1: Enter second code → connection established!

The mock server will show logs like:
```
🚀 Mock OTP server running on http://localhost:3001
📦 Stored data for passcode: happy-tiger-runs
📤 Retrieved and deleted data for passcode: happy-tiger-runs
📦 Stored data for passcode: clever-bird-soars
📤 Retrieved and deleted data for passcode: clever-bird-soars
```

### Option 2: Test with Real Cloudflare Worker

To test with the actual Cloudflare infrastructure:

```bash
cd /path/to/clipboard-transfer
wrangler dev
```

This will start a local development server that connects to Cloudflare's infrastructure. Update `otpServerUrl` in `script.js` to the URL shown by `wrangler dev`.

### Production Deployment

Once testing is complete:

1. Change `otpServerUrl` back to your production worker URL
2. Deploy with `wrangler deploy`
3. Test with the live worker