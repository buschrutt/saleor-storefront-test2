type SaleorFetchOptions = {
    token?: string;
    variables?: Record<string, unknown>;
};

export async function saleorFetch(
    query: string,
    options: SaleorFetchOptions = {}
) {
    const { token, variables } = options;

    const response = await fetch(
        process.env.NEXT_PUBLIC_SALEOR_API_URL as string,
        {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            body: JSON.stringify({
                query,
                variables,
            }),
            cache: 'no-store',
        }
    );

    if (!response.ok) {
        throw new Error(`Saleor API error: ${response.status}`);
    }

    return response.json();
}
