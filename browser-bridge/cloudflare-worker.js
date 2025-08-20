/**
 * Cloudflare Worker for OTP-style WebRTC signaling
 * Provides secure, temporary storage for WebRTC offer/answer exchange
 * With built-in rate limiting using Cloudflare Rate Limiting API
 */

export default {
  async fetch(request, env, ctx) {
    // CORS headers for browser requests
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400',
    };

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 200, headers: corsHeaders });
    }

    try {
      const url = new URL(request.url);
      const path = url.pathname;
      const clientIP = request.headers.get('CF-Connecting-IP') || 'unknown';

      // Rate limiting using Cloudflare Rate Limiting API
      const rateLimitResult = await checkRateLimit(request, env, ctx, clientIP);
      if (!rateLimitResult.success) {
        return jsonResponse({
          error: 'Rate limit exceeded',
          retryAfter: rateLimitResult.retryAfter
        }, 429, corsHeaders);
      }

      // Route handling
      if (path.startsWith('/temp/')) {
        const passcode = path.substring(6); // Remove '/temp/'
        
        if (request.method === 'POST') {
          return await handleStore(request, env.TEMP_STORAGE_KV, passcode, clientIP, corsHeaders);
        } else if (request.method === 'GET') {
          return await handleRetrieve(env.TEMP_STORAGE_KV, passcode, clientIP, corsHeaders);
        }
      }

      return jsonResponse({ error: 'Not found' }, 404, corsHeaders);
      
    } catch (error) {
      console.error('Worker error:', error);
      return jsonResponse({ 
        error: 'Internal server error' 
      }, 500, corsHeaders);
    }
  }
};

/**
 * Store encrypted WebRTC data with passcode
 */
async function handleStore(request, kv, passcode, clientIP, corsHeaders) {
  // Validate passcode format (human-readable: word-word-word format)
  if (!isValidPasscode(passcode)) {
    return jsonResponse({
      error: 'Invalid passcode format'
    }, 400, corsHeaders);
  }

  try {
    const body = await request.json();
    
    if (!body.encryptedData || !body.type) {
      return jsonResponse({
        error: 'Missing required fields: encryptedData, type'
      }, 400, corsHeaders);
    }

    // Check if passcode already exists
    const existing = await kv.get(passcode);
    if (existing) {
      return jsonResponse({
        error: 'Passcode already in use'
      }, 409, corsHeaders);
    }

    // Store with metadata
    const data = {
      encryptedData: body.encryptedData,
      type: body.type, // 'offer' or 'answer'
      timestamp: Date.now(),
      clientIP: hashIP(clientIP), // Store hashed IP for logging
    };

    // Store with 15-minute TTL
    await kv.put(passcode, JSON.stringify(data), {
      expirationTtl: 15 * 60 // 15 minutes
    });

    return jsonResponse({
      success: true,
      expiresIn: 15 * 60
    }, 200, corsHeaders);

  } catch (error) {
    console.error('Store error:', error);
    return jsonResponse({
      error: 'Failed to store data'
    }, 500, corsHeaders);
  }
}

/**
 * Retrieve and delete encrypted WebRTC data
 */
async function handleRetrieve(kv, passcode, clientIP, corsHeaders) {
  // Validate passcode format
  if (!isValidPasscode(passcode)) {
    return jsonResponse({
      error: 'Invalid passcode format'
    }, 400, corsHeaders);
  }

  try {
    const stored = await kv.get(passcode);
    
    if (!stored) {
      return jsonResponse({
        error: 'Passcode not found or expired'
      }, 404, corsHeaders);
    }

    const data = JSON.parse(stored);
    
    // Delete the data (one-time use)
    await kv.delete(passcode);

    return jsonResponse({
      encryptedData: data.encryptedData,
      type: data.type,
      timestamp: data.timestamp
    }, 200, corsHeaders);

  } catch (error) {
    console.error('Retrieve error:', error);
    return jsonResponse({
      error: 'Failed to retrieve data'
    }, 500, corsHeaders);
  }
}

/**
 * Check if passcode follows valid format
 */
function isValidPasscode(passcode) {
  // Accept either:
  // 1. 6-digit numeric codes: 123456
  // 2. Human-id format: word-word-word (3-4 words, hyphen separated)
  const numericPattern = /^\d{6}$/;
  const wordPattern = /^[a-z]+(-[a-z]+){2,3}$/;
  
  if (numericPattern.test(passcode)) {
    return true;
  }
  
  return wordPattern.test(passcode) && passcode.length >= 8 && passcode.length <= 50;
}

/**
 * Rate limiting using Cloudflare's Rate Limiting API
 */
async function checkRateLimit(request, env, ctx, clientIP) {
  // Skip rate limiting if no rate limiter is configured
  if (!env.RATE_LIMITER) {
    return { success: true };
  }

  try {
    // Create a unique identifier for rate limiting (by IP)
    const identifier = `ip:${clientIP}`;
    
    // Check rate limit - 10 requests per minute per IP
    const { success } = await env.RATE_LIMITER.limit({ key: identifier });
    
    if (!success) {
      return { 
        success: false, 
        retryAfter: 60 // Retry after 60 seconds
      };
    }
    
    return { success: true };
    
  } catch (error) {
    console.error('Rate limiting error:', error);
    // On rate limiter error, allow request through (fail open)
    return { success: true };
  }
}


/**
 * Hash IP address for privacy (one-way hash)
 */
function hashIP(ip) {
  // Simple hash for IP - not cryptographically secure but sufficient for rate limiting
  let hash = 0;
  for (let i = 0; i < ip.length; i++) {
    const char = ip.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return hash.toString(16);
}

/**
 * Helper for JSON responses with CORS
 */
function jsonResponse(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...headers
    }
  });
}