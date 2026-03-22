const cloudinary = require('cloudinary');

/**
 * Get a Cloudinary instance configured for a specific subject.
 * Expects env vars: {SubjectName}_cloud_name, {SubjectName}_api_key, {SubjectName}_api_secret
 * e.g. Physics_cloud_name, Physics_api_key, Physics_api_secret
 */
const getCloudinaryForSubject = (subjectName) => {
  const cloud_name = process.env[`${subjectName}_cloud_name`];
  const api_key = process.env[`${subjectName}_api_key`];
  const api_secret = process.env[`${subjectName}_api_secret`];

  if (!cloud_name || !api_key || !api_secret) {
    throw new Error(
      `Cloudinary credentials not found for subject: ${subjectName}. ` +
      `Please set ${subjectName}_cloud_name, ${subjectName}_api_key, ${subjectName}_api_secret in .env`
    );
  }

  const instance = cloudinary.v2;
  // Return a config object since cloudinary.v2 is a singleton.
  // We'll use the upload API with overridden options instead.
  return { cloud_name, api_key, api_secret };
};

/**
 * Upload a buffer to the correct Cloudinary account for a subject.
 */
const uploadToSubjectCloud = (fileBuffer, subjectName, folder) => {
  const creds = getCloudinaryForSubject(subjectName);

  return new Promise((resolve, reject) => {
    const stream = cloudinary.v2.uploader.upload_stream(
      {
        folder: folder || `garud-classes-${subjectName}`,
        resource_type: 'image',
        cloud_name: creds.cloud_name,
        api_key: creds.api_key,
        api_secret: creds.api_secret,
      },
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      }
    );
    stream.end(fileBuffer);
  });
};

/**
 * Delete an image from the correct Cloudinary account for a subject.
 */
const deleteFromSubjectCloud = (publicId, subjectName) => {
  const creds = getCloudinaryForSubject(subjectName);

  return cloudinary.v2.uploader.destroy(publicId, {
    cloud_name: creds.cloud_name,
    api_key: creds.api_key,
    api_secret: creds.api_secret,
  });
};

/**
 * Upload a buffer to a randomly selected configured Cloudinary account.
 * Scans all env vars ending in _cloud_name to build the pool.
 */
const uploadToRandomCloud = (fileBuffer, folder) => {
  // Collect all accounts that have cloud_name + api_key + api_secret set
  const accounts = Object.keys(process.env)
    .filter(k => k.endsWith('_cloud_name'))
    .map(k => {
      const prefix = k.replace('_cloud_name', '');
      const cloud_name  = process.env[`${prefix}_cloud_name`];
      const api_key     = process.env[`${prefix}_api_key`];
      const api_secret  = process.env[`${prefix}_api_secret`];
      return cloud_name && api_key && api_secret ? { prefix, cloud_name, api_key, api_secret } : null;
    })
    .filter(Boolean);

  if (!accounts.length) {
    throw new Error('No Cloudinary accounts configured. Add {Name}_cloud_name/api_key/api_secret to .env');
  }

  // Pick one at random
  const creds = accounts[Math.floor(Math.random() * accounts.length)];

  return new Promise((resolve, reject) => {
    const stream = cloudinary.v2.uploader.upload_stream(
      {
        folder: folder || 'garud-classes-questions',
        resource_type: 'image',
        cloud_name: creds.cloud_name,
        api_key:    creds.api_key,
        api_secret: creds.api_secret,
      },
      (error, result) => {
        if (error) return reject(error);
        resolve({ result, cloudPrefix: creds.prefix });
      }
    );
    stream.end(fileBuffer);
  });
};

/**
 * Delete an image from a specific Cloudinary account by prefix.
 * Falls back to subject-based lookup for backward compatibility.
 */
const deleteFromCloud = (publicId, cloudPrefix) => {
  // Try prefix-based first, fall back to subjectName
  const cloud_name = process.env[`${cloudPrefix}_cloud_name`];
  const api_key    = process.env[`${cloudPrefix}_api_key`];
  const api_secret = process.env[`${cloudPrefix}_api_secret`];

  if (!cloud_name || !api_key || !api_secret) {
    // Legacy: cloudPrefix might actually be a subject name
    try {
      return deleteFromSubjectCloud(publicId, cloudPrefix);
    } catch {
      return Promise.resolve(); // best-effort
    }
  }

  return cloudinary.v2.uploader.destroy(publicId, {
    cloud_name, api_key, api_secret,
  });
};

module.exports = { getCloudinaryForSubject, uploadToSubjectCloud, deleteFromSubjectCloud, uploadToRandomCloud, deleteFromCloud };
