import { useRouter } from 'next/navigation'

export async function authFetch(
    input: RequestInfo,
    init?: RequestInit,
    router?: ReturnType<typeof useRouter>
) {
    const res = await fetch(input, {
        ...init,
        credentials: 'include',
    })

    if (res.status === 401 && router) {
        router.replace('/login')
        throw new Error('Unauthorized')
    }

    return res
}
