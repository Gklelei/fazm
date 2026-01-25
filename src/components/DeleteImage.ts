"use server";
import { v2 as cloudinary } from "cloudinary";
cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.NEXT_PUBLIC_CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

export async function deleteCloudinaryImage(publicId: string) {
  try {
    console.log("Attempting to delete image with publicId:", publicId);

    const result = await cloudinary.uploader.destroy(publicId);

    console.log("Cloudinary delete result:", result);

    if (result.result === "ok") {
      return { success: true, message: "Image deleted successfully" };
    } else {
      return {
        success: false,
        message: `Delete failed: ${result.result}`,
        result: result.result,
      };
    }
  } catch (error) {
    console.error("Cloudinary delete error:", error);
    return {
      success: false,
      message: error instanceof Error ? error.message : "Unknown error",
      error,
    };
  }
}
