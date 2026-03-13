import { Router } from 'express';

const ALLOWED_PROTOCOLS = new Set(['http:', 'https:']);

function getFilenameFromUrl(rawUrl: string): string {
  try {
    const parsed = new URL(rawUrl);
    const pathPart = parsed.pathname.split('/').pop();
    if (!pathPart) {
      return 'question-image';
    }
    return decodeURIComponent(pathPart.replace(/[^a-zA-Z0-9._-]/g, '_')) || 'question-image';
  } catch {
    return 'question-image';
  }
}

export const mediaRouter = Router();

mediaRouter.get('/image', async (req, res, next) => {
  try {
    const rawUrl = typeof req.query.url === 'string' ? req.query.url.trim() : '';
    const shouldDownload = req.query.download === '1';

    if (!rawUrl) {
      res.status(400).json({ error: 'Image url is required' });
      return;
    }

    let parsedUrl: URL;
    try {
      parsedUrl = new URL(rawUrl);
    } catch {
      res.status(400).json({ error: 'Invalid image url' });
      return;
    }

    if (!ALLOWED_PROTOCOLS.has(parsedUrl.protocol)) {
      res.status(400).json({ error: 'Only http/https image urls are allowed' });
      return;
    }

    const response = await fetch(parsedUrl.toString(), {
      headers: {
        'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        accept: 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8'
      }
    });

    if (!response.ok) {
      res.status(400).json({ error: 'Failed to fetch image from source url' });
      return;
    }

    const contentType = response.headers.get('content-type') ?? '';
    if (!contentType.startsWith('image/')) {
      res.status(400).json({ error: 'Source URL did not return an image' });
      return;
    }

    const arrayBuffer = await response.arrayBuffer();
    const body = Buffer.from(arrayBuffer);

    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=600');
    if (shouldDownload) {
      const filename = getFilenameFromUrl(parsedUrl.toString());
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    }

    res.status(200).send(body);
  } catch (error) {
    next(error);
  }
});
