import { NextRequest, NextResponse } from 'next/server';

// Set MAIN_DOMAIN in your Vercel environment variables to your custom domain,
// e.g. "accomm-ally.com". Subdomain routing only activates when this is set
// and the request hostname matches *.MAIN_DOMAIN.
const MAIN_DOMAIN = process.env.MAIN_DOMAIN;

function extractSlug(host: string): string | null {
  if (!MAIN_DOMAIN) return null;
  const bare = host.split(':')[0]; // strip port if present
  if (bare === MAIN_DOMAIN || bare === `www.${MAIN_DOMAIN}`) return null;
  if (bare.endsWith(`.${MAIN_DOMAIN}`)) {
    const sub = bare.slice(0, bare.length - MAIN_DOMAIN.length - 1);
    return sub && sub !== 'www' ? sub : null;
  }
  return null;
}

export function middleware(request: NextRequest) {
  const host = request.headers.get('host') || '';
  const slug = extractSlug(host);

  if (!slug) return NextResponse.next();

  const { pathname } = request.nextUrl;

  // Rewrite the root path to the org landing page
  if (pathname === '/') {
    const url = request.nextUrl.clone();
    url.pathname = `/org/${slug}`;
    return NextResponse.rewrite(url);
  }

  // Pass all other paths through, attaching the slug as a header
  // so downstream server components can read it if needed
  const response = NextResponse.next();
  response.headers.set('x-tenant-slug', slug);
  return response;
}

export const config = {
  matcher: [
    // Skip Next.js internals, static files, and API routes that don't need slug routing
    '/((?!_next/static|_next/image|favicon.ico|api/).*)',
  ],
};
