export const loadImage = (src: string, cross: boolean = false): Promise<HTMLImageElement|null> => new Promise(res => {
  const img = new Image;
  cross && (img.crossOrigin = 'anonymous');
  img.onload = () => res(img);
  img.onerror = () => res(null);
  img.src = src + '?' + Date.now();
});