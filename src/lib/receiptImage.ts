function canvasToWebp(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(blob => {
      if (!blob || blob.type !== 'image/webp') reject(new Error('הדפדפן לא הצליח להכין את צילום הקבלה.'));
      else resolve(blob);
    }, 'image/webp', quality);
  });
}

export async function compressReceipt(file: File): Promise<Blob> {
  if (!file.type.startsWith('image/')) throw new Error('אפשר לצרף צילום קבלה בלבד.');
  if (file.size > 20_000_000) throw new Error('התמונה המקורית גדולה מדי. בחרו צילום קטן מ־20MB.');

  const url = URL.createObjectURL(file);
  let image: HTMLImageElement;
  try {
    image = await new Promise((resolve, reject) => {
      const next = new Image();
      next.onload = () => resolve(next);
      next.onerror = () => reject(new Error('לא ניתן לפתוח את התמונה. נסו לצרף צילום בפורמט JPEG או PNG.'));
      next.src = url;
    });
  } finally {
    URL.revokeObjectURL(url);
  }

  for (const maxSide of [1800, 1400, 1100]) {
    const scale = Math.min(1, maxSide / Math.max(image.naturalWidth, image.naturalHeight));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
    const context = canvas.getContext('2d');
    if (!context) throw new Error('לא ניתן לעבד את צילום הקבלה.');
    context.fillStyle = '#fff';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    for (const quality of [0.85, 0.72, 0.6]) {
      const blob = await canvasToWebp(canvas, quality);
      if (blob.size <= 350_000) return blob;
    }
  }
  throw new Error('הצילום מכיל יותר מדי פרטים לדחיסה. נסו צילום ברור וממוקד יותר.');
}

export function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('לא ניתן לקרוא את צילום הקבלה.'));
    reader.readAsDataURL(blob);
  });
}
