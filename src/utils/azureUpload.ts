import { BlobServiceClient } from '@azure/storage-blob';
import { AZURE_CONFIG, generateBlobName } from '@/config/azure';

// File validation
export const validateImageFile = (file: File): { isValid: boolean; error?: string } => {
  // Check file type
  if (!file.type.startsWith('image/')) {
    return { isValid: false, error: 'Please select an image file' };
  }

  // Check file size (max 10MB)
  const maxSize = 10 * 1024 * 1024; // 10MB
  if (file.size > maxSize) {
    return { isValid: false, error: 'Image size must be less than 10MB' };
  }

  return { isValid: true };
};

// Compress image if needed
export const compressImage = (file: File, maxWidth: number = 800, quality: number = 0.8): Promise<File> => {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    img.onload = () => {
      // Calculate new dimensions
      let { width, height } = img;
      if (width > maxWidth) {
        height = (height * maxWidth) / width;
        width = maxWidth;
      }

      // Set canvas dimensions
      canvas.width = width;
      canvas.height = height;

      // Draw and compress
      ctx?.drawImage(img, 0, 0, width, height);
      canvas.toBlob(
        (blob) => {
          if (blob) {
            const compressedFile = new File([blob], file.name, {
              type: file.type,
              lastModified: Date.now(),
            });
            resolve(compressedFile);
          } else {
            reject(new Error('Failed to compress image'));
          }
        },
        file.type,
        quality
      );
    };

    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = URL.createObjectURL(file);
  });
};

// Upload to Azure Blob Storage directly from frontend
export const uploadToAzureBlob = async (
  file: File, 
  userId: string,
  onProgress?: (progress: number) => void
): Promise<string> => {
  try {
    // Validate file
    const validation = validateImageFile(file);
    if (!validation.isValid) {
      throw new Error(validation.error);
    }

    // Compress image if it's large
    let uploadFile = file;
    if (file.size > 2 * 1024 * 1024) { // Compress if > 2MB
      uploadFile = await compressImage(file);
    }

    // Generate unique blob name
    const fileExtension = file.name.split('.').pop() || 'jpg';
    const blobName = generateBlobName(userId, fileExtension);

    // Debug: Log Azure config and environment variables
    console.log('🔍 Azure Config Debug:');
    console.log('  Raw env.STORAGE_NAME:', process.env.STORAGE_NAME);
    console.log('  Raw env.CONTAINER:', process.env.CONTAINER);
    console.log('  Raw env.SAS_TOKEN (first 50 chars):', process.env.SAS_TOKEN?.substring(0, 50) + '...');
    console.log('  Storage Name:', AZURE_CONFIG.STORAGE_ACCOUNT_NAME);
    console.log('  Container:', AZURE_CONFIG.CONTAINER_NAME);
    console.log('  SAS Token (first 50 chars):', AZURE_CONFIG.SAS_TOKEN.substring(0, 50) + '...');
    console.log('  Blob Service URL:', AZURE_CONFIG.BLOB_SERVICE_URL);

    // Create BlobServiceClient using SAS token (browser-compatible)
    const { BlobServiceClient } = await import('@azure/storage-blob');
    const blobServiceClient = new BlobServiceClient(AZURE_CONFIG.BLOB_SERVICE_URL);
    const containerClient = blobServiceClient.getContainerClient(AZURE_CONFIG.CONTAINER_NAME);
    const blockBlobClient = containerClient.getBlockBlobClient(blobName);

    // Upload with progress tracking
    const uploadResponse = await blockBlobClient.uploadData(uploadFile, {
      blobHTTPHeaders: {
        blobContentType: uploadFile.type,
        blobContentDisposition: `inline; filename="${uploadFile.name}"`,
      },
      onProgress: (progress) => {
        if (onProgress) {
          const percentage = Math.round((progress.loadedBytes / progress.totalBytes) * 100);
          onProgress(percentage);
        }
      },
    });

    // Get the public URL
    const photoUrl = blockBlobClient.url;
    
    // Update user profile via API
    const updateResponse = await fetch('/api/auth/update-profile-photo/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        user_id: userId,
        profile_photo_url: photoUrl
      })
    });

    if (!updateResponse.ok) {
      console.warn('Failed to update user profile, but upload succeeded');
    }

    return photoUrl;
    
  } catch (error) {
    console.error('Azure upload error:', error);
    throw new Error(`Upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};


