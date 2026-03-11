document.addEventListener('DOMContentLoaded', () => {
    // --- State ---
    let posts = JSON.parse(localStorage.getItem('kcon_posts')) || getInitialPosts();
    let currentCategory = 'kpop';
    let currentTheme = localStorage.getItem('kcon_theme') || 'light';

    const categoryData = {
        kpop: {
            title: 'K-Pop & Entertainment',
            desc: 'The latest from the world of K-Pop and Korean entertainment.'
        },
        living: {
            title: 'Living in Korea',
            desc: 'Tips, advice, and stories about living in the Land of the Morning Calm.'
        },
        food: {
            title: 'Food & Recipes',
            desc: 'Discover delicious Korean recipes and the best places to eat.'
        },
        beauty: {
            title: 'Beauty & Skincare',
            desc: 'Unlock the secrets of K-Beauty and effective skincare routines.'
        },
        travel: {
            title: 'Travel & Hidden Spots',
            desc: 'Explore famous landmarks and hidden gems across South Korea.'
        }
    };

    // --- DOM Elements ---
    const postsContainer = document.getElementById('posts-container');
    const categoryTabs = document.getElementById('category-tabs');
    const categoryTitle = document.getElementById('category-title');
    const categoryDesc = document.getElementById('category-desc');
    const themeToggle = document.getElementById('theme-toggle');
    const btnWrite = document.getElementById('btn-write');
    const modalOverlay = document.getElementById('modal-overlay');
    const closeModal = document.getElementById('close-modal');
    const cancelPost = document.getElementById('cancel-post');
    const postForm = document.getElementById('post-form');
    const logoLink = document.getElementById('logo-link');

    // --- Initialization ---
    applyTheme(currentTheme);
    renderPosts();

    // --- Functions ---

    function getInitialPosts() {
        return [
            {
                id: Date.now() - 1000,
                category: 'kpop',
                title: 'Aespa\'s New Album is Incredible!',
                content: 'I just listened to the whole album and the production quality is through the roof. What\'s your favorite track?',
                author: 'KPopFan99',
                date: new Date().toLocaleDateString()
            },
            {
                id: Date.now() - 2000,
                category: 'living',
                title: 'Best districts for expats in Seoul?',
                content: 'I\'m moving to Seoul next month for work. Should I look into Yongsan or Mapo? Any advice would be appreciated!',
                author: 'SeoulBound',
                date: new Date().toLocaleDateString()
            },
            {
                id: Date.now() - 3000,
                category: 'food',
                title: 'The ultimate Tteokbokki recipe',
                content: 'The secret is using a bit of curry powder in the sauce. Trust me, it changes everything.',
                author: 'ChefKim',
                date: new Date().toLocaleDateString()
            }
        ];
    }

    function renderPosts() {
        postsContainer.innerHTML = '';
        const filteredPosts = posts.filter(post => post.category === currentCategory);

        if (filteredPosts.length === 0) {
            postsContainer.innerHTML = '<div class="post-card"><p>No posts in this category yet. Be the first to write one!</p></div>';
            return;
        }

        // Sort by newest first
        const sortedPosts = [...filteredPosts].sort((a, b) => b.id - a.id);

        sortedPosts.forEach(post => {
            const postElement = document.createElement('article');
            postElement.className = 'post-card';
            postElement.innerHTML = `
                <div class="post-meta">
                    <span>@${post.author}</span>
                    <span>•</span>
                    <span>${post.date}</span>
                </div>
                <h3 class="post-title">${post.title}</h3>
                <div class="post-content">${post.content}</div>
            `;
            postsContainer.appendChild(postElement);
        });
    }

    function applyTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('kcon_theme', theme);
    }

    function savePosts() {
        localStorage.setItem('kcon_posts', JSON.stringify(posts));
    }

    // --- Event Listeners ---

    // Category Switching
    categoryTabs.addEventListener('click', (e) => {
        const tab = e.target.closest('.tab');
        if (!tab) return;

        // Update UI
        document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');

        // Update State
        currentCategory = tab.dataset.category;
        categoryTitle.textContent = categoryData[currentCategory].title;
        categoryDesc.textContent = categoryData[currentCategory].desc;

        renderPosts();
    });

    // Theme Toggle
    themeToggle.addEventListener('click', () => {
        currentTheme = currentTheme === 'light' ? 'dark' : 'light';
        applyTheme(currentTheme);
    });

    // Modal Control
    const openModal = () => modalOverlay.classList.add('active');
    const hideModal = () => {
        modalOverlay.classList.remove('active');
        postForm.reset();
    };

    btnWrite.addEventListener('click', openModal);
    closeModal.addEventListener('click', hideModal);
    cancelPost.addEventListener('click', hideModal);
    modalOverlay.addEventListener('click', (e) => {
        if (e.target === modalOverlay) hideModal();
    });

    // Create Post
    postForm.addEventListener('submit', (e) => {
        e.preventDefault();

        const newPost = {
            id: Date.now(),
            category: document.getElementById('post-category').value,
            title: document.getElementById('post-title').value,
            content: document.getElementById('post-content').value,
            author: 'User_' + Math.floor(Math.random() * 1000),
            date: new Date().toLocaleDateString()
        };

        posts.push(newPost);
        savePosts();
        
        // If current category matches, re-render
        if (currentCategory === newPost.category) {
            renderPosts();
        } else {
            // Otherwise switch to that category
            const targetTab = document.querySelector(`.tab[data-category="${newPost.category}"]`);
            if (targetTab) targetTab.click();
        }

        hideModal();
    });

    // Logo Click (Reset to home)
    logoLink.addEventListener('click', () => {
        const firstTab = document.querySelector('.tab');
        if (firstTab) firstTab.click();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });
});
