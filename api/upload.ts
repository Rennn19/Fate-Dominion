import type { VercelRequest, VercelResponse } from '@vercel/node';
import sharp from 'sharp';
import { put } from '@vercel/blob';

// Konfigurasi agar Vercel mengizinkan ukuran request body hingga 10MB
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb',
    },
  },
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // 1. Batasi method hanya POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { fileBufferBase64, fileName } = req.body;

    if (!fileBufferBase64 || !fileName) {
      return res.status(400).json({ error: 'Data file atau nama file tidak ditemukan.' });
    }

    // 2. Decode Base64 ke Node Buffer
    const buffer = Buffer.from(fileBufferBase64, 'base64');

    // 3. Kompresi gambar utama ke WebP (Kualitas 80%) menggunakan Sharp
    const compressedBuffer = await sharp(buffer)
      .resize(1920, 1080, { fit: 'inside', withoutEnlargement: true }) // Maksimal Full HD
      .webp({ quality: 80 })
      .toBuffer();

    // 4. Buat Blur Placeholder Ultra-Ringan (10px Base64)
    const blurBuffer = await sharp(buffer)
      .resize(10)
      .webp({ quality: 20 })
      .toBuffer();

    const blurDataURL = `data:image/webp;base64,${blurBuffer.toString('base64')}`;

    // 5. Upload file WebP ke Vercel Blob
    const cleanFileName = fileName.replace(/[^a-zA-Z0-9_-]/g, '_');
    const blob = await put(`servant-assets/${cleanFileName}-${Date.now()}.webp`, compressedBuffer, {
      access: 'public',
      contentType: 'image/webp',
    });

    return res.status(200).json({
      url: blob.url,
      blurDataURL: blurDataURL,
    });

  } catch (error) {
    console.error("Upload Error:", error);
    return res.status(500).json({ error: (error as Error).message || 'Internal Server Error' });
  }
}
