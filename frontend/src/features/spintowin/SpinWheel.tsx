import { useCallback, useEffect, useImperativeHandle, useRef, useState, forwardRef } from 'react';
import { PRIZES, Prize, saveWin } from './prizes';
import { reportSpinWinToServer, type SpinSessionMeta } from './spinWinLog';

type LogoMap = Record<string, HTMLImageElement>;
let logoCacheMap: LogoMap | null = null;

const BRAND_LOGOS: [string, string][] = [
  ['ARMOR ALL', '/products/aall.png'],
  ['JELLY BELLY', '/products/jelly.png'],
  ['ENERGIZER', '/products/energizer.png'],
  ['EVEREADY', '/products/eready.png'],
];

function loadAllLogos(): Promise<LogoMap> {
  if (logoCacheMap) return Promise.resolve(logoCacheMap);
  return Promise.all(
    BRAND_LOGOS.map(
      ([brand, src]) =>
        new Promise<[string, HTMLImageElement]>((resolve) => {
          const img = new Image();
          img.onload = () => resolve([brand, img]);
          img.onerror = () => resolve([brand, img]);
          img.src = src;
        }),
    ),
  ).then((entries) => {
    logoCacheMap = Object.fromEntries(entries);
    return logoCacheMap;
  });
}

export interface SpinWheelHandle {
  spin: () => void;
  isSpinning: () => boolean;
}

interface Props {
  onWin?: (prize: Prize, sku: string, timestamp: string) => void;
  onClaimPrize?: () => void;
  spinSessionMeta?: SpinSessionMeta;
}

const SEGMENT_COUNT = PRIZES.length;
const SEGMENT_ANGLE = (2 * Math.PI) / SEGMENT_COUNT;
const SPIN_DURATION = 4500;
const MIN_ROTATIONS = 5;

function ease(t: number): number {
  if (t < 0.08) {
    const u = t / 0.08;
    return u * u * 0.05;
  }
  const u = (t - 0.08) / 0.92;
  return 0.05 + 0.95 * (1 - Math.pow(1 - u, 4));
}

function drawFrame(canvas: HTMLCanvasElement, rotation: number, logos: LogoMap | null) {
  const ctx = canvas.getContext('2d')!;
  const cx = canvas.width / 2;
  const cy = canvas.height / 2;
  const outerR = Math.min(cx, cy) - 20;
  const innerR = outerR * 0.18;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.6)';
  ctx.shadowBlur = 40;
  ctx.shadowOffsetY = 12;
  ctx.beginPath();
  ctx.arc(cx, cy, outerR + 6, 0, Math.PI * 2);
  ctx.fillStyle = '#111';
  ctx.fill();
  ctx.restore();

  for (let i = 0; i < SEGMENT_COUNT; i++) {
    const startAngle = rotation + i * SEGMENT_ANGLE - Math.PI / 2;
    const endAngle = startAngle + SEGMENT_ANGLE;
    const prize = PRIZES[i];
    const midAngle = startAngle + SEGMENT_ANGLE / 2;

    ctx.save();
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, outerR, startAngle, endAngle);
    ctx.closePath();
    const gx = cx + Math.cos(midAngle) * outerR * 0.55;
    const gy = cy + Math.sin(midAngle) * outerR * 0.55;
    const grad = ctx.createRadialGradient(cx, cy, innerR, gx, gy, outerR);
    grad.addColorStop(0, prize.color + 'bb');
    grad.addColorStop(1, prize.color);
    ctx.fillStyle = grad;
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.18)';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.restore();

    const logo = logos?.[prize.brand];
    if (logo?.naturalWidth) {
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, outerR - 2, startAngle, endAngle);
      ctx.closePath();
      ctx.clip();
      ctx.translate(cx, cy);
      ctx.rotate(midAngle);
      const logoR = outerR * 0.8;
      const radialMax = outerR * 0.36;
      const tangMax = 2 * logoR * Math.sin(SEGMENT_ANGLE / 2) * 0.8;
      const scale = Math.min(radialMax / logo.naturalWidth, tangMax / logo.naturalHeight);
      const lw = logo.naturalWidth * scale;
      const lh = logo.naturalHeight * scale;
      ctx.translate(logoR, 0);
      if (Math.cos(midAngle) < 0) ctx.rotate(Math.PI);
      ctx.drawImage(logo, -lw / 2, -lh / 2, lw, lh);
      ctx.restore();
    }
  }

  ctx.save();
  const rimGrad = ctx.createLinearGradient(cx - outerR, cy - outerR, cx + outerR, cy + outerR);
  rimGrad.addColorStop(0, '#FFD700');
  rimGrad.addColorStop(0.5, '#FFFACD');
  rimGrad.addColorStop(1, '#B8860B');
  ctx.beginPath();
  ctx.arc(cx, cy, outerR + 4, 0, Math.PI * 2);
  ctx.strokeStyle = rimGrad;
  ctx.lineWidth = 7;
  ctx.stroke();
  ctx.restore();

  const hubGrad = ctx.createRadialGradient(cx - innerR * 0.3, cy - innerR * 0.3, 0, cx, cy, innerR);
  hubGrad.addColorStop(0, '#ffffff');
  hubGrad.addColorStop(0.5, '#eeeeee');
  hubGrad.addColorStop(1, '#bbbbbb');
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, innerR, 0, Math.PI * 2);
  ctx.fillStyle = hubGrad;
  ctx.shadowColor = 'rgba(0,0,0,0.35)';
  ctx.shadowBlur = 10;
  ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.12)';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.restore();

  const hubLogo = logos?.ENERGIZER;
  if (hubLogo?.naturalWidth) {
    const maxW = innerR * 1.7;
    const maxH = innerR * 0.75;
    const scale = Math.min(maxW / hubLogo.naturalWidth, maxH / hubLogo.naturalHeight);
    const lw = hubLogo.naturalWidth * scale;
    const lh = hubLogo.naturalHeight * scale;
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, innerR - 2, 0, Math.PI * 2);
    ctx.clip();
    ctx.globalCompositeOperation = 'multiply';
    ctx.drawImage(hubLogo, cx - lw / 2, cy - lh / 2, lw, lh);
    ctx.globalCompositeOperation = 'source-over';
    ctx.restore();
  } else {
    ctx.save();
    ctx.font = `900 ${innerR * 0.36}px Inter, sans-serif`;
    ctx.fillStyle = '#333';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('SPIN', cx, cy);
    ctx.restore();
  }

  const pW = outerR * 0.075;
  const pH = outerR * 0.16;
  const pTip = cy - outerR + 4;
  const pBase = pTip - pH;
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(cx, pTip);
  ctx.lineTo(cx + pW, pBase);
  ctx.lineTo(cx - pW, pBase);
  ctx.closePath();
  const pGrad = ctx.createLinearGradient(cx, pTip, cx, pBase);
  pGrad.addColorStop(0, '#FF3D00');
  pGrad.addColorStop(1, '#B71C1C');
  ctx.fillStyle = pGrad;
  ctx.shadowColor = 'rgba(0,0,0,0.5)';
  ctx.shadowBlur = 8;
  ctx.fill();
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.restore();
}

const SpinWheel = forwardRef<SpinWheelHandle, Props>(function SpinWheel(
  { onWin, onClaimPrize, spinSessionMeta },
  ref,
) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const logosRef = useRef<LogoMap | null>(null);
  const rotationRef = useRef(0);
  const animRef = useRef<{ from: number; to: number; start: number; winIdx: number } | null>(null);
  const rafRef = useRef<number>(0);
  const [spinning, setSpinning] = useState(false);
  const [winner, setWinner] = useState<Prize | null>(null);
  const [showModal, setShowModal] = useState(false);

  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const anim = animRef.current;
    if (anim) {
      const t = Math.min((performance.now() - anim.start) / SPIN_DURATION, 1);
      rotationRef.current = anim.from + (anim.to - anim.from) * ease(t);
      if (t >= 1) {
        rotationRef.current = anim.to;
        animRef.current = null;
        const prize = PRIZES[anim.winIdx];
        const record = saveWin(prize);
        reportSpinWinToServer(prize, spinSessionMeta);
        setWinner(prize);
        setSpinning(false);
        setShowModal(true);
        onWin?.(prize, prize.sku, record.timestamp);
      }
    }
    drawFrame(canvas, rotationRef.current, logosRef.current);
    rafRef.current = requestAnimationFrame(render);
  }, [onWin, spinSessionMeta]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const resize = () => {
      const container = canvas.parentElement!;
      const size = Math.min(container.clientWidth, container.clientHeight) - 32;
      canvas.width = size;
      canvas.height = size;
    };
    resize();
    loadAllLogos().then((m) => {
      logosRef.current = m;
    });
    const ro = new ResizeObserver(resize);
    ro.observe(canvas.parentElement!);
    rafRef.current = requestAnimationFrame(render);
    return () => {
      ro.disconnect();
      cancelAnimationFrame(rafRef.current);
    };
  }, [render]);

  const spin = useCallback(() => {
    if (spinning || showModal) return;
    const winIdx = Math.floor(Math.random() * SEGMENT_COUNT);
    const targetRot = -(winIdx * SEGMENT_ANGLE + SEGMENT_ANGLE / 2);
    const from = rotationRef.current;
    let delta = targetRot - (from % (2 * Math.PI));
    if (delta > 0) delta -= 2 * Math.PI;
    const to = from + delta - MIN_ROTATIONS * 2 * Math.PI;
    animRef.current = { from, to, start: performance.now(), winIdx };
    setSpinning(true);
    setWinner(null);
  }, [spinning, showModal]);

  const dismiss = useCallback(() => {
    setShowModal(false);
    setWinner(null);
  }, []);

  const handleClaimPrize = useCallback(() => {
    dismiss();
    onClaimPrize?.();
  }, [dismiss, onClaimPrize]);

  useImperativeHandle(
    ref,
    () => ({
      spin,
      isSpinning: () => spinning,
    }),
    [spin, spinning],
  );

  return (
    <div className="sw-wrapper">
      <div className="sw-canvas-area">
        <canvas ref={canvasRef} className="sw-canvas" onClick={!spinning && !showModal ? spin : undefined} />
        {spinning && <div className="sw-spinning-label">Spinning…</div>}
      </div>
      {showModal && winner && (
        <div className="sw-modal-backdrop" onClick={dismiss}>
          <div className="sw-modal" onClick={(e) => e.stopPropagation()}>
            <h2 className="sw-modal-title">YOU WIN!</h2>
            {logosRef.current?.[winner.brand] && (
              <div className="sw-modal-logo-wrap" style={{ background: '#fff' }}>
                <img src={logosRef.current[winner.brand].src} alt={winner.brand} className="sw-modal-logo" />
              </div>
            )}
            <div className="sw-modal-prize">{winner.name}</div>
            <div className="sw-modal-sku">SKU: {winner.sku}</div>
            <button className="sw-modal-btn" onClick={handleClaimPrize}>
              CLAIM PRIZE
            </button>
          </div>
        </div>
      )}
    </div>
  );
});

export default SpinWheel;
