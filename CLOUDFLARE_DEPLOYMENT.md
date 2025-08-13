# Cloudflare Deployment Guide

## 1. Deploy Worker (closed-loop OTP)

### CLI Method
```bash
cd closed-loop
# For containers/codespaces - get API token from dashboard
export CLOUDFLARE_API_TOKEN=your_api_token_here
# OR: wrangler login (if OAuth works in your environment)

npx wrangler kv namespace create TEMP_STORAGE_KV
npx wrangler kv namespace create TEMP_STORAGE_KV --preview
# Update wrangler.toml with returned IDs
npx wrangler deploy
```

**Get API Token**: Dashboard → My Profile → API Tokens → Create Token → Custom token with `Workers:Edit` and `Zone:Read` permissions

### Console Method
1. Dashboard → Workers & Pages → Create → Upload worker
2. Upload `cloudflare-worker.js`
3. Settings → Variables → KV Namespace Bindings
4. Add binding: `TEMP_STORAGE_KV` → Create new namespace

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

## 4. Set Rate Limiting
Dashboard → Security → Rate Limiting Rules → Create rule:
- **Match**: Worker Route equals `your-worker-url.workers.dev`
- **Action**: Block for 1 minute after 10 requests per IP

## 5. Test
- Image editor: Check WASM loads at `/image-editor/`
- Closed-loop: Test OTP mode at `/closed-loop/`