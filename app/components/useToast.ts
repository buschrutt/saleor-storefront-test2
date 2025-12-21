'use client';

import { useState } from 'react';

export type ToastType = 'error' | 'success' | 'info';

export type Toast = {
    id: number;
    type: ToastType;
    message: string;
};

export function useToast() {
    const [toasts, setToasts] = useState<Toast[]>([]);

    function pushToast(type: ToastType, message: string) {
        const id = Date.now();
        setToasts(t => [...t, { id, type, message }]);

        setTimeout(() => {
            setToasts(t => t.filter(toast => toast.id !== id));
        }, 4000);
    }

    function closeToast(id: number) {
        setToasts(t => t.filter(toast => toast.id !== id));
    }

    return {
        toasts,
        pushToast,
        closeToast,
    };
}
