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

module.exports = { getCloudinaryForSubject, uploadToSubjectCloud, deleteFromSubjectCloud };
