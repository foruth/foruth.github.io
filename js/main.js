/* ============================================
   STATIC BLOG - MAIN JAVASCRIPT
   ============================================
   
   Features:
   - Dark mode toggle with localStorage persistence
   - Auto-generated Table of Contents
   - Share buttons (copy link, Twitter)
   - Smooth scroll for anchor links
   - Reading progress indicator (optional)
   
============================================ */

(function () {
    'use strict';

    /* ============================================
       DARK MODE
    ============================================ */

    const ThemeManager = {
        STORAGE_KEY: 'blog-theme',

        init() {
            // Check for saved preference, then HTML default, then system preference
            const savedTheme = localStorage.getItem(this.STORAGE_KEY);
            const htmlDefaultTheme = document.documentElement.getAttribute('data-theme');
            const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

            // Priority: saved > HTML default > system preference
            const theme = savedTheme || htmlDefaultTheme || (systemPrefersDark ? 'dark' : 'light');
            this.setTheme(theme);

            // Listen for system theme changes
            window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
                if (!localStorage.getItem(this.STORAGE_KEY)) {
                    this.setTheme(e.matches ? 'dark' : 'light');
                }
            });

            // Bind toggle button
            const toggleBtn = document.getElementById('theme-toggle');
            if (toggleBtn) {
                toggleBtn.addEventListener('click', () => this.toggle());
            }
        },

        setTheme(theme) {
            document.documentElement.setAttribute('data-theme', theme);
            localStorage.setItem(this.STORAGE_KEY, theme);
        },

        toggle() {
            const currentTheme = document.documentElement.getAttribute('data-theme');
            const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
            this.setTheme(newTheme);
        }
    };

    /* ============================================
       TABLE OF CONTENTS
    ============================================ */

    const TableOfContents = {
        init() {
            const tocContainer = document.getElementById('toc-list');
            const article = document.querySelector('article');

            if (!tocContainer || !article) return;

            // Find all h2 and h3 headings in the article
            const headings = article.querySelectorAll('h2, h3');

            const tocWrapper = tocContainer.closest('.toc-card, .toc');

            if (headings.length === 0) {
                // Hide TOC if no headings
                if (tocWrapper) tocWrapper.style.display = 'none';
                return;
            }

            // Generate TOC items
            const fragment = document.createDocumentFragment();

            headings.forEach((heading, index) => {
                // Ensure heading has an ID
                if (!heading.id) {
                    heading.id = this.generateId(heading.textContent, index);
                }

                const li = document.createElement('li');
                const a = document.createElement('a');
                a.href = `#${heading.id}`;
                a.textContent = heading.textContent;
                a.className = heading.tagName === 'H3' ? 'toc-h3' : 'toc-h2';

                // Smooth scroll on click
                a.addEventListener('click', (e) => {
                    e.preventDefault();
                    heading.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    history.pushState(null, '', `#${heading.id}`);
                });

                li.appendChild(a);
                fragment.appendChild(li);
            });

            tocContainer.appendChild(fragment);

            // Set up scroll spy
            this.setupScrollSpy(headings, tocContainer);

            // Conditionally show TOC only between specific sections (e.g., Overview → Conclusion)
            this.setupVisibilityWindow(tocWrapper);
        },

        generateId(text, index) {
            // Create URL-friendly ID from heading text
            const slug = text
                .toLowerCase()
                .replace(/[^\w\s-]/g, '')
                .replace(/\s+/g, '-')
                .replace(/-+/g, '-')
                .trim();
            return slug || `section-${index}`;
        },

        setupScrollSpy(headings, tocContainer) {
            const links = tocContainer.querySelectorAll('a');

            const observer = new IntersectionObserver(
                (entries) => {
                    entries.forEach(entry => {
                        if (entry.isIntersecting) {
                            // Remove active class from all links
                            links.forEach(link => link.classList.remove('active'));

                            // Add active class to corresponding link
                            const activeLink = tocContainer.querySelector(`a[href="#${entry.target.id}"]`);
                            if (activeLink) {
                                activeLink.classList.add('active');

                                // Ensure active link is visible inside the floating TOC card
                                activeLink.scrollIntoView({
                                    block: 'nearest',
                                    inline: 'nearest'
                                });
                            }
                        }
                    });
                },
                {
                    rootMargin: '-100px 0px -60% 0px',
                    threshold: 0
                }
            );

            headings.forEach(heading => observer.observe(heading));
        },

        // Show TOC only while scrolling between #overview and #conclusion (if present)
        setupVisibilityWindow(tocWrapper) {
            if (!tocWrapper) return;

            const startEl = document.getElementById('overview');
            const endEl = document.getElementById('conclusion');

            // If either section is missing on this page, keep default behavior
            if (!startEl || !endEl) return;

            const updateVisibility = () => {
                const scrollY = window.scrollY || window.pageYOffset;

                const start = startEl.offsetTop - 200; // start a bit before the heading
                const end = endEl.offsetTop + endEl.offsetHeight;

                if (scrollY >= start && scrollY <= end) {
                    tocWrapper.classList.remove('toc-hidden');
                } else {
                    tocWrapper.classList.add('toc-hidden');
                }
            };

            // Initial state and listeners
            updateVisibility();
            window.addEventListener('scroll', updateVisibility);
            window.addEventListener('resize', updateVisibility);
        }
    };

    /* ============================================
       SHARE BUTTONS
    ============================================ */

    const ShareButtons = {
        init() {
            // Copy link button
            const copyBtn = document.getElementById('share-copy');
            if (copyBtn) {
                copyBtn.addEventListener('click', () => this.copyLink());
            }

            // Twitter share button
            const twitterBtn = document.getElementById('share-twitter');
            if (twitterBtn) {
                twitterBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    this.shareTwitter();
                });
            }
        },

        async copyLink() {
            try {
                await navigator.clipboard.writeText(window.location.href);
                this.showToast('Link copied to clipboard!');
            } catch (err) {
                // Fallback for older browsers
                const textarea = document.createElement('textarea');
                textarea.value = window.location.href;
                document.body.appendChild(textarea);
                textarea.select();
                document.execCommand('copy');
                document.body.removeChild(textarea);
                this.showToast('Link copied to clipboard!');
            }
        },

        shareTwitter() {
            const title = document.title;
            const url = window.location.href;
            const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(title)}&url=${encodeURIComponent(url)}`;
            window.open(twitterUrl, '_blank', 'width=550,height=420');
        },

        showToast(message) {
            // Create toast if it doesn't exist
            let toast = document.getElementById('toast');
            if (!toast) {
                toast = document.createElement('div');
                toast.id = 'toast';
                toast.className = 'toast';
                toast.setAttribute('role', 'alert');
                toast.setAttribute('aria-live', 'polite');
                document.body.appendChild(toast);
            }

            toast.textContent = message;
            toast.classList.add('show');

            setTimeout(() => {
                toast.classList.remove('show');
            }, 2500);
        }
    };

    /* ============================================
       READING PROGRESS (Optional)
    ============================================ */

    const ReadingProgress = {
        init() {
            const progressBar = document.getElementById('reading-progress');
            if (!progressBar) return;

            const article = document.querySelector('article');
            if (!article) return;

            window.addEventListener('scroll', () => {
                const articleTop = article.offsetTop;
                const articleHeight = article.offsetHeight;
                const windowHeight = window.innerHeight;
                const scrollY = window.scrollY;

                // Calculate progress
                const start = articleTop - windowHeight;
                const end = articleTop + articleHeight - windowHeight;
                const progress = Math.min(Math.max((scrollY - start) / (end - start), 0), 1);

                progressBar.style.width = `${progress * 100}%`;
            });
        }
    };

    /* ============================================
       MOBILE TOC TOGGLE
    ============================================ */

    const MobileTOC = {
        init() {
            const tocToggle = document.getElementById('toc-toggle');
            const tocContent = document.getElementById('toc-content');

            if (!tocToggle || !tocContent) return;

            tocToggle.addEventListener('click', () => {
                const isExpanded = tocToggle.getAttribute('aria-expanded') === 'true';
                tocToggle.setAttribute('aria-expanded', !isExpanded);
                tocContent.hidden = isExpanded;
            });
        }
    };

    /* ============================================
       EXTERNAL LINKS
    ============================================ */

    const ExternalLinks = {
        init() {
            // Add target="_blank" and rel="noopener" to external links
            const links = document.querySelectorAll('article a[href^="http"]');
            links.forEach(link => {
                if (!link.hostname.includes(window.location.hostname)) {
                    link.setAttribute('target', '_blank');
                    link.setAttribute('rel', 'noopener noreferrer');
                }
            });
        }
    };

    /* ============================================
       LAZY LOADING IMAGES (Native fallback)
    ============================================ */

    const LazyImages = {
        init() {
            // Add loading="lazy" to images that don't have it
            const images = document.querySelectorAll('article img:not([loading])');
            images.forEach(img => {
                img.setAttribute('loading', 'lazy');
            });
        }
    };

    /* ============================================
       POST CARDS (Clickable)
    ============================================ */

    const PostCards = {
        init() {
            const cards = document.querySelectorAll('.post-card');
            cards.forEach(card => {
                const link = card.querySelector('.post-card__title a');
                if (link) {
                    card.addEventListener('click', (e) => {
                        // Don't navigate if clicking on a tag or other link
                        if (e.target.closest('.tag-chip') || (e.target.tagName === 'A' && !e.target.closest('.post-card__title'))) {
                            return;
                        }
                        // Navigate to the post
                        window.location.href = link.href;
                    });
                }
            });
        }
    };

    /* ============================================
       VISITOR COUNTER
    ============================================ */

    const VisitorCounter = {
        init() {
            const counterEl = document.getElementById('visitor-count');
            if (!counterEl) return;

            // Get the current page path as key
            const pageKey = 'visitor-count-' + window.location.pathname;

            // Get current count from localStorage or start at 0
            let count = parseInt(localStorage.getItem(pageKey) || '0', 10);

            // Increment count
            count++;

            // Save back to localStorage
            localStorage.setItem(pageKey, count.toString());

            // Display the count
            counterEl.textContent = count;
        }
    };

    /* ============================================
       SEARCH FUNCTIONALITY
    ============================================ */

    const SearchModal = {
        // Pre-defined posts for static search (works on all pages)
        posts: [
            {
                title: 'Windows Privilege Escalation via Weak Service Permissions',
                url: 'posts/Windows Privilege Escalation Weak Service Permissions.html',
                excerpt: 'Exploiting weak ACLs and service permissions to escalate from standard user to SYSTEM on Windows.',
                tags: ['Windows Security', 'Privilege Escalation', 'Service Permissions']
            },
            {
                title: 'Windows UAC Bypass via DLL Hijacking Walkthrough',
                url: 'posts/Windows UAC Bypass DLL Hijacking.html',
                excerpt: 'Exploiting auto-elevating binaries and missing DLLs to gain elevated privileges on Windows 10.',
                tags: ['Windows Security', 'UAC Bypass', 'DLL Hijacking']
            }
        ],

        init() {
            const modal = document.getElementById('search-modal');
            const toggle = document.getElementById('search-toggle');
            const input = document.getElementById('search-input');
            const results = document.getElementById('search-results');
            const backdrop = modal?.querySelector('.search-modal__backdrop');

            if (!modal || !toggle) return;

            // Fix URLs if on a post page (add ../ prefix)
            if (window.location.pathname.includes('/posts/')) {
                this.posts = this.posts.map(post => ({
                    ...post,
                    url: '../' + post.url
                }));
            }

            // Open modal
            toggle.addEventListener('click', () => this.open());

            // Close on backdrop click
            backdrop?.addEventListener('click', () => this.close());

            // Keyboard shortcuts
            document.addEventListener('keydown', (e) => {
                // Ctrl+K or Cmd+K to open
                if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                    e.preventDefault();
                    this.open();
                }
                // Escape to close
                if (e.key === 'Escape' && !modal.classList.contains('hidden')) {
                    this.close();
                }
            });

            // Search on input
            input?.addEventListener('input', (e) => {
                this.search(e.target.value);
            });
        },

        open() {
            const modal = document.getElementById('search-modal');
            const input = document.getElementById('search-input');
            modal?.classList.remove('hidden');
            input?.focus();
            document.body.style.overflow = 'hidden';
        },

        close() {
            const modal = document.getElementById('search-modal');
            const input = document.getElementById('search-input');
            const results = document.getElementById('search-results');
            modal?.classList.add('hidden');
            if (input) input.value = '';
            if (results) results.innerHTML = '<p class="search-modal__hint">Type to search posts by title, content, or tags...</p>';
            document.body.style.overflow = '';
        },

        search(query) {
            const results = document.getElementById('search-results');
            if (!results) return;

            query = query.toLowerCase().trim();

            if (!query) {
                results.innerHTML = '<p class="search-modal__hint">Type to search posts by title, content, or tags...</p>';
                return;
            }

            const matches = this.posts.filter(post => {
                return post.title.toLowerCase().includes(query) ||
                    post.excerpt.toLowerCase().includes(query) ||
                    post.tags.some(tag => tag.toLowerCase().includes(query));
            });

            if (matches.length === 0) {
                results.innerHTML = `<div class="search-no-results">No results found for "${this.escapeHtml(query)}"</div>`;
                return;
            }

            results.innerHTML = matches.map(post => `
                <a href="${post.url}" class="search-result">
                    <div class="search-result__title">${this.highlight(post.title, query)}</div>
                    <div class="search-result__excerpt">${this.highlight(post.excerpt, query)}</div>
                    <div class="search-result__tags">
                        ${post.tags.map(tag => `<span class="search-result__tag">${tag}</span>`).join('')}
                    </div>
                </a>
            `).join('');
        },

        highlight(text, query) {
            if (!query) return this.escapeHtml(text);
            const escaped = this.escapeHtml(text);
            const regex = new RegExp(`(${this.escapeRegex(query)})`, 'gi');
            return escaped.replace(regex, '<mark class="search-highlight">$1</mark>');
        },

        escapeHtml(text) {
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        },

        escapeRegex(string) {
            return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        }
    };

    /* ============================================
       INITIALIZE
    ============================================ */

    document.addEventListener('DOMContentLoaded', () => {
        ThemeManager.init();
        TableOfContents.init();
        ShareButtons.init();
        ReadingProgress.init();
        SearchModal.init();

        // Visitor counter (works on static hosting like GitHub Pages)
        (function initVisitorCounter() {
            const elements = document.querySelectorAll('.js-visitor-count');
            if (!elements.length) return;

            const namespace = 'foruth-blog';
            const key = window.location.pathname.replace(/\//g, '_') || 'home';
            const url = `https://api.countapi.xyz/hit/${namespace}/${key}`;

            fetch(url)
                .then(r => r.json())
                .then(data => {
                    if (typeof data.value === 'number') {
                        const text = data.value.toLocaleString();
                        elements.forEach(el => {
                            el.textContent = text;
                        });
                    }
                })
                .catch(() => {
                    // leave default "--" on error
                });
        })();
        MobileTOC.init();
        ExternalLinks.init();
        LazyImages.init();
        PostCards.init();
        VisitorCounter.init();
    });

})();
