// ==UserScript==
// @name         waotyutil
// @namespace    woid.im
// @version      1.0.0
// @description  Quick add new release from Apple Music, SoundCloud, Spotify, and Bandcamp + other useful features for website contributors.
// @author       woidzero
// @match        https://*.albumoftheyear.org/*
// @grant        GM_xmlhttpRequest
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_registerMenuCommand
// @connect      soundcloud.com
// @connect      music.apple.com
// @connect      itunes.apple.com
// @connect      spotify.com
// @connect      open.spotify.com
// @connect      *.scdn.co
// @connect      *.bandcamp.com
// @connect      *.sndcdn.com
// @connect      *.spotifycdn.com
// @connect      *.bandcamp.com
// @connect      *.bcbits.com
// @homepageURL  https://by.woid.im/waotyutil
// @updateURL    https://github.com/woidzero/waotyutil/raw/refs/heads/master/waotyutil.user.js
// @downloadURL  https://github.com/woidzero/waotyutil/raw/refs/heads/master/waotyutil.user.js
// @icon         https://by.woid.im/waotyutil/images/icon.png
// ==/UserScript==

(function() {
    'use strict';

    const Settings = {
        maxSize: GM_getValue('maxSize', 2000),
        quality: GM_getValue('quality', 0.92),
        targetBytes: GM_getValue('targetBytes', 2 * 1024 * 1024)
    }

    console.log(`[waotyutil] Initialized: `);
    console.table(Settings);

    if (typeof GM_registerMenuCommand === 'function') {
        GM_registerMenuCommand('Max Size (px)', () => {
            const input = prompt('Enter maximum image dimension in pixels (e.g., 1500 or 2000):', Settings.maxSize);
            if (input !== null) {
                const val = parseInt(input, 10);
                if (!isNaN(val) && val > 100) {
                    Settings.maxSize = val;
                    GM_setValue('maxSize', Settings.maxSize);
                    console.log(`[waotyutil] Config changed: maxSize = ${Settings.maxSize}`);
                    alert(`Max size updated to: ${Settings.maxSize}px`);
                } else {
                    alert('Invalid value.');
                }
            }
        });

        GM_registerMenuCommand('JPEG Quality (0.1 - 1.0)', () => {
            const input = prompt('Enter initial JPEG quality from 0.1 to 1.0 (e.g., 0.92):', Settings.quality);
            if (input !== null) {
                const val = parseFloat(input);
                if (!isNaN(val) && val > 0 && val <= 1) {
                    Settings.quality = val;
                    GM_setValue('quality', Settings.quality);
                    console.log(`[waotyutil] Config changed: quality = ${Settings.quality}`);
                    alert(`Quality updated to: ${Settings.quality}`);
                } else {
                    alert('Please enter a number between 0.1 and 1.0');
                }
            }
        });

        GM_registerMenuCommand('Size Limit (MB)', () => {
            const currentMb = Settings.targetBytes / (1024 * 1024);
            const input = prompt('Enter maximum file size limit in MB (e.g., 2):', currentMb);
            if (input !== null) {
                const val = parseFloat(input);
                if (!isNaN(val) && val > 0) {
                    Settings.targetBytes = val * 1024 * 1024;
                    GM_setValue('targetBytes', Settings.targetBytes);
                    console.log(`[waotyutil] Config changed: targetBytes = ${Settings.targetBytes}`);
                    alert(`Size limit updated to: ${val} MB`);
                } else {
                    alert('Invalid value.');
                }
            }
        });
    }

    // cover utility
    if (window.location.pathname.includes('/album/add-cover.php')) {
        console.log('[waotyutil] Detected add-cover.php page.');
        const coverBox = document.querySelector('.addCoverBox');
        if (coverBox) {
            injectCoverUrlInput(coverBox);
        } else {
            console.warn('[waotyutil] .addCoverBox element not found on page.');
        }
    }

    function injectCoverUrlInput(container) {
        console.log('[waotyutil] Injecting cover URL input UI...');
        const wrapper = document.createElement('div');
        wrapper.id = 'customCoverUrlContainer';
        wrapper.style.cssText = 'margin-bottom: 20px; padding: 15px; background: rgba(0,0,0,0.2); border-radius: 4px;';

        wrapper.innerHTML = `
            <div style="font-weight: bold; margin-bottom: 8px; text-transform: uppercase; font-size: 11px; letter-spacing: 1px">
                Cover Utility
            </div>
            <p style='font-size: 10px; font-family: monospace; color: grey;'>
                This utility will automatically download the image and attempt to convert it to a JPEG + ${Settings.maxSize}x${Settings.maxSize} + ${(Settings.targetBytes / (1024 * 1024)).toFixed(1)}MB. Supports direct links and SoundCloud (original quality).
            </p>
            <div style="display: flex; gap: 5px; margin-bottom: 8px;">
                <input type="text" id="coverUrlInput" class="overlaySearchBox" placeholder="Paste direct image URL or SoundCloud link..." style="width: calc(100% - 85px); display: inline-block;">
                <button type="button" id="coverProcessBtn" class="smallButton" style="width: 75px; height: 100%; text-align: center; cursor: pointer; display: inline-flex">Process</button>
            </div>
            <div id="coverStatus" style="font-size: 12px; color: #666; margin-bottom: 8px;"></div>
            <div id="coverPreviewContainer" style="display: none; text-align: center; margin-top: 10px;">
                <div style="font-size: 11px; color: #666; margin-bottom: 5px; font-weight: bold;">Preview & Ready to Submit:</div>
                <img id="coverPreviewImg" style="max-width: 200px; max-height: 200px; border-radius: 4px; border: 1px solid #ccc; display: block; margin: 0 auto;" />
            </div>
        `;

        container.insertBefore(wrapper, container.firstChild);

        document.getElementById('coverProcessBtn').addEventListener('click', handleCoverUrl);
        document.getElementById('coverUrlInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                handleCoverUrl();
            }
        });
    }

    function processSoundCloudUrl(url) {
        if (url.includes('sndcdn.com') && url.includes('-t')) {
            const originalUrl = url.replace(/-t\d+x\d+(\.[a-zA-Z]+)(\?.*)?$/, '-original$1');
            console.log('[waotyutil] SoundCloud URL transformed to original:', originalUrl);
            return originalUrl;
        }
        return url;
    }

    function handleCoverUrl() {
        const urlInput = document.getElementById('coverUrlInput');
        const status = document.getElementById('coverStatus');
        let rawUrl = urlInput.value.trim();

        if (!rawUrl) {
            status.textContent = 'Please enter an image or SoundCloud URL.';
            status.style.color = 'red';
            console.warn('[waotyutil] Input is empty.');
            return;
        }

        status.textContent = 'Downloading image...';
        let url = processSoundCloudUrl(rawUrl);
        console.log('[waotyutil] Starting download from final URL:', url);

        GM_xmlhttpRequest({
            method: 'GET',
            url: url,
            responseType: 'blob',
            onload: function(res) {
                console.log('[waotyutil] Image download response status:', res.status);
                if (res.status !== 200) {
                    status.textContent = `Failed to download image (HTTP ${res.status})`;
                    status.style.color = 'red';
                    console.error(`[waotyutil] Download failed with HTTP status ${res.status}`);
                    return;
                }

                status.textContent = 'Processing and compressing image...';
                const blob = res.response;
                console.log('[waotyutil] Downloaded blob size:', blob.size, 'type:', blob.type);

                processAndCompressImage(blob, (compressedBlob) => {
                    if (!compressedBlob) {
                        status.textContent = 'Error processing image.';
                        status.style.color = 'red';
                        console.error('[waotyutil] processAndCompressImage returned null.');
                        return;
                    }

                    console.log('[waotyutil] Compression finished. Resulting blob size:', compressedBlob.size);

                    const file = new File([compressedBlob], 'cover.jpg', { type: 'image/jpeg' });
                    const oldForm = document.querySelector('.addCoverBox form');
                    const fileInput = oldForm ? oldForm.querySelector('input[type="file"]') : null;

                    if (!fileInput) {
                        status.textContent = 'Error: File input element not found in form.';
                        status.style.color = 'red';
                        console.error('[waotyutil] File input element not found!');
                        return;
                    }

                    const dataTransfer = new DataTransfer();
                    dataTransfer.items.add(file);
                    fileInput.files = dataTransfer.files;
                    console.log('[waotyutil] File injected into form file input successfully.');

                    if (oldForm) {
                        oldForm.style.display = 'block';
                    }

                    const previewContainer = document.getElementById('coverPreviewContainer');
                    const previewImg = document.getElementById('coverPreviewImg');
                    const objectUrl = URL.createObjectURL(compressedBlob);
                    previewImg.src = objectUrl;
                    previewContainer.style.display = 'block';

                    status.textContent = `Done! Size: ${(file.size / 1024 / 1024).toFixed(2)} MB.`;
                    status.style.color = 'green';
                    console.log('[waotyutil] Cover processing completely finished successfully.');
                });
            },
            onerror: function(err) {
                console.error('[waotyutil] Network error downloading image:', err);
                status.textContent = 'Network error downloading image.';
                status.style.color = 'red';
            }
        });
    }

    function processAndCompressImage(blob, callback) {
        console.log('[waotyutil] Starting image decoding & compression...');
        const img = document.createElement('img');
        const url = URL.createObjectURL(blob);

        img.onload = function() {
            URL.revokeObjectURL(url);

            let width = img.width;
            let height = img.height;
            console.log(`[waotyutil] Original dimensions: ${width}x${height}`);

            if (width > Settings.maxSize || height > Settings.maxSize) {
                if (width > height) {
                    height = Math.round((height * Settings.maxSize) / width);
                    width = Settings.maxSize;
                } else {
                    width = Math.round((width * Settings.maxSize) / height);
                    height = Settings.maxSize;
                }
                console.log(`[waotyutil] Resized dimensions to fit max limit: ${width}x${height}`);
            }

            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');

            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(0, 0, width, height);
            ctx.drawImage(img, 0, 0, width, height);

            let currentQuality = Settings.quality;
            let attempts = 0;

            function tryCompress() {
                attempts++;
                canvas.toBlob((resultBlob) => {
                    if (!resultBlob) {
                        console.error('[waotyutil] canvas.toBlob failed to produce a blob.');
                        callback(null);
                        return;
                    }

                    console.log(`[waotyutil] Attempt ${attempts}: Quality = ${currentQuality.toFixed(2)}, Size = ${(resultBlob.size / 1024).toFixed(2)} KB (Target: ${(Settings.targetBytes / 1024).toFixed(2)} KB)`);

                    if (resultBlob.size > Settings.targetBytes && currentQuality > 0.4) {
                        currentQuality -= 0.1;
                        tryCompress();
                    } else {
                        console.log('[waotyutil] Compression completed successfully.');
                        callback(resultBlob);
                    }
                }, 'image/jpeg', currentQuality);
            }

            tryCompress();
        };

        img.onerror = function(err) {
            URL.revokeObjectURL(url);
            console.error('[waotyutil] Failed to load image from blob:', err);
            callback(null);
        };

        img.src = url;
    }

    // release add form
    const observer = new MutationObserver(() => {
        const popupForm = document.querySelector('.popupForm');
        if (popupForm && !document.getElementById('autoFillContainer')) {
            console.log('[waotyutil] Popup form detected via MutationObserver.');
            injectAutoFillField(popupForm);
        }
    });

    observer.observe(document.body, { childList: true, subtree: true });

    function injectAutoFillField(form) {
        console.log('[waotyutil] Injecting Auto-fill field into popup form...');
        const container = document.createElement('div');
        container.id = 'autoFillContainer';
        container.style.cssText = 'margin-bottom: 20px; padding: 10px; background: rgba(0,0,0,0.2); border-radius: 4px;';

        container.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                <label style="font-weight: bold;">Auto-fill from Link</label>
            </div>
            <div style="display: flex; gap: 5px;">
                <input type="text" id="autoFillUrl" class="overlaySearchBox" placeholder="Paste Apple Music, SoundCloud, Spotify, or Bandcamp URL..." style="width: calc(100% - 70px); display: inline-block;">
                <button type="button" id="autoFillBtn" class="smallButton" style="width: 60px; text-align: center; cursor: pointer;">Fill</button>
            </div>
            <div id="autoFillStatus" class="description" style="margin-top: 4px; color: #666;"></div>
        `;

        form.insertBefore(container, form.firstChild);

        document.getElementById('autoFillBtn').addEventListener('click', handleAutoFill);
        document.getElementById('autoFillUrl').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                handleAutoFill();
            }
        });
    }

    function handleAutoFill() {
        const urlInput = document.getElementById('autoFillUrl');
        const status = document.getElementById('autoFillStatus');
        const url = urlInput.value.trim();

        console.log('[waotyutil] handleAutoFill triggered with URL:', url);

        if (!url) {
            status.textContent = 'Please enter a URL';
            status.style.color = 'red';
            console.warn('[waotyutil] URL input is empty.');
            return;
        }

        status.textContent = 'Fetching metadata...';
        status.style.color = '#666';

        if (url.includes('apple.com')) {
            parseAppleMusic(url, status);
        } else if (url.includes('soundcloud.com')) {
            parseSoundCloudHtml(url, status);
        } else if (url.includes('spotify.com')) {
            parseSpotifyOEmbed(url, status);
        } else if (url.includes('bandcamp.com')) {
            parseBandcampHtml(url, status);
        } else {
            status.textContent = 'Unsupported URL. Please use Apple Music, SoundCloud, Spotify, or Bandcamp link.';
            status.style.color = 'red';
            console.warn('[waotyutil] Unsupported URL domain:', url);
        }
    }

    function fillForm({ title, type, date, sourceUrl }) {
        console.log('[waotyutil] Filling form with data:', { title, type, date, sourceUrl });

        if (title) {
            const titleInput = document.getElementById('insertAlbumTitle');
            if (titleInput) titleInput.value = title;
        }
        if (date) {
            const dateInput = document.getElementById('insertReleaseDate');
            if (dateInput) dateInput.value = date;
        }

        if (sourceUrl) {
            const sourceInput = document.getElementById('insertSource');
            if (sourceInput) sourceInput.value = sourceUrl;
        }

        if (type) {
            const select = document.getElementById('insertAlbumType');
            if (select) {
                const options = Array.from(select.options);
                const matchedOption = options.find(opt => opt.value.toLowerCase() === type.toLowerCase());
                if (matchedOption) {
                    select.value = matchedOption.value;
                    console.log('[waotyutil] Matched album type:', matchedOption.value);
                } else {
                    console.warn('[waotyutil] Could not match album type option for:', type);
                }
            }
        }

        const status = document.getElementById('autoFillStatus');
        status.textContent = date ? 'Successfully filled!' : 'Filled! (Date missing, fill manually)';
        status.style.color = date ? 'green' : 'orange';
        console.log('[waotyutil] Form filling status updated.');
    }

    function parseSpotifyOEmbed(url, status) {
        const apiUrl = `https://open.spotify.com/oembed?url=${encodeURIComponent(url)}`;
        console.log('[waotyutil] Fetching Spotify metadata from API:', apiUrl);

        GM_xmlhttpRequest({
            method: 'GET',
            url: apiUrl,
            onload: function(res) {
                console.log('[waotyutil] Spotify metadata response status:', res.status);
                try {
                    const data = JSON.parse(res.responseText);
                    console.log('[waotyutil] Spotify parsed metadata:', data);
                    if (data.title) {
                        let rawTitle = data.title;
                        let type = 'LP';

                        if (rawTitle.toLowerCase().includes('- single')) {
                            type = 'Single';
                            rawTitle = rawTitle.replace(/\s*-\s*Single/i, '');
                        } else if (rawTitle.toLowerCase().includes('- ep')) {
                            type = 'EP';
                            rawTitle = rawTitle.replace(/\s*-\s*EP/i, '');
                        } else if (url.includes('/track/')) {
                            type = 'Single';
                        }

                        fillForm({
                            title: rawTitle,
                            type: type,
                            date: '',
                            sourceUrl: url
                        });
                    } else {
                        status.textContent = 'Album/Track not found via Spotify API.';
                        status.style.color = 'red';
                        console.warn('[waotyutil] Title missing in Spotify oEmbed response.');
                    }
                } catch (e) {
                    status.textContent = 'Failed to parse Spotify response.';
                    status.style.color = 'red';
                    console.error('[waotyutil] JSON parse error for Spotify:', e);
                }
            },
            onerror: function(err) {
                status.textContent = 'Network error fetching Spotify metadata.';
                status.style.color = 'red';
                console.error('[waotyutil] Network error fetching Spotify metadata:', err);
            }
        });
    }

    function parseAppleMusic(url, status) {
        const match = url.match(/id(\d+)/);
        if (!match) {
            status.textContent = 'Invalid Apple Music URL (ID missing)';
            status.style.color = 'red';
            console.warn('[waotyutil] Apple Music ID not found in URL:', url);
            return;
        }

        const albumId = match[1];
        const apiUrl = `https://itunes.apple.com/lookup?id=${albumId}&entity=album`;
        console.log('[waotyutil] Fetching Apple Music API:', apiUrl);

        GM_xmlhttpRequest({
            method: 'GET',
            url: apiUrl,
            onload: function(res) {
                console.log('[waotyutil] Apple Music API response status:', res.status);
                try {
                    const data = JSON.parse(res.responseText);
                    console.log('[waotyutil] Apple Music parsed data:', data);
                    if (data.results && data.results.length > 0) {
                        const album = data.results[0];
                        const title = album.collectionName;
                        const rawDate = album.releaseDate;
                        const date = rawDate ? rawDate.split('T')[0] : '';

                        let type = 'LP';
                        if (album.collectionType === 'Single') {
                            type = album.trackCount > 3 ? 'EP' : 'Single';
                        }

                        fillForm({ title, type, date, sourceUrl: url });
                    } else {
                        status.textContent = 'Album not found on Apple Music API';
                        status.style.color = 'red';
                        console.warn('[waotyutil] No results returned from Apple Music API.');
                    }
                } catch (e) {
                    status.textContent = 'Failed to parse Apple Music response.';
                    status.style.color = 'red';
                    console.error('[waotyutil] JSON parse error for Apple Music:', e);
                }
            },
            onerror: function(err) {
                status.textContent = 'Network error fetching Apple Music metadata.';
                status.style.color = 'red';
                console.error('[waotyutil] Network error fetching Apple Music:', err);
            }
        });
    }

    function parseSoundCloudHtml(url, status) {
        console.log('[waotyutil] Fetching SoundCloud HTML page:', url);
        GM_xmlhttpRequest({
            method: 'GET',
            url: url,
            onload: function(res) {
                console.log('[waotyutil] SoundCloud page fetch status:', res.status);
                try {
                    const parser = new DOMParser();
                    const doc = parser.parseFromString(res.responseText, 'text/html');

                    let titleEl = doc.querySelector('.soundTitle__titleHeroContainer h1 span') ||
                        doc.querySelector('h1.soundTitle__title span') ||
                        doc.querySelector('meta[property="og:title"]');

                    let title = '';
                    if (titleEl) {
                        title = titleEl.getAttribute('content') || titleEl.textContent.trim();
                    }

                    let rawDate = '';
                    const releaseDataEl = doc.querySelector('.l-about-row.l-listen__mainContent .listenInfo__releaseData');
                    if (releaseDataEl) {
                        rawDate = releaseDataEl.textContent.trim();
                    }

                    if (!rawDate) {
                        const timeEl = doc.querySelector('time.relativeTime') || doc.querySelector('time');
                        if (timeEl) {
                            rawDate = timeEl.getAttribute('datetime') || timeEl.textContent.trim();
                        }
                    }

                    const formattedDate = formatDate(rawDate);
                    const releaseType = url.includes('/sets/') ? 'LP' : 'Single';
                    console.log('[waotyutil] SoundCloud extracted -> Title:', title, 'Date:', formattedDate, 'Type:', releaseType);

                    if (!title) {
                        status.textContent = 'Failed to parse title from SoundCloud HTML.';
                        status.style.color = 'red';
                        console.warn('[waotyutil] SoundCloud title element not found.');
                        return;
                    }

                    fillForm({
                        title: title,
                        type: releaseType,
                        date: formattedDate,
                        sourceUrl: url
                    });

                } catch (e) {
                    status.textContent = 'Failed to parse SoundCloud HTML.';
                    status.style.color = 'red';
                    console.error('[waotyutil] Error parsing SoundCloud HTML:', e);
                }
            },
            onerror: function(err) {
                status.textContent = 'Network error fetching SoundCloud page.';
                status.style.color = 'red';
                console.error('[waotyutil] Network error fetching SoundCloud:', err);
            }
        });
    }

    function parseBandcampHtml(url, status) {
        console.log('[waotyutil] Fetching Bandcamp HTML page:', url);
        GM_xmlhttpRequest({
            method: 'GET',
            url: url,
            onload: function(res) {
                console.log('[waotyutil] Bandcamp page fetch status:', res.status);
                try {
                    const parser = new DOMParser();
                    const doc = parser.parseFromString(res.responseText, 'text/html');

                    let title = '';
                    const trackTitleEl = doc.querySelector('h2.trackTitle');
                    if (trackTitleEl && trackTitleEl.textContent.trim()) {
                        title = trackTitleEl.textContent.trim();
                    } else {
                        const ogTitle = doc.querySelector('meta[property="og:title"]');
                        if (ogTitle && ogTitle.getAttribute('content')) {
                            title = ogTitle.getAttribute('content').trim();
                            title = title.replace(/,\s*by\s+.*$/i, '').trim();
                        }
                    }

                    title = title.replace(/^["'“«]+|["'”»]+$/g, '').trim();

                    let rawDate = '';
                    const jsonLdScript = doc.querySelector('script[type="application/ld+json"]');
                    if (jsonLdScript) {
                        try {
                            const jsonLd = JSON.parse(jsonLdScript.textContent);
                            if (jsonLd.datePublished) {
                                rawDate = jsonLd.datePublished;
                            } else if (jsonLd.albumRelease && jsonLd.albumRelease[0] && jsonLd.albumRelease[0].datePublished) {
                                rawDate = jsonLd.albumRelease[0].datePublished;
                            }
                        } catch (err) {
                            console.warn('[waotyutil] Failed to parse Bandcamp JSON-LD:', err);
                        }
                    }

                    if (!rawDate) {
                        const metaPublish = doc.querySelector('meta[itemprop="datePublished"]');
                        if (metaPublish) rawDate = metaPublish.getAttribute('content');
                    }

                    if (!rawDate) {
                        const trdateEl = doc.querySelector('.trdate') || doc.querySelector('.album-credits');
                        if (trdateEl) {
                            const dateMatch = trdateEl.textContent.match(/released\s+([A-Za-z0-9\s,]+)/i);
                            if (dateMatch) rawDate = dateMatch[1].trim();
                        }
                    }

                    let releaseType = 'LP';
                    if (url.includes('/track/')) {
                        releaseType = 'Single';
                    } else {
                        const trackRows = doc.querySelectorAll('table.track_list tr.track_row_view');
                        if (trackRows.length > 0) {
                            if (trackRows.length <= 3) {
                                releaseType = 'Single';
                            } else if (trackRows.length <= 6) {
                                releaseType = 'EP';
                            }
                        }
                    }

                    const cleanFormattedDate = formatDate(rawDate);
                    console.log('[waotyutil] Bandcamp extracted -> Title:', title, 'Date:', cleanFormattedDate, 'Type:', releaseType);

                    if (!title) {
                        status.textContent = 'Failed to parse title from Bandcamp HTML.';
                        status.style.color = 'red';
                        console.warn('[waotyutil] Bandcamp title element not found.');
                        return;
                    }

                    fillForm({
                        title: title,
                        type: releaseType,
                        date: cleanFormattedDate,
                        sourceUrl: url
                    });

                } catch (e) {
                    status.textContent = 'Failed to parse Bandcamp HTML.';
                    status.style.color = 'red';
                    console.error('[waotyutil] Error parsing Bandcamp HTML:', e);
                }
            },
            onerror: function(err) {
                status.textContent = 'Network error fetching Bandcamp page.';
                status.style.color = 'red';
                console.error('[waotyutil] Network error fetching Bandcamp:', err);
            }
        });
    }

    function formatDate(raw) {
        if (!raw) return '';

        let cleaned = String(raw).replace(/\s*\d{2}:\d{2}:\d{2}.*$/i, '').trim();

        const match = cleaned.match(/(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})/);
        if (match) {
            const months = {
                jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
                jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12'
            };
            const day = match[1].padStart(2, '0');
            const monthKey = match[2].toLowerCase().substring(0, 3);
            const month = months[monthKey];
            const year = match[3];
            if (month) {
                return `${year}-${month}-${day}`;
            }
        }

        if (cleaned.includes('T')) {
            return cleaned.split('T')[0];
        }

        const parsed = new Date(cleaned);
        if (!isNaN(parsed.getTime())) {
            const year = parsed.getFullYear();
            const month = String(parsed.getMonth() + 1).padStart(2, '0');
            const day = String(parsed.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
        }

        return '';
    }
})();