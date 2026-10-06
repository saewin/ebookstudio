import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';

// Check if Cloudflare R2 / S3 credentials are configured
export function isR2Configured(): boolean {
    return Boolean(
        process.env.R2_ACCOUNT_ID &&
        process.env.R2_ACCESS_KEY_ID &&
        process.env.R2_SECRET_ACCESS_KEY &&
        process.env.R2_BUCKET_NAME
    );
}

function getR2Client(): S3Client {
    const accountId = process.env.R2_ACCOUNT_ID;
    return new S3Client({
        region: 'auto',
        endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
        credentials: {
            accessKeyId: process.env.R2_ACCESS_KEY_ID!,
            secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
        },
    });
}

export interface UploadResult {
    success: boolean;
    url: string;
    fileName: string;
    storageType: 'r2' | 'local';
    error?: string;
}

/**
 * Uploads a file buffer either to Cloudflare R2 (if configured) or local VPS storage.
 */
export async function uploadBookAsset({
    buffer,
    fileName,
    contentType,
}: {
    buffer: Buffer;
    fileName: string;
    contentType: string;
}): Promise<UploadResult> {
    // 1. Try Cloudflare R2 if configured
    if (isR2Configured()) {
        try {
            const client = getR2Client();
            const bucketName = process.env.R2_BUCKET_NAME!;
            const key = `ebook-assets/${fileName}`;

            await client.send(
                new PutObjectCommand({
                    Bucket: bucketName,
                    Key: key,
                    Body: buffer,
                    ContentType: contentType,
                    CacheControl: 'public, max-age=31536000, immutable',
                })
            );

            // Compute public URL (custom domain or public r2 url)
            const publicDomain = process.env.R2_PUBLIC_URL?.replace(/\/$/, '') || '';
            const url = publicDomain 
                ? `${publicDomain}/${key}` 
                : `https://${bucketName}.${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${key}`;

            return {
                success: true,
                url,
                fileName,
                storageType: 'r2',
            };
        } catch (r2Error: any) {
            console.error('R2 Upload failed, falling back to local disk:', r2Error.message);
            // Gracefully fall back to local disk if R2 fails
        }
    }

    // 2. Default / Fallback: Local VPS storage (public/uploads)
    try {
        const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
        await mkdir(uploadsDir, { recursive: true });
        const filePath = path.join(uploadsDir, fileName);
        await writeFile(filePath, buffer);

        const url = `/api/uploads/${fileName}`;

        return {
            success: true,
            url,
            fileName,
            storageType: 'local',
        };
    } catch (localError: any) {
        console.error('Local File Save Error:', localError);
        return {
            success: false,
            url: '',
            fileName,
            storageType: 'local',
            error: localError.message,
        };
    }
}
