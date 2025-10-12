import { API_BASE_URL } from "../api/routes";

/**
 * Get the full URL for a profile picture
 * Handles both Cloudinary URLs and local uploads
 * 
 * @param {string} profilePicture - The profile picture path/URL from the backend
 * @returns {string} - The full URL to display the image
 */
export function getProfilePictureUrl(profilePicture) {
  if (!profilePicture) {
    return "";
  }
  
  // If it's already a full URL (e.g., Cloudinary), return as-is
  if (profilePicture.startsWith("http://") || profilePicture.startsWith("https://")) {
    return profilePicture;
  }
  
  // Otherwise, it's a local upload path, prepend API_BASE_URL
  return `${API_BASE_URL}${profilePicture}`;
}
