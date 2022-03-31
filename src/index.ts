import addDragControl, { PointerMoveEvent } from './drag-control';
import './index.css';
import { loadImage } from './utils';

/**
 * 캔버스에 그려진 이미지(스티커)를 삭제하고 자유자재로 드래그앤드랍, 리사이징, 회전 기능
 */
const setTransform = (ctx: CanvasRenderingContext2D, { x, y, rotate }: { x: number, y: number, rotate: number }, f: () => void) => {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate((Math.PI / 180) * rotate);
  ctx.translate(-x, -y);
  f();
  ctx.restore();
};

// 1. 스티커 노드 만들기
class Node {
  x!: number;
  y!: number;
  scale!: number;
  minScale!: number;
  maxScale!: number;
  constructor (public img: HTMLImageElement, {id, x = 0, y = 0, width = 100, minWidth = 50, maxWidth = 900}: {id: number; x: number; y: number; width: number; minWidth: number; maxWidth: number}) {
    const init = () => Object.assign(this, {
      id,
      x,
      y,
      scale: width / img.width,
      minScale: minWidth / img.width,
      maxScale: maxWidth / img.width,
    });
    img.complete && init();
    img.onload = () => init();
  }
  get width () {
    return this.img.width * this.scale;
  }
  get height () {
    return this.img.height * this.scale;
  }
  move(x: number, y: number){
    this.x = x;
    this.y = y;
  }
}

// 2. 스티커 보드 
class StickerBoard {
  store: Node[] = [];
  forced: Node|null = null;

  canvas!: HTMLCanvasElement;
  ctx!: CanvasRenderingContext2D;
  width!: number;
  height!: number;
  init(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.width = canvas.width;
    this.height = canvas.height;
    this.ctx = canvas.getContext('2d') as CanvasRenderingContext2D;

    this.ctx.fillStyle = '#F8DF01';
    this.ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
  moveHandler(ev: PointerMoveEvent, sticker: Node) {
    this.move(sticker.x + ev.dx, sticker.y + ev.dy);
  }
  upHandler({tx, ty}: {tx: number, ty: number}, sticker: Node) {
    
  }
  draw(img: HTMLImageElement, x: number, y: number, width: number, height: number) {
    if (!img) console.warn('not found sticker image');
    // this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.ctx.drawImage(img, x, y, width, height);
    console.log(x,y)
  }
  move(x: number, y: number) {
    if(!this.forced) return;
    this.forced.move(x, y);
    this.draw(this.forced.img, x, y, this.forced.width, this.forced.height);
  }
  add(node: Node) {
    this.store.push(node);
    this.forced = node;
    this.store.forEach(sticker => this.draw(sticker.img, sticker.x, sticker.y, sticker.width, sticker.height));
  }
  find(pageX: number, pageY: number) {
    const finded = this.store.find(node => {
      const {x, y, width, height} = node;
      if (pageX >= x && pageX <= x + width && pageY >= y && pageY <= y + height) {
        return node;
      }
    });
    this.forced = finded ?? null;
    return this.forced;
  }
  correction(clientX: number, clientY: number): [number, number] {
    const {left, top, width, height} = this.canvas.getBoundingClientRect();
    return [clientX - left, clientY - top];
  }
  transform(sticker: Node, f: () => void) {
    setTransform(this.ctx, { x: sticker.x, y: sticker.y, rotate: 0 }, f);
  }
}

// 메인 로직
const main = async () => {try {
  const img1 = await loadImage('https://hashsnap-static.s3.ap-northeast-2.amazonaws.com/kiosk/210611_hera/sticker1.png') as HTMLImageElement;
  const img2 = await loadImage('https://hashsnap-static.s3.ap-northeast-2.amazonaws.com/kiosk/210611_hera/sticker3.png') as HTMLImageElement;
  const img3 = await loadImage('https://hashsnap-static.s3.ap-northeast-2.amazonaws.com/kiosk/210611_hera/sticker10.png') as HTMLImageElement;
  const img4 = await loadImage('https://hashsnap-static.s3.ap-northeast-2.amazonaws.com/kiosk/210611_hera/sticker6.png') as HTMLImageElement;
  
  const canvas = document.getElementById('canvas') as HTMLCanvasElement;
  const stickerBoard = new StickerBoard();
  stickerBoard.init(canvas);

  const node = new Node(img2 as HTMLImageElement, {id: 0, x: 0, y: 0, width: 150, minWidth: 50, maxWidth: 900});
  stickerBoard.add(Object.assign(node, {x: (canvas.width / 2) - (node.width / 2), y: (canvas.height / 2) - (node.height / 2)}));
  
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
    }
  });
  

  
} catch(err: any) {
  throw new Error(err)
}}

main();