import addDragControl, { PointerMoveEvent } from './drag-control';
import './index.css';
import { Img, loadImage, setTransform } from './utils';

/**
 * 캔버스에 그려진 이미지(스티커)를 삭제하고 자유자재로 드래그앤드랍, 리사이징, 회전 기능
 */

const deleteButton = Img({
  src: "https://hashsnap-static.s3.ap-northeast-2.amazonaws.com/file/kiosk-file/button-delete-sticker.svg",
  crossOrigin: "anonymous"
});
const rotateButton = Img({
  src: "https://hashsnap-static.s3.ap-northeast-2.amazonaws.com/file/kiosk-file/button-rotate-sticker.svg",
  crossOrigin: "anonymous"
});

// 1. 스티커 노드 만들기
class Sticker {
  x!: number;
  y!: number;
  scale!: number;
  minScale!: number;
  maxScale!: number;
  constructor (public img: HTMLImageElement, { x, y, defaultWidth = 200, minWidth = 80, maxWidth = 900 }: {x?: number; y?: number; defaultWidth?: number; minWidth?: number; maxWidth?: number}) {
    const init = () => Object.assign(this, {
      x,
      y,
      scale: defaultWidth / img.width,
      minScale: minWidth / img.width,
      maxScale: maxWidth / img.width,
    });
    img.complete && init();
    img.onload = () => init();
    console.log(this);
  }
  get width () {
    return this.img.width * this.scale;
  }
  get height () {
    return this.img.height * this.scale;
  }
  get widthHalf() {
    return this.width / 2;
  }
  get heightHalf() {
    return this.height / 2;
  }
  get centerX() {
    return - this.widthHalf + this.x;
    // return this.x - this.widthHalf;
  }
  get centerY() {
    return - this.heightHalf + this.y;
    // return this.y - this.heightHalf;
  }
  move(x: number, y: number){
    this.x = x;
    this.y = y;
  }
}

// 2. 스티커 보드 
class StickerBoard {
  private handlSize = 50;
  store: Sticker[] = [];
  forced: Sticker|null = null;

  canvas!: HTMLCanvasElement;
  ctx!: CanvasRenderingContext2D;
  width!: number;
  height!: number;
  left!: number;
  top!: number;
  background!: HTMLImageElement|HTMLCanvasElement;

  init(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.width = canvas.width;
    this.height = canvas.height;
    this.left = canvas.offsetLeft;
    this.top = canvas.offsetTop;
    this.ctx = canvas.getContext('2d') as CanvasRenderingContext2D;
  }
  moveHandler(ev: PointerMoveEvent, sticker: Sticker) {
    console.log('moveHandler', sticker)
    this.move(sticker.x + ev.dx, sticker.y + ev.dy);
  }
  upHandler(ev: PointerMoveEvent, sticker: Sticker) {
    console.log('upHandler', sticker);
  }
  drawImage(img: HTMLImageElement, x: number, y: number, width: number, height: number) {
    this.ctx.drawImage(img, x, y, width, height);
  }
  draw() {
    if (!this.forced) return console.warn('not found sticker image');
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    if (this.background) this.ctx.drawImage(this.background, 0, 0);
    this.store.forEach(sticker => {
      this.drawImage(sticker.img, sticker.centerX, sticker.centerY, sticker.width, sticker.height)
    });

    this.drawMoveRect(this.forced);
    this.drawRemoveRect(this.forced);
  }
  drawMoveRect(sticker: Sticker) {
    const {width, height, centerX: x, centerY: y} = sticker;
    this.ctx.beginPath();
    this.ctx.strokeStyle = "cyan";
    this.ctx.lineWidth = 5;
    this.ctx.rect(x - (this.ctx.lineWidth / 2), y - (this.ctx.lineWidth / 2), width + this.ctx.lineWidth, height + this.ctx.lineWidth);

    this.ctx.globalCompositeOperation = "difference";
    this.ctx.stroke();

    this.ctx.closePath();
  }
  drawRemoveRect(sticker: Sticker) {
    const {width, height, centerX: x, centerY: y} = sticker;
    this.ctx.beginPath();
    this.ctx.strokeStyle = "cyan";
    this.ctx.lineWidth = 5;
    this.ctx.rect(x - this.handlSize / 2, y - this.handlSize / 2, this.handlSize, this.handlSize);
    this.ctx.globalCompositeOperation = "difference";
    this.ctx.stroke();
    this.ctx.closePath();
  }
  move(x: number, y: number) {
    if(!this.forced) return;
    this.forced.move(x, y);
    this.draw();
  }
  add(sticker: Sticker) {
    this.forced = sticker;
    this.store.push(sticker);
    this.setBoundingClientRect();
    this.draw();
  }
  find(pageX: number, pageY: number) {
    console.log(this.ctx.isPointInPath(pageX, pageY))
    // const finded = this.store.find(node => {
    //   const {centerX: x, centerY: y, width, height} = node;
    //   if (pageX >= x && pageX <= x + width && pageY >= y && pageY <= y + height) {
    //     return node;
    //   }
    // });
    // this.forced = finded ?? null;
    // return this.forced;
  }
  correction(clientX: number, clientY: number): [number, number] {
    const {left, top, width, height} = this.canvas.getBoundingClientRect();
    return [clientX - left, clientY - top];
  }
  transform(sticker: Sticker, f: () => void) {
    // setTransform(this.ctx, { x: sticker.x, y: sticker.y, rotate: 0 }, f);
  }
  setBackground(background: HTMLImageElement|HTMLCanvasElement) {
    this.background = background;
    if (this.background) this.ctx.drawImage(this.background, 0, 0);
  }
  setBoundingClientRect() {
    const { left, top, width, height } = this.canvas.getBoundingClientRect();
    Object.assign(this, { top, left, width, height });
  }
}

// 메인 로직
const main = async () => {try {
  const img1 = await loadImage('https://hashsnap-static.s3.ap-northeast-2.amazonaws.com/kiosk/210611_hera/sticker1.png') as HTMLImageElement;
  const img2 = await loadImage('https://hashsnap-static.s3.ap-northeast-2.amazonaws.com/kiosk/210611_hera/sticker3.png') as HTMLImageElement;
  const img3 = await loadImage('https://hashsnap-static.s3.ap-northeast-2.amazonaws.com/kiosk/210611_hera/sticker10.png') as HTMLImageElement;
  const img4 = await loadImage('https://hashsnap-static.s3.ap-northeast-2.amazonaws.com/kiosk/210611_hera/sticker6.png') as HTMLImageElement;
  const bg = await loadImage('https://picsum.photos/600/600') as HTMLImageElement;

  const canvas = Object.assign(document.createElement('canvas'), {width: 600, height: 600, style: `
    background: url(${bg.src}) no-repeat center / cover;
    margin: 0 auto;
    position: relative;
  `}) as HTMLCanvasElement;
  
  const stickerBoard = new StickerBoard();
  stickerBoard.init(canvas);
  stickerBoard.setBackground(bg);

  const stickerInner = Object.assign(document.createElement('div'), { style: "width: 100%; text-align: center" });
  document.body.appendChild(stickerInner);
  document.body.appendChild(canvas);

  [img1, img2, img3, img4].forEach((img) => {
    img.style.width = "auto";
    img.style.height = "85px";
    img.style.margin = "0 auto";
    img.onclick = (ev) => {
      ev.preventDefault();
      const sticker = new Sticker(img as HTMLImageElement, {x: canvas.width / 2, y: canvas.height / 2});
      stickerBoard.add(Object.assign(sticker));
    };
    stickerInner.appendChild(img);
  });
  
  let dragListener: any;
  dragListener?.();
  dragListener = addDragControl(canvas, {
    down: (ev) => {
      const {ox, oy, clientX, clientY} = ev;
      const [pageX, pageY] = stickerBoard.correction(clientX, clientY);
      const target = stickerBoard.find(pageX, pageY);
      return target;
    }, 
    move: (ev, payload) => {
      const {dx, dy, tx, ty} = ev;
      stickerBoard.moveHandler(ev, payload);
      // stickerBoard.move({tx: dy, ty: dx}, payload);
    }, 
    up: (ev, payload) => {
      const {dx, dy, tx, ty} = ev;
      stickerBoard.upHandler(ev, payload);
    }
  });
  
} catch(err: any) {
  throw new Error(err)
}}

main();