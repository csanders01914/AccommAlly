// Session & auth
export const SESSION_DURATION = '8h';
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 8; // 8 hours
export const PORTAL_SESSION_MAX_AGE_SECONDS = 60 * 60; // 1 hour
export const SUPER_ADMIN_SESSION_MAX_AGE_SECONDS = 60 * 60 * 4; // 4 hours
export const ACCOUNT_LOCKOUT_DURATION_SECONDS = 15 * 60; // 15 min lockout after failed logins

// Cookie names
export const SESSION_COOKIE_NAME = 'session_token';
export const PORTAL_SESSION_COOKIE_NAME = 'portal_token';
export const SUPER_ADMIN_SESSION_COOKIE_NAME = 'super_admin_token';

// CSRF
export const CSRF_COOKIE_NAME = 'csrf_token';
export const CSRF_HEADER_NAME = 'x-csrf-token';

// Rate limiting (windows in seconds)
export const RATE_LIMIT_LOGIN_WINDOW = 15 * 60;
export const RATE_LIMIT_LOGIN_MAX = 5;
export const RATE_LIMIT_2FA_WINDOW = 5 * 60;
export const RATE_LIMIT_2FA_MAX = 5;
export const RATE_LIMIT_PORTAL_WINDOW = 15 * 60;
export const RATE_LIMIT_PORTAL_MAX = 10;
export const RATE_LIMIT_API_WINDOW = 60;
export const RATE_LIMIT_API_MAX = 100;
export const RATE_LIMIT_PASSWORD_RESET_WINDOW = 60 * 60;
export const RATE_LIMIT_PASSWORD_RESET_MAX = 3;
export const RATE_LIMIT_SUPER_ADMIN_WINDOW = 15 * 60;
export const RATE_LIMIT_SUPER_ADMIN_MAX = 5;

// Pagination
export const DEFAULT_PAGE_SIZE = 50;
export const MAX_PAGE_SIZE = 200;

// Equipment
export const EQUIPMENT_CATEGORIES = [
 "Auditory/Hearing",
 "Visual",
 "Mobility/Ergonomics",
 "Cognitive/Focus",
 "Software/Digital",
 "Accessories",
 "Other"
];
