import "server-only";
import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import type { StorageDriver } from "./types";

type S3Options = {
  bucket: string;
  region: string;
  endpoint?: string;
  accessKeyId: string;
  secretAccessKey: string;
  forcePathStyle: boolean;
};

/** S3-compatible object storage (AWS S3, Cloudflare R2, MinIO, Backblaze B2…). Bucket must be private. */
export class S3StorageDriver implements StorageDriver {
  private readonly client: S3Client;
  private readonly bucket: string;

  constructor(opts: S3Options) {
    this.bucket = opts.bucket;
    this.client = new S3Client({
      region: opts.region,
      endpoint: opts.endpoint,
      forcePathStyle: opts.forcePathStyle,
      credentials: { accessKeyId: opts.accessKeyId, secretAccessKey: opts.secretAccessKey },
    });
  }

  async put(key: string, data: Uint8Array, contentType: string) {
    await this.client.send(
      new PutObjectCommand({ Bucket: this.bucket, Key: key, Body: data, ContentType: contentType }),
    );
  }

  async get(key: string) {
    try {
      const res = await this.client.send(new GetObjectCommand({ Bucket: this.bucket, Key: key }));
      if (!res.Body) return null;
      return {
        body: res.Body.transformToWebStream() as ReadableStream<Uint8Array>,
        contentType: res.ContentType ?? "application/octet-stream",
        size: res.ContentLength,
      };
    } catch (error) {
      if ((error as { name?: string }).name === "NoSuchKey") return null;
      throw error;
    }
  }

  async delete(key: string) {
    await this.client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
  }
}
