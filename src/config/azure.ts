// Azure Blob Storage Configuration
export const AZURE_CONFIG = {
  // Azure Blob Storage settings
  STORAGE_ACCOUNT_NAME: process.env.NEXT_PUBLIC_STORAGE_NAME || 'blobmm',
  CONTAINER_NAME: process.env.NEXT_PUBLIC_CONTAINER || 'photos',
  
  // SAS Token for authentication (must have write permissions)
  SAS_TOKEN: process.env.NEXT_PUBLIC_SAS_TOKEN || 'sv=2024-11-04&ss=bfqt&srt=sco&sp=rwdlacupiytfx&se=2027-06-02T02:19:33Z&st=2025-08-17T18:04:33Z&spr=https,http&sig=s0dh1tjJbi%2BDJLe7yGnZAZ8GSaOP019WKzIiYj%2FK3FA%3D',
  
  // Blob service endpoint with SAS token
  get BLOB_SERVICE_URL() {
    return `https://${this.STORAGE_ACCOUNT_NAME}.blob.core.windows.net?${this.SAS_TOKEN}`;
  },
  
  // Container URL with SAS token
  get CONTAINER_URL() {
    return `https://${this.STORAGE_ACCOUNT_NAME}.blob.core.windows.net/${this.CONTAINER_NAME}?${this.SAS_TOKEN}`;
  }
};

// Helper function to generate unique blob name
export const generateBlobName = (userId: string, fileExtension: string): string => {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  return `profile-photos/user-${userId}-${timestamp}.${fileExtension}`;
};

// Helper function to get full blob URL
export const getBlobUrl = (blobName: string): string => {
  return `${AZURE_CONFIG.BLOB_SERVICE_URL}/${AZURE_CONFIG.CONTAINER_NAME}/${blobName}?${AZURE_CONFIG.SAS_TOKEN}`;
};
