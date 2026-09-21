process.env.AUTH_PROVIDER = "totp-local";
process.env.SESSION_SECRET = "test-session-secret-at-least-32-chars!!";
process.env.FIELD_ENCRYPTION_KEY = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
process.env.FIRM_TIMEZONE = "America/New_York";
process.env.FIRM_LOCALE = "en-US";
process.env.RATE_LIMIT_MAX_PER_MINUTE = "5";
process.env.LOCKOUT_FAILURES = "10";
process.env.TOTP_ISSUER = "Law firm management";
