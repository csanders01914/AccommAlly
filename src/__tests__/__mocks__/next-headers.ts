/**
 * Manual mock for 'next/headers'
 */
export function cookies() {
    return {
        get: (_name: string) => undefined,
        set: (_name: string, _value: string, _options?: any) => { },
    };
}

export function headers() {
    return {
        get: (_name: string) => null,
    };
}
