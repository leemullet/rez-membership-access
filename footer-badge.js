// footer-badge.js - Host this on your domain
(function () {
    'use strict';

    // Badge Configuration - Update these values as needed
    const BADGE_CONFIG = {
        companyName: 'Rezurrected Coffee',
        logoUrl: 'https://cdn.prod.website-files.com/6758a13445f172eb64177bdd/686546f3a30bd6d9f0ea07cf_medium-png.png', // Update this path
        websiteUrl: 'https://www.rezurrectedcoffee.com/?utm_source=clientfooter&utm_medium=referral&utm_id=footer_badge',
        showText: true, // Set to false for logo-only badge
        fadeInDistance: 100, // Pixels from bottom to trigger fade-in
        customCSS: `
            .footer-badge {
                position: fixed;
                bottom: 20px;
                left: 50%;
                transform: translateX(-50%);
                z-index: 9999;
                opacity: 0;
                transition: opacity 0.2s ease-out, transform 0.2s ease-out;
                pointer-events: none;
                transform: translateX(-50%) translateY(20px);
            }
            
            .footer-badge.visible {
                opacity: 1;
                pointer-events: auto;
                transform: translateX(-50%) translateY(0);
            }
            
            .footer-badge-content {
                background: #FFFAF2;
                backdrop-filter: blur(10px);
                color: #33302B;
                padding: 4px 8px;
                border-radius: 20px;
                display: flex;
                align-items: center;
                gap: 6px;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                font-size: 12px;
                font-weight: 500;
                text-decoration: none;
                box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
                border: 1px solid #CBCBCB;
                transition: all 0.3s ease;
            }
            
            .footer-badge-content:hover {
                background: #FFD278;
                transform: translateY(-2px);
                box-shadow: 0 6px 25px rgba(0, 0, 0, 0.2);
                text-decoration: none;
                color: #33302B;
            }
            
            .footer-badge-logo {
                width: 24px;
                height: 20px;
                border-radius: 0px;
                flex-shrink: 0;
                object-fit: contain;
            }
            
            .footer-badge-text {
                white-space: nowrap;
                color: inherit;
            }
            
            /* Mobile responsive */
            @media (max-width: 768px) {
                .footer-badge {
                    bottom: 15px;
                }
                .footer-badge-content {
                    padding: 6px 12px;
                    font-size: 11px;
                }
                .footer-badge-logo {
                    width: 14px;
                    height: 14px;
                }
            }
            
            /* Ensure badge doesn't interfere with other fixed elements */
            .footer-badge-content {
                user-select: none;
                -webkit-user-select: none;
                -moz-user-select: none;
                -ms-user-select: none;
            }
        `
    };

    let badge = null;
    let isVisible = false;

    // Create and inject CSS
    function injectCSS() {
        if (document.getElementById('footer-badge-styles')) return;

        const style = document.createElement('style');
        style.id = 'footer-badge-styles';
        style.textContent = BADGE_CONFIG.customCSS;
        document.head.appendChild(style);
    }

    // Create badge HTML
    function createBadge() {
        if (badge) return badge;

        badge = document.createElement('div');
        badge.className = 'footer-badge';
        badge.innerHTML = `
            <a href="${BADGE_CONFIG.websiteUrl}" target="_blank" class="footer-badge-content">
                <img src="${BADGE_CONFIG.logoUrl}" alt="${BADGE_CONFIG.companyName}" class="footer-badge-logo">
                ${BADGE_CONFIG.showText ? `<span class="footer-badge-text">Made by ${BADGE_CONFIG.companyName}</span>` : ''}
            </a>
        `;

        return badge;
    }

    // Check if user has scrolled near bottom
    function checkScrollPosition() {
        const scrollHeight = document.documentElement.scrollHeight;
        const scrollTop = document.documentElement.scrollTop || document.body.scrollTop;
        const clientHeight = document.documentElement.clientHeight;

        const distanceFromBottom = scrollHeight - (scrollTop + clientHeight);
        const shouldShow = distanceFromBottom <= BADGE_CONFIG.fadeInDistance;

        if (shouldShow && !isVisible) {
            showBadge();
        } else if (!shouldShow && isVisible) {
            hideBadge();
        }
    }

    // Show badge with animation
    function showBadge() {
        if (!badge || isVisible) return;

        isVisible = true;
        requestAnimationFrame(() => {
            badge.classList.add('visible');
        });
    }

    // Hide badge with animation
    function hideBadge() {
        if (!badge || !isVisible) return;

        isVisible = false;
        badge.classList.remove('visible');
    }

    // Initialize the badge
    function initBadge() {
        // Don't initialize if already exists
        if (document.querySelector('.footer-badge')) return;

        // Inject CSS
        injectCSS();

        // Create and append badge
        badge = createBadge();
        document.body.appendChild(badge);

        // Set up scroll listener with throttling
        let ticking = false;
        function onScroll() {
            if (!ticking) {
                requestAnimationFrame(() => {
                    checkScrollPosition();
                    ticking = false;
                });
                ticking = true;
            }
        }

        // Add scroll listener
        window.addEventListener('scroll', onScroll, { passive: true });

        // Initial check
        checkScrollPosition();
    }

    // Auto-initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initBadge);
    } else {
        initBadge();
    }

    // Expose manual control
    window.FooterBadge = {
        init: initBadge,
        show: showBadge,
        hide: hideBadge,
        config: BADGE_CONFIG
    };
})();
