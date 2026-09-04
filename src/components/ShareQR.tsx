import { useEffect, useRef, useState } from 'react';
import { buildShareUrl } from '../lib/share';
import type { GeneratedRoute } from '../types';

export default function ShareQR({ route }: { route: GeneratedRoute }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [url] = useState(() => buildShareUrl(route));
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!show || !canvasRef.current) return;
    // Use external QR API via image then draw to canvas to allow download, fallback to simple encoding
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => { ctx.clearRect(0, 0, canvas.width, canvas.height); ctx.drawImage(img, 0, 0, 200, 200); };
    img.onerror = () => {
      ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, 200, 200);
      ctx.fillStyle = '#000'; ctx.font = '10px sans-serif'; ctx.fillText('QR indisponible', 50, 100);
    };
    img.src = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(url)}`;
  }, [show, url]);

  return (
    <div className="space-y-2">
      <button onClick={() => setShow((v) => !v)} className="rounded-xl bg-purple-600 px-3 py-2 text-sm text-white">{show ? 'Masquer QR' : 'Afficher QR'}</button>
      {show && (
        <div className="rounded-xl border bg-white p-3 flex flex-col items-center gap-2">
          <canvas ref={canvasRef} width={200} height={200} className="border" />
          <a href={url} className="text-xs underline break-all max-w-[250px] text-center">{url}</a>
          <button onClick={() => { const c = canvasRef.current; if (!c) return; const a = document.createElement('a'); a.href = c.toDataURL('image/png'); a.download = 'parcours-qr.png'; a.click(); }} className="text-xs underline">Télécharger QR</button>
        </div>
      )}
    </div>
  );
}
