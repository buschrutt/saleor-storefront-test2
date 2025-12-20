export async function saleorFetch(
    query: string,
    options?: {
        variables?: Record<string, unknown>;
        headers?: Record<string, string>;
    }
) {
    const response = await fetch(process.env.NEXT_PUBLIC_SALEOR_API_URL!, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            ...options?.headers,
        },
        body: JSON.stringify({
            query,
            variables: options?.variables,
        }),
    });

    const json = await response.json();

    if (!response.ok) {
        console.error(
            'Saleor error response:',
            JSON.stringify(json, null, 2)
        );
        throw new Error(`Saleor API error: ${response.status}`);
    }

    return json;
}
