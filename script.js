/* ============================================================
   SWISS GALLERY – script.js
   Luxury Swiss Watches Brand Page
   Designed & Developed by AMIR0WEB
   Version: 4.0 – Ultimate Production
   ============================================================ */

/* ============================================================
   1. UTILITY HELPERS
   ============================================================ */

/**
 * Debounce – limits function execution rate
 */
function debounce(fn, delay = 100) {
    let timer;
    return function (...args) {
        clearTimeout(timer);
        timer = setTimeout(() => fn.apply(this, args), delay);
    };
}

/**
 * Throttle – ensures function runs at most once per interval
 */
function throttle(fn, limit = 80) {
    let inThrottle = false;
    return function (...args) {
        if (!inThrottle) {
            fn.apply(this, args);
            inThrottle = true;
            setTimeout(() => (inThrottle = false), limit);
        }
    };
}

/**
 * Check if user prefers reduced motion
 */
const prefersReducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * Check if device supports hover (desktop)
 */
const isTouchDevice = () => 'ontouchstart' in window || navigator.maxTouchPoints > 0;

/**
 * Safe element selector with error handling
 */
function safeSelector(selector, context = document) {
    try {
        return context.querySelector(selector);
    } catch {
        return null;
    }
}

/**
 * Safe element selector all with error handling
 */
function safeSelectorAll(selector, context = document) {
    try {
        return context.querySelectorAll(selector);
    } catch {
        return [];
    }
}

/**
 * Add event listener with automatic cleanup reference
 */
function addEventListenerWithCleanup(element, event, handler, options = {}) {
    element.addEventListener(event, handler, options);
    return () => element.removeEventListener(event, handler, options);
}

/* ============================================================
   2. LOADER CLASS – waits for images + fonts
   ============================================================ */
class Loader {
    constructor() {
        this.element = safeSelector('.loading');
        if (!this.element) return;
        this.images = document.images;
        this.loaded = 0;
        this.total = this.images.length;
        this.isHidden = false;
        this.cleanupFns = [];
        this.init();
    }

    init() {
        // Wait for both images and fonts
        const imagePromises = [];
        for (const img of this.images) {
            if (img.complete) {
                this.loaded++;
            } else {
                const promise = new Promise((resolve) => {
                    const onLoad = () => { this.loaded++; resolve(); };
                    const onError = () => { this.loaded++; resolve(); };
                    img.addEventListener('load', onLoad);
                    img.addEventListener('error', onError);
                    this.cleanupFns.push(() => {
                        img.removeEventListener('load', onLoad);
                        img.removeEventListener('error', onError);
                    });
                });
                imagePromises.push(promise);
            }
        }

        // Wait for fonts
        let fontPromise = Promise.resolve();
        if (document.fonts && document.fonts.ready) {
            fontPromise = document.fonts.ready.catch(() => {});
        }

        Promise.all([...imagePromises, fontPromise]).then(() => {
            this.hide();
        });

        // Fallback timeout (if something hangs)
        setTimeout(() => {
            if (!this.isHidden) this.hide();
        }, 4000);
    }

    hide() {
        if (this.isHidden) return;
        this.isHidden = true;
        this.element.classList.add('loading--hidden');
        setTimeout(() => {
            if (this.element?.parentNode) {
                this.element.style.display = 'none';
            }
            // Cleanup listeners
            for (const clean of this.cleanupFns) {
                clean();
            }
            this.cleanupFns = [];
        }, 1200);
    }

    destroy() {
        this.cleanupFns = [];
    }
}

/* ============================================================
   3. CURSOR CLASS – with visibility API pause + cleanup
   ============================================================ */
class Cursor {
    constructor() {
        this.cursor = safeSelector('.cursor');
        if (!this.cursor || isTouchDevice()) {
            this.disable();
            return;
        }
        this.dot = safeSelector('.cursor__dot', this.cursor);
        this.isActive = true;
        this.isPaused = false;
        this.x = 0;
        this.y = 0;
        this.targetX = 0;
        this.targetY = 0;
        this.rafId = null;
        this.cleanupFns = [];
        this.init();
    }

    init() {
        this.bindEvents();
        this.loop();
        this.handleVisibility();
    }

    bindEvents() {
        // Mouse move
        const onMouseMove = (e) => {
            this.targetX = e.clientX;
            this.targetY = e.clientY;
        };
        document.addEventListener('mousemove', onMouseMove);
        this.cleanupFns.push(() => document.removeEventListener('mousemove', onMouseMove));

        // Event delegation for hover effects
        const onMouseEnter = (e) => {
            const target = e.target.closest('button, a, .collection__card, .brands__item, .hero__btn, .about__btn');
            if (target) this.enlarge();
        };
        const onMouseLeave = (e) => {
            const target = e.target.closest('button, a, .collection__card, .brands__item, .hero__btn, .about__btn');
            if (target) this.reset();
        };
        document.addEventListener('mouseenter', onMouseEnter, true);
        document.addEventListener('mouseleave', onMouseLeave, true);
        this.cleanupFns.push(() => {
            document.removeEventListener('mouseenter', onMouseEnter, true);
            document.removeEventListener('mouseleave', onMouseLeave, true);
        });

        // Hide cursor when leaving window
        const onWindowLeave = () => { this.cursor.style.opacity = '0'; };
        const onWindowEnter = () => { this.cursor.style.opacity = '1'; };
        document.addEventListener('mouseleave', onWindowLeave);
        document.addEventListener('mouseenter', onWindowEnter);
        this.cleanupFns.push(() => {
            document.removeEventListener('mouseleave', onWindowLeave);
            document.removeEventListener('mouseenter', onWindowEnter);
        });
    }

    handleVisibility() {
        const onVisibilityChange = () => {
            if (document.hidden) {
                this.isPaused = true;
                if (this.rafId) {
                    cancelAnimationFrame(this.rafId);
                    this.rafId = null;
                }
            } else {
                this.isPaused = false;
                if (!this.rafId) {
                    this.loop();
                }
            }
        };
        document.addEventListener('visibilitychange', onVisibilityChange);
        this.cleanupFns.push(() => document.removeEventListener('visibilitychange', onVisibilityChange));
    }

    enlarge() {
        if (!this.isActive) return;
        this.cursor.classList.add('cursor--hover');
    }

    reset() {
        if (!this.isActive) return;
        this.cursor.classList.remove('cursor--hover');
    }

    loop() {
        if (!this.isActive || this.isPaused) {
            this.rafId = requestAnimationFrame(() => this.loop());
            return;
        }

        this.x += (this.targetX - this.x) * 0.15;
        this.y += (this.targetY - this.y) * 0.15;

        this.cursor.style.transform = `translate(${this.x - 6}px, ${this.y - 6}px)`;

        this.rafId = requestAnimationFrame(() => this.loop());
    }

    disable() {
        if (this.cursor) {
            this.cursor.style.display = 'none';
        }
        this.isActive = false;
        if (this.rafId) {
            cancelAnimationFrame(this.rafId);
            this.rafId = null;
        }
    }

    destroy() {
        this.disable();
        for (const clean of this.cleanupFns) {
            clean();
        }
        this.cleanupFns = [];
    }
}

/* ============================================================
   4. HEADER CLASS – using IntersectionObserver for active link
   ============================================================ */
class Header {
    constructor() {
        this.header = safeSelector('.header');
        if (!this.header) return;
        this.links = safeSelectorAll('.header__nav-link');
        this.sections = safeSelectorAll('section[id]');
        this.toggle = safeSelector('.header__toggle');
        this.nav = safeSelector('.header__nav');
        this.isOpen = false;
        this.observer = null;
        this.cleanupFns = [];
        this.init();
    }

    init() {
        this.bindScroll();
        this.bindNavigation();
        this.bindMobileMenu();
        this.setupActiveLinkObserver();
    }

    bindScroll() {
        const handler = throttle(() => {
            const scrollY = window.scrollY;
            if (scrollY > 60) {
                this.header.classList.add('header--scrolled');
            } else {
                this.header.classList.remove('header--scrolled');
            }
        }, 50);
        window.addEventListener('scroll', handler, { passive: true });
        this.cleanupFns.push(() => window.removeEventListener('scroll', handler));
        handler();
    }

    bindNavigation() {
        for (const link of this.links) {
            const onClick = (e) => {
                const targetId = link.getAttribute('href');
                if (targetId?.startsWith('#')) {
                    e.preventDefault();
                    const target = safeSelector(targetId);
                    if (target) {
                        this.closeMenu();
                        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
                        this.setActive(link);
                    }
                }
            };
            link.addEventListener('click', onClick);
            this.cleanupFns.push(() => link.removeEventListener('click', onClick));
        }
    }

    setupActiveLinkObserver() {
        if (this.sections.length === 0) return;
        this.observer = new IntersectionObserver((entries) => {
            for (const entry of entries) {
                if (entry.isIntersecting) {
                    const id = entry.target.getAttribute('id');
                    for (const link of this.links) {
                        if (link.getAttribute('href') === `#${id}`) {
                            this.setActive(link);
                        }
                    }
                }
            }
        }, {
            threshold: 0.3,
            rootMargin: '0px 0px -40px 0px'
        });
        for (const section of this.sections) {
            this.observer.observe(section);
        }
        this.cleanupFns.push(() => {
            if (this.observer) {
                this.observer.disconnect();
                this.observer = null;
            }
        });
    }

    bindMobileMenu() {
        if (!this.toggle || !this.nav) return;

        // Toggle click
        const onToggle = () => {
            this.isOpen ? this.closeMenu() : this.openMenu();
        };
        this.toggle.addEventListener('click', onToggle);
        this.cleanupFns.push(() => this.toggle.removeEventListener('click', onToggle));

        // Close on outside click
        const onOutsideClick = (e) => {
            if (this.isOpen && !this.nav.contains(e.target) && !this.toggle.contains(e.target)) {
                this.closeMenu();
            }
        };
        document.addEventListener('click', onOutsideClick);
        this.cleanupFns.push(() => document.removeEventListener('click', onOutsideClick));

        // Close on ESC
        const onKeyDown = (e) => {
            if (e.key === 'Escape' && this.isOpen) this.closeMenu();
        };
        document.addEventListener('keydown', onKeyDown);
        this.cleanupFns.push(() => document.removeEventListener('keydown', onKeyDown));

        // Swipe to close
        let startX = 0;
        const onTouchStart = (e) => { startX = e.touches[0].clientX; };
        const onTouchMove = (e) => {
            const moveX = e.touches[0].clientX;
            if (moveX - startX > 60) this.closeMenu();
        };
        this.nav.addEventListener('touchstart', onTouchStart, { passive: true });
        this.nav.addEventListener('touchmove', onTouchMove, { passive: true });
        this.cleanupFns.push(() => {
            this.nav.removeEventListener('touchstart', onTouchStart);
            this.nav.removeEventListener('touchmove', onTouchMove);
        });
    }

    openMenu() {
        this.isOpen = true;
        this.nav.classList.add('header__nav--open');
        this.toggle.classList.add('header__toggle--active');
        document.body.style.overflow = 'hidden';
    }

    closeMenu() {
        this.isOpen = false;
        this.nav.classList.remove('header__nav--open');
        this.toggle.classList.remove('header__toggle--active');
        document.body.style.overflow = '';
    }

    setActive(link) {
        for (const l of this.links) l.classList.remove('active');
        if (link) link.classList.add('active');
    }

    destroy() {
        for (const clean of this.cleanupFns) {
            clean();
        }
        this.cleanupFns = [];
        if (this.observer) {
            this.observer.disconnect();
            this.observer = null;
        }
    }
}

/* ============================================================
   5. SCROLL REVEAL – using Set to avoid duplicates + cleanup
   ============================================================ */
class ScrollReveal {
    constructor() {
        this.elements = new Set();
        this.observer = null;
        this.reducedMotion = prefersReducedMotion();
        this.cleanupFns = [];
        this.init();
    }

    init() {
        const selectors = [
            '.fade-up', '.fade-in', '.scale-in',
            '.slide-left', '.slide-right', '.blur-reveal',
            '.text-reveal', '.rotate-in', '.stagger',
            '.image-reveal', '.collection__card', '.brands__item'
        ];
        for (const selector of selectors) {
            const items = safeSelectorAll(selector);
            for (const el of items) {
                this.elements.add(el);
            }
        }
        if (this.elements.size === 0) return;

        if (this.reducedMotion) {
            this.revealAll();
            return;
        }

        this.setupObserver();
    }

    revealAll() {
        for (const el of this.elements) {
            this.applyVisibleClass(el);
        }
    }

    applyVisibleClass(el) {
        const classes = [
            'fade-up', 'fade-in', 'scale-in',
            'slide-left', 'slide-right', 'blur-reveal',
            'text-reveal', 'rotate-in', 'stagger', 'image-reveal'
        ];
        for (const cls of classes) {
            if (el.classList.contains(cls)) {
                el.classList.add(`${cls}--visible`);
                return;
            }
        }
        if (el.classList.contains('collection__card')) {
            const delay = parseInt(el.dataset.delay) || 0;
            setTimeout(() => el.classList.add('collection__card--visible'), delay);
            return;
        }
        if (el.classList.contains('brands__item')) {
            el.classList.add('brands__item--visible');
            return;
        }
        el.classList.add('fade-up--visible');
    }

    setupObserver() {
        this.observer = new IntersectionObserver((entries) => {
            for (const entry of entries) {
                if (entry.isIntersecting) {
                    this.applyVisibleClass(entry.target);
                    this.observer.unobserve(entry.target);
                }
            }
        }, {
            threshold: 0.12,
            rootMargin: '0px 0px -40px 0px'
        });
        for (const el of this.elements) {
            this.observer.observe(el);
        }
        this.cleanupFns.push(() => {
            if (this.observer) {
                this.observer.disconnect();
                this.observer = null;
            }
        });
    }

    refresh() {
        // Re-observe if needed (but Set prevents duplicates)
        if (this.observer) {
            for (const el of this.elements) {
                if (!el.classList.toString().includes('--visible')) {
                    this.observer.observe(el);
                }
            }
        }
    }

    destroy() {
        for (const clean of this.cleanupFns) {
            clean();
        }
        this.cleanupFns = [];
        if (this.observer) {
            this.observer.disconnect();
            this.observer = null;
        }
    }
}

/* ============================================================
   6. CARD TILT – with requestAnimationFrame
   ============================================================ */
class CardTilt {
    constructor() {
        this.cards = safeSelectorAll('.collection__card-inner');
        if (this.cards.length === 0 || isTouchDevice()) return;
        this.rafId = null;
        this.cleanupFns = [];
        this.init();
    }

    init() {
        for (const card of this.cards) {
            let rafId = null;
            let targetX = 0, targetY = 0;
            let currentX = 0, currentY = 0;
            let isHovering = false;

            const onMouseMove = (e) => {
                const rect = card.getBoundingClientRect();
                targetX = e.clientX - rect.left;
                targetY = e.clientY - rect.top;
                if (!isHovering) {
                    isHovering = true;
                    if (rafId) cancelAnimationFrame(rafId);
                    const update = () => {
                        const centerX = rect.width / 2;
                        const centerY = rect.height / 2;
                        // Smooth follow
                        currentX += (targetX - currentX) * 0.12;
                        currentY += (targetY - currentY) * 0.12;

                        const rotateX = ((currentY - centerY) / centerY) * -4;
                        const rotateY = ((currentX - centerX) / centerX) * 4;
                        card.style.transform =
                            `perspective(800px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-10px) scale(1.03)`;

                        if (isHovering) {
                            rafId = requestAnimationFrame(update);
                        } else {
                            rafId = null;
                        }
                    };
                    update();
                }
            };

            const onMouseLeave = () => {
                isHovering = false;
                if (rafId) {
                    cancelAnimationFrame(rafId);
                    rafId = null;
                }
                card.style.transform = 'perspective(800px) rotateX(0) rotateY(0) translateY(0) scale(1)';
                card.style.transition = 'transform 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)';
                currentX = 0;
                currentY = 0;
            };

            const onMouseEnter = () => {
                card.style.transition = 'transform 0.15s ease';
            };

            card.addEventListener('mousemove', onMouseMove);
            card.addEventListener('mouseleave', onMouseLeave);
            card.addEventListener('mouseenter', onMouseEnter);
            this.cleanupFns.push(() => {
                card.removeEventListener('mousemove', onMouseMove);
                card.removeEventListener('mouseleave', onMouseLeave);
                card.removeEventListener('mouseenter', onMouseEnter);
                if (rafId) {
                    cancelAnimationFrame(rafId);
                    rafId = null;
                }
            });
        }
    }

    destroy() {
        for (const clean of this.cleanupFns) {
            clean();
        }
        this.cleanupFns = [];
        if (this.rafId) {
            cancelAnimationFrame(this.rafId);
            this.rafId = null;
        }
    }
}

/* ============================================================
   7. RIPPLE EFFECT – simplified (no pool) for clarity
   ============================================================ */
class Ripple {
    constructor() {
        this.buttons = safeSelectorAll('.hero__btn, .about__btn, .collection__card-link');
        if (this.buttons.length === 0) return;
        this.cleanupFns = [];
        this.init();
    }

    init() {
        for (const btn of this.buttons) {
            btn.classList.add('ripple');
            const onClick = (e) => {
                const rect = btn.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const y = e.clientY - rect.top;
                const ripple = document.createElement('span');
                ripple.className = 'ripple__effect';
                const size = Math.max(rect.width, rect.height) * 0.6;
                ripple.style.width = ripple.style.height = `${size}px`;
                ripple.style.left = `${x - size / 2}px`;
                ripple.style.top = `${y - size / 2}px`;
                btn.appendChild(ripple);
                setTimeout(() => {
                    if (ripple.parentNode) ripple.remove();
                }, 800);
            };
            btn.addEventListener('click', onClick);
            this.cleanupFns.push(() => btn.removeEventListener('click', onClick));
        }
    }

    destroy() {
        for (const clean of this.cleanupFns) {
            clean();
        }
        this.cleanupFns = [];
    }
}

/* ============================================================
   8. HERO PARALLAX – with cleanup
   ============================================================ */
class HeroParallax {
    constructor() {
        this.hero = safeSelector('.hero__picture');
        if (!this.hero) return;
        this.cleanupFns = [];
        this.init();
    }

    init() {
        const handler = throttle(() => {
            const scrollY = window.scrollY;
            const maxScroll = window.innerHeight * 0.15;
            const offset = Math.min(scrollY * 0.08, maxScroll);
            this.hero.style.transform = `translateY(${offset}px)`;
        }, 30);
        window.addEventListener('scroll', handler, { passive: true });
        this.cleanupFns.push(() => window.removeEventListener('scroll', handler));
        handler();
    }

    destroy() {
        for (const clean of this.cleanupFns) {
            clean();
        }
        this.cleanupFns = [];
    }
}

/* ============================================================
   9. HERO MOUSE GLOW – with rAF and cleanup
   ============================================================ */
class HeroMouseGlow {
    constructor() {
        this.glow = safeSelector('.hero__mouse-glow');
        this.hero = safeSelector('.hero');
        if (!this.glow || !this.hero || isTouchDevice()) return;
        this.x = 0;
        this.y = 0;
        this.targetX = 0;
        this.targetY = 0;
        this.isActive = false;
        this.rafId = null;
        this.cleanupFns = [];
        this.init();
    }

    init() {
        const onMouseMove = (e) => {
            const rect = this.hero.getBoundingClientRect();
            this.targetX = e.clientX - rect.left;
            this.targetY = e.clientY - rect.top;
            this.isActive = true;
            this.glow.classList.add('hero__mouse-glow--active');
            if (!this.rafId) this.loop();
        };
        const onMouseLeave = () => {
            this.isActive = false;
            this.glow.classList.remove('hero__mouse-glow--active');
            if (this.rafId) {
                cancelAnimationFrame(this.rafId);
                this.rafId = null;
            }
        };
        this.hero.addEventListener('mousemove', onMouseMove);
        this.hero.addEventListener('mouseleave', onMouseLeave);
        this.cleanupFns.push(() => {
            this.hero.removeEventListener('mousemove', onMouseMove);
            this.hero.removeEventListener('mouseleave', onMouseLeave);
        });
    }

    loop() {
        this.x += (this.targetX - this.x) * 0.08;
        this.y += (this.targetY - this.y) * 0.08;
        this.glow.style.left = `${this.x}px`;
        this.glow.style.top = `${this.y}px`;
        if (this.isActive) {
            this.rafId = requestAnimationFrame(() => this.loop());
        } else {
            this.rafId = null;
        }
    }

    destroy() {
        if (this.rafId) {
            cancelAnimationFrame(this.rafId);
            this.rafId = null;
        }
        for (const clean of this.cleanupFns) {
            clean();
        }
        this.cleanupFns = [];
    }
}

/* ============================================================
   10. BACK TO TOP – with cleanup
   ============================================================ */
class BackToTop {
    constructor() {
        this.btn = safeSelector('.back-top');
        if (!this.btn) return;
        this.cleanupFns = [];
        this.init();
    }

    init() {
        const handler = throttle(() => {
            const scrollY = window.scrollY;
            if (scrollY > 400) {
                this.btn.classList.add('back-top--visible');
            } else {
                this.btn.classList.remove('back-top--visible');
            }
        }, 50);
        window.addEventListener('scroll', handler, { passive: true });
        this.cleanupFns.push(() => window.removeEventListener('scroll', handler));
        handler();

        const onClick = (e) => {
            e.preventDefault();
            window.scrollTo({ top: 0, behavior: 'smooth' });
        };
        this.btn.addEventListener('click', onClick);
        this.cleanupFns.push(() => this.btn.removeEventListener('click', onClick));
    }

    destroy() {
        for (const clean of this.cleanupFns) {
            clean();
        }
        this.cleanupFns = [];
    }
}

/* ============================================================
   11. SMOOTH SCROLL – with cleanup
   ============================================================ */
class SmoothScroll {
    constructor() {
        this.links = safeSelectorAll('a[href^="#"]');
        if (this.links.length === 0) return;
        this.cleanupFns = [];
        this.init();
    }

    init() {
        for (const link of this.links) {
            if (link.closest('.header__nav') || link === safeSelector('.footer__logo')) continue;
            const href = link.getAttribute('href');
            if (href === '#') continue;
            const target = safeSelector(href);
            if (!target) continue;

            const onClick = (e) => {
                e.preventDefault();
                target.scrollIntoView({ behavior: 'smooth', block: 'start' });
            };
            link.addEventListener('click', onClick);
            this.cleanupFns.push(() => link.removeEventListener('click', onClick));
        }
    }

    destroy() {
        for (const clean of this.cleanupFns) {
            clean();
        }
        this.cleanupFns = [];
    }
}

/* ============================================================
   12. COUNTER – with cleanup
   ============================================================ */
class Counter {
    constructor() {
        this.elements = safeSelectorAll('[data-count]');
        if (this.elements.length === 0) return;
        this.observer = null;
        this.cleanupFns = [];
        this.init();
    }

    init() {
        if (prefersReducedMotion()) {
            for (const el of this.elements) {
                el.textContent = el.dataset.count;
            }
            return;
        }

        this.observer = new IntersectionObserver((entries) => {
            for (const entry of entries) {
                if (entry.isIntersecting) {
                    this.animateCounter(entry.target);
                    this.observer.unobserve(entry.target);
                }
            }
        }, { threshold: 0.3 });

        for (const el of this.elements) {
            this.observer.observe(el);
        }
        this.cleanupFns.push(() => {
            if (this.observer) {
                this.observer.disconnect();
                this.observer = null;
            }
        });
    }

    animateCounter(el) {
        const target = parseInt(el.dataset.count);
        if (isNaN(target)) return;
        const duration = 2000;
        const startTime = performance.now();

        const update = (currentTime) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const ease = 1 - Math.pow(1 - progress, 3);
            const current = Math.floor(ease * target);
            el.textContent = current.toLocaleString();
            if (progress < 1) {
                requestAnimationFrame(update);
            } else {
                el.textContent = target.toLocaleString();
            }
        };
        requestAnimationFrame(update);
    }

    destroy() {
        for (const clean of this.cleanupFns) {
            clean();
        }
        this.cleanupFns = [];
        if (this.observer) {
            this.observer.disconnect();
            this.observer = null;
        }
    }
}

/* ============================================================
   13. LAZY IMAGES – with cleanup
   ============================================================ */
class LazyImages {
    constructor() {
        this.images = safeSelectorAll('img[loading="lazy"]');
        if (this.images.length === 0) return;
        this.observer = null;
        this.cleanupFns = [];
        this.init();
    }

    init() {
        if (prefersReducedMotion()) {
            for (const img of this.images) {
                img.style.opacity = '1';
            }
            return;
        }

        this.observer = new IntersectionObserver((entries) => {
            for (const entry of entries) {
                if (entry.isIntersecting) {
                    const img = entry.target;
                    img.style.transition = 'opacity 0.8s ease';
                    img.style.opacity = '1';
                    this.observer.unobserve(img);
                }
            }
        }, { threshold: 0.1 });

        for (const img of this.images) {
            img.style.opacity = '0';
            this.observer.observe(img);
        }
        this.cleanupFns.push(() => {
            if (this.observer) {
                this.observer.disconnect();
                this.observer = null;
            }
        });
    }

    destroy() {
        for (const clean of this.cleanupFns) {
            clean();
        }
        this.cleanupFns = [];
        if (this.observer) {
            this.observer.disconnect();
            this.observer = null;
        }
    }
}

/* ============================================================
   14. ACCESSIBILITY – CSS-based, minimal JS
   ============================================================ */
class Accessibility {
    constructor() {
        this.cleanupFns = [];
        this.init();
    }

    init() {
        const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
        const handleChange = () => {
            if (mediaQuery.matches) {
                document.documentElement.setAttribute('data-reduced-motion', 'true');
            } else {
                document.documentElement.removeAttribute('data-reduced-motion');
            }
        };
        mediaQuery.addEventListener('change', handleChange);
        this.cleanupFns.push(() => mediaQuery.removeEventListener('change', handleChange));
        handleChange();
    }

    destroy() {
        for (const clean of this.cleanupFns) {
            clean();
        }
        this.cleanupFns = [];
    }
}

/* ============================================================
   15. PERFORMANCE MONITOR – robust using navigation entry
   ============================================================ */
class PerformanceMonitor {
    constructor() {
        this.cleanupFns = [];
        this.init();
    }

    init() {
        if (!window.performance) return;
        try {
            // Use navigation entry for accurate timings
            const navEntry = performance.getEntriesByType('navigation')[0];
            if (navEntry && navEntry.domContentLoadedEventEnd) {
                const loadTime = navEntry.domContentLoadedEventEnd - navEntry.startTime;
                console.log(`⏱️ App loaded in ${Math.round(loadTime)}ms`);
            } else {
                // Fallback using performance.now()
                const now = performance.now();
                console.log(`⏱️ App ready at ${Math.round(now)}ms`);
            }
        } catch (e) {
            // Silently fail – performance monitoring is non-critical
        }
    }

    destroy() {
        // Nothing to clean up
    }
}

/* ============================================================
   16. MAIN APP – orchestrates everything with full cleanup
   ============================================================ */
class App {
    constructor() {
        this.modules = [];
        this.init();
    }

    init() {
        // Order matters: accessibility first, then monitor
        this.modules.push(new Accessibility());
        this.modules.push(new PerformanceMonitor());

        // Loader (waits for images + fonts)
        this.modules.push(new Loader());

        // UI modules
        this.modules.push(new Cursor());
        this.modules.push(new Header());
        this.modules.push(new ScrollReveal());
        this.modules.push(new CardTilt());
        this.modules.push(new Ripple());
        this.modules.push(new HeroParallax());
        this.modules.push(new HeroMouseGlow());
        this.modules.push(new BackToTop());
        this.modules.push(new SmoothScroll());
        this.modules.push(new Counter());
        this.modules.push(new LazyImages());

        console.log('✨ SWISS GALLERY – Luxury Experience Loaded');
        console.log('🛠️ Designed & Developed by AMIR0WEB');
    }

    destroy() {
        // Destroy in reverse order
        for (let i = this.modules.length - 1; i >= 0; i--) {
            const module = this.modules[i];
            if (module && typeof module.destroy === 'function') {
                module.destroy();
            }
        }
        this.modules = [];
    }
}

/* ============================================================
   LAUNCH – single DOMContentLoaded entry
   ============================================================ */
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        const app = new App();
        // Expose for debugging / potential cleanup
        window.__app = app;
    });
} else {
    const app = new App();
    window.__app = app;
}

/* ============================================================
   END OF SCRIPT – Designed & Developed by AMIR0WEB
   ============================================================ */