'use client';

import { useState, useCallback, useRef } from 'react';

export type ToastType = 'error' | 'success' | 'info';

export type Toast = {
    id: number;
    type: ToastType;
    message: string;
};

export function useToast() {
    const [toasts, setToasts] = useState<Toast[]>([]);

    // Используем useRef для гарантии уникальности ID
    const toastIdCounter = useRef(0);

    const pushToast = useCallback((type: ToastType, message: string) => {
        // Генерируем уникальный ID на основе инкрементирующего счетчика
        const id = ++toastIdCounter.current;

        setToasts((prev) => [...prev, { id, type, message }]);

        // Автоматическое удаление через 5 секунд
        const timer = setTimeout(() => {
            setToasts((prev) => prev.filter((toast) => toast.id !== id));
        }, 5000);

        // Очистка таймера при размонтировании
        return () => clearTimeout(timer);
    }, []);

    const closeToast = useCallback((id: number) => {
        setToasts((prev) => prev.filter((toast) => toast.id !== id));
    }, []);

    return { toasts, pushToast, closeToast };
}