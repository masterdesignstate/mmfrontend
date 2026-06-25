'use client';

import Image from 'next/image';
import React, { useCallback, useRef, useState } from 'react';

type ProfilePhotoGalleryProps = {
  photos: string[];
  displayName: string;
};

const DRAG_SNAP_THRESHOLD = 40;

export default function ProfilePhotoGallery({ photos, displayName }: ProfilePhotoGalleryProps) {
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const pointerIdRef = useRef<number | null>(null);
  const startXRef = useRef(0);
  const startScrollLeftRef = useRef(0);
  const startIndexRef = useRef(0);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  const hasMultiplePhotos = photos.length > 1;

  const scrollToIndex = useCallback((index: number, behavior: ScrollBehavior = 'smooth') => {
    const scroller = scrollerRef.current;
    if (!scroller) return;

    const boundedIndex = Math.max(0, Math.min(index, photos.length - 1));
    scroller.scrollTo({
      left: boundedIndex * scroller.clientWidth,
      behavior,
    });
    setActiveIndex(boundedIndex);
  }, [photos.length]);

  const handleScroll = useCallback(() => {
    const scroller = scrollerRef.current;
    if (!scroller || scroller.clientWidth === 0) return;

    const index = Math.round(scroller.scrollLeft / scroller.clientWidth);
    setActiveIndex(Math.max(0, Math.min(index, photos.length - 1)));
  }, [photos.length]);

  const handlePointerDown = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    if (!hasMultiplePhotos || event.button !== 0) return;

    const scroller = scrollerRef.current;
    if (!scroller) return;

    pointerIdRef.current = event.pointerId;
    startXRef.current = event.clientX;
    startScrollLeftRef.current = scroller.scrollLeft;
    startIndexRef.current = activeIndex;
    setIsDragging(true);
    scroller.setPointerCapture(event.pointerId);
  }, [activeIndex, hasMultiplePhotos]);

  const handlePointerMove = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging || pointerIdRef.current !== event.pointerId) return;

    const scroller = scrollerRef.current;
    if (!scroller) return;

    event.preventDefault();
    const deltaX = event.clientX - startXRef.current;
    scroller.scrollLeft = startScrollLeftRef.current - deltaX;
  }, [isDragging]);

  const finishDrag = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging || pointerIdRef.current !== event.pointerId) return;

    const scroller = scrollerRef.current;
    if (!scroller) return;

    const deltaX = event.clientX - startXRef.current;
    const dragIndex = Math.round(scroller.scrollLeft / scroller.clientWidth);
    const thresholdIndex = Math.abs(deltaX) >= DRAG_SNAP_THRESHOLD
      ? startIndexRef.current + (deltaX < 0 ? 1 : -1)
      : dragIndex;

    setIsDragging(false);
    pointerIdRef.current = null;

    if (scroller.hasPointerCapture(event.pointerId)) {
      scroller.releasePointerCapture(event.pointerId);
    }

    scrollToIndex(thresholdIndex);
  }, [isDragging, scrollToIndex]);

  return (
    <>
      <div
        ref={scrollerRef}
        aria-label={`${displayName} photos`}
        className={`absolute inset-0 flex snap-x snap-mandatory overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden ${
          isDragging ? 'cursor-grabbing scroll-auto' : hasMultiplePhotos ? 'cursor-grab scroll-smooth' : 'scroll-smooth'
        }`}
        role="group"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={finishDrag}
        onPointerCancel={finishDrag}
        onLostPointerCapture={() => {
          setIsDragging(false);
          pointerIdRef.current = null;
        }}
        onScroll={handleScroll}
        style={{ touchAction: hasMultiplePhotos ? 'pan-y' : 'auto', userSelect: isDragging ? 'none' : undefined }}
      >
        {photos.map((src, i) => (
          <div key={`${src}-${i}`} className="relative h-full w-full shrink-0 snap-center">
            <Image
              src={src}
              alt={`${displayName} photo ${i + 1}`}
              fill
              draggable={false}
              className="select-none object-cover"
            />
          </div>
        ))}
      </div>

      {hasMultiplePhotos && (
        <div className="absolute top-3 left-1/2 z-30 flex -translate-x-1/2 gap-1.5 rounded-full bg-black/30 px-2 py-1 backdrop-blur-sm">
          {photos.map((_, i) => (
            <button
              key={i}
              type="button"
              aria-label={`Show photo ${i + 1}`}
              aria-current={activeIndex === i ? 'true' : undefined}
              onClick={() => scrollToIndex(i)}
              className={`h-1.5 w-1.5 rounded-full transition-all ${
                activeIndex === i ? 'w-4 bg-white' : 'bg-white/70 hover:bg-white'
              }`}
            />
          ))}
        </div>
      )}
    </>
  );
}
