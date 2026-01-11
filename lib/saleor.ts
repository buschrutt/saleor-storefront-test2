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
    // ИСПРАВЛЕНО: используем NEXT_PUBLIC_ префикс для клиента
    const SALEOR_API_URL = process.env.NEXT_PUBLIC_SALEOR_API_URL

    if (!SALEOR_API_URL) {
        console.error('NEXT_PUBLIC_SALEOR_API_URL is not defined')
        throw new Error('NEXT_PUBLIC_SALEOR_API_URL is not defined')
    }

    console.log('Calling Saleor API:', SALEOR_API_URL) // Для отладки

    const res = await fetch(SALEOR_API_URL, {
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