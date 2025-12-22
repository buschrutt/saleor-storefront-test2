import { Suspense } from 'react'
import PasswordResetClient from './PasswordResetClient'

export default function PasswordResetPage() {
    return (
        <Suspense fallback={null}>
            <PasswordResetClient />
        </Suspense>
    )
}
