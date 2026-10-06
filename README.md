# eBay Photo Downloader

Click the toolbar button on an eBay item page to save its gallery photos to Firefox's configured downloads folder (normally Downloads). Files use Unix timestamps in milliseconds, such as `1791295000123.webp`. Each filename is unique; image formats are preserved. The badge counts completed downloads. Hover over it for status or error details.

## Load in Firefox

1. Open `about:debugging#/runtime/this-firefox` in Firefox.
2. Click **Load Temporary Add-on…**.
3. Choose `manifest.json` in this folder, or select the supplied ZIP.
4. Open a listing, wait for the gallery to appear, and click **eBay Photo Downloader** in the extensions menu. Pin it to the toolbar for one-click access.

Temporary add-ons disappear when Firefox restarts. For permanent installation in normal Firefox, Mozilla must sign the extension. Submit the supplied ZIP as an unlisted add-on at https://addons.mozilla.org/developers/ and install the signed XPI Mozilla provides. The supplied ZIP is not signed.

## Behavior and privacy

- Uses only `activeTab` and `downloads`; accesses the page when clicked.
- Reads only the listing gallery, including lazy-loaded images. Excludes recommendations and seller-feedback photos.
- Deduplicates thumbnails and gallery copies by eBay image ID and chooses the largest advertised version.
- Does not send listing data to any service. Firefox downloads images directly from eBay's image servers.
- Repeated clicks during an active batch are ignored. Clicking after completion downloads a new batch.
- Supports standard eBay `/itm/` listings. Gallery layout changes may require updates. Does not download videos or images embedded in the seller-description iframe.

## Verification

The example listing https://www.ebay.com/itm/257696546918 exposes seven unique gallery photos, including lazy-loaded photos. Automated tests cover seven-photo extraction, deduplication, maximum resolution, filtering, timestamp filenames, and completion/failure reporting. Run `node --test tests/*.test.cjs` from the project folder.

API reference: https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/downloads/download
Temporary installation: https://extensionworkshop.com/documentation/develop/temporary-installation-in-firefox/
