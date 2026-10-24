/**
 * Where uploaded files (conduct evidence, student photos, signatures, PDFs, homework) live.
 * All files are private: clients only ever get a short-lived signed URL, issued after
 * the caller's permission to see that file has been checked.
 */
export interface FileStorage {
  put(key: string, body: Uint8Array, contentType: string): Promise<void>;
  delete(key: string): Promise<void>;
  /** A URL that lets a browser download the file until it expires. */
  signedDownloadUrl(key: string, expiresInSeconds?: number): Promise<string>;
}

export const FILE_STORAGE = Symbol('FILE_STORAGE');
