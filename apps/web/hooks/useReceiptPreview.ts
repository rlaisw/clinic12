"use client";

import { useState, useCallback } from "react";
import { apiClient } from "@/lib/api";

/** Best-effort parse of the backend's structured JSON error payload. */
function parsePdfError(err: any, fallback: string): Error {
  try {
    // Error bodies arrive as ArrayBuffer (responseType: "arraybuffer").
    const data = err?.response?.data;
    if (data && data.byteLength) {
      const text = new TextDecoder().decode(data);
      const json = text ? JSON.parse(text) : null;
      if (json?.error) {
        const detail = json.error_type ? ` (${json.error_type})` : "";
        return new Error(`${json.error}${detail}`);
      }
    } else if (data?.error) {
      const detail = data.error_type ? ` (${data.error_type})` : "";
      return new Error(`${data.error}${detail}`);
    }
  } catch {
    // Ignore parse failures; fall through to the default path.
  }
  return err instanceof Error ? err : new Error(err?.message || fallback);
}

export function useReceiptPreview(receiptId: string) {
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const openModal = useCallback(async () => {
    if (!receiptId) return;
    setIsLoading(true);
    setError(null);
    try {
      const response = await apiClient.get(
        `/receipts/${receiptId}/pdf/`,
        { responseType: "arraybuffer" }
      );
      const uint8 = new Uint8Array(response.data);
      const binary = uint8.reduce((acc, byte) => acc + String.fromCharCode(byte), "");
      const base64 = btoa(binary);
      const dataUrl = `data:application/pdf;base64,${base64}`;
      setPdfUrl(dataUrl);
    } catch (err: any) {
      setError(parsePdfError(err, `Failed to load PDF for receipt ${receiptId}`));
    } finally {
      setIsLoading(false);
    }
  }, [receiptId]);

  const closeModal = useCallback(() => {
    setPdfUrl(null);
    setError(null);
  }, []);

  return { pdfUrl, isLoading, error, openModal, closeModal, isOpen: !!pdfUrl };
}