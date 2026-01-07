type SaleorFetchArgs<T> = {
    query: string
    variables?: Record<string, unknown>
    headers?: Record<string, string>
}

export async function saleorFetch<T>({
                                         query,
                                         variables,
                                         headers = {},
                                     }: SaleorFetchArgs<T>): Promise<T> {
    if (!process.env.SALEOR_API_URL) {
        throw new Error('SALEOR_API_URL is not defined')
    }

    const res = await fetch(process.env.SALEOR_API_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            ...headers,
        },
        body: JSON.stringify({
            query,
            variables,
        }),
    })

    const json = await res.json()

    if (!res.ok) {
        console.error('Saleor HTTP error:', res.status, json)
        throw new Error(`Saleor HTTP error ${res.status}`)
    }

    if (json.errors) {
        console.error('Saleor GraphQL error:', json.errors)
        throw new Error('Saleor GraphQL error')
    }

    return json.data as T
}
