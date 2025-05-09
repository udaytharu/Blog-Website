// Utility functions
const debounce = (func, wait) => {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
};

// Smooth scroll for navigation links with error handling
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const targetId = this.getAttribute('href');
        const targetElement = document.querySelector(targetId);
        
        if (targetElement) {
            targetElement.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        } else {
            console.warn(`Target element ${targetId} not found`);
        }
    });
});

// Enhanced animation on scroll with performance optimization
const observerOptions = {
    threshold: 0.1,
    rootMargin: '50px'
};

const handleIntersection = (entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('fade-in');
            // Stop observing once animation is triggered
            observer.unobserve(entry.target);
        }
    });
};

const observer = new IntersectionObserver(handleIntersection, observerOptions);

// Observe all sections with error handling
document.querySelectorAll('section').forEach(section => {
    if (section) {
        observer.observe(section);
    }
});

// Enhanced hover effect for feature cards with smooth transitions
document.querySelectorAll('.feature-card').forEach(card => {
    if (!card) return;

    const handleHover = debounce((isEnter) => {
        card.style.transform = isEnter ? 'translateY(-10px)' : 'translateY(0)';
        card.style.transition = 'transform 0.3s ease-in-out';
    }, 50);

    card.addEventListener('mouseenter', () => handleHover(true));
    card.addEventListener('mouseleave', () => handleHover(false));
});

// Enhanced loading animation with error handling
window.addEventListener('load', () => {
    try {
        document.body.classList.add('loaded');
        
        // Remove loading spinner if it exists
        const spinner = document.querySelector('.loading-spinner');
        if (spinner) {
            spinner.style.opacity = '0';
            setTimeout(() => spinner.remove(), 500);
        }
    } catch (error) {
        console.error('Error during page load:', error);
    }
});

// Add error handling for images
document.querySelectorAll('img').forEach(img => {
    img.addEventListener('error', function() {
        this.src = 'path/to/fallback-image.jpg';
        this.alt = 'Image failed to load';
    });
});

// Add responsive navigation handling
const handleResponsiveNav = () => {
    const nav = document.querySelector('nav');
    if (!nav) return;

    const toggleButton = document.querySelector('.nav-toggle');
    if (toggleButton) {
        toggleButton.addEventListener('click', () => {
            nav.classList.toggle('active');
        });
    }
};

// Initialize responsive navigation
handleResponsiveNav();

// Add scroll to top button functionality
const scrollToTopButton = document.querySelector('.scroll-to-top');
if (scrollToTopButton) {
    window.addEventListener('scroll', debounce(() => {
        if (window.pageYOffset > 300) {
            scrollToTopButton.classList.add('visible');
        } else {
            scrollToTopButton.classList.remove('visible');
        }
    }, 100));

    scrollToTopButton.addEventListener('click', () => {
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    });
}
