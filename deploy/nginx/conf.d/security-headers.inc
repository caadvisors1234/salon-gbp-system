# Security headers — included in each location block that defines its own add_header,
# because nginx does not inherit parent add_header directives into child blocks.
add_header X-Frame-Options        "SAMEORIGIN" always;
add_header X-Content-Type-Options "nosniff" always;
add_header Referrer-Policy        "strict-origin-when-cross-origin" always;
add_header Permissions-Policy     "camera=(), microphone=(), geolocation=()" always;
add_header Content-Security-Policy
    "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: blob: https:; connect-src 'self' https://*.supabase.co; frame-ancestors 'self'; base-uri 'self'; form-action 'self';"
    always;
