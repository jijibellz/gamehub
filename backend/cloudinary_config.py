"""
Cloudinary configuration for image uploads
Stores profile pictures in the cloud instead of local filesystem
"""
import os
import cloudinary
import cloudinary.uploader
import cloudinary.api

# Check if Cloudinary credentials are set
CLOUDINARY_ENABLED = all([
    os.getenv("CLOUDINARY_CLOUD_NAME"),
    os.getenv("CLOUDINARY_API_KEY"),
    os.getenv("CLOUDINARY_API_SECRET")
])

if CLOUDINARY_ENABLED:
    # Configure Cloudinary with environment variables
    cloudinary.config(
        cloud_name=os.getenv("CLOUDINARY_CLOUD_NAME"),
        api_key=os.getenv("CLOUDINARY_API_KEY"),
        api_secret=os.getenv("CLOUDINARY_API_SECRET"),
        secure=True
    )
    print("✅ Cloudinary configured successfully")
else:
    print("⚠️ Cloudinary credentials not set - profile pictures will use local storage")

def upload_image(file_bytes, public_id=None, folder="gamehub/profile_pictures"):
    """
    Upload an image to Cloudinary
    
    Args:
        file_bytes: Image file bytes
        public_id: Optional custom public ID for the image
        folder: Cloudinary folder to store the image
    
    Returns:
        dict: Upload result with 'url' and 'public_id'
    """
    if not CLOUDINARY_ENABLED:
        raise Exception("Cloudinary is not configured. Please set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET environment variables.")
    
    try:
        upload_result = cloudinary.uploader.upload(
            file_bytes,
            folder=folder,
            public_id=public_id,
            overwrite=True,
            resource_type="image",
            transformation=[
                {'width': 500, 'height': 500, 'crop': 'limit'},  # Max 500x500
                {'quality': 'auto:good'}  # Automatic quality optimization
            ]
        )
        
        return {
            'url': upload_result.get('secure_url'),
            'public_id': upload_result.get('public_id')
        }
    except Exception as e:
        print(f"❌ Cloudinary upload error: {e}")
        raise


def delete_image(public_id):
    """
    Delete an image from Cloudinary
    
    Args:
        public_id: The public ID of the image to delete
    
    Returns:
        dict: Deletion result
    """
    if not CLOUDINARY_ENABLED:
        print("⚠️ Cloudinary not configured, skipping delete")
        return {"result": "not_configured"}
    
    try:
        result = cloudinary.uploader.destroy(public_id)
        return result
    except Exception as e:
        print(f"❌ Cloudinary delete error: {e}")
        raise


def extract_public_id_from_url(url):
    """
    Extract the public_id from a Cloudinary URL
    
    Args:
        url: Cloudinary image URL
    
    Returns:
        str: Public ID or None
    """
    try:
        # Example URL: https://res.cloudinary.com/demo/image/upload/v1234567890/gamehub/profile_pictures/user123.jpg
        # Public ID: gamehub/profile_pictures/user123
        if 'cloudinary.com' in url:
            parts = url.split('/upload/')
            if len(parts) > 1:
                # Remove version number (v1234567890) and get path
                path_parts = parts[1].split('/')
                # Skip version if present
                if path_parts[0].startswith('v'):
                    path_parts = path_parts[1:]
                # Remove file extension
                public_id = '/'.join(path_parts)
                public_id = public_id.rsplit('.', 1)[0]
                return public_id
    except Exception as e:
        print(f"⚠️ Could not extract public_id from URL: {e}")
    
    return None
