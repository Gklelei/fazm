import { useMutation } from "@tanstack/react-query";

interface UploadResponse {
  message: string;
  url: string;
}

export function useUploadFiles() {
  return useMutation<UploadResponse, Error, FormData>({
    mutationFn: async (formData: FormData) => {
      const response = await fetch("/api/files/upload", {
        method: "POST",
        credentials: "include",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "An error occurred uploading files");
      }

      return data;
    },
  });
}
