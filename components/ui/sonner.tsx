"use client";

import { Toaster as Sonner } from "sonner";

export function Toaster() {
  return (
    <Sonner
      theme="light"
      position="bottom-right"
      toastOptions={{
        style: {
          background: "#ffffff",
          border: "1px solid #e6e1d6",
          color: "#1c1915",
          boxShadow: "0 10px 30px rgba(28, 25, 21, 0.08)",
        },
      }}
    />
  );
}
