			/** @typedef {{id: string, kind: 'image'|'video', name: string, size: number, type: string, url: string, file?: File, style?: 'glass'|'neon'|'pastel'|'paper'}} MediaItem */

			const state = {
				/** @type {MediaItem[]} */
				items: [],
				filter: 'all',
				query: '',
				activeId: null,
				layout: 'grid',
				styleMode: 'mixed',
				pattern: {
					seed: 1,
				},
				slideshow: {
					playing: false,
					intervalMs: 3000,
					effect: 'auto',
					layoutMode: 'smart',
					autoMode: true,
					cycleStep: 0,
					layoutSeqStep: 0,
					cursor: 0,
					lastGroupCount: 1,
					effectHistory: ['fade', 'zoom'],
					effectBag: [],
					effectOrderIndex: 0,
					lastLayoutKey: 'one',
					timer: null,
				},
				music: {
					enabled: false,
					name: '',
					volume: 0.6,
					objectUrl: null,
				},
			};

			const el = {
				file: document.getElementById('file'),
				addBtn: document.getElementById('addBtn'),
				slideshowBtn: document.getElementById('slideshowBtn'),
				clearBtn: document.getElementById('clearBtn'),
				demoBtn: document.getElementById('demoBtn'),
				jumbleBtn: document.getElementById('jumbleBtn'),
				shuffleBtn: document.getElementById('shuffleBtn'),
				search: document.getElementById('search'),
				drop: document.getElementById('drop'),
				grid: document.getElementById('grid'),
				empty: document.getElementById('empty'),
				pills: Array.from(document.querySelectorAll('.pill')),
				filterPills: Array.from(document.querySelectorAll('.pill[data-filter]')),
				layoutPills: Array.from(document.querySelectorAll('.pill[data-layout]')),
				stylePills: Array.from(document.querySelectorAll('.pill[data-style]')),

				viewer: document.getElementById('viewer'),
				viewerBody: document.getElementById('viewerBody'),
				viewerName: document.getElementById('viewerName'),
				viewerSub: document.getElementById('viewerSub'),
				closeBtn: document.getElementById('closeBtn'),
				prevBtn: document.getElementById('prevBtn'),
				nextBtn: document.getElementById('nextBtn'),
				downloadBtn: document.getElementById('downloadBtn'),
				playBtn: document.getElementById('playBtn'),
				musicFile: document.getElementById('musicFile'),
				musicBtn: document.getElementById('musicBtn'),
				musicToggleBtn: document.getElementById('musicToggleBtn'),
				musicVol: document.getElementById('musicVol'),
				bgAudio: document.getElementById('bgAudio'),
				speedSelect: document.getElementById('speedSelect'),
				layoutSelect: document.getElementById('layoutSelect'),
				effectSelect: document.getElementById('effectSelect'),
			};

			const SLIDESHOW_EFFECTS = /** @type {const} */ ([
				'morph',
				'fade',
				'push',
				'wipe',
				'zoom',
				'cover',
			]);

			function mod(n, m) {
				return ((n % m) + m) % m;
			}

			function resolveFxClass(effect) {
				const fx = effect || 'fade';
				if (fx === 'zoom') return 'fx-zoom';
				if (fx === 'slide') return 'fx-slide';
				if (fx === 'kenburns') return 'fx-kenburns';
				if (fx === 'flip') return 'fx-flip';
				if (fx === 'rotate') return 'fx-rotate';
				if (fx === 'wipe-left') return 'fx-wipe-left';
				if (fx === 'wipe-up') return 'fx-wipe-up';
				if (fx === 'curtain') return 'fx-curtain';
				if (fx === 'circle') return 'fx-circle';
				if (fx === 'diamond') return 'fx-diamond';
				if (fx === 'window') return 'fx-window';
				if (fx === 'push') return 'fx-slide';
				if (fx === 'cover') return 'fx-slide';
				if (fx === 'morph') return 'fx-fade';
				if (fx === 'wipe') return 'fx-wipe-left';
				return 'fx-fade';
			}

			function pickSlideshowEffect() {
				if (state.slideshow.effect !== 'auto') return state.slideshow.effect;
				// Deterministic cycle so every slide is different:
				// Morph → Fade → Push → Wipe → Zoom → Cover → repeat
				const idx = Number.isFinite(state.slideshow.effectOrderIndex) ? state.slideshow.effectOrderIndex : 0;
				const pick = SLIDESHOW_EFFECTS[idx % SLIDESHOW_EFFECTS.length] || 'fade';
				state.slideshow.effectOrderIndex = (idx + 1) % SLIDESHOW_EFFECTS.length;
				const recent = Array.isArray(state.slideshow.effectHistory) ? state.slideshow.effectHistory : [];
				state.slideshow.effectHistory = [...recent.slice(-3), pick];
				return pick;
			}

			function pickDir() {
				return ['left', 'right', 'up', 'down'][Math.floor(Math.random() * 4)];
			}

			function dirToOffset(dir, amountPx) {
				if (dir === 'left') return { dx: -amountPx, dy: 0 };
				if (dir === 'right') return { dx: amountPx, dy: 0 };
				if (dir === 'up') return { dx: 0, dy: -amountPx };
				return { dx: 0, dy: amountPx };
			}

			function dirToClipStart(dir) {
				if (dir === 'left') return 'inset(0 100% 0 0)';
				if (dir === 'right') return 'inset(0 0 0 100%)';
				if (dir === 'up') return 'inset(100% 0 0 0)';
				return 'inset(0 0 100% 0)';
			}

			function ensureViewerStage() {
				let stage = el.viewerBody.querySelector('.viewer-stage');
				if (stage) return stage;
				el.viewerBody.innerHTML = '';
				stage = document.createElement('div');
				stage.className = 'viewer-stage';
				el.viewerBody.appendChild(stage);
				return stage;
			}

			function getStageMaxBox() {
				const bodyW = el.viewerBody?.clientWidth || 1100;
				const maxW = Math.min(1100, Math.max(320, bodyW - 24));
				const isSmall = window.matchMedia('(max-width: 720px)').matches;
				const vhFactor = isSmall ? 0.70 : 0.78;
				const hardMaxH = isSmall ? 680 : 820;
				const maxH = Math.min(window.innerHeight * vhFactor, hardMaxH);
				return { maxW, maxH };
			}

			function fitBoxToRatio(maxW, maxH, ratio) {
				let w = maxW;
				let h = w / ratio;
				if (h > maxH) {
					h = maxH;
					w = h * ratio;
				}
				return { w, h };
			}

			function setStageSize(stage, w, h) {
				stage.style.width = `${Math.round(w)}px`;
				stage.style.height = `${Math.round(h)}px`;
			}

			function resetStageToMax(stage) {
				const { maxW, maxH } = getStageMaxBox();
				setStageSize(stage, maxW, maxH);
			}

			function setStageToImage(stage, imgEl) {
				const nw = imgEl.naturalWidth || 0;
				const nh = imgEl.naturalHeight || 0;
				if (!nw || !nh) {
					resetStageToMax(stage);
					return;
				}
				const ratio = nw / nh;
				const { maxW, maxH } = getStageMaxBox();
				const { w, h } = fitBoxToRatio(maxW, maxH, ratio);
				setStageSize(stage, w, h);
			}

			function transitionFrames(stage, nextFrame, effectName) {
				const prevFrame = stage.querySelector('.slide-frame[data-active="true"]');
				nextFrame.dataset.active = 'true';
				stage.appendChild(nextFrame);

				const prefersReduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
				if (!prevFrame || prefersReduced) {
					if (prevFrame) prevFrame.remove();
					return;
				}

				prevFrame.dataset.active = 'false';
				const duration = effectName === 'wipe' || effectName === 'morph' ? 680 : effectName === 'push' || effectName === 'cover' ? 620 : 540;
				const easing = 'cubic-bezier(0.2, 0.9, 0.2, 1)';

				/** @type {Animation[]} */
				const animations = [];
				const dir = pickDir();

				// Ensure clip-path is applied to a clean node
				prevFrame.style.clipPath = '';
				nextFrame.style.clipPath = '';
				prevFrame.style.filter = '';
				nextFrame.style.filter = '';

				if (effectName === 'fade') {
					animations.push(prevFrame.animate([{ opacity: 1 }, { opacity: 0 }], { duration, easing }));
					animations.push(nextFrame.animate([{ opacity: 0 }, { opacity: 1 }], { duration, easing }));
				} else if (effectName === 'zoom') {
					animations.push(prevFrame.animate([{ opacity: 1 }, { opacity: 0 }], { duration, easing }));
					animations.push(nextFrame.animate([{ opacity: 0, transform: 'scale(0.93)' }, { opacity: 1, transform: 'scale(1)' }], { duration, easing }));
				} else if (effectName === 'wipe') {
					// More compatible wipe: scale reveal from an edge.
					const isHorizontal = dir === 'left' || dir === 'right';
					nextFrame.style.transformOrigin =
						dir === 'left' ? '0% 50%'
						: dir === 'right' ? '100% 50%'
						: dir === 'up' ? '50% 0%'
						: '50% 100%';
					animations.push(prevFrame.animate([{ opacity: 1 }, { opacity: 0.2 }], { duration, easing }));
					animations.push(
						nextFrame.animate(
							isHorizontal
								? [{ opacity: 1, transform: 'scaleX(0.02)' }, { opacity: 1, transform: 'scaleX(1)' }]
								: [{ opacity: 1, transform: 'scaleY(0.02)' }, { opacity: 1, transform: 'scaleY(1)' }],
							{ duration, easing }
						)
					);
				} else if (effectName === 'push') {
					const { dx, dy } = dirToOffset(dir, 70);
					animations.push(prevFrame.animate([{ transform: 'translate(0px, 0px)', opacity: 1 }, { transform: `translate(${dx}px, ${dy}px)`, opacity: 1 }], { duration, easing }));
					animations.push(nextFrame.animate([{ transform: `translate(${-dx}px, ${-dy}px)`, opacity: 1 }, { transform: 'translate(0px, 0px)', opacity: 1 }], { duration, easing }));
				} else if (effectName === 'cover') {
					const { dx, dy } = dirToOffset(dir, 86);
					animations.push(prevFrame.animate([{ opacity: 1 }, { opacity: 1 }], { duration, easing }));
					animations.push(nextFrame.animate([{ transform: `translate(${-dx}px, ${-dy}px)`, opacity: 1 }, { transform: 'translate(0px, 0px)', opacity: 1 }], { duration, easing }));
				} else {
					// Morph
					animations.push(prevFrame.animate([{ opacity: 1, transform: 'scale(1)' }, { opacity: 0, transform: 'scale(0.992)' }], { duration, easing }));
					animations.push(nextFrame.animate([{ opacity: 0, transform: 'scale(1.01)' }, { opacity: 1, transform: 'scale(1)' }], { duration, easing }));
				}

				Promise.allSettled(animations.map((a) => a.finished)).then(() => {
					if (prevFrame.isConnected) prevFrame.remove();
				});
			}

			function getManyCount() {
				if (window.matchMedia('(max-width: 420px)').matches) return 4;
				if (window.matchMedia('(max-width: 900px)').matches) return 4;
				return 5;
			}

			function uniqCounts(list) {
				return Array.from(new Set(list.filter((n) => Number.isFinite(n) && n > 0)));
			}

			function pickWeighted(items) {
				// items: {value:number, weight:number}[]
				let total = 0;
				for (const it of items) total += Math.max(0, it.weight || 0);
				if (total <= 0) return items[0]?.value;
				let r = Math.random() * total;
				for (const it of items) {
					r -= Math.max(0, it.weight || 0);
					if (r <= 0) return it.value;
				}
				return items[items.length - 1]?.value;
			}

			function pickSmartGroupCount(totalPhotos) {
				const many = Math.min(getManyCount(), totalPhotos);
				const candidates = uniqCounts([
					1,
					totalPhotos >= 2 ? 2 : null,
					totalPhotos >= 3 ? 3 : null,
					totalPhotos >= 4 ? many : null,
				]);
				if (!candidates.length) return 0;
				if (candidates.length === 1) return candidates[0];

				const last = state.slideshow.lastGroupCount || 1;
				const withoutRepeat = candidates.filter((c) => c !== last);
				const usable = withoutRepeat.length ? withoutRepeat : candidates;

				const weighted = usable.map((value) => {
					// Bias slightly toward 2 and 3 for variety (PPT-like)
					const weight = value === 1 ? 2.2 : value === 2 ? 3.2 : value === 3 ? 2.8 : 2.4;
					return { value, weight };
				});
				return pickWeighted(weighted) || usable[0];
			}

			function getCycleManyCount(totalPhotos) {
				return Math.max(1, Math.min(getManyCount(), totalPhotos));
			}

			function getNextGroupCountSmartCycle(totalPhotos, advanceCycle) {
				// Always cycle: 1 -> 2 -> 3 -> many, then repeat.
				const step = state.slideshow.layoutSeqStep || 0;
				const many = getCycleManyCount(totalPhotos);
				const seq = [1, 2, 3, many];
				let count = seq[step % seq.length];
				count = Math.max(1, Math.min(count, totalPhotos));
				if (advanceCycle) state.slideshow.layoutSeqStep = (step + 1) % seq.length;
				return count;
			}

			function getNextGroupCount(totalPhotos, advanceCycle) {
				if (totalPhotos <= 0) return 0;
				const mode = state.slideshow.layoutMode || 'single';
				let count = 1;
				if (mode === 'single') count = 1;
				else if (mode === 'two') count = 2;
				else if (mode === 'many') count = getManyCount();
				else if (mode === 'smart') count = getNextGroupCountSmartCycle(totalPhotos, advanceCycle);
				else {
					// cycle: 1 -> 2 -> many
					const seq = [1, 2, getManyCount()];
					count = seq[state.slideshow.cycleStep % seq.length];
					if (advanceCycle) state.slideshow.cycleStep = (state.slideshow.cycleStep + 1) % seq.length;
				}
				return Math.max(1, Math.min(count, totalPhotos));
			}

			function takeWrap(arr, start, count) {
				if (count <= 0 || arr.length === 0) return [];
				const out = [];
				for (let i = 0; i < count; i += 1) out.push(arr[mod(start + i, arr.length)]);
				return out;
			}

			function pickCollageLayoutKey(count) {
				if (count <= 1) return 'one';
				const prev = state.slideshow.lastLayoutKey || '';
				let options;
				if (count === 2) options = ['two-overlay', 'two-overlay-left'];
				else if (count === 3) options = ['three', 'three-right'];
				else if (count === 4) options = ['quad'];
				else if (count === 5) options = ['mosaic-5', 'mosaic-5r'];
				else options = ['mosaic-a', 'mosaic-b', 'mosaic-c'];
				const pool = options.filter((x) => x !== prev);
				const list = pool.length ? pool : options;
				const pick = list[Math.floor(Math.random() * list.length)];
				state.slideshow.lastLayoutKey = pick;
				return pick;
			}

			function formatBytes(bytes) {
				const units = ['B', 'KB', 'MB', 'GB'];
				let value = bytes;
				let i = 0;
				while (value >= 1024 && i < units.length - 1) {
					value /= 1024;
					i += 1;
				}
				return `${value.toFixed(value >= 10 || i === 0 ? 0 : 1)} ${units[i]}`;
			}

			function uid() {
				return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
			}

			const STYLES = /** @type {const} */ (['glass', 'neon', 'pastel', 'paper']);
			function pickStyle() {
				return STYLES[Math.floor(Math.random() * STYLES.length)];
			}

			// Deterministic PRNG for stable "jumble" layouts
			function mulberry32(seed) {
				let a = seed >>> 0;
				return function rand() {
					a |= 0;
					a = (a + 0x6d2b79f5) | 0;
					let t = Math.imul(a ^ (a >>> 15), 1 | a);
					t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
					return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
				};
			}

			function getPatternCols() {
				// Keep cards readable on smaller screens.
				if (window.matchMedia('(max-width: 420px)').matches) return 2;
				if (window.matchMedia('(max-width: 720px)').matches) return 6;
				return 12;
			}

			function allowedGroupSizes(cols) {
				if (cols <= 2) return [1, 2];
				if (cols <= 6) return [1, 2, 3];
				return [1, 2, 3, 4];
			}

			function groupToSpan(cols, groupSize) {
				// For 12 cols: 1->12, 2->6, 3->4, 4->3
				// For 6 cols:  1->6,  2->3, 3->2
				// For 2 cols:  1->2,  2->1
				if (groupSize <= 0) return cols;
				return Math.max(1, Math.floor(cols / groupSize));
			}

			function buildJumbleGroups(count, cols, seed) {
				const sizesAllowed = allowedGroupSizes(cols);
				const rand = mulberry32(seed);
				/** @type {number[]} */
				const groups = [];
				let remaining = count;
				let prev = 0;
				while (remaining > 0) {
					const options = sizesAllowed.filter((s) => s <= remaining && s !== prev);
					let pick = options.length ? options[Math.floor(rand() * options.length)] : Math.min(remaining, sizesAllowed[sizesAllowed.length - 1]);
					// If we are on a small screen, avoid too many tiny cards
					if (cols <= 2 && pick === 2 && remaining === 1) pick = 1;
					groups.push(pick);
					prev = pick;
					remaining -= pick;
				}
				return groups;
			}

			function guessKind(file) {
				if (file.type.startsWith('image/')) return 'image';
				if (file.type.startsWith('video/')) return 'video';
				return null;
			}

			function addFiles(fileList) {
				const files = Array.from(fileList || []);
				const accepted = [];
				for (const file of files) {
					const kind = guessKind(file);
					if (!kind) continue;
					accepted.push({
						id: uid(),
						kind,
						name: file.name || (kind === 'image' ? 'Photo' : 'Video'),
						size: file.size || 0,
						type: file.type || '',
						url: URL.createObjectURL(file),
						file,
						style: pickStyle(),
					});
				}

				if (accepted.length === 0) return;
				state.items.unshift(...accepted);
				render();
			}

			function isBlobUrl(url) {
				return typeof url === 'string' && url.startsWith('blob:');
			}

			function revokeIfBlob(url) {
				if (!isBlobUrl(url)) return;
				try { URL.revokeObjectURL(url); } catch { /* noop */ }
			}

			function toAbsoluteUrl(url) {
				if (typeof url !== 'string' || !url) return '';
				if (isBlobUrl(url) || url.startsWith('data:')) return url;
				try {
					return new URL(url, document.baseURI).href;
				} catch {
					return url;
				}
			}

			function addRemoteItems(items) {
				const accepted = [];
				for (const it of Array.from(items || [])) {
					if (!it || !it.url) continue;
					const kind = it.kind === 'video' ? 'video' : 'image';
					accepted.push({
						id: uid(),
						kind,
						name: it.name || 'Photo',
						size: Number(it.size) || 0,
						type: it.type || '',
						url: toAbsoluteUrl(it.url),
						style: pickStyle(),
					});
				}
				if (!accepted.length) return;
				state.items.unshift(...accepted);
			}

			function clearAll() {
				for (const item of state.items) revokeIfBlob(item.url);
				state.items = [];
				state.activeId = null;
				render();
				closeViewer();
			}

			function removeOne(id) {
				const idx = state.items.findIndex((x) => x.id === id);
				if (idx === -1) return;
				const [removed] = state.items.splice(idx, 1);
				revokeIfBlob(removed.url);
				if (state.activeId === id) {
					closeViewer();
				}
				render();
			}

			function getVisibleItems() {
				const q = state.query.trim().toLowerCase();
				return state.items.filter((item) => {
					if (state.filter !== 'all' && item.kind !== state.filter) return false;
					if (q && !item.name.toLowerCase().includes(q)) return false;
					return true;
				});
			}

			function getVisiblePhotos() {
				return getVisibleItems().filter((x) => x.kind === 'image');
			}

			function resolveStyle(item) {
				if (state.styleMode !== 'mixed') return state.styleMode;
				return item.style || 'glass';
			}

			function render() {
				const visible = getVisibleItems();
				el.grid.innerHTML = '';
				el.empty.hidden = state.items.length !== 0;

				el.grid.classList.toggle('masonry', state.layout === 'masonry');
				el.grid.classList.toggle('pattern', state.layout === 'pattern');

				if (state.items.length !== 0 && visible.length === 0) {
					const msg = document.createElement('div');
					msg.className = 'empty';
					msg.textContent = 'No matches for the current filter/search.';
					el.grid.appendChild(msg);
					el.grid.style.gridTemplateColumns = '1fr';
					return;
				}

				el.grid.style.gridTemplateColumns = '';

				let patternCols = 12;
				let groups = [];
				if (state.layout === 'pattern') {
					patternCols = getPatternCols();
					groups = buildJumbleGroups(visible.length, patternCols, state.pattern.seed);
				}

				let groupIdx = 0;
				let indexWithinGroup = 0;
				let currentGroupSize = groups.length ? groups[0] : 1;
				let currentSpan = groupToSpan(patternCols, currentGroupSize);

				for (const item of visible) {
					const card = document.createElement('div');
					card.className = 'card';
					card.tabIndex = 0;
					card.setAttribute('role', 'button');
					card.setAttribute('aria-label', `Open ${item.kind}: ${item.name}`);
					card.dataset.id = item.id;
					card.dataset.style = resolveStyle(item);

					// Pattern layout: 1 big, then 2, then 3, then 1, then 4... (jumbled)
					if (state.layout === 'pattern') {
						card.style.gridColumn = `span ${currentSpan}`;
						// Make big cards a bit more cinematic; smaller ones more compact
						if (currentGroupSize === 1) card.style.aspectRatio = '16 / 9';
						else if (currentGroupSize === 2) card.style.aspectRatio = '4 / 3';
						else if (currentGroupSize === 3) card.style.aspectRatio = '1 / 1';
						else card.style.aspectRatio = '3 / 4';

						indexWithinGroup += 1;
						if (indexWithinGroup >= currentGroupSize) {
							groupIdx += 1;
							indexWithinGroup = 0;
							currentGroupSize = groups[groupIdx] ?? 1;
							currentSpan = groupToSpan(patternCols, currentGroupSize);
						}
					} else {
						card.style.gridColumn = '';
						card.style.aspectRatio = '';
					}

					const frame = document.createElement('div');
					frame.className = 'frame';
					const frameInner = document.createElement('div');
					frameInner.className = 'frame-inner';
					frame.appendChild(frameInner);
					card.appendChild(frame);

					let thumb;
					if (item.kind === 'image') {
						thumb = document.createElement('img');
						thumb.loading = 'lazy';
						thumb.decoding = 'async';
						thumb.src = item.url;
						thumb.alt = '';
					} else {
						thumb = document.createElement('video');
						thumb.src = item.url;
						thumb.muted = true;
						thumb.playsInline = true;
						thumb.preload = 'metadata';
					}
					thumb.className = 'thumb';
					frameInner.appendChild(thumb);

					const removeBtn = document.createElement('button');
					removeBtn.className = 'x';
					removeBtn.type = 'button';
					removeBtn.textContent = 'Remove';
					removeBtn.addEventListener('click', (e) => {
						e.stopPropagation();
						removeOne(item.id);
					});
					card.appendChild(removeBtn);

					const meta = document.createElement('div');
					meta.className = 'meta';
					const name = document.createElement('div');
					name.className = 'name';
					name.textContent = item.name;
					const sub = document.createElement('div');
					sub.className = 'sub';
					const badge = document.createElement('span');
					badge.className = 'badge';
					badge.textContent = item.kind === 'image' ? 'Photo' : 'Video';
					const size = document.createElement('span');
					size.textContent = formatBytes(item.size);
					sub.appendChild(badge);
					sub.appendChild(size);
					meta.appendChild(name);
					meta.appendChild(sub);
					card.appendChild(meta);

					card.addEventListener('click', () => openViewer(item.id));
					card.addEventListener('keydown', (e) => {
						if (e.key === 'Enter' || e.key === ' ') {
							e.preventDefault();
							openViewer(item.id);
						}
					});

					el.grid.appendChild(card);
				}
			}

			function openViewer(id) {
				const visible = getVisibleItems();
				const item = state.items.find((x) => x.id === id);
				if (!item) return;

				state.activeId = id;
				el.viewerName.textContent = item.name;
				el.viewerSub.textContent = `${item.kind === 'image' ? 'Photo' : 'Video'} • ${formatBytes(item.size)} • ${item.type || 'unknown type'}`;
				el.viewerBody.innerHTML = '';

				if (item.kind === 'video' && state.slideshow.playing) {
					// Slideshow is for photos; opening a video pauses it.
					stopSlideshow();
				}

				let mediaEl;
				if (item.kind === 'image') {
					mediaEl = document.createElement('img');
					mediaEl.src = item.url;
					mediaEl.alt = item.name;
					const fxClass = resolveFxClass(state.slideshow.effect);
					mediaEl.className = `viewer-media fx ${fxClass}`;
				} else {
					mediaEl = document.createElement('video');
					mediaEl.src = item.url;
					mediaEl.controls = true;
					mediaEl.playsInline = true;
					mediaEl.preload = 'metadata';
					mediaEl.className = 'viewer-media';
				}
				el.viewerBody.appendChild(mediaEl);

				// Enable/disable nav based on visible items
				const idx = visible.findIndex((x) => x.id === id);
				el.prevBtn.disabled = idx <= 0;
				el.nextBtn.disabled = idx === -1 || idx >= visible.length - 1;

				const isOpen = Boolean(el.viewer.open || el.viewer.hasAttribute('open'));
				if (!isOpen) {
					// Some browsers/webviews don't fully support <dialog>.showModal().
					if (typeof el.viewer.showModal === 'function') el.viewer.showModal();
					else if (typeof el.viewer.show === 'function') el.viewer.show();
					else el.viewer.setAttribute('open', '');
				}
			}

			function initSlideshowCursorFromActive(photos) {
				if (!photos.length) return;
				const active = state.items.find((x) => x.id === state.activeId);
				if (!active || active.kind !== 'image') {
					state.slideshow.cursor = 0;
					return;
				}
				const idx = photos.findIndex((x) => x.id === active.id);
				state.slideshow.cursor = idx === -1 ? 0 : idx;
			}

			function renderSlideshowFrame({ dir = 0, advanceCycle = false } = {}) {
				const photos = getVisiblePhotos();
				if (photos.length === 0) return;

				if (!el.viewer.open) {
					// Ensure viewer is open.
					openViewer(photos[0].id);
				}

				if (!Number.isFinite(state.slideshow.cursor)) state.slideshow.cursor = 0;
				if (state.slideshow.cursor < 0 || state.slideshow.cursor >= photos.length) initSlideshowCursorFromActive(photos);

				const stepBy = state.slideshow.lastGroupCount || 1;
				if (dir !== 0) state.slideshow.cursor = mod(state.slideshow.cursor + dir * stepBy, photos.length);

				const groupCount = getNextGroupCount(photos.length, advanceCycle);
				const group = takeWrap(photos, state.slideshow.cursor, groupCount);
				if (!group.length) return;

				state.activeId = group[0].id;
				state.slideshow.lastGroupCount = group.length;

				const effect = pickSlideshowEffect();

				// Title/subtitle
				if (group.length === 1) {
					el.viewerName.textContent = group[0].name;
					el.viewerSub.textContent = `Photo • ${formatBytes(group[0].size)} • ${group[0].type || 'unknown type'}`;
				} else {
					el.viewerName.textContent = 'Slideshow';
					el.viewerSub.textContent = `Showing ${group.length} photos • Effect: ${effect === 'kenburns' ? 'Ken Burns' : effect}`;
				}

				const stage = ensureViewerStage();
				// Default stage size; refined per single-image aspect ratio.
				resetStageToMax(stage);
				const nextFrame = document.createElement('div');
				nextFrame.className = 'slide-frame';
				nextFrame.dataset.active = 'false';

				if (group.length === 1) {
					const img = document.createElement('img');
					img.className = 'viewer-slide';
					img.src = group[0].url;
					img.alt = group[0].name;
					img.loading = 'eager';
					img.decoding = 'async';
					nextFrame.appendChild(img);
					// Fit stage to the image aspect ratio to avoid letterbox gaps.
					if (img.decode) {
						img.decode().then(() => setStageToImage(stage, img)).catch(() => {});
					} else {
						img.addEventListener('load', () => setStageToImage(stage, img), { once: true });
					}
				} else {
					// For collages, keep a large consistent stage.
					resetStageToMax(stage);
					const collage = document.createElement('div');
					collage.className = 'viewer-collage';
					collage.dataset.layout = pickCollageLayoutKey(group.length);
					for (const photo of group) {
						const absUrl = toAbsoluteUrl(photo.url);
						const tile = document.createElement('div');
						tile.className = 'tile';
						tile.style.setProperty('--tile-bg', `url("${absUrl}")`);

						const img = document.createElement('img');
						img.className = 'tile-media';
						img.src = absUrl;
						img.alt = photo.name;
						img.loading = 'eager';
						img.decoding = 'async';
						tile.appendChild(img);
						collage.appendChild(tile);
					}
					nextFrame.appendChild(collage);
				}

				transitionFrames(stage, nextFrame, effect);

				// While playing, nav steps by groups rather than single items.
				el.prevBtn.disabled = photos.length <= 1;
				el.nextBtn.disabled = photos.length <= 1;
			}

			function closeViewer() {
				if (el.viewer.open) el.viewer.close();
				state.activeId = null;
				el.viewerBody.innerHTML = '';
				stopSlideshow();
			}

			function stepViewer(dir) {
				const visible = getVisibleItems();
				if (!state.activeId) return;
				const idx = visible.findIndex((x) => x.id === state.activeId);
				if (idx === -1) return;
				const nextIdx = idx + dir;
				if (nextIdx < 0 || nextIdx >= visible.length) return;
				openViewer(visible[nextIdx].id);
			}

			function updatePlayUi() {
				const playing = state.slideshow.playing;
				el.playBtn.textContent = playing ? 'Pause' : 'Play';
				el.playBtn.setAttribute('aria-pressed', String(playing));
			}

			function updateMusicUi() {
				const hasTrack = Boolean(state.music.objectUrl);
				const isPlaying = hasTrack && !el.bgAudio.paused;
				if (el.musicToggleBtn) {
					el.musicToggleBtn.disabled = !hasTrack;
					el.musicToggleBtn.textContent = !hasTrack ? 'Music Off' : isPlaying ? 'Music On' : 'Music Paused';
					el.musicToggleBtn.setAttribute('aria-pressed', String(isPlaying));
				}
				if (el.musicVol) el.musicVol.disabled = !hasTrack;
			}

			function setMusicFromFile(file) {
				if (!file) return;
				revokeIfBlob(state.music.objectUrl);
				const url = URL.createObjectURL(file);
				state.music.objectUrl = url;
				state.music.enabled = true;
				state.music.name = file.name || 'Music';
				el.bgAudio.src = url;
				el.bgAudio.loop = true;
				el.bgAudio.volume = Math.max(0, Math.min(1, state.music.volume || 0.6));
				updateMusicUi();
			}

			function setMusicFromUrl(url, name) {
				if (!url) return;
				revokeIfBlob(state.music.objectUrl);
				state.music.objectUrl = url;
				state.music.enabled = true;
				state.music.name = name || 'Music';
				el.bgAudio.src = url;
				el.bgAudio.loop = true;
				el.bgAudio.volume = Math.max(0, Math.min(1, state.music.volume || 0.6));
				updateMusicUi();
			}

			function tryPlayMusic() {
				if (!state.music.enabled) return;
				if (!state.music.objectUrl) return;
				el.bgAudio.volume = Math.max(0, Math.min(1, state.music.volume || 0.6));
				el.bgAudio.play().then(updateMusicUi).catch(() => {
					// Autoplay can be blocked until a user gesture.
					state.music.needsGesture = true;
					updateMusicUi();
					showAudioNudge();
				});
			}

			function pauseMusic() {
				if (!el.bgAudio) return;
				if (!el.bgAudio.paused) el.bgAudio.pause();
				state.music.needsGesture = false;
				hideAudioNudge();
				updateMusicUi();
			}

			function toggleMusic() {
				if (!state.music.objectUrl) return;
				if (el.bgAudio.paused) tryPlayMusic();
				else pauseMusic();
			}

			function ensureAudioNudgeEl() {
				let nudge = document.querySelector('.audio-nudge');
				if (nudge) return nudge;
				nudge = document.createElement('div');
				nudge.className = 'audio-nudge';
				nudge.innerHTML = `
					<div>
						<strong>Sound is blocked</strong>
						<div class="muted">Tap “Enable sound” once.</div>
					</div>
					<button type="button" id="enableSoundBtn">Enable sound</button>
				`;
				document.body.appendChild(nudge);
				const btn = nudge.querySelector('#enableSoundBtn');
				if (btn) btn.addEventListener('click', () => {
					state.music.needsGesture = false;
					hideAudioNudge();
					tryPlayMusic();
				});
				return nudge;
			}

			function showAudioNudge() {
				const nudge = ensureAudioNudgeEl();
				nudge.classList.add('show');
			}

			function hideAudioNudge() {
				const nudge = document.querySelector('.audio-nudge');
				if (nudge) nudge.classList.remove('show');
			}

			function setShowcaseMode(on) {
				document.body.classList.toggle('showcase-mode', Boolean(on));
			}

			function encodeGalleryUrl(file) {
				// Encode only the filename portion (handles spaces / unicode safely)
				// IMPORTANT: return an absolute URL so CSS `url(...)` in assets/styles.css
				// does not resolve relative to /assets/.
				const rel = `gallery/${encodeURIComponent(String(file || ''))}`;
				return new URL(rel, document.baseURI).href;
			}

			async function loadGalleryManifest() {
				try {
					const res = await fetch('gallery/manifest.json', { cache: 'no-store' });
					if (!res.ok) return null;
					return await res.json();
				} catch {
					return null;
				}
			}

			async function bootShowcaseFromManifest() {
				const manifest = await loadGalleryManifest();
				if (!manifest) return false;
				// IMPORTANT:
				// Only preload the bundled /gallery items when explicitly in showcase mode.
				// This keeps the public QR link "empty by default" so each user can upload their own media.
				if (manifest.showcaseMode !== true) return false;
				if (!Array.isArray(manifest.items) || manifest.items.length === 0) return false;

				if (manifest.showcaseMode) setShowcaseMode(true);

				// Build remote items
				const remoteItems = manifest.items.map((it) => {
					const file = it.file || it.name;
					const baseUrl = it.url || encodeGalleryUrl(file);
					const absUrl = new URL(String(baseUrl || ''), document.baseURI).href;
					return {
						kind: it.kind || 'image',
						name: it.name || file,
						url: absUrl,
					};
				});
				addRemoteItems(remoteItems);

				// Music
				if (manifest.music && (manifest.music.url || manifest.music.file)) {
					if (Number.isFinite(manifest.music.volume)) state.music.volume = Number(manifest.music.volume);
					state.music.enabled = manifest.music.enabled !== false;
					const baseMusicUrl = manifest.music.url || encodeGalleryUrl(manifest.music.file);
					const musicUrl = new URL(String(baseMusicUrl || ''), document.baseURI).href;
					setMusicFromUrl(musicUrl, manifest.music.name || manifest.music.file);
				}

				render();

				if (manifest.autostart) {
					const photos = getVisiblePhotos();
					if (photos.length) {
						try {
							openViewer(photos[0].id);
							startSlideshow();
							// Try music after starting slideshow
							tryPlayMusic();
						} catch {
							// If the browser blocks dialog open without gesture, gallery still renders.
						}
					}
				}

				return true;
			}

			function stopSlideshow() {
				if (state.slideshow.timer) {
					clearInterval(state.slideshow.timer);
					state.slideshow.timer = null;
				}
				state.slideshow.playing = false;
				updatePlayUi();
				pauseMusic();
			}

			function stepSlideshow(dir) {
				// dir: -1 prev group, +1 next group
				renderSlideshowFrame({ dir, advanceCycle: true });
			}

			function startSlideshow() {
				const photos = getVisiblePhotos();
				if (photos.length === 0) return;

				// Fully automatic slideshow (no manual setup needed)
				if (state.slideshow.autoMode) {
					state.slideshow.effect = 'auto';
					state.slideshow.layoutMode = 'smart';
					if (el.effectSelect) {
						el.effectSelect.value = 'auto';
						el.effectSelect.disabled = true;
					}
					if (el.layoutSelect) {
						el.layoutSelect.value = 'smart';
						el.layoutSelect.disabled = true;
					}
				}

				// Initialize slideshow cursor from current active photo (or start).
				initSlideshowCursorFromActive(photos);
				state.slideshow.cycleStep = 0;
				state.slideshow.layoutSeqStep = 0;
				state.slideshow.lastGroupCount = 1;
				state.slideshow.effectHistory = ['fade', 'zoom'];
				state.slideshow.effectBag = [];
				state.slideshow.effectOrderIndex = 0;
				state.slideshow.lastLayoutKey = 'one';

				// Ensure viewer is open
				if (!el.viewer.open) openViewer(photos[0].id);

				if (state.slideshow.timer) clearInterval(state.slideshow.timer);
				state.slideshow.playing = true;
				updatePlayUi();
				tryPlayMusic();
				// Render first frame immediately (and advance cycle for next frame)
				renderSlideshowFrame({ dir: 0, advanceCycle: true });
				state.slideshow.timer = setInterval(() => {
					// Only advance while viewer is open
					if (!el.viewer.open) {
						stopSlideshow();
						return;
					}

					const livePhotos = getVisiblePhotos();
					if (livePhotos.length === 0) {
						stopSlideshow();
						return;
					}
					if (state.slideshow.cursor < 0 || state.slideshow.cursor >= livePhotos.length) initSlideshowCursorFromActive(livePhotos);

					// Advance cursor by the previous frame's group size, then change layout count (if cycling)
					state.slideshow.cursor = mod(state.slideshow.cursor + (state.slideshow.lastGroupCount || 1), livePhotos.length);
					renderSlideshowFrame({ dir: 0, advanceCycle: true });
				}, state.slideshow.intervalMs);
			}

			function toggleSlideshow() {
				if (state.slideshow.playing) stopSlideshow();
				else startSlideshow();
			}

			function downloadActive() {
				if (!state.activeId) return;
				const item = state.items.find((x) => x.id === state.activeId);
				if (!item) return;

				const a = document.createElement('a');
				a.href = item.url;
				a.download = item.name || (item.kind === 'image' ? 'photo' : 'video');
				document.body.appendChild(a);
				a.click();
				a.remove();
			}

			function pressGroup(buttons, activeBtn) {
				for (const b of buttons) b.setAttribute('aria-pressed', String(b === activeBtn));
			}

			// Filter pills
			el.filterPills.forEach((btn) => {
				btn.addEventListener('click', () => {
					state.filter = btn.dataset.filter;
					pressGroup(el.filterPills, btn);
					render();
					if (state.activeId) {
						const stillVisible = getVisibleItems().some((x) => x.id === state.activeId);
						if (!stillVisible) closeViewer();
						else openViewer(state.activeId);
					}
				});
			});

			// Layout pills
			el.layoutPills.forEach((btn) => {
				btn.addEventListener('click', () => {
					state.layout = btn.dataset.layout;
					pressGroup(el.layoutPills, btn);
					render();
				});
			});

			// Style pills
			el.stylePills.forEach((btn) => {
				btn.addEventListener('click', () => {
					state.styleMode = btn.dataset.style;
					pressGroup(el.stylePills, btn);
					render();
				});
			});

			// Search
			el.search.addEventListener('input', () => {
				state.query = el.search.value;
				render();
				if (state.activeId) {
					const stillVisible = getVisibleItems().some((x) => x.id === state.activeId);
					if (!stillVisible) closeViewer();
					else openViewer(state.activeId);
				}
			});

			// Add files
			el.addBtn.addEventListener('click', () => el.file.click());
			el.file.addEventListener('change', () => {
				addFiles(el.file.files);
				el.file.value = '';
			});

			// Drag/drop
			function setDrag(active) {
				el.drop.classList.toggle('drag', active);
			}
			;['dragenter', 'dragover'].forEach((type) => {
				el.drop.addEventListener(type, (e) => {
					e.preventDefault();
					setDrag(true);
				});
			});
			;['dragleave', 'drop'].forEach((type) => {
				el.drop.addEventListener(type, (e) => {
					e.preventDefault();
					setDrag(false);
				});
			});
			el.drop.addEventListener('drop', (e) => {
				const dt = e.dataTransfer;
				if (!dt) return;
				addFiles(dt.files);
			});

			// Clear
			el.clearBtn.addEventListener('click', () => {
				if (state.items.length === 0) return;
				const ok = confirm('Remove all photos/videos from this page?');
				if (ok) clearAll();
			});

			// Start slideshow from gallery
			el.slideshowBtn.addEventListener('click', () => {
				const photos = getVisiblePhotos();
				if (photos.length === 0) {
					alert('No photos are visible to start a slideshow.');
					return;
				}
				openViewer(photos[0].id);
				startSlideshow();
			});

			// Demo items (no external assets; generates simple SVG images)
			el.demoBtn.addEventListener('click', () => {
				const mkSvg = (label, a, b) => {
					const svg = `\n<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="800">\n  <defs>\n    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">\n      <stop offset="0" stop-color="${a}"/>\n      <stop offset="1" stop-color="${b}"/>\n    </linearGradient>\n  </defs>\n  <rect width="100%" height="100%" fill="url(#g)"/>\n  <circle cx="940" cy="220" r="120" fill="rgba(255,255,255,0.18)"/>\n  <circle cx="980" cy="280" r="170" fill="rgba(0,0,0,0.10)"/>\n  <text x="60" y="120" font-size="64" font-family="ui-sans-serif,system-ui" fill="rgba(255,255,255,0.92)">${label}</text>\n  <text x="60" y="180" font-size="26" font-family="ui-sans-serif,system-ui" fill="rgba(255,255,255,0.74)">Demo photo (SVG)</text>\n</svg>`;
					return new Blob([svg], { type: 'image/svg+xml' });
				};

				const demoFiles = [
					new File([mkSvg('Sunset', '#8b5cf6', '#22c55e')], 'demo-sunset.svg', { type: 'image/svg+xml' }),
					new File([mkSvg('City', '#0ea5e9', '#8b5cf6')], 'demo-city.svg', { type: 'image/svg+xml' }),
					new File([mkSvg('Mountains', '#22c55e', '#0b1020')], 'demo-mountains.svg', { type: 'image/svg+xml' }),
					new File([mkSvg('Flowers', '#fb7185', '#a78bfa')], 'demo-flowers.svg', { type: 'image/svg+xml' }),
					new File([mkSvg('Ocean', '#38bdf8', '#22c55e')], 'demo-ocean.svg', { type: 'image/svg+xml' }),
				];
				addFiles(demoFiles);
			});

			// Shuffle styles
			el.shuffleBtn.addEventListener('click', () => {
				for (const item of state.items) item.style = pickStyle();
				render();
			});

			// Jumble pattern layout
			el.jumbleBtn.addEventListener('click', () => {
				state.pattern.seed = (state.pattern.seed + 1 + Math.floor(Math.random() * 100000)) >>> 0;
				if (state.layout !== 'pattern') {
					const btn = el.layoutPills.find((b) => b.dataset.layout === 'pattern');
					if (btn) {
						state.layout = 'pattern';
						pressGroup(el.layoutPills, btn);
					}
				}
				render();
			});

			window.addEventListener('resize', () => {
				if (state.layout === 'pattern') render();
				if (el.viewer.open && state.slideshow.playing) {
					renderSlideshowFrame({ dir: 0, advanceCycle: false });
				}
			});

			// Viewer controls
			el.closeBtn.addEventListener('click', closeViewer);
			el.prevBtn.addEventListener('click', () => (state.slideshow.playing ? stepSlideshow(-1) : stepViewer(-1)));
			el.nextBtn.addEventListener('click', () => (state.slideshow.playing ? stepSlideshow(1) : stepViewer(1)));
			el.downloadBtn.addEventListener('click', downloadActive);

			el.playBtn.addEventListener('click', toggleSlideshow);
			if (el.musicBtn && el.musicFile) {
				el.musicBtn.addEventListener('click', () => el.musicFile.click());
				el.musicFile.addEventListener('change', () => {
					const file = el.musicFile.files && el.musicFile.files[0];
					if (!file) return;
					setMusicFromFile(file);
					// If slideshow is currently playing, start music immediately.
					if (state.slideshow.playing && el.viewer.open) tryPlayMusic();
				});
			}
			if (el.musicToggleBtn) el.musicToggleBtn.addEventListener('click', toggleMusic);
			if (el.musicVol) {
				el.musicVol.addEventListener('input', () => {
					state.music.volume = Number(el.musicVol.value);
					el.bgAudio.volume = Math.max(0, Math.min(1, state.music.volume || 0.6));
				});
			}
			el.speedSelect.addEventListener('change', () => {
				state.slideshow.intervalMs = Number(el.speedSelect.value) || 3000;
				if (state.slideshow.playing) startSlideshow();
			});
			el.layoutSelect.addEventListener('change', () => {
				if (state.slideshow.autoMode) {
					el.layoutSelect.value = 'cycle';
					return;
				}
				state.slideshow.layoutMode = el.layoutSelect.value || 'single';
				state.slideshow.cycleStep = 0;
				state.slideshow.lastGroupCount = 1;
				if (el.viewer.open && state.slideshow.playing) renderSlideshowFrame({ dir: 0, advanceCycle: false });
			});
			el.effectSelect.addEventListener('change', () => {
				if (state.slideshow.autoMode) {
					el.effectSelect.value = 'auto';
					return;
				}
				state.slideshow.effect = el.effectSelect.value || 'fade';
				if (el.viewer.open && state.slideshow.playing) renderSlideshowFrame({ dir: 0, advanceCycle: false });
				else if (state.activeId) openViewer(state.activeId);
			});

			el.viewer.addEventListener('click', (e) => {
				// Click outside the dialog content to close
				const rect = el.viewer.querySelector('.viewer').getBoundingClientRect();
				const inside = e.clientX >= rect.left && e.clientX <= rect.right && e.clientY >= rect.top && e.clientY <= rect.bottom;
				if (!inside) closeViewer();
			});

			el.viewer.addEventListener('close', () => {
				// Handles Esc key close and other implicit closes.
				state.activeId = null;
				el.viewerBody.innerHTML = '';
				stopSlideshow();
				pauseMusic();
			});

			window.addEventListener('keydown', (e) => {
				if (!el.viewer.open) return;
				if (e.key === 'Escape') return; // dialog handles
				if (e.key.toLowerCase && e.key.toLowerCase() === 'p') {
					e.preventDefault();
					toggleSlideshow();
					return;
				}
				if (e.key.toLowerCase && e.key.toLowerCase() === 'm') {
					e.preventDefault();
					toggleMusic();
					return;
				}
				if (e.key === 'ArrowLeft') {
					e.preventDefault();
					if (state.slideshow.playing) stepSlideshow(-1);
					else stepViewer(-1);
				}
				if (e.key === 'ArrowRight') {
					e.preventDefault();
					if (state.slideshow.playing) stepSlideshow(1);
					else stepViewer(1);
				}
			});

			// Initial render
			// Default to automatic slideshow behavior (no manual user setup)
			if (el.layoutSelect) {
				el.layoutSelect.value = 'smart';
				el.layoutSelect.disabled = true;
			}
			if (el.effectSelect) {
				el.effectSelect.value = 'auto';
				el.effectSelect.disabled = true;
			}
			updatePlayUi();
			updateMusicUi();
			render();
			// Default behavior:
			// 1) Show your preloaded gallery on first open
			// 2) Still allow users to upload their own photos/videos
			// If you need an "empty start" link, use ?empty=1
			const qs = new URLSearchParams(window.location.search || '');
			const forceEmpty = qs.get('empty') === '1' || qs.get('uploadOnly') === '1';
			if (!forceEmpty) bootShowcaseFromManifest();
		
