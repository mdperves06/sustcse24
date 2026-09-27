import "server-only";
import { promises as fs } from "node:fs";
import path from "node:path";
import type { StorageDriver } from "./types";

/**
 * Stores files on local disk, OUTSIDE /public, so every download goes through the
 * authenticated /api/files route. Suitable for development and single-server deployments.
 */
export class LocalStorageDriver implements StorageDriver {
  private readonly root: string;

  constructor(root: string) {
    this.root = path.resolve(root);
  }

  private resolve(key: string) {
    const full = path.resolve(this.root, key);
    if (!full.startsWith(this.root + path.sep)) throw new Error("Invalid storage key");
    return full;
  }

  async put(key: string, data: Uint8Array, contentType: string) {
    const full = this.resolve(key);
    await fs.mkdir(path.dirname(full), { recursive: true });
    await fs.writeFile(full, data);
    await fs.writeFile(`${full}.meta.json`, JSON.stringify({ contentType }));
  }

  async get(key: string) {
    const full = this.resolve(key);
    try {
      const [body, meta] = await Promise.all([
        fs.readFile(full),
        fs.readFile(`${full}.meta.json`, "utf8").catch(() => '{"contentType":"application/octet-stream"}'),
      ]);
      return { body: new Uint8Array(body), contentType: JSON.parse(meta).contentType as string, size: body.byteLength };
    } catch {
      return null;
    }
  }

  async delete(key: string) {
    const full = this.resolve(key);
    await Promise.all([fs.rm(full, { force: true }), fs.rm(`${full}.meta.json`, { force: true })]);
  }
}
