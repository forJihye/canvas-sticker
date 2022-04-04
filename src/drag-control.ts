
export type PointerDownEvent = PointerEvent & { ox: number; oy: number; };
export type PointerMoveEvent = PointerEvent & { dx: number; dy: number; tx: number; ty: number; };
export type PointerUpEvent = PointerEvent & { dx: number; dy: number; tx: number; ty: number; };

// 드래그 컨드롤
const dragControl = new class DragControl {
  tx!: number;
  ty!: number;
  prevX!: number;
  prevY!: number;
  payload!: any;
  down?: (ev: PointerDownEvent) => void;
  move?: (ev: PointerMoveEvent, payload: any) => void;
  up?: (ev: PointerUpEvent, payload: any) => void;
  constructor() {
    window.addEventListener('pointerdown', this.pointerdown.bind(this));
    window.addEventListener('pointermove', this.pointermove.bind(this));
    window.addEventListener('pointerup', this.pointerup.bind(this));
  }
  pointerdown(ev: PointerEvent){
    const {clientX, clientY} = ev;
    this.prevX = clientX;
    this.prevY = clientY;
    this.tx = clientX;
    this.ty = clientY;
    
    this.down?.(Object.assign(ev, {ox: this.prevX, oy: this.prevY}));
  }
  pointermove(ev: PointerEvent){
    const {clientX, clientY} = ev;
    const dx = clientX - this.prevX;
    const dy = clientY - this.prevY;  // 이동된 간격 위치값 
    this.prevX = clientX;
    this.prevY = clientY;
    
    this.move?.(Object.assign(ev, {dx, dy, tx: clientX - this.tx, ty: clientY - this.ty}), this.payload);
  }
  pointerup(ev: PointerEvent){
    const {clientX, clientY} = ev;
    const dx = clientX - this.prevX;
    const dy = clientY - this.prevY;
    this.prevX = clientX;
    this.prevY = clientY;
    
    this.up?.(Object.assign(ev, {dx, dy, tx: clientX - this.tx, ty: clientY - this.ty}), this.payload);
    this.clear();
    this.payload = undefined;
  }
  setDown(f?: (ev: PointerDownEvent) => void) {
    this.down = f;
  }
  setMove(f?: (ev: PointerMoveEvent, payload: any) => void) {
    this.move = f;
  }
  setUp(f?: (ev: PointerUpEvent, payload: any) => void) {
    this.up = f;
  }
  clear() {
    this.setDown();
    this.setMove();
    this.setUp();
  }
}

const addDragControl = (
  target: HTMLElement, 
  handlers: {
    down?(ev: PointerDownEvent): void;
    move?(ev: PointerMoveEvent, payload: any): void;
    up?(ev: PointerUpEvent, payload: any): void;
    cancel?(ev: PointerEvent): void;
  }
) => {
  const {down, move, up, cancel} = handlers;

  const downHanlder = (ev: PointerEvent) => {
    ev.preventDefault();
    const payload = down?.(ev as PointerDownEvent);
    if (payload === null || payload === undefined) {
      dragControl.setMove();
      dragControl.setUp();
      // dragControl.clear()
      cancel?.(ev);
    } else {
      dragControl.payload = payload;
      dragControl.setMove(move);
      dragControl.setUp(up);
    }
  }
  target.addEventListener('pointerdown', downHanlder);

  return () => {
    dragControl.clear();
    target.removeEventListener('pointerdown', downHanlder);
  }
}

export default addDragControl;