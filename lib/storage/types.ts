export type StoredObject = {
  body: ReadableStream<Uint8Array> | Uint8Array;
  contentType: string;
  size?: number;
};

export interface StorageDriver {
  put(key: string, data: Uint8Array, contentType: string): Promise<void>;
  get(key: string): Promise<StoredObject | null>;
  delete(key: string): Promise<void>;
}
