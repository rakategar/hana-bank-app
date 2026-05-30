import { supabase, STORAGE_BUCKET } from './supabase';

// Kompresi gambar client-side dengan canvas sebelum upload (target <= maxKB)
export async function compressImage(file, maxKB = 500) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const scale = Math.min(1, Math.sqrt((maxKB * 1024) / file.size));
      canvas.width = Math.max(1, Math.round(img.width * scale));
      canvas.height = Math.max(1, Math.round(img.height * scale));
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      canvas.toBlob(
        (blob) => {
          URL.revokeObjectURL(url);
          if (blob) resolve(blob);
          else reject(new Error('Kompresi gambar gagal.'));
        },
        'image/jpeg',
        0.8
      );
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('File gambar tidak valid.'));
    };
    img.src = url;
  });
}

// Upload gambar bukti aktivitas ke Supabase Storage
export async function uploadActivityImage({ userId, date, timeSlot, file }) {
  const compressed = await compressImage(file);
  const uuid = crypto.randomUUID();
  const timeForPath = timeSlot.replace(':', '-'); // 07:30 → 07-30
  const path = `${userId}/${date}/${timeForPath}_${uuid}.jpg`;

  const { error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(path, compressed, { contentType: 'image/jpeg', upsert: true });

  if (error) throw error;

  // Signed URL untuk bucket private (berlaku 1 minggu)
  const { data: signed } = await supabase.storage
    .from(STORAGE_BUCKET)
    .createSignedUrl(path, 60 * 60 * 24 * 7);

  // Catat metadata
  await supabase.from('activity_images').insert({
    user_id: userId,
    date,
    time_slot: timeSlot,
    storage_path: path,
    public_url: signed?.signedUrl || null,
    file_size_kb: Math.round(compressed.size / 1024),
  });

  return { path, url: signed?.signedUrl || null };
}
