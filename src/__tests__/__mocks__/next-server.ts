/**
 * Manual mock for 'next/server'
 */
export class NextRequest {
    url: string;
    method: string;
    headers: Headers;
    cookies: any;

    constructor(url: string, init?: any) {
        this.url = url;
        this.method = init?.method || 'GET';
        this.headers = new Headers(init?.headers);
        this.cookies = {
            get: (_name: string) => undefined,
        };
    }
}

export class NextResponse {
    body: any;
    status: number;
    headers: Headers;

    constructor(body?: any, init?: any) {
        this.body = body;
        this.status = init?.status || 200;
        this.headers = new Headers(init?.headers);
    }

    static json(data: any, init?: { status?: number; headers?: Record<string, string> }) {
        const res = new NextResponse(JSON.stringify(data), init);
        return res;
    }

    static redirect(url: URL | string) {
        return new NextResponse(null, { status: 302 });
    }

    static next() {
        return new NextResponse(null, { status: 200 });
    }

    cookies = {
        set: (_name: string, _value: string, _options?: any) => { },
    };
}
