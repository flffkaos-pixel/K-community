document.addEventListener('DOMContentLoaded', () => {
    // --- Global State ---
    let currentUser = localStorage.getItem('kcon_user');
    if (!currentUser) {
        currentUser = 'User_' + Math.floor(Math.random() * 9999);
        localStorage.setItem('kcon_user', currentUser);
    }

    // Force Reset for V15 (New Features)
    const RESET_VER = "v15_final";
    if (localStorage.getItem('kcon_ver') !== RESET_VER) {
        localStorage.removeItem('kcon_votes');
        localStorage.removeItem('kcon_posts');
        localStorage.removeItem('kcon_requests');
        localStorage.removeItem('kcon_liked_posts'); // Clear old likes
        localStorage.setItem('kcon_ver', RESET_VER);
    }

    // --- Data Initialization ---
    let posts = JSON.parse(localStorage.getItem('kcon_posts'));
    if (!posts) {
        posts = getInitialPosts();
        savePosts();
    }

    let voteData = JSON.parse(localStorage.getItem('kcon_votes')) || {
        'bts': { name: 'BTS', likes: 1200, dislikes: 5 },
        'aespa': { name: 'Aespa', likes: 850, dislikes: 2 },
        'seventeen': { name: 'Seventeen', likes: 920, dislikes: 3 },
        'enhypen': { name: 'Enhypen', likes: 500, dislikes: 1 },
        'skz': { name: 'Stray Kids', likes: 600, dislikes: 4 },
        'ive': { name: 'IVE', likes: 750, dislikes: 6 },
        'newjeans': { name: 'NewJeans', likes: 880, dislikes: 2 },
        'riize': { name: 'RIIZE', likes: 450, dislikes: 1 }
    };

    let idolRequests = JSON.parse(localStorage.getItem('kcon_requests')) || [];
    let myDislikes = JSON.parse(localStorage.getItem('kcon_my_dislikes')) || [];
    let myLikedPosts = JSON.parse(localStorage.getItem('kcon_liked_posts')) || [];

    // --- App State ---
    let currentCategory = 'vote'; // Default to Vote
    let currentLang = localStorage.getItem('kcon_lang') || 'en';
    let currentTheme = localStorage.getItem('kcon_theme') || 'light';
    let currentPostImages = [];
    
    // --- DOM Elements ---
    const els = {
        postsContainer: document.getElementById('posts-container'),
        trendingList: document.getElementById('trending-list'),
        tabs: document.querySelectorAll('.tab'),
        modal: document.getElementById('modal-overlay'),
        postForm: document.getElementById('post-form'),
        postTitle: document.getElementById('post-title'),
        postContent: document.getElementById('post-content'),
        imagePreviews: document.getElementById('image-previews'),
        langBtns: document.querySelectorAll('.lang-btn'),
        themeToggle: document.getElementById('theme-toggle'),
        btnWrite: document.getElementById('btn-write'),
        categoryTitle: document.getElementById('category-title'),
        categoryDesc: document.getElementById('category-desc'),
        btnNick: document.getElementById('btn-change-nickname'),
        userDisplay: document.getElementById('user-display')
    };

    // --- Translations ---
    const t = {
        ko: {
            write: "글쓰기", cancel: "취소", post: "게시하기",
            pollTitle: "⭐ 아이돌 인기 투표", pollDesc: "당신의 '최애'에게 투표하세요! 좋아요는 무제한, 싫어요는 1회만!",
            reqTitle: "➕ 아이돌 추가 요청", reqPlace: "추가하고 싶은 아이돌 이름...", reqBtn: "요청",
            noPosts: "이 게시판에 글이 없습니다.",
            confirmDelete: "삭제하시겠습니까?", confirmDislike: "싫어요는 취소할 수 없습니다. 계속하시겠습니까?",
            alertVoteWrite: "투표 탭에서는 글을 쓸 수 없습니다. 아래 요청 기능을 이용해주세요.",
            cats: { vote: "아이돌 투표", kpop: "K-Pop", living: "한국 생활", food: "음식", beauty: "뷰티", travel: "여행" },
            titles: { vote: "아이돌 인기 투표", kpop: "K-Pop & 엔터", living: "한국 생활 정보", food: "K-푸드 & 레시피", beauty: "K-뷰티 & 스타일", travel: "한국 여행 가이드" },
            descs: { vote: "무제한 투표로 팬심을 보여주세요!", kpop: "가장 핫한 K-Pop 뉴스", living: "한국 생활 꿀팁 공유", food: "맛있는 한국 음식 이야기", beauty: "최신 뷰티 트렌드", travel: "숨겨진 명소 탐방" }
        },
        en: {
            write: "Write Post", cancel: "Cancel", post: "Post",
            pollTitle: "⭐ Idol Popularity Poll", pollDesc: "Vote for your bias! Unlimited Likes, One Dislike only.",
            reqTitle: "➕ Request New Idol", reqPlace: "Enter idol name...", reqBtn: "Request",
            noPosts: "No posts here yet.",
            confirmDelete: "Delete this post?", confirmDislike: "Dislike cannot be undone. Proceed?",
            alertVoteWrite: "You cannot write posts in the Poll tab. Please use the Request feature below.",
            cats: { vote: "Idol Poll", kpop: "K-Pop", living: "Living", food: "Food", beauty: "Beauty", travel: "Travel" },
            titles: { vote: "Idol Popularity Poll", kpop: "K-Pop & Entertainment", living: "Living in Korea", food: "K-Food & Recipes", beauty: "K-Beauty & Style", travel: "Korea Travel Guide" },
            descs: { vote: "Show your love with unlimited votes!", kpop: "Hottest K-Pop News", living: "Tips for life in Korea", food: "Delicious Korean food stories", beauty: "Latest beauty trends", travel: "Explore hidden gems" }
        },
        ja: {
            write: "投稿", cancel: "キャンセル", post: "投稿",
            pollTitle: "⭐ アイドル人気投票", pollDesc: "推しに投票しよう！いいねは無制限、嫌いねは1回のみ。",
            reqTitle: "➕ アイドル追加リクエスト", reqPlace: "アイドル名を入力...", reqBtn: "リクエスト",
            noPosts: "まだ投稿がありません。",
            confirmDelete: "削除しますか？", confirmDislike: "嫌いねは取り消せません。続けますか？",
            alertVoteWrite: "投票タブでは投稿できません。リクエスト機能を使用してください。",
            cats: { vote: "アイドル投票", kpop: "K-POP", living: "生活", food: "グルメ", beauty: "ビューティー", travel: "旅行" },
            titles: { vote: "アイドル人気投票", kpop: "K-POP & エンタメ", living: "韓国生活情報", food: "K-フード & レシピ", beauty: "K-ビューティー", travel: "韓国旅行ガイド" },
            descs: { vote: "無制限投票で愛を伝えよう！", kpop: "最新K-POPニュース", living: "韓国生活のヒント", food: "美味しい韓国料理の話", beauty: "最新ビューティートレンド", travel: "隠れた名所を探そう" }
        },
        zh: {
            write: "发帖", cancel: "取消", post: "发布",
            pollTitle: "⭐ 偶像人气投票", pollDesc: "为你最爱的偶像投票！点赞无限制，踩只能一次。",
            reqTitle: "➕ 请求添加偶像", reqPlace: "输入偶像名字...", reqBtn: "提交",
            noPosts: "暂无帖子。",
            confirmDelete: "确定删除吗？", confirmDislike: "踩操作无法撤销。确定吗？",
            alertVoteWrite: "投票区不能发帖。请使用下方的请求功能。",
            cats: { vote: "偶像投票", kpop: "K-Pop", living: "生活", food: "美食", beauty: "美妆", travel: "旅游" },
            titles: { vote: "偶像人气投票", kpop: "K-Pop & 娱乐", living: "韩国生活信息", food: "K-美食 & 食谱", beauty: "K-美妆 & 风格", travel: "韩国旅游指南" },
            descs: { vote: "用无限制的票数表达你的爱！", kpop: "最热 K-Pop 新闻", living: "韩国生活小贴士", food: "美味的韩国食物", beauty: "最新美妆潮流", travel: "探索隐藏景点" }
        },
        es: {
            write: "Publicar", cancel: "Cancelar", post: "Publicar",
            pollTitle: "⭐ Votación de Ídolos", pollDesc: "¡Vota por tu favorito! Likes ilimitados, Dislike solo una vez.",
            reqTitle: "➕ Solicitar Ídolo", reqPlace: "Nombre del ídolo...", reqBtn: "Solicitar",
            noPosts: "No hay publicaciones aún.",
            confirmDelete: "¿Eliminar?", confirmDislike: "No se puede deshacer. ¿Continuar?",
            alertVoteWrite: "No puedes publicar aquí. Usa la solicitud abajo.",
            cats: { vote: "Votación", kpop: "K-Pop", living: "Vida", food: "Comida", beauty: "Belleza", travel: "Viajes" },
            titles: { vote: "Votación de Ídolos", kpop: "K-Pop y Entretenimiento", living: "Vida en Corea", food: "Comida y Recetas", beauty: "Belleza y Estilo", travel: "Guía de Viajes" },
            descs: { vote: "¡Muestra tu amor con votos ilimitados!", kpop: "Noticias K-Pop", living: "Consejos de vida", food: "Historias de comida", beauty: "Tendencias de belleza", travel: "Explora lugares únicos" }
        }
    };

    // --- Init ---
    init();

    function init() {
        applyTheme(currentTheme);
        updateUI();
        renderContent();
        setupEventListeners();
        setupDragAndDrop();
    }

    // --- Core Logic ---

    function savePosts() { localStorage.setItem('kcon_posts', JSON.stringify(posts)); }
    function saveVotes() { localStorage.setItem('kcon_votes', JSON.stringify(voteData)); }
    function saveRequests() { localStorage.setItem('kcon_requests', JSON.stringify(idolRequests)); }

    function getInitialPosts() {
        return [
            {
                id: 9001, category: 'kpop', author: 'K-Editor', date: '2026-03-12', lang: 'en',
                title: "Welcome to K-community!", content: "Enjoy K-Pop voting and share your stories! [IMG_0]",
                images: ["https://images.unsplash.com/photo-1532452119098-a3650b3c46d3?w=800&auto=format&fit=crop"],
                likes: 120, views: 1500, comments: []
            }
        ];
    }

    function updateUI() {
        const langData = t[currentLang];
        // Tabs
        els.tabs.forEach(tab => {
            tab.classList.toggle('active', tab.dataset.category === currentCategory);
            tab.textContent = langData.cats[tab.dataset.category];
        });
        
        // Header
        els.categoryTitle.textContent = langData.titles[currentCategory];
        els.categoryDesc.textContent = langData.descs[currentCategory];
        els.btnWrite.textContent = langData.write;
        els.userDisplay.textContent = currentUser;

        // Modal
        document.querySelector('.modal-header h3').textContent = langData.write;
        document.querySelector('#cancel-post').textContent = langData.cancel;
        document.querySelector('#post-form .btn-primary').textContent = langData.post;
    }

    function renderContent() {
        if (currentCategory === 'vote') {
            renderPoll();
        } else {
            renderPosts();
        }
        renderTrending();
    }

    // --- Post System ---

    function renderPosts() {
        els.postsContainer.innerHTML = '';
        const filtered = posts.filter(p => p.category === currentCategory);
        
        if (filtered.length === 0) {
            els.postsContainer.innerHTML = `<div class="post-card" style="text-align:center; color:#888;">${t[currentLang].noPosts}</div>`;
            return;
        }

        filtered.sort((a, b) => b.id - a.id).forEach(post => {
            const el = document.createElement('article');
            el.className = 'post-card';
            if (expandedPostId === post.id) el.classList.add('expanded');

            // Translation placeholder or actual text
            const title = (post.lang === currentLang) ? post.title : (translationCache[`${post.id}_title_${currentLang}`] || post.title);
            let content = (post.lang === currentLang) ? post.content : (translationCache[`${post.id}_content_${currentLang}`] || post.content);

            // Trigger translation if needed
            if (post.lang !== currentLang && !translationCache[`${post.id}_title_${currentLang}`]) {
                translatePost(post);
            }

            // Insert Images
            if (post.images) {
                post.images.forEach((url, idx) => {
                    const imgTag = `<img src="${url}" loading="lazy">`;
                    if (content.includes(`[IMG_${idx}]`)) {
                        content = content.replace(`[IMG_${idx}]`, imgTag);
                    } else {
                        // Append to end if not placed
                        if (!content.includes('[IMG_')) content += imgTag;
                    }
                });
            }

            const isLiked = myLikedPosts.includes(post.id);
            const isOwner = post.author === currentUser;

            el.innerHTML = `
                <div class="post-header">
                    <div class="post-title">${title}</div>
                </div>
                <div class="post-meta">
                    <div class="meta-left">
                        <span>@${post.author}</span>
                        <span>•</span>
                        <span>${post.date}</span>
                    </div>
                    <div class="meta-right">
                        <span>👁 ${post.views}</span>
                        <span>💬 ${post.comments.length}</span>
                        <button class="btn-icon like-post-btn" style="color: ${isLiked ? 'var(--primary-color)' : 'inherit'}" data-id="${post.id}">
                            ${isLiked ? '❤️' : '🤍'} ${post.likes}
                        </button>
                    </div>
                </div>
                ${isOwner ? `<div class="post-mgmt-actions">
                    <button class="btn-icon edit-post-btn" data-id="${post.id}">✎</button>
                    <button class="btn-icon delete-post-btn" data-id="${post.id}">🗑</button>
                </div>` : ''}
                <div class="post-content">${content}</div>
                <div class="comments-section">
                    <div class="comment-list">
                        ${post.comments.map(c => renderComment(c)).join('')}
                    </div>
                    <div class="comment-input-area">
                        <input type="text" class="comment-input" placeholder="...">
                        <button class="btn btn-primary btn-sm add-comment-btn" data-id="${post.id}">Send</button>
                    </div>
                </div>
            `;

            // Click handling
            el.onclick = (e) => {
                if (e.target.closest('button') || e.target.closest('input')) return;
                
                // Toggle Expansion
                const isExpanding = !el.classList.contains('expanded');
                document.querySelectorAll('.post-card').forEach(c => c.classList.remove('expanded'));
                
                if (isExpanding) {
                    el.classList.add('expanded');
                    expandedPostId = post.id;
                    post.views++;
                    savePosts();
                    el.querySelector('.meta-right span').textContent = `👁 ${post.views}`;
                } else {
                    expandedPostId = null;
                }
            };

            // Event Listeners for buttons
            const likeBtn = el.querySelector('.like-post-btn');
            likeBtn.onclick = () => togglePostLike(post.id);

            const deleteBtn = el.querySelector('.delete-post-btn');
            if (deleteBtn) deleteBtn.onclick = () => {
                if(confirm(t[currentLang].confirmDelete)) {
                    posts = posts.filter(p => p.id !== post.id);
                    savePosts();
                    renderContent();
                }
            };

            const commentBtn = el.querySelector('.add-comment-btn');
            const commentInput = el.querySelector('.comment-input');
            commentBtn.onclick = () => {
                if(!commentInput.value.trim()) return;
                post.comments.push({
                    id: Date.now(),
                    text: commentInput.value,
                    author: currentUser,
                    lang: currentLang
                });
                savePosts();
                renderPosts(); // Re-render to show comment
            };

            els.postsContainer.appendChild(el);
        });
    }

    function renderComment(c) {
        // Simple translation check
        let text = c.text;
        if (c.lang !== currentLang) {
            const key = `cmt_${c.id}_${currentLang}`;
            if (translationCache[key]) text = translationCache[key];
            else translateText(c.text, c.lang, currentLang, (res) => {
                translationCache[key] = res;
                // Lazy re-render or DOM update could go here
                // For simplicity, just updating state in cache and next render picks it up
                // Or find element and update
            });
        }
        return `<div class="comment-item">
            <div class="comment-header"><span>@${c.author}</span></div>
            <div>${text}</div>
        </div>`;
    }

    function togglePostLike(id) {
        const post = posts.find(p => p.id === id);
        if (!post) return;

        const idx = myLikedPosts.indexOf(id);
        if (idx === -1) {
            myLikedPosts.push(id);
            post.likes++;
        } else {
            myLikedPosts.splice(idx, 1);
            post.likes--;
        }
        localStorage.setItem('kcon_liked_posts', JSON.stringify(myLikedPosts));
        savePosts();
        renderPosts();
    }

    // --- Poll System ---

    function renderPoll() {
        const lang = t[currentLang];
        els.postsContainer.innerHTML = `
            <div class="poll-grid"></div>
            <div class="request-board">
                <div class="req-header">
                    <h3>${lang.reqTitle}</h3>
                </div>
                <div class="request-input-area">
                    <input type="text" id="req-input" class="request-input" placeholder="${lang.reqPlace}">
                    <button id="btn-submit-req" class="btn btn-primary">${lang.reqBtn}</button>
                </div>
                <div class="req-list"></div>
            </div>
        `;

        const grid = els.postsContainer.querySelector('.poll-grid');
        const sortedIdols = Object.entries(voteData).sort(([,a], [,b]) => b.likes - a.likes);

        sortedIdols.forEach(([key, data]) => {
            const el = document.createElement('div');
            el.className = 'idol-card';
            const hasDisliked = myDislikes.includes(key);
            el.innerHTML = `
                <div class="idol-name">${data.name}</div>
                <div class="poll-actions">
                    <button class="poll-btn like" data-key="${key}">
                        ❤️ <span class="count">${data.likes}</span>
                    </button>
                    <button class="poll-btn dislike ${hasDisliked ? 'disabled' : ''}" data-key="${key}">
                        💔 <span class="count">${data.dislikes}</span>
                    </button>
                </div>
            `;
            grid.appendChild(el);
        });

        // Vote Events
        grid.onclick = (e) => {
            const btn = e.target.closest('.poll-btn');
            if (!btn) return;
            const key = btn.dataset.key;

            if (btn.classList.contains('like')) {
                voteData[key].likes++;
                if (voteData[key].likes % 100 === 0) triggerFireworks(voteData[key].likes);
                saveVotes();
                renderPoll();
            } else if (btn.classList.contains('dislike')) {
                if (myDislikes.includes(key)) return;
                if (confirm(lang.confirmDislike)) {
                    voteData[key].dislikes++;
                    myDislikes.push(key);
                    localStorage.setItem('kcon_my_dislikes', JSON.stringify(myDislikes));
                    saveVotes();
                    renderPoll();
                }
            }
        };

        // Request Board
        const reqList = els.postsContainer.querySelector('.req-list');
        idolRequests.forEach((req, idx) => {
            const canDelete = req.author === currentUser || currentUser.includes('Admin');
            const item = document.createElement('div');
            item.className = 'req-item';
            item.innerHTML = `
                <span>${req.text} <small style="color:#888">(@${req.author})</small></span>
                ${canDelete ? `<span class="req-delete" data-idx="${idx}">🗑</span>` : ''}
            `;
            reqList.appendChild(item);
        });

        reqList.onclick = (e) => {
            if (e.target.classList.contains('req-delete')) {
                if (confirm(lang.confirmDelete)) {
                    idolRequests.splice(e.target.dataset.idx, 1);
                    saveRequests();
                    renderPoll();
                }
            }
        };

        els.postsContainer.querySelector('#btn-submit-req').onclick = () => {
            const input = document.getElementById('req-input');
            const val = input.value.trim();
            if (val) {
                idolRequests.push({ text: val, author: currentUser });
                saveRequests();
                renderPoll();
            }
        };
    }

    function triggerFireworks(score) {
        const count = Math.min(200, Math.max(50, score / 10)); // Scale confetti
        confetti({
            particleCount: count,
            spread: 70,
            origin: { y: 0.6 }
        });
    }

    // --- Sidebar Trending ---
    function renderTrending() {
        els.trendingList.innerHTML = '';
        // Mix posts and poll leaders
        const trendingItems = [];
        
        // Add top 3 posts
        posts.sort((a,b) => (b.views + b.likes*2) - (a.views + a.likes*2)).slice(0, 3).forEach(p => {
            trendingItems.push({ title: p.title, meta: `Post • ❤️ ${p.likes}`, type: 'post', id: p.id, cat: p.category });
        });

        // Add top 2 Idols
        Object.entries(voteData).sort(([,a], [,b]) => b.likes - a.likes).slice(0, 2).forEach(([key, data]) => {
            trendingItems.push({ title: data.name, meta: `Idol • ❤️ ${data.likes}`, type: 'idol', cat: 'vote' });
        });

        trendingItems.forEach((item, i) => {
            const li = document.createElement('li');
            li.className = 'trending-item';
            li.innerHTML = `
                <div class="trending-rank">${i+1}</div>
                <div class="trending-info">
                    <div class="trending-title">${item.title}</div>
                    <div class="trending-meta">${item.meta}</div>
                </div>
            `;
            li.onclick = () => {
                if (item.cat === 'vote') {
                    currentCategory = 'vote';
                } else {
                    currentCategory = item.cat;
                    expandedPostId = item.id;
                }
                updateUI();
                renderContent();
            };
            els.trendingList.appendChild(li);
        });
    }

    // --- Translation API ---
    async function translatePost(post) {
        // Only translate if not already done
        const titleKey = `${post.id}_title_${currentLang}`;
        const contentKey = `${post.id}_content_${currentLang}`;
        
        if (translationCache[titleKey] && translationCache[contentKey]) return;

        // Using Promise.all to fetch both
        try {
            const [tTitle, tContent] = await Promise.all([
                fetchTranslation(post.title, post.lang, currentLang),
                fetchTranslation(post.content, post.lang, currentLang)
            ]);
            
            translationCache[titleKey] = tTitle;
            translationCache[contentKey] = tContent;
            renderPosts(); // Update view
        } catch (e) {
            console.error("Translation failed", e);
        }
    }

    async function translateText(text, src, target, callback) {
        const res = await fetchTranslation(text, src, target);
        callback(res);
    }

    async function fetchTranslation(text, source, target) {
        if (source === target) return text;
        const res = await fetch(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${source}|${target}`);
        const data = await res.json();
        return data.responseData.translatedText;
    }

    // --- Drag & Drop & Events ---

    function setupDragAndDrop() {
        const dropZone = document.querySelector('.content-area');
        const textarea = els.postContent;

        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            dropZone.addEventListener(eventName, preventDefaults, false);
        });

        function preventDefaults(e) {
            e.preventDefault();
            e.stopPropagation();
        }

        dropZone.addEventListener('drop', handleDrop, false);

        function handleDrop(e) {
            const dt = e.dataTransfer;
            const files = dt.files;
            handleFiles(files);
        }
    }

    function handleFiles(files) {
        ([...files]).forEach(file => {
            if (!file.type.startsWith('image/')) return;
            const reader = new FileReader();
            reader.onload = (e) => {
                currentPostImages.push(e.target.result);
                const idx = currentPostImages.length - 1;
                
                // Insert [IMG_N] at cursor position
                const cursor = els.postContent.selectionStart;
                const text = els.postContent.value;
                const insertText = `\n[IMG_${idx}]\n`;
                els.postContent.value = text.slice(0, cursor) + insertText + text.slice(cursor);
                
                // Show Preview
                const img = document.createElement('img');
                img.src = e.target.result;
                img.className = 'preview-thumb';
                els.imagePreviews.appendChild(img);
            };
            reader.readAsDataURL(file);
        });
    }

    function setupEventListeners() {
        // Category Tabs
        els.tabs.forEach(tab => {
            tab.onclick = () => {
                currentCategory = tab.dataset.category;
                expandedPostId = null;
                updateUI();
                renderContent();
            };
        });

        // Lang Switcher
        els.langBtns.forEach(btn => {
            btn.onclick = () => {
                currentLang = btn.dataset.lang;
                els.langBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                localStorage.setItem('kcon_lang', currentLang);
                updateUI();
                renderContent(); // Trigger translation reload
            };
        });

        // Theme Toggle
        els.themeToggle.onclick = () => {
            currentTheme = currentTheme === 'light' ? 'dark' : 'light';
            localStorage.setItem('kcon_theme', currentTheme);
            applyTheme(currentTheme);
        };

        // Write Post Button
        els.btnWrite.onclick = () => {
            if (currentCategory === 'vote') {
                alert(t[currentLang].alertVoteWrite);
                return;
            }
            els.modal.classList.add('active');
        };

        document.getElementById('close-modal').onclick = () => els.modal.classList.remove('active');
        document.getElementById('cancel-post').onclick = () => els.modal.classList.remove('active');

        // Post Submit
        els.postForm.onsubmit = (e) => {
            e.preventDefault();
            const id = document.getElementById('post-id').value;
            
            const newPost = {
                id: id ? parseInt(id) : Date.now(),
                category: currentCategory,
                title: els.postTitle.value,
                content: els.postContent.value,
                author: currentUser,
                date: new Date().toLocaleDateString(),
                likes: 0,
                views: 0,
                comments: [],
                lang: currentLang,
                images: [...currentPostImages]
            };

            if (id) {
                // Edit mode
                const idx = posts.findIndex(p => p.id === parseInt(id));
                if (idx !== -1) {
                    newPost.likes = posts[idx].likes;
                    newPost.views = posts[idx].views;
                    newPost.comments = posts[idx].comments;
                    posts[idx] = newPost;
                }
            } else {
                posts.push(newPost);
            }

            savePosts();
            els.modal.classList.remove('active');
            // Clear form
            els.postTitle.value = '';
            els.postContent.value = '';
            currentPostImages = [];
            els.imagePreviews.innerHTML = '';
            renderPosts();
        };

        // Nickname
        els.btnNick.onclick = () => {
            const name = prompt(t[currentLang].promptNickname, currentUser);
            if (name) {
                currentUser = name;
                localStorage.setItem('kcon_user', name);
                updateUI();
            }
        };
    }

    function applyTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
    }
});
