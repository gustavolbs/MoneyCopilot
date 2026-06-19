"use client";

import { usePathname, useRouter } from "next/navigation";
import {
  type ReactNode,
  type TouchEvent,
  useEffect,
  useRef,
  useState,
} from "react";

import { appNavigation, navigationIndex } from "./app-navigation";

const ignoredSwipeTargets = [
  "a",
  "button",
  "input",
  "textarea",
  "select",
  "[role='button']",
  "[data-swipe-ignore]",
  ".transaction-period-grid",
  ".mobile-budget-scroll",
  ".mobile-patrimonio-scroll",
  ".recharts-wrapper",
].join(",");

export function MobileRouteViewport({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const previousPathname = useRef(pathname);
  const touchStart = useRef({ x: 0, y: 0, at: 0 });
  const trackingSwipe = useRef(false);
  const [dragX, setDragX] = useState(0);

  const currentIndex = navigationIndex(pathname);
  const previousIndex = navigationIndex(previousPathname.current);
  const enteringDirection =
    previousIndex >= 0 && currentIndex < previousIndex ? "backward" : "forward";

  useEffect(() => {
    previousPathname.current = pathname;
    setDragX(0);

    if (currentIndex < 0) return;
    const adjacent = [
      appNavigation[currentIndex - 1],
      appNavigation[currentIndex + 1],
    ];
    adjacent.forEach((item) => {
      if (item) router.prefetch(item.href);
    });
  }, [currentIndex, pathname, router]);

  const handleTouchStart = (event: TouchEvent<HTMLDivElement>) => {
    if (window.innerWidth >= 900 || event.touches.length !== 1) return;
    const target = event.target;
    if (target instanceof HTMLElement && target.closest(ignoredSwipeTargets)) {
      return;
    }

    const touch = event.touches[0];
    touchStart.current = { x: touch.clientX, y: touch.clientY, at: Date.now() };
    trackingSwipe.current = true;
    setDragX(0);
  };

  const handleTouchMove = (event: TouchEvent<HTMLDivElement>) => {
    if (!trackingSwipe.current || event.touches.length !== 1) return;
    const touch = event.touches[0];
    const deltaX = touch.clientX - touchStart.current.x;
    const deltaY = touch.clientY - touchStart.current.y;

    if (Math.abs(deltaY) > Math.abs(deltaX) && Math.abs(deltaY) > 10) {
      trackingSwipe.current = false;
      setDragX(0);
      return;
    }
    if (Math.abs(deltaX) < 8) return;

    const hasDestination =
      deltaX < 0 ? currentIndex < appNavigation.length - 1 : currentIndex > 0;
    const resistance = hasDestination ? 0.32 : 0.08;
    setDragX(Math.max(-72, Math.min(72, deltaX * resistance)));
  };

  const finishSwipe = (event: TouchEvent<HTMLDivElement>) => {
    if (!trackingSwipe.current) return;
    trackingSwipe.current = false;

    const touch = event.changedTouches[0];
    const deltaX = touch.clientX - touchStart.current.x;
    const deltaY = touch.clientY - touchStart.current.y;
    const elapsed = Math.max(Date.now() - touchStart.current.at, 1);
    const velocity = Math.abs(deltaX) / elapsed;
    const isHorizontal = Math.abs(deltaX) > Math.abs(deltaY) * 1.2;
    const passedThreshold = Math.abs(deltaX) >= 58 || velocity >= 0.48;
    const nextIndex = deltaX < 0 ? currentIndex + 1 : currentIndex - 1;
    const destination = appNavigation[nextIndex];

    setDragX(0);
    if (isHorizontal && passedThreshold && destination) {
      router.push(destination.href);
    }
  };

  return (
    <div
      className="mobile-route-viewport"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={finishSwipe}
      onTouchCancel={() => {
        trackingSwipe.current = false;
        setDragX(0);
      }}
    >
      <div
        key={pathname}
        className={`mobile-route-page route-enter-${enteringDirection}`}
        style={{ "--route-drag-x": `${dragX}px` } as React.CSSProperties}
      >
        {children}
      </div>
    </div>
  );
}
