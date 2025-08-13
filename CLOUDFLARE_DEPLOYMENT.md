# Cloudflare Deployment Guide

## 1. Deploy Worker (closed-loop OTP)

### CLI Method
```bash
cd closed-loop
# For containers/codespaces - get API token from dashboard
export CLOUDFLARE_API_TOKEN=your_api_token_here
# OR: wrangler login (if OAuth works in your environment)

# Create KV namespace
npx wrangler kv namespace create TEMP_STORAGE_KV
npx wrangler kv namespace create TEMP_STORAGE_KV --preview

# Update wrangler.toml with returned IDs
# For first deployment, comment out the rate limiter section in wrangler.toml
npx wrangler deploy
```

**Get API Token**: Dashboard → My Profile → API Tokens → Create Token → Custom token with `Workers:Edit` and `Zone:Read` permissions

### Console Method
1. Dashboard → Workers & Pages → Create → Upload worker
2. Upload `cloudflare-worker.js`
3. Settings → Variables → Bindings:
   - **KV Namespace**: `TEMP_STORAGE_KV` → Create new namespace
   - **Rate Limiting**: `RATE_LIMITER` → Create new rate limiter (10 req/min)

Note worker URL: `https://otoolebox-signaling.your-subdomain.workers.dev`

## 2. Update Client Code
Edit `/closed-loop/script.js` line 14:
```javascript
this.otpServerUrl = 'https://your-worker-url.workers.dev';
```

## 3. Deploy Pages (Main Site)
1. Dashboard → Pages → Create project → Connect Git
2. Repository: your repo, Branch: `main`
3. Build command: (empty), Output: `/`
4. Deploy

Site will be available at: `https://your-project.pages.dev`

### Custom Domain (Optional)
Pages → Custom domains → Add domain → Follow DNS setup

## 4. Rate Limiting (Optional)

### Initial Deployment
For your first deployment, **comment out** the rate limiter section in wrangler.toml:
```toml
# Rate limiting - 10 requests per minute per IP
# [[unsafe.bindings]]
# name = "RATE_LIMITER"
# type = "ratelimit"
# namespace_id = "your-rate-limiter-namespace-id"
# simple = { limit = 10, period = 60 }
```

### Adding Rate Limiting Later
1. **Dashboard** → **Workers & Pages** → **Your Worker** → **Settings** → **Variables**
2. Add **Rate Limiting** binding named `RATE_LIMITER` 
3. Set limit to **10 requests per minute**
4. Uncomment the rate limiter section in wrangler.toml
5. Replace `your-rate-limiter-namespace-id` with the ID from step 2
6. Redeploy: `npx wrangler deploy`

The worker will function without rate limiting initially, then you can add it later.

## 5. Test
- Image editor: Check WASM loads at `/image-editor/`
- Closed-loop: Test OTP mode at `/closed-loop/`