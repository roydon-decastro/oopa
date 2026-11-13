import { validatePhoto } from "./storage";

export const MAX_PHOTOS = 20;

export function photosFrom(formData: FormData, field = "photos") {
  return formData.getAll(field).filter((f): f is File => f instanceof File && f.size > 0);
}

export function checkPhotos(files: File[], existing = 0): string | undefined {
  if (existing + files.length > MAX_PHOTOS) return `You can upload up to ${MAX_PHOTOS} photos.`;
  for (const f of files) {
    const err = validatePhoto(f);
    if (err) return err;
  }
}
