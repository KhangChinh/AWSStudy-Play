import 'dotenv/config';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';

const here = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(here, '..');
const assetsBase = new URL(process.env.VITE_S3_ASSETS_URL);
const bucket = process.env.S3_ASSETS_BUCKET || assetsBase.hostname.split('.s3.')[0];
const region = process.env.AWS_REGION || process.env.VITE_COGNITO_REGION || 'ap-southeast-1';
const publicPrefix = assetsBase.pathname.replace(/^\/+|\/+$/g, '');
const frameId = process.argv[2] || 'frame_diamond';
const sourceDir = resolve(projectRoot, 'assets', 'avatar-frames');
const destinationPrefix = [publicPrefix, 'items', 'frame', frameId, 'assets'].filter(Boolean).join('/');

const uploads = [
  { extension: 'svg', contentType: 'image/svg+xml' },
  { extension: 'css', contentType: 'text/css; charset=utf-8' },
];

const s3 = new S3Client({ region });

for (const upload of uploads) {
  const fileName = `${frameId}.${upload.extension}`;
  const body = await readFile(resolve(sourceDir, fileName));
  const key = `${destinationPrefix}/${fileName}`;

  await s3.send(new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    Body: body,
    ContentType: upload.contentType,
    CacheControl: 'public, max-age=300',
  }));

  console.log(`Uploaded s3://${bucket}/${key}`);
}
