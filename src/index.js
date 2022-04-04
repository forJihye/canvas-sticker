const {body} = document;
const createElement = (tagName, properties) => Object.assign(document.createElement(tagName), properties);
const Div = properties => createElement('div', properties);
const Img = ({crossOrigin, onload, onerror, ...properties}) => Object.assign(createElement('img', {crossOrigin, onload, onerror}), properties);
const Button = properties => createElement('button', properties);
const Canvas = properties => createElement('canvas', properties);
const createCanvas = properties => {
  const canvas = Canvas(properties);
  return [canvas, canvas.getContext('2d')];
};

const deleteButton = Img({src: 'https://hashsnap-static.s3.ap-northeast-2.amazonaws.com/file/kiosk-file/button-delete-sticker.svg', crossOrigin: 'anonymous'});
const rotateButton = Img({src: 'https://hashsnap-static.s3.ap-northeast-2.amazonaws.com/file/kiosk-file/button-rotate-sticker.svg', crossOrigin: 'anonymous'});

const createHandlers = (target, type) => {
  const handlers = new Set;
  target.addEventListener(type, ev => handlers.forEach(f => f(ev)));
  return handlers;
};
const runHandlers = handlers => (...params) => handlers.forEach(f => f(...params));
const draggable = (target) => {
  const downHandlers = new Set;
  const moveHandlers = new Set;
  const upHandlers = new Set;
  
  let pushed = false;
  let ox;
  let oy;
  let dx;
  let dy;

  target.addEventListener('pointerdown', ev => {
    pushed = true;
    const {clientX, clientY} = ev;
    ox = clientX;
    oy = clientY;
    runHandlers(downHandlers)({clientX: ox, clientY:oy},ev);
  });
  target.addEventListener('pointermove', ev => {
    if (!pushed) return;
    const {clientX, clientY} = ev;
    dx = clientX - ox;
    dy = clientY - oy;
    ox = clientX;
    oy = clientY;
    runHandlers(moveHandlers)({clientX: ox, clientY:oy, deltaX: dx, deltaY: dy, pageX: ev.pageX, pageY: ev.pageY}, ev);
  });
  target.addEventListener('pointerup', ev => {
    pushed = false;
    const {clientX, clientY} = ev;
    ox = clientX;
    oy = clientY;
    runHandlers(upHandlers)({clientX: ox, clientY:oy},ev);
  });

  return [downHandlers, moveHandlers, upHandlers];
};

const getCenter = (box, correctionX = v => v, correctionY = v => v) =>  [correctionX(box.width / 2), correctionY(box.height / 2)];
const comp = (min, value, max) => Math.max(min, Math.min(value, max));
// canvas
const rectOuter = (ctx, x, y, width, height) => ctx.rect(x - ctx.lineWidth / 2, y - ctx.lineWidth / 2, width + ctx.lineWidth, height + ctx.lineWidth);
const arcOuter = (ctx, x, y, size) => ctx.arc(x - ctx.lineWidth / 2, y - ctx.lineWidth / 2, size + ctx.lineWidth, 0, 2 * Math.PI);
const getDegree = (cursorX, cursorY, centerX, centerY) => 180 - Math.atan2(cursorX - centerX, cursorY - centerY) * 180 / Math.PI
const getDistance = (cursorX, cursorY, centerX, centerY) => Math.pow(Math.pow(cursorX - centerX, 2) + Math.pow(cursorY - centerY, 2), 1 / 2);

const setTransform = (ctx, {left, top, rotate}, f) => {
  ctx.save();
  ctx.translate(left, top);
  ctx.rotate(Math.PI / 180 * rotate);
  ctx.translate(-left, -top);
  f();
  ctx.restore();
};

class Sticker {
  constructor(img, {left = 0, top = 0, defaultWidth = 300, maxWidth = 1200, minWidth = 150} = {}) {
    const init = () => {
      Object.assign(this, {img, left, top, rotate: 0, scale: defaultWidth / img.width, minScale: minWidth / img.width, maxScale: maxWidth / img.width, offsetDegree: getDegree(img.width, img.height, 0, 0)});
      console.log(img.width, img.height);
    };
    img.complete && init();
    img.onload = () => init();
  }
  get width() {
    return this.img.width * this.scale;
  }
  get height() {
    return this.img.height * this.scale;
  }
  get widthHalf() {
    return this.width / 2;
  }
  get heightHalf() {
    return this.height / 2;
  }
  get leftByCenter() {
    return - this.widthHalf + this.left;
  }
  get topByCenter() {
    return - this.heightHalf + this.top;
  }
}
class StickerBoard {
  static REMOVE_SIZE = 50;
  canvas = Canvas();
  focusIndex = -1;
  init(canvas) {
    this.canvas = canvas;
    this.width = canvas.width;
    this.height = canvas.height;
    this.left = canvas.offsetLeft;
    this.top = canvas.offsetTop;
    this.focus = null;
    this.focusIndex = -1;
    this.store = [];
    this.isRotate = false;
    this.draw();
  }
  get ctx() {
    return this.canvas.getContext('2d');
  }
  transform({left, top, rotate}, f) {
    setTransform(this.ctx, {left, top, rotate}, f);
  };
  drawIamge({img, leftByCenter, topByCenter, width, height}) {
    this.ctx.drawImage(img, leftByCenter, topByCenter, width, height);
  }
  draw() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    if (this.background) this.ctx.drawImage(this.background, 0, 0);
    this.store.forEach(sticker => {
      this.transform(sticker, () => this.drawIamge(sticker));
    });

    if (this.focus === null) return;
    this.transform(this.focus, () => {
      this.drawMoveRect(this.focus);
      this.drawRemoveArc(this.focus);
      this.drawResizeArc(this.focus);
    });
  }
  drawMoveRect(sticker, hide) {
    const {width, height, leftByCenter, topByCenter} = sticker;
    this.ctx.beginPath();
    this.ctx.strokeStyle = 'cyan';
    this.ctx.lineWidth = !hide ? 5 : 0;
    rectOuter(this.ctx, leftByCenter, topByCenter, width, height);
    if (!hide) {
      this.ctx.globalCompositeOperation = 'difference';
      this.ctx.stroke();
    }
    this.ctx.closePath();
  }
  drawRemoveArc(sticker, hide) {
    const size = StickerBoard.REMOVE_SIZE;
    const {width, height, left, top, leftByCenter, topByCenter} = sticker;
    this.ctx.beginPath();
    this.ctx.strokeStyle = 'cyan';
    this.ctx.lineWidth = !hide ? 5 : 0;
    arcOuter(this.ctx, leftByCenter, topByCenter, size);
    if (!hide) {
      this.ctx.globalCompositeOperation = 'source-over';
      this.ctx.drawImage(deleteButton, leftByCenter - size, topByCenter - size, size * 2, size * 2);
      // this.ctx.stroke();
    }
    this.ctx.closePath();
  }
  drawResizeArc(sticker, hide) {
    const size = StickerBoard.REMOVE_SIZE;
    const {width, height, left, top, leftByCenter, topByCenter} = sticker;
    this.ctx.beginPath();
    this.ctx.strokeStyle = 'cyan';
    this.ctx.lineWidth = !hide ? 5 : 0;
    arcOuter(this.ctx, leftByCenter + width + this.ctx.lineWidth, topByCenter + height + this.ctx.lineWidth, size);
    if (!hide) {
      this.ctx.globalCompositeOperation = 'source-over';
      this.ctx.drawImage(rotateButton, leftByCenter + width - size, topByCenter + height - size, size * 2, size * 2);
      // this.ctx.stroke();
    }
    this.ctx.closePath();
  }
  downHandler({pageX: originPageX, pageY: originPageY}) {
    const [pageX, pageY] = this.correction(originPageX, originPageY);
    for(const sticker of [...this.store].reverse()) {
      let isBreak;
      this.transform(sticker, () => {
        if (this.focus === sticker) {
          this.drawRemoveArc(sticker, true);
          if (this.ctx.isPointInPath(pageX, pageY)) {
            this.focus = null;
            this.store.splice(this.store.indexOf(sticker), 1);
            return isBreak = true;
          }
          this.drawResizeArc(sticker, true);
          if (this.ctx.isPointInPath(pageX, pageY)) {
            this.originDegree = getDegree(pageX, pageY, sticker.left, sticker.top);
            this.originDistance = getDistance(pageX, pageY, sticker.left, sticker.top);
            this.isRotate = true;
            isBreak = true;
          }
        }

        // 현재 선택 스티커 해제 후 다른 스티커 선택
        this.drawMoveRect(sticker, true);
        if (this.ctx.isPointInPath(pageX, pageY)) {
          this.focus = sticker;
          this.store.push(...this.store.splice(this.store.indexOf(sticker), 1));
          return isBreak = true;
        }
      });
      if (isBreak) return;
    }
    this.focus = null;
  }
  moveHandler(ev) {
    this.isRotate ? this.resizeSticker(ev) : this.translateSticker(ev);
  }
  upHandler(ev) {
    this.isRotate = false;
  }
  correctionScaleX(v) {
    return v * this.canvas.width / this.width;
  }
  correctionScaleY(v) {
    return v * this.canvas.height / this.height
  }
  correction(cursorX, cursorY) {
    const {left, top} = this.canvas.getBoundingClientRect();
    return [
      this.correctionScaleX(cursorX - left - window.scrollX),
      this.correctionScaleY(cursorY - top - window.scrollY),
    ];
  }
  translateSticker({deltaX: originDeltaX, deltaY: originDeltaY}) {
    if (!this.focus) return;
    const deltaX = this.correctionScaleX(originDeltaX);
    const deltaY = this.correctionScaleY(originDeltaY);
    this.focus.left += deltaX;
    this.focus.top += deltaY;
    this.focus.left = comp(0, this.focus.left, this.canvas.width);
    this.focus.top = comp(0, this.focus.top, this.canvas.height);
  }
  resizeSticker({pageX: originPageX, pageY: originPageY}) {
    if (!this.focus) return;
    const {img, width, height, leftByCenter, topByCenter, left, top, maxScale, minScale, offsetDegree} = this.focus;
    const [pageX, pageY] = this.correction(originPageX, originPageY);
    const currentDegree = getDegree(pageX, pageY, left, top);
    const deltaDegree = currentDegree - this.originDegree;
    this.focus.rotate += deltaDegree;
    
    const currentDistance = getDistance(pageX, pageY, left, top);
    const originWidth = Math.abs(Math.cos(180 / Math.PI * offsetDegree) * this.originDistance);
    const currentWidth = Math.abs(Math.cos(180 / Math.PI * offsetDegree) * currentDistance);

    this.focus.scale += currentWidth * 2 / img.width - originWidth * 2 / img.width;
    this.focus.scale = comp(minScale, this.focus.scale, maxScale);

    this.originDegree = currentDegree;
    this.originDistance = currentDistance;
  }
  setBoundingClientRect() {
    const {left, top, width, height} = this.canvas.getBoundingClientRect();
    Object.assign(this, {top, left, width, height});
  }
  clear() {
    this.store.splice(0);
    this.focus = null;
    this.draw();
  }
  setBackground(img) {
    this.background = img;
    console.log(this.background)
    if (this.background) this.ctx.drawImage(this.background, 0, 0);
  }
  focusOut() {
    this.focus = null;
    this.draw();
  }
  add(sticker) {
    console.log(sticker)
    this.setBoundingClientRect();
    this.store.push(sticker);
    this.focus = sticker;
    this.draw();
  }
  remove(index) {
    this.store.splice(index, 1);
    this.focusIndex = -1;
    this.draw();
  }
}

export default function createStickers(canvas) {
  const stickerBoard = new StickerBoard();
  stickerBoard.init(canvas);
  console.log(stickerBoard);
  const [downHandlers, moveHandlers, upHandlers] = draggable(canvas);
  downHandlers.add((data, ev) => {
    stickerBoard.downHandler(ev);
    stickerBoard.draw();
  });
  moveHandlers.add((data, ev) => {
    stickerBoard.moveHandler(data);
    stickerBoard.draw();
  });
  upHandlers.add((data, ev) => {
    stickerBoard.upHandler();
    stickerBoard.draw();
  });

  const img1 = Img({src: 'https://hashsnap-static.s3.ap-northeast-2.amazonaws.com/kiosk/210611_hera/sticker1.png', crossOrigin: 'anonymous'});
  const img2 = Img({src: 'https://hashsnap-static.s3.ap-northeast-2.amazonaws.com/kiosk/210611_hera/sticker3.png', crossOrigin: 'anonymous'});
  const img3 = Img({src: 'https://hashsnap-static.s3.ap-northeast-2.amazonaws.com/kiosk/210611_hera/sticker10.png', crossOrigin: 'anonymous'});
  const img4 = Img({src: 'https://hashsnap-static.s3.ap-northeast-2.amazonaws.com/kiosk/210611_hera/sticker6.png', crossOrigin: 'anonymous'});
  
  body.appendChild(img1)
  // body.appendChild(img2)
  // body.appendChild(img3)
  // body.appendChild(img4)

  const sticker1 = new Sticker(img1, {left: canvas.width / 2, top: canvas.height / 2});
  // const sticker2 = new Sticker(img2, {left: canvas.width / 2, top: canvas.height / 2});
  // const sticker3 = new Sticker(img3, {left: canvas.width / 2, top: canvas.height / 2});
  // const sticker4 = new Sticker(img4, {left: canvas.width / 2, top: canvas.height / 2});

  const button = Button({innerText: 'add sticker'});
  body.appendChild(button);
  button.addEventListener('click', () => stickerBoard.add(new Sticker(img1, {left: canvas.width / 2, top: canvas.height / 2, defaultWidth: 300})));

  setTimeout(() => {
    stickerBoard.add(sticker1);
    // stickerBoard.add(sticker2);
    // stickerBoard.add(sticker3);
    // stickerBoard.add(sticker4);
  }, 2000);

  // const cursor = Div({style: 'position: absolute; pointer-events: none; background: green; width: 5px; height: 5px; z-index: 9999;'})
  // body.appendChild(cursor);
  // const [, wmoveHandlers, ] = draggable(window);
  // window.addEventListener('pointerdown', ev => {
  //   const [left, top] = stickerBoard.correction(ev.pageX, ev.pageY)
  //   console.log(left, top);
  // });
  // window.addEventListener('pointermove', ev => {
  //   const [left, top] = stickerBoard.correction(ev.pageX, ev.pageY)
  //   cursor.style.left = left + 'px';
  //   cursor.style.top = top + 'px';
  // });

  return {
    add(img, defaultWidth, minWidth, maxWidth) {
      const sticker = new Sticker(img, {left: canvas.width / 2, top: canvas.height / 2, defaultWidth, minWidth, maxWidth});
      stickerBoard.add(sticker);
    },
    setBackground(img) {
      stickerBoard.setBackground(img);
    },
    clear() {
      stickerBoard.clear();
    },
    focusOut() {
      stickerBoard.focusOut();
    },
  }
};

const container = Div({style: `
width: 725px; 
display: flex; 
margin: 0 auto; 
align-items:center; 
justify-content: center; 
background: #ddd;
`});
const inner = Div({style: `
width: 60%
`});
const [canvas, ctx] = createCanvas({width: 1200, height: 1800, style: `
background: url(https://picsum.photos/1200/1800) no-repeat center / cover; 
width: 100%; 
height: auto; 
position: relative`
});
createStickers(canvas);

inner.appendChild(canvas);
container.appendChild(inner);
body.appendChild(container);

// container 725.53px;
// width 60
// 435 x 657

// const stickerBoard = new StickerBoard();
// stickerBoard.init(canvas);
// console.log(stickerBoard)
