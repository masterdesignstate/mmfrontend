# Azure Blob Storage Configuration Setup

## 🚀 Quick Setup

Create a `.env.local` file in your `mmfrontend` directory with the following content:

```bash
# Azure Blob Storage Configuration
# Replace these dummy values with your actual Azure credentials

# Your Azure Storage Account Name (e.g., mystorageaccount)
NEXT_PUBLIC_AZURE_STORAGE_ACCOUNT_NAME=blobmm

# Your Azure Container Name (e.g., profile-photos)
NEXT_PUBLIC_AZURE_CONTAINER_NAME=photos

# Your Azure SAS Token (Shared Access Signature)
# This should be a long string starting with 'sv=' and containing various parameters
NEXT_PUBLIC_AZURE_SAS_TOKEN=sv=2024-11-04&ss=bfqt&srt=sco&sp=rwdlacupiytfx&se=2027-06-02T02:19:33Z&st=2025-08-17T18:04:33Z&spr=https,http&sig=s0dh1tjJbi%2BDJLe7yGnZAZ8GSaOP019WKzIiYj%2FK3FA%3D

## 📋 Steps to Get Your Azure Credentials

### 1. Storage Account Name
- Go to Azure Portal → Storage Accounts
- Find your storage account name (e.g., `mystorageaccount123`)

### 2. Container Name
- In your storage account → Containers
- Use your existing container name (e.g., `profile-photos`)

### 3. Generate SAS Token
- In your container → Shared access signature
- Set permissions: **Read, Write, Create, Delete**
- Set expiry: **1+ year** (for development)
- Click **Generate SAS and connection string**
- Copy the **SAS token** (the part after `?`)

## 🔐 Example SAS Token Format

A SAS token looks like this:
```
sv=2020-08-04&ss=b&srt=sco&sp=rwdlacupitx&se=2025-12-31T23:59:59Z&st=2024-01-01T00:00:00Z&spr=https&sig=abc123...
```

## ⚠️ Important Notes

- **Never commit** `.env.local` to git
- **Restart your Next.js dev server** after adding the file
- **Test with a small image** first
- **Check browser console** for any Azure connection errors

## 🧪 Testing

1. Create `.env.local` with your credentials
2. Restart `npm run dev`
3. Go through the signup → personal details → add photo flow
4. Check browser console for Azure upload logs
5. Verify photo appears in your Azure container
