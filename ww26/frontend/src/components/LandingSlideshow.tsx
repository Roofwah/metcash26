import React, { useEffect, useRef, useState } from 'react';
import './LandingSlideshow.css';

const SLIDES = ['home.jpg', 'slide1v2.jpg', 'slide2v2.jpg', 'slide3v2.jpg'];
const SLIDE_MS = 5600;
const TRANSITION_MS = 900;
/** Bumped on build so browsers fetch fresh JPGs from public/ */
const SLIDE_CACHE = process.env.REACT_APP_SLIDE_CACHE ?? '1';

type Props = {
  publicUrl?: string;
};

function slideUrl(publicUrl: string, file: string) {
  const base = publicUrl.replace(/\/$/, '');
  return `${base}/${file}?v=${SLIDE_CACHE}`;
}

export default function LandingSlideshow({ publicUrl = '' }: Props) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [leavingIndex, setLeavingIndex] = useState<number | null>(null);
  const activeRef = useRef(0);

  useEffect(() => {
    SLIDES.forEach((file) => {
      const img = new Image();
      img.src = slideUrl(publicUrl, file);
    });
  }, [publicUrl]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      const current = activeRef.current;
      const next = (current + 1) % SLIDES.length;
      activeRef.current = next;
      setLeavingIndex(current);
      setActiveIndex(next);
    }, SLIDE_MS);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (leavingIndex === null) return undefined;
    const timer = window.setTimeout(() => setLeavingIndex(null), TRANSITION_MS);
    return () => window.clearTimeout(timer);
  }, [leavingIndex, activeIndex]);

  return (
    <div className="ww-landing-slideshow ww-landing-bg" aria-hidden="true">
      {SLIDES.map((file, index) => {
        const isActive = index === activeIndex;
        const isLeaving = index === leavingIndex;
        let stateClass = 'is-hidden';
        if (isActive) stateClass = 'is-active';
        else if (isLeaving) stateClass = 'is-leaving';

        return (
          <div
            key={file}
            className={['ww-landing-slideshow-slide', stateClass].join(' ')}
            style={{ backgroundImage: `url(${slideUrl(publicUrl, file)})` }}
          />
        );
      })}
    </div>
  );
}
