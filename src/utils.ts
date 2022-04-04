export const loadImage = (src: string, cross: boolean = false): Promise<HTMLImageElement|null> => new Promise(res => {
  const img = new Image;
  cross && (img.crossOrigin = 'anonymous');
  img.onload = () => res(img);
  img.onerror = () => res(null);
  img.src = src + '?' + Date.now();
});

export const Img = ({ src, crossOrigin, onload, onerror, ...properties }: { src: string, crossOrigin: string, onload?: () => void, onerror?: () => void, properties?: any}) => Object.assign(Object.assign(document.createElement('img'), {src, crossOrigin, onload, onerror}, properties));

export const setTransform = (ctx: CanvasRenderingContext2D, { x, y, rotate }: { x: number, y: number, rotate: number }, f: () => void) => {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate((Math.PI / 180) * rotate);
  ctx.translate(-x, -y);
  f();
  ctx.restore();
};


export const comp = (val: number, min: number, max: number) => Math.min(max, Math.max(min, val));