/**
 * Manual mock for 'next/server'
 */
export class NextRequest {
    url: string;
    method: string;
    headers: Headers;
    cookies: any;
    nextUrl: URL;
    private _body: string | undefined;

    constructor(url: string, init?: any) {
        this.url = url;
        this.method = init?.method || 'GET';
        this.headers = new Headers(init?.headers);
        this.cookies = {
            get: (_name: string) => undefined,
        };
        this.nextUrl = new URL(url);
        this._body = init?.body;
    }

    async json() {
        if (!this._body) return {};
        return JSON.parse(this._body);
    }

    async text() {
        return this._body ?? '';
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

    async json() {
        if (!this.body) return null;
        return JSON.parse(this.body);
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
