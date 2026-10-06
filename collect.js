/* Injected only after the user clicks. Read gallery DOM, never page scripts. */
(() => {
  const photos = new Map();
  const roots = document.querySelectorAll('#PicturePanel, .ux-image-carousel, .ux-image-grid, #vi_main_img_fs, #vi_main_img');
  for (const root of roots) {
    const images = root.matches('img') ? [root] : root.querySelectorAll('img');
    for (const img of images) {
      for (const attribute of ['data-zoom-src', 'data-src', 'src', 'srcset', 'data-srcset']) {
        for (const candidate of (img.getAttribute(attribute) || '').split(',')) {
          const raw = candidate.trim().split(/\s+/)[0];
          if (!raw) continue;
          let url;
          try { url = new URL(raw, location.href); } catch { continue; }
          if (url.protocol !== 'https:' || !/(^|\.)ebayimg\.com$/i.test(url.hostname)) continue;
          const match = url.pathname.match(/^\/images\/g\/([^/]+)\/s-l(\d+)\.(jpg|jpeg|png|webp|avif)$/i);
          if (!match) continue;
          const [, key, size, extension] = match;
          const previous = photos.get(key);
          if (!previous || Number(size) > previous.size) {
            photos.set(key, {url: url.href, size: Number(size), extension: extension.toLowerCase()});
          }
        }
      }
    }
  }
  return [...photos.values()];
})();
