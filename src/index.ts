import addDragControl, { PointerDownEvent, PointerMoveEvent, PointerUpEvent } from './drag-control';
import './index.css';
import { comp, Img, loadImage, setTransform } from './utils';

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

const getDegree = (cursorX: number, cursorY: number, centerX: number, centerY: number) => 180 - (Math.atan2(cursorX - centerX, cursorY - centerY) * 180) / Math.PI;
const getDistance = (cursorX: number, cursorY: number, centerX: number, centerY: number) => Math.pow(Math.pow(cursorX - centerX, 2) + Math.pow(cursorY - centerY, 2), 1 / 2);

// 1. 스티커 노드 만들기
class Sticker {
  id!: number;
  x!: number;
  y!: number;
  width!: number;
  height!: number;
  minWidth!: number;
  maxWidth!: number;
  scale!: number;
  minScale!: number;
  maxScale!: number;
  rotate!: number;
  offsetDegree!: number;
  constructor (public img: HTMLImageElement, { id, left, top, defaultWidth = 200, minWidth = 80, maxWidth = 900 }: {id: number; left: number; top: number; defaultWidth?: number; minWidth?: number; maxWidth?: number}) {
    const init = () => {
      const scale = defaultWidth / img.width;
      const width = img.width * scale;
      const height = img.height * scale;
      Object.assign(this, {
        id,
        x: - (width / 2) + left,
        y: - (height / 2) + top,
        width,
        height,
        minWidth,
        maxWidth,
        scale: scale,
        minScale: minWidth / img.width,
        maxScale: maxWidth / img.width,
        offsetDegree: getDegree(img.width, img.height, 0, 0)
      })
    };
    img.complete && init();
    img.onload = () => init();
    console.log(this);
  }
  move(x: number, y: number){
    this.x = x;
    this.y = y;
  }
  ratioResize(xRatio: number, yRatio: number, tx: number, ty: number, x: number, y: number, width: number, height: number) {
    const prevWidth = width;
    const prevHeight = height;
    this.width = comp(width + tx, this.minWidth, this.maxWidth);
    this.height = comp(height + ty, this.minWidth, this.maxWidth);
    const dx = this.width - prevWidth;
    const dy = this.height - prevHeight;
    this.x = x - dx * xRatio;
    this.y = y - dy * yRatio;
  }
}

// 2. 스티커 보드 
class StickerBoard {
  private handlSize = 50;
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
      this.drawImage(sticker.img, sticker.x, sticker.y, sticker.width, sticker.height)
    });
    
    if (this.focus === null) return;
    this.drawMoveRect(this.focus, false);
    this.drawRemoveRect(this.focus, false);
    this.drawTransformRect(this.focus, false)
  }
  drawMoveRect(sticker: Sticker, hide: boolean) {
    const {width, height, x, y} = sticker;
    this.ctx.beginPath();
    this.ctx.strokeStyle = "cyan";
    this.ctx.lineWidth = !hide ? 5 : 0;
    this.ctx.rect(x - (this.ctx.lineWidth / 2), y - (this.ctx.lineWidth / 2), width + this.ctx.lineWidth, height + this.ctx.lineWidth);
    if (!hide) {
      this.ctx.globalCompositeOperation = "difference";
      this.ctx.stroke();
    }
    this.ctx.closePath();
  }
  drawRemoveRect(sticker: Sticker, hide: boolean) {
    const {width, height, x, y} = sticker;
    this.ctx.beginPath();
    this.ctx.strokeStyle = "cyan";
    this.ctx.lineWidth = !hide ? 5 : 0;
    this.ctx.rect(x - this.handlSize / 2, y - this.handlSize / 2, this.handlSize, this.handlSize);
    if (!hide) {
      this.ctx.globalCompositeOperation = "source-over";
      this.ctx.stroke();
    }
    this.ctx.closePath();
  }
  drawTransformRect(sticker: Sticker, hide: boolean) {
    const {width, height, x, y} = sticker;
    this.ctx.beginPath();
    this.ctx.strokeStyle = "cyan";
    this.ctx.lineWidth = !hide ? 5 : 0;
    this.ctx.rect((x + width) - this.handlSize / 2, (y + height) - this.handlSize / 2, this.handlSize, this.handlSize);
    if (!hide) {
      this.ctx.globalCompositeOperation = "source-over";
      this.ctx.stroke();
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
          isFouced = true;
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
        this.isTransform = false;
        isFouced = true;
      }
      if (isFouced) return;
    }
    // 캔버스 빈 공간 선택
    this.focus = null;
    // const finded = this.store.find(node => {
    //   const {centerX: x, centerY: y, width, height} = node;
    //   if (pageX >= x && pageX <= x + width && pageY >= y && pageY <= y + height) {
    //     return node;
    //   }
    // });
    // this.forced = finded ?? null;
    // return this.forced;
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
  transform(
    x: number,
    y: number,
    width: number,
    height: number,
    offsetDegree: number,
    deltaDegree: number,
    currentDistance: number
  ) {
    if (this.focus === null) return; 
  }
  // transform(tx: number, ty: number, x: number, y: number, width: number, height: number) {
  //   if (this.focus === null) return;
  //   tx = (ty * width) / height;
  //   this.focus.ratioResize(0.5, 0.5, tx, ty, x, y, width, height);
  // }
  correction(clientX: number, clientY: number): [number, number] {
    const {left, top, width, height} = this.canvas.getBoundingClientRect();
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
    const {dx, dy, tx, ty, clientX, clientY} = ev;
    const {x, y, width, height, offsetDegree} = sticker;
    const [pageX, pageY] = this.correction(clientX, clientY);
    
    if (this.isTransform) {
      const currentDegree = getDegree(pageX, pageY, x, y);
      const currentDistance = getDistance(pageX, pageY, x, y);
      const deltaDegree = currentDegree - this.originDegree;
      // this.transform(tx, ty, x, y, width, height)
      this.transform(x, y, width, height, offsetDegree, deltaDegree, currentDistance)
      this.draw()
    } else {
      const moveX = comp(0 - width/2, x + tx, this.canvas.width - width/2);
      const moveY = comp(0 - height/2, y + ty, this.canvas.height - height/2);
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