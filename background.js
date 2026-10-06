const busyTabs = new Set();
let lastTimestamp = 0;

function isListing(raw) {
  try {
    const url = new URL(raw);
    return url.protocol === 'https:' && /(^|\.)ebay\.(com|co\.uk|ca|com\.au|de|fr|it|es|at|ch|ie|nl|be|pl|com\.sg|com\.my|ph)$/i.test(url.hostname)
      && /^\/itm\/(?:[^/]+\/)?\d+(?:\/|$)/.test(url.pathname);
  } catch { return false; }
}

async function status(tabId, text, title, color) {
  await Promise.all([
    browser.browserAction.setBadgeText({tabId, text}),
    browser.browserAction.setBadgeBackgroundColor({tabId, color}),
    browser.browserAction.setTitle({tabId, title})
  ]).catch(() => {}); // The user may have closed the tab.
}

// The download API resolves when queued; wait for completion before reporting success.
function waitForDownload(id) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => finish(new Error('Download timed out; check Firefox Downloads.')), 120000);
    function finish(error) {
      clearTimeout(timer);
      browser.downloads.onChanged.removeListener(changed);
      error ? reject(error) : resolve();
    }
    function changed(delta) {
      if (delta.id !== id) return;
      if (delta.state?.current === 'complete') finish();
      else if (delta.state?.current === 'interrupted') finish(new Error(delta.error?.current || 'Download interrupted'));
    }
    browser.downloads.onChanged.addListener(changed);
    browser.downloads.search({id}).then(items => {
      const item = items[0];
      if (item?.state === 'complete') finish();
      else if (item?.state === 'interrupted') finish(new Error(item.error || 'Download interrupted'));
      else if (!item) finish(new Error('Download was removed.'));
    }, finish);
  });
}

browser.browserAction.onClicked.addListener(async tab => {
  if (busyTabs.has(tab.id)) return;
  if (!isListing(tab.url)) {
    await status(tab.id, '!', 'Open an eBay listing, then click again.', '#bd382f');
    return;
  }
  busyTabs.add(tab.id);
  try {
    await status(tab.id, '…', 'Finding listing photos…', '#1254db');
    const [photos] = await browser.tabs.executeScript(tab.id, {file: 'collect.js'});
    if (!photos?.length) throw new Error('No gallery photos found. Wait for the listing to load, then try again.');
    let saved = 0;
    let failed = 0;
    for (const photo of photos) {
      try {
        lastTimestamp = Math.max(Date.now(), lastTimestamp + 1);
        const id = await browser.downloads.download({
          url: photo.url,
          filename: `${lastTimestamp}.${photo.extension}`,
          saveAs: false,
          conflictAction: 'uniquify',
          ...(tab.incognito ? {incognito: true} : {})
        });
        await waitForDownload(id);
        saved++;
      } catch (error) {
        failed++;
        console.warn('eBay photo download failed:', error);
      }
      await status(tab.id, `${saved}/${photos.length}`, `Saved ${saved} of ${photos.length} photos${failed ? `; ${failed} failed` : ''}.`, '#1254db');
    }
    await status(tab.id, failed ? '!' : String(saved),
      failed ? `Saved ${saved} photos; ${failed} failed. Check Firefox Downloads (Ctrl+J).` : `Saved all ${saved} photos to your downloads folder.`,
      failed ? '#bd382f' : '#178047');
  } catch (error) {
    await status(tab.id, '!', error.message || 'Unable to read this listing. Reload and try again.', '#bd382f');
  } finally {
    busyTabs.delete(tab.id);
  }
});
