(() => {
  'use strict';

  const STAGE_W = 3840;
  const STAGE_H = 804;
  const params = new URLSearchParams(window.location.search);
  const stage = document.getElementById('stage');
  const viewport = document.getElementById('viewport');

  if (!stage || !viewport) return;

  // Explicit absolute centring is required because CSS grid can fall back to
  // start alignment when the unscaled 3840px stage is wider than a phone.
  stage.style.position = 'absolute';
  stage.style.left = '50%';
  stage.style.top = '50%';
  stage.style.marginLeft = `${-STAGE_W / 2}px`;
  stage.style.marginTop = `${-STAGE_H / 2}px`;

  let frame = 0;

  function viewportSize() {
    const vv = window.visualViewport;
    return {
      width: Math.max(1, Math.round(vv?.width || window.innerWidth || document.documentElement.clientWidth || 1)),
      height: Math.max(1, Math.round(vv?.height || window.innerHeight || document.documentElement.clientHeight || 1))
    };
  }

  function fitMobilePreview() {
    window.cancelAnimationFrame(frame);
    frame = window.requestAnimationFrame(() => {
      const { width, height } = viewportSize();
      const portrait = height > width;
      const allowPortraitRotation = params.get('rotate') !== '0';
      const rotate = portrait && allowPortraitRotation;
      const scale = rotate
        ? Math.min(width / STAGE_H, height / STAGE_W)
        : Math.min(width / STAGE_W, height / STAGE_H);

      stage.style.transformOrigin = 'center center';
      stage.style.transform = rotate
        ? `rotate(90deg) scale(${scale})`
        : `scale(${scale})`;

      viewport.style.width = `${width}px`;
      viewport.style.height = `${height}px`;
      viewport.dataset.previewOrientation = rotate ? 'portrait-rotated' : 'landscape';
      viewport.style.setProperty('--preview-scale', String(scale));
    });
  }

  window.addEventListener('resize', fitMobilePreview, { passive: true });
  window.addEventListener('orientationchange', () => window.setTimeout(fitMobilePreview, 80), { passive: true });
  window.visualViewport?.addEventListener('resize', fitMobilePreview, { passive: true });
  window.visualViewport?.addEventListener('scroll', fitMobilePreview, { passive: true });

  fitMobilePreview();
  window.setTimeout(fitMobilePreview, 120);
  window.setTimeout(fitMobilePreview, 500);
})();
