const CLOUDINARY_CLOUD_NAME = process.env.EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME?.trim();
const CLOUDINARY_UPLOAD_PRESET = process.env.EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET?.trim();

type CloudinaryUploadResponse = {
  error?: {
    message?: string;
  };
  secure_url?: string;
};

const getImageMimeType = (uri: string): string => {
  const normalizedUri = uri.toLowerCase();

  if (normalizedUri.endsWith('.png')) {
    return 'image/png';
  }

  if (normalizedUri.endsWith('.webp')) {
    return 'image/webp';
  }

  if (normalizedUri.endsWith('.heic')) {
    return 'image/heic';
  }

  return 'image/jpeg';
};

const getImageFileName = (uri: string): string => {
  const rawFileName = uri.split('/').pop()?.split('?')[0]?.trim();

  if (rawFileName) {
    return rawFileName;
  }

  return `space-image-${Date.now()}.jpg`;
};

const ensureCloudinaryConfigured = (): void => {
  if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_UPLOAD_PRESET) {
    throw new Error('Image uploads are not configured yet.');
  }
};

export const isHostedImageUrl = (value: string | null | undefined): value is string => {
  if (!value) {
    return false;
  }

  return /^https:\/\//i.test(value.trim());
};

export const uploadImageToCloudinary = async (uri: string): Promise<string> => {
  const imageUri = uri.trim();

  if (!imageUri) {
    throw new Error('Image URI is required.');
  }

  if (/^https:\/\//i.test(imageUri)) {
    return imageUri;
  }

  ensureCloudinaryConfigured();

  const formData = new FormData();
  const isBlobUri = imageUri.slice(0, 5) === 'blob:';

  if (isBlobUri) {
    const blobResponse = await fetch(imageUri);
    const blob = await blobResponse.blob();

    formData.append('file', blob, getImageFileName(imageUri));
  } else {
    formData.append('file', {
      uri: imageUri,
      name: getImageFileName(imageUri),
      type: getImageMimeType(imageUri),
    } as any);
  }
  formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET!);

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
    {
      method: 'POST',
      body: formData,
    },
  );
  const data = (await response.json().catch(() => null)) as CloudinaryUploadResponse | null;

  if (!response.ok) {
    throw new Error(data?.error?.message ?? 'Image upload failed.');
  }

  const secureUrl = data?.secure_url?.trim();

  if (!secureUrl || !isHostedImageUrl(secureUrl)) {
    throw new Error('Image upload did not return a valid hosted URL.');
  }

  return secureUrl;
};
