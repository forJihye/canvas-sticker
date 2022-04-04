import addDragControl, { PointerDownEvent, PointerMoveEvent, PointerUpEvent } from './drag-control';
import './index.css';
import { comp, Img, loadImage } from './utils';

const deleteButton = Img({
  src: "https://hashsnap-static.s3.ap-northeast-2.amazonaws.com/file/kiosk-file/button-delete-sticker.svg",
  crossOrigin: "anonymous"
});
const rotateButton = Img({
  src: "https://hashsnap-static.s3.ap-northeast-2.amazonaws.com/file/kiosk-file/button-rotate-sticker.svg",
  crossOrigin: "anonymous"
});

const getDegree = (cursorX: number, cursorY: number, centerX: number, centerY: number) => 180 - (Math.atan2(cursorX - centerX, cursorY - centerY) * 180) / Math.PI;
const getDistance = (cursorX: number, cursorY: number, centerX: number, centerY: number) => Math.pow(Math.pow(cursorX - centerX, 2) + Math.pow(cursorY - centerY, 2), 1 / 2);
const setTransform = (ctx: CanvasRenderingContext2D, { x, y, rotate }: { x: number, y: number, rotate: number }, f: () => void) => {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate((Math.PI / 180) * rotate);
  ctx.translate(-x, -y);
  f();
  ctx.restore();
};

// 1. 스티커 노드 만들기
class Sticker {
  id!: number;
  x!: number;
  y!: number;
  minWidth!: number;
  maxWidth!: number;
  scale!: number;
  minScale!: number;
  maxScale!: number;
  rotate!: number;
  offsetDegree!: number;
  constructor (public img: HTMLImageElement, { id, left, top, defaultWidth = 200, minWidth = 50, maxWidth = 600 }: {id: number; left: number; top: number; defaultWidth?: number; minWidth?: number; maxWidth?: number}) {
    const init = () => {
      Object.assign(this, {
        id,
        x: left,
        y: top,
        minWidth,
        maxWidth,
        rotate: 0,
        scale: defaultWidth / img.width,
        minScale: minWidth / img.width,
        maxScale: maxWidth / img.width,
        offsetDegree: getDegree(img.width, img.height, 0, 0)
      });
    };
    img.complete && init();
    img.onload = () => init();
    console.log(this);
  }
  move(x: number, y: number){
    this.x = x;
    this.y = y;
  }
  get width () {
    return this.img.width * this.scale;
  }
  get height () {
    return this.img.height * this.scale;
  }
  get centerX () {
    return - (this.width / 2) + this.x;
  } 
  get centerY () {
    return - (this.height / 2) + this.y;
  } 
}

// 2. 스티커 보드 
class StickerBoard {
  private handlSize = 40;
  store: Sticker[] = [];
  focus: Sticker|null = null;

  canvas!: HTMLCanvasElement;
  ctx!: CanvasRenderingContext2D;
  width!: number;
  height!: number;
  left!: number;
  top!: number;
  background!: HTMLImageElement|HTMLCanvasElement;

  isTransform: boolean = false;
  originDegree: number = 0;
  originDistance: number = 0;
  init(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.width = canvas.width;
    this.height = canvas.height;
    this.left = canvas.offsetLeft;
    this.top = canvas.offsetTop;
    this.ctx = canvas.getContext('2d') as CanvasRenderingContext2D;
  }
  drawImage(img: HTMLImageElement, x: number, y: number, width: number, height: number) {
    this.ctx.drawImage(img, x, y, width, height);
  }
  draw() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    if (this.background) this.ctx.drawImage(this.background, 0, 0);
    this.store.forEach(sticker => {
      const {img, x, y, rotate, width, height, centerX, centerY} = sticker;
      setTransform(this.ctx, {x, y, rotate}, () => {
        this.drawImage(img, centerX, centerY, width, height);
      });
    });

    if (this.focus === null) return;
    setTransform(this.ctx, {x: this.focus.x, y: this.focus.y, rotate: this.focus.rotate}, () => {
      if (this.focus) {
        this.drawMoveRect(this.focus, false);
        this.drawRemoveRect(this.focus, false);
        this.drawTransformRect(this.focus, false)
      }
    });
  }
  drawMoveRect(sticker: Sticker, hide: boolean) {
    const {width, height, x, y, centerX, centerY} = sticker;
    this.ctx.beginPath();
    this.ctx.strokeStyle = "cyan";
    this.ctx.lineWidth = !hide ? 5 : 0;
    this.ctx.rect(centerX - (this.ctx.lineWidth / 2), centerY - (this.ctx.lineWidth / 2), width + this.ctx.lineWidth, height + this.ctx.lineWidth);
    if (!hide) {
      this.ctx.globalCompositeOperation = "difference";
      this.ctx.stroke();
    }
    this.ctx.closePath();
  }
  drawRemoveRect(sticker: Sticker, hide: boolean) {
    const {x, y, centerX, centerY, width, height} = sticker;
    const arcX = centerX - this.ctx.lineWidth / 2;
    const arcY = centerY - this.ctx.lineWidth / 2;
    const radius = (this.handlSize / 2) + this.ctx.lineWidth;

    this.ctx.beginPath();
    this.ctx.strokeStyle = "cyan";
    this.ctx.lineWidth = !hide ? 5 : 0;
    this.ctx.arc(arcX, arcY, radius, 0, 2 * Math.PI)
    if (!hide) {
      this.ctx.globalCompositeOperation = "source-over";
      this.ctx.drawImage(deleteButton, (centerX - this.handlSize / 2) - 5, (centerY - this.handlSize / 2) - 5, this.handlSize + this.ctx.lineWidth, this.handlSize + this.ctx.lineWidth);
      // this.ctx.stroke();
    }
    this.ctx.closePath();
  }
  drawTransformRect(sticker: Sticker, hide: boolean) {
    const {width, height, centerX, centerY} = sticker;
    const arcX = (centerX + width) - this.ctx.lineWidth / 2;
    const arcY = (centerY + height) - this.ctx.lineWidth / 2;
    const radius = (this.handlSize / 2) + this.ctx.lineWidth;

    this.ctx.beginPath();
    this.ctx.strokeStyle = "cyan";
    this.ctx.lineWidth = !hide ? 5 : 0;
    this.ctx.arc(arcX, arcY, radius, 0, 2 * Math.PI)
    if (!hide) {
      this.ctx.globalCompositeOperation = "source-over";
      this.ctx.drawImage(rotateButton, ((centerX + width) - this.handlSize / 2) - 5, ((centerY + height) - this.handlSize / 2) - 5, this.handlSize + this.ctx.lineWidth, this.handlSize + this.ctx.lineWidth);
      // this.ctx.stroke();
    }
    this.ctx.closePath();
  }
  find(pageX: number, pageY: number) {
    for (const sticker of [...this.store].reverse()) {
      let isFouced: boolean = false;
      if (this.focus?.id === sticker.id) {
        // 스티커 삭제
        this.drawRemoveRect(sticker, true)
        if (this.ctx.isPointInPath(pageX, pageY)) {  
          this.focus = null;
          this.store.splice(this.store.indexOf(sticker), 1);
          return isFouced = true;
        }
        // 스티커 변형
        this.drawTransformRect(sticker, true) 
        if (this.ctx.isPointInPath(pageX, pageY)) {
          this.originDegree = getDegree(pageX, pageY, sticker.x, sticker.y);
          this.originDistance = getDistance(pageX, pageY, sticker.x, sticker.y);
          this.isTransform = true;
          isFouced = true;
        }
      }
      // 현재 선택 스티커 해제 후 다른 스티커 선택
      this.drawMoveRect(sticker, true);
      if (this.ctx.isPointInPath(pageX, pageY)) {
        this.focus = sticker;
        this.store.push(...this.store.splice(this.store.indexOf(sticker), 1));
        return isFouced = true;
      }
      if (isFouced) return;
    }
    // 캔버스 빈 공간 선택
    this.focus = null;
    
  }
  move(x: number, y: number) {
    if(!this.focus) return;
    this.focus.move(x, y);
  }
  add(sticker: Sticker) {
    this.focus = sticker;
    this.store.push(sticker);
    this.setBoundingClientRect();
    this.draw();
  }
  transform( pageX: number, pageY: number, tx: number, ty: number ) {
    if (this.focus === null) return; 
    const {img, x, y, offsetDegree, minScale, maxScale} = this.focus;
    
    const currentDegree = getDegree(pageX, pageY, x, y);
    const deltaDegree = currentDegree - this.originDegree;
    this.focus.rotate += deltaDegree;
    
    const currentDistance = getDistance(pageX, pageY, x, y);
    const originWidth = Math.abs(Math.cos(180 / Math.PI * offsetDegree) * this.originDistance);
    const currentWidth = Math.abs(Math.cos(180 / Math.PI * offsetDegree) * currentDistance);

    this.focus.scale += currentWidth * 2 / img.width - originWidth * 2 / img.width;
    this.focus.scale = comp(this.focus.scale, minScale, maxScale);

    this.originDegree = currentDegree;
    this.originDistance = currentDistance;
  }
  correction(clientX: number, clientY: number): [number, number] {
    const {left, top} = this.canvas.getBoundingClientRect();
    return [clientX - left, clientY - top];
  }
  setBackground(background: HTMLImageElement|HTMLCanvasElement) {
    this.background = background;
    if (this.background) this.ctx.drawImage(this.background, 0, 0);
  }
  setBoundingClientRect() {
    const { left, top, width, height } = this.canvas.getBoundingClientRect();
    Object.assign(this, { top, left, width, height });
  }
  downHandler(ev: PointerDownEvent) {
    const {clientX, clientY} = ev;
    const [pageX, pageY] = this.correction(clientX, clientY);
    this.find(pageX, pageY);
    this.draw();
    return this.focus;
  }
  moveHandler(ev: PointerMoveEvent, sticker: Sticker) {
    const {tx, ty, clientX, clientY} = ev;
    const {x, y} = sticker;
    const [pageX, pageY] = this.correction(clientX, clientY);
    if (this.focus === null) return;

    if (this.isTransform) {
      this.transform(pageX, pageY, tx, ty);
      this.draw();
    } else {
      const moveX = comp(0, x + tx, this.canvas.width);
      const moveY = comp(0, y + ty, this.canvas.height);
      this.move(moveX, moveY);
      this.draw()
    }
  }
  upHandler(ev: PointerUpEvent, sticker: Sticker) {
    console.log('upHandler', sticker);
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

  [img1, img2, img3, img4].forEach((img, i) => {
    img.style.width = "auto";
    img.style.height = "85px";
    img.style.margin = "0 auto";
    img.onclick = (ev) => {
      ev.preventDefault();
      const sticker = new Sticker(img as HTMLImageElement, {id: i, left: canvas.width / 2, top: canvas.height / 2});
      stickerBoard.add(Object.assign(sticker));
    };
    stickerInner.appendChild(img);
  });
  
  let dragListener: any;
  dragListener?.();
  dragListener = addDragControl(canvas, {
    down: (ev) => {
      const target = stickerBoard.downHandler(ev);
      return {...target};
    }, 
    move: (ev, payload) => {
      const {dx, dy, tx, ty} = ev;
      stickerBoard.moveHandler(ev, payload);
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
// const finded = this.store.find(node => {
//   const {centerX: x, centerY: y, width, height} = node;
//   if (pageX >= x && pageX <= x + width && pageY >= y && pageY <= y + height) {
//     return node;
//   }
// });
// this.forced = finded ?? null;
// return this.forced;