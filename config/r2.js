const { S3Client, GetObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');

const {
  R2_ACCOUNT_ID,
  R2_ACCESS_KEY_ID,
  R2_SECRET_ACCESS_KEY,
  R2_BUCKET,
  R2_SIGNED_URL_TTL_SECONDS,
} = process.env;

let r2Client = null;

function isR2Configured() {
  return Boolean(R2_ACCOUNT_ID && R2_ACCESS_KEY_ID && R2_SECRET_ACCESS_KEY && R2_BUCKET);
}

function getR2Client() {
  if (!isR2Configured()) return null;
  if (r2Client) return r2Client;

  r2Client = new S3Client({
    region: 'auto',
    endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: R2_ACCESS_KEY_ID,
      secretAccessKey: R2_SECRET_ACCESS_KEY,
    },
  });

  return r2Client;
}

async function getSignedR2Url(objectKey) {
  const client = getR2Client();
  if (!client) {
    throw new Error('R2 is not configured. Set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, and R2_BUCKET.');
  }

  const command = new GetObjectCommand({
    Bucket: R2_BUCKET,
    Key: objectKey,
  });

  const expiresIn = Math.max(Number(R2_SIGNED_URL_TTL_SECONDS || 300), 60);
  return getSignedUrl(client, command, { expiresIn });
}

module.exports = {
  isR2Configured,
  getSignedR2Url,
};
