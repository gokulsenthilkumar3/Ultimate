import gsap from 'gsap';

export const NAV_MOTION = Object.freeze({ duration: 0.32, ease: 'power3.out' });

export function animateIndicator(indicator, item) {
  if (!indicator || !item) return;
  gsap.to(indicator, { y: item.offsetTop, height: item.offsetHeight, overwrite: 'auto', ...NAV_MOTION });
}

export function animateNavVisibility(element, visible) {
  if (!element) return;
  gsap.to(element, { y: visible ? 0 : 150, opacity: visible ? 1 : 0, overwrite: 'auto', ...NAV_MOTION });
}
