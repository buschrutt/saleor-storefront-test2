'use client';

import React from 'react';

export type ToastType = 'error' | 'success' | 'info';

export type Toast = {
    id: number;
    type: ToastType;
    message: string;
};

export default function ToastContainer({
                                           toasts,
                                           onClose,
                                       }: {
    toasts: Toast[];
    onClose: (id: number) => void;
}) {
    return (
        <div className="fixed top-6 right-6 z-50 space-y-3">
            {toasts.map((toast) => (
                <div
                    key={toast.id}
                    className={`relative px-5 py-4 pr-10 rounded-md text-sm shadow-none
                        ${
                        toast.type === 'error'
                            ? 'bg-red-600 text-red-50'
                            : toast.type === 'success'
                                ? 'bg-green-600 text-green-50'
                                : toast.type === 'info'
                                    ? 'bg-yellow-500 text-yellow-50'
                                    : 'bg-gray-600 text-gray-50'
                    }
                    `}
                >
                    {/* CLOSE BUTTON */}
                    <button
                        type="button"
                        onClick={() => onClose(toast.id)}
                        className="absolute top-2 right-3 text-xs opacity-70 hover:opacity-100"
                        aria-label="Close"
                    >
                        ✕
                    </button>

                    {toast.message}
                </div>
            ))}
        </div>
    );
}
