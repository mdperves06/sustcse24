import "server-only";
import { env } from "@/lib/env";
import { LocalStorageDriver } from "./local";
import { S3StorageDriver } from "./s3";
import type { StorageDriver } from "./types";

function createDriver(): StorageDriver {
  if (env.STORAGE_DRIVER === "s3") {
    const { S3_BUCKET, S3_REGION, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY } = env;
    if (!S3_BUCKET || !S3_REGION || !S3_ACCESS_KEY_ID || !S3_SECRET_ACCESS_KEY) {
      throw new Error("STORAGE_DRIVER=s3 requires S3_BUCKET, S3_REGION, S3_ACCESS_KEY_ID and S3_SECRET_ACCESS_KEY.");
    }
    return new S3StorageDriver({
      bucket: S3_BUCKET,
      region: S3_REGION,
      endpoint: env.S3_ENDPOINT,
      accessKeyId: S3_ACCESS_KEY_ID,
      secretAccessKey: S3_SECRET_ACCESS_KEY,
      forcePathStyle: env.S3_FORCE_PATH_STYLE,
    });
  }
  return new LocalStorageDriver(env.STORAGE_LOCAL_DIR);
}

let driver: StorageDriver | null = null;
export function storage(): StorageDriver {
  driver ??= createDriver();
  return driver;
}

/**
 * Serverless hosts (e.g. Vercel) have no persistent disk, so the local driver can't
 * accept uploads there. Set STORAGE_DRIVER=s3 in that case.
 */
export function uploadsAvailable(): boolean {
  return env.STORAGE_DRIVER === "s3" || !process.env.VERCEL;
}

