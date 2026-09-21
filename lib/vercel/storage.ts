import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  DeleteObjectCommand,
  CreateMultipartUploadCommand,
  UploadPartCommand,
  CompleteMultipartUploadCommand,
  AbortMultipartUploadCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

export class PrivateBucket {
  constructor(
    readonly client: S3Client,
    readonly bucket: string,
  ) {}
  private input(key: string) {
    return { Bucket: this.bucket, Key: key };
  }
  async put(
    key: string,
    bytes: Uint8Array | ArrayBuffer,
    options?: { httpMetadata?: { contentType?: string } },
  ) {
    return this.client.send(
      new PutObjectCommand({
        ...this.input(key),
        Body: bytes instanceof ArrayBuffer ? new Uint8Array(bytes) : bytes,
        ContentType: options?.httpMetadata?.contentType,
      }),
    );
  }
  async head(key: string) {
    try {
      const r = await this.client.send(new HeadObjectCommand(this.input(key)));
      return { size: r.ContentLength ?? 0 };
    } catch (error) {
      if (
        (error as { $metadata?: { httpStatusCode?: number } }).$metadata
          ?.httpStatusCode === 404
      )
        return null;
      throw error;
    }
  }
  async get(key: string) {
    try {
      const r = await this.client.send(new GetObjectCommand(this.input(key)));
      if (!r.Body) return null;
      return {
        httpMetadata: { contentType: r.ContentType },
        size: r.ContentLength ?? 0,
        body: r.Body.transformToWebStream(),
      };
    } catch (error) {
      if (
        (error as { $metadata?: { httpStatusCode?: number } }).$metadata
          ?.httpStatusCode === 404
      )
        return null;
      throw error;
    }
  }
  async delete(keys: string | string[]) {
    await Promise.all(
      (Array.isArray(keys) ? keys : [keys]).map((key) =>
        this.client.send(new DeleteObjectCommand(this.input(key))),
      ),
    );
  }
  async createMultipartUpload(
    key: string,
    options?: { httpMetadata?: { contentType?: string } },
  ) {
    const r = await this.client.send(
      new CreateMultipartUploadCommand({
        ...this.input(key),
        ContentType: options?.httpMetadata?.contentType,
      }),
    );
    if (!r.UploadId) throw new Error("Storage did not return an upload ID");
    return this.resumeMultipartUpload(key, r.UploadId);
  }
  resumeMultipartUpload(key: string, uploadId: string) {
    const input = { ...this.input(key), UploadId: uploadId };
    return {
      key,
      uploadId,
      uploadPart: async (part: number, bytes: Uint8Array) => {
        const r = await this.client.send(
          new UploadPartCommand({ ...input, PartNumber: part, Body: bytes }),
        );
        if (!r.ETag)
          throw new Error("Storage did not acknowledge the upload part");
        return { partNumber: part, etag: r.ETag };
      },
      complete: async (parts: { partNumber: number; etag: string }[]) =>
        this.client.send(
          new CompleteMultipartUploadCommand({
            ...input,
            MultipartUpload: {
              Parts: parts.map((p) => ({
                PartNumber: p.partNumber,
                ETag: p.etag,
              })),
            },
          }),
        ),
      abort: async () =>
        this.client.send(new AbortMultipartUploadCommand(input)),
    };
  }
  async signedUpload(key: string, size: number) {
    return getSignedUrl(
      this.client,
      new PutObjectCommand({
        ...this.input(key),
        ContentLength: size,
        ContentType: "application/octet-stream",
      }),
      { expiresIn: 300 },
    );
  }
}
let bucket: PrivateBucket | undefined;
export function privateBucket() {
  if (bucket) return bucket;
  const e = process.env;
  if (
    !e.STORAGE_ENDPOINT ||
    !e.STORAGE_BUCKET ||
    !e.STORAGE_ACCESS_KEY_ID ||
    !e.STORAGE_SECRET_ACCESS_KEY
  )
    return undefined;
  bucket = new PrivateBucket(
    new S3Client({
      endpoint: e.STORAGE_ENDPOINT,
      region: e.STORAGE_REGION || "ap-southeast-2",
      forcePathStyle: true,
      requestChecksumCalculation: "WHEN_REQUIRED",
      responseChecksumValidation: "WHEN_REQUIRED",
      credentials: {
        accessKeyId: e.STORAGE_ACCESS_KEY_ID,
        secretAccessKey: e.STORAGE_SECRET_ACCESS_KEY,
      },
    }),
    e.STORAGE_BUCKET,
  );
  return bucket;
}
