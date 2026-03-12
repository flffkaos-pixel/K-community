document.addEventListener('DOMContentLoaded', () => {
    // --- Global State ---
    let currentUser = localStorage.getItem('kcon_user');
    if (!currentUser) {
        currentUser = 'User_' + Math.floor(Math.random() * 9999);
        localStorage.setItem('kcon_user', currentUser);
    }

    const RESET_VER = "v19_fixed_poll"; // Incremented version to force reset and fix NewJeans issue
    if (localStorage.getItem('kcon_ver') !== RESET_VER) {
        localStorage.removeItem('kcon_votes');
        localStorage.removeItem('kcon_posts');
        localStorage.removeItem('kcon_requests');
        localStorage.removeItem('kcon_my_dislikes');
        localStorage.removeItem('kcon_liked_posts');
        localStorage.setItem('kcon_ver', RESET_VER);
    }

    let posts = JSON.parse(localStorage.getItem('kcon_posts'));
    if (!posts) {
        posts = getInitialPosts();
        savePosts();
    }

    const defaultVoteData = {
        'bts': { name: 'BTS', likes: 0, dislikes: 0 },
        'aespa': { name: 'Aespa', likes: 0, dislikes: 0 },
        'seventeen': { name: 'Seventeen', likes: 0, dislikes: 0 },
        'enhypen': { name: 'Enhypen', likes: 0, dislikes: 0 },
        'skz': { name: 'Stray Kids', likes: 0, dislikes: 0 },
        'ive': { name: 'IVE', likes: 0, dislikes: 0 },
        'newjeans': { name: 'NewJeans', likes: 0, dislikes: 0 },
        'riize': { name: 'RIIZE', likes: 0, dislikes: 0 }
    };

    let voteData = JSON.parse(localStorage.getItem('kcon_votes')) || defaultVoteData;
    
    // Ensure newjeans exists even if localStorage was from older version without it
    if (!voteData.newjeans) {
        voteData.newjeans = { name: 'NewJeans', likes: 0, dislikes: 0 };
        saveVotes();
    }

    let idolRequests = JSON.parse(localStorage.getItem('kcon_requests')) || [];
    let myDislikes = JSON.parse(localStorage.getItem('kcon_my_dislikes')) || [];
    let myLikedPosts = JSON.parse(localStorage.getItem('kcon_liked_posts')) || [];

    let currentCategory = 'vote';
    let currentLang = localStorage.getItem('kcon_lang') || 'en';
    let currentTheme = localStorage.getItem('kcon_theme') || 'light';
    let currentPostImages = [];
    let expandedPostId = null;

    const translationCache = {};

    const t = {
        ko: {
            write: "글쓰기", cancel: "취소", post: "게시하기",
            pollTitle: "⭐ 아이돌 인기 투표", pollDesc: "좋아요 무제한! 싫어요는 1회만!",
            reqTitle: "➕ 아이돌 추가 요청", reqPlace: "아이돌 이름 입력...", reqBtn: "요청",
            noPosts: "게시글이 없습니다.", translating: "번역 중...",
            confirmDelete: "삭제하시겠습니까?", confirmDislike: "싫어요는 취소 불가합니다. 계속하시겠습니까?",
            intro: "K-community에 오신 것을 환영합니다! 이곳은 한국의 다양한 문화, 연예, 생활 정보를 전 세계인과 공유하는 글로벌 허브입니다. 아이돌 투표에도 참여하고 여러분의 소중한 이야기를 들려주세요.",
            cats: { vote: "아이돌 투표", kpop: "K-Pop", living: "한국 생활", food: "음식", beauty: "뷰티", travel: "여행" },
            titles: { vote: "아이돌 인기 투표", kpop: "K-Pop & 엔터", living: "한국 생활 정보", food: "K-푸드 & 레시피", beauty: "K-뷰티 & 스타일", travel: "한국 여행 가이드" },
            descs: { vote: "무제한 투표로 팬심을 보여주세요!", kpop: "가장 핫한 K-Pop 뉴스", living: "한국 생활 꿀팁 공유", food: "맛있는 한국 음식 이야기", beauty: "최신 뷰티 트렌드", travel: "숨겨진 명소 탐방" }
        },
        en: {
            write: "Write", cancel: "Cancel", post: "Post",
            pollTitle: "⭐ Idol Popularity Poll", pollDesc: "Unlimited Likes! One Dislike only.",
            reqTitle: "➕ Request New Idol", reqPlace: "Idol name...", reqBtn: "Request",
            noPosts: "No posts yet.", translating: "Translating...",
            confirmDelete: "Delete this?", confirmDislike: "Cannot undo dislike. Proceed?",
            intro: "Welcome to K-community! We are a global hub sharing various information about Korean culture, entertainment, and lifestyle. Participate in idol polls and share your precious stories with the world.",
            cats: { vote: "Idol Poll", kpop: "K-Pop", living: "Living", food: "Food", beauty: "Beauty", travel: "Travel" },
            titles: { vote: "Idol Popularity Poll", kpop: "K-Pop & Entertainment", living: "Living in Korea", food: "K-Food & Recipes", beauty: "K-Beauty & Style", travel: "Korea Travel Guide" },
            descs: { vote: "Show your love with unlimited votes!", kpop: "Hottest K-Pop News", living: "Tips for life in Korea", food: "Delicious Korean food stories", beauty: "Latest beauty trends", travel: "Explore hidden gems" }
        },
        ja: {
            write: "書く", cancel: "キャンセル", post: "投稿",
            pollTitle: "⭐ アイドル人気投票", pollDesc: "いいね無制限！嫌いねは1回のみ。",
            reqTitle: "➕ 추가 리퀘스트", reqPlace: "名前を入力...", reqBtn: "리퀘스트",
            noPosts: "投稿がありません。", translating: "翻訳中...",
            confirmDelete: "削除しますか？", confirmDislike: "嫌いねは取消不可です。続けますか？",
            intro: "K-communityへようこそ！ここは韓国の多様な文化、芸能、生活情報を全世界の人々と共有するグローバルハブです。アイドル投票に参加したり、あなたの貴重な話を共有してください。",
            cats: { vote: "アイドル投票", kpop: "K-POP", living: "生活", food: "グルメ", beauty: "ビューティー", travel: "旅行" },
            titles: { vote: "アイドル人気投票", kpop: "K-POP & エンタメ", living: "韓国生活情報", food: "K-フード & レシピ", beauty: "K-ビューティー", travel: "韓国旅行ガイド" },
            descs: { vote: "無制限投票で愛を伝えよう！", kpop: "最新K-POPニュース", living: "韓国生活のヒント", food: "美味しい韓国料理の話", beauty: "最新ビューティートレンド", travel: "隠れた名所を探そう" }
        },
        zh: {
            write: "发布", cancel: "取消", post: "发布",
            pollTitle: "⭐ 偶像人气投票", pollDesc: "点赞无限制！踩只能投一次。",
            reqTitle: "➕ 请求添加偶像", reqPlace: "偶像名字...", reqBtn: "提交",
            noPosts: "暂无帖子。", translating: "翻译中...",
            confirmDelete: "确定删除吗？", confirmDislike: "踩操作无法撤销。确定吗？",
            intro: "欢迎来到 K-community！这是一个与全球分享韩国文化、娱乐和生活信息的中心。欢迎参加偶像投票，并与世界分享您的精彩故事。",
            cats: { vote: "偶像投票", kpop: "K-Pop", living: "生活", food: "美食", beauty: "美妆", travel: "旅游" },
            titles: { vote: "偶像人气投票", kpop: "K-Pop & 娱乐", living: "韩国生活信息", food: "K-美食 & 食谱", beauty: "K-美妆 & 风格", travel: "韩国旅游指南" },
            descs: { vote: "用无限制的票数表达你的爱！", kpop: "最热 K-Pop 新闻", living: "韩国生活小贴士", food: "美味的韩国食物", beauty: "最新美妆潮流", travel: "探索隐藏景点" }
        },
        es: {
            write: "Escribir", cancel: "Cancelar", post: "Publicar",
            pollTitle: "⭐ Votación de Ídolos", pollDesc: "¡Likes ilimitados! Dislike solo una vez.",
            reqTitle: "➕ Solicitar Ídolo", reqPlace: "Nombre del ídolo...", reqBtn: "Solicitar",
            noPosts: "No hay publicaciones.", translating: "Traduciendo...",
            confirmDelete: "¿Eliminar?", confirmDislike: "No se puede deshacer. ¿Continuar?",
            intro: "¡Bienvenido a K-community! Somos un centro global que comparte información sobre la cultura, el entretenimiento y el estilo de vida coreanos. Participa en las encuestas de ídolos y comparte tus historias con el mundo.",
            cats: { vote: "Votación", kpop: "K-Pop", living: "Vida", food: "Comida", beauty: "Belleza", travel: "Viajes" },
            titles: { vote: "Votación de Ídolos", kpop: "K-Pop y Entretenimiento", living: "Vida en Corea", food: "Comida y Recetas", beauty: "Belleza y Estilo", travel: "Guía de Viajes" },
            descs: { vote: "¡Muestra tu amor con votos ilimitados!", kpop: "Noticias K-Pop", living: "Consejos de vida", food: "Historias de comida", beauty: "Tendencias de belleza", travel: "Explora lugares únicos" }
        }
    };

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
        categoryTitle: document.getElementById('category-title'),
        categoryDesc: document.getElementById('category-desc'),
        btnNick: document.getElementById('btn-change-nickname'),
        userDisplay: document.getElementById('user-display')
    };

    init();

    function init() {
        applyTheme(currentTheme);
        updateUI();
        renderContent();
        setupEventListeners();
        setupDragAndDrop();
    }

    function savePosts() { localStorage.setItem('kcon_posts', JSON.stringify(posts)); }
    function saveVotes() { localStorage.setItem('kcon_votes', JSON.stringify(voteData)); }
    function saveRequests() { localStorage.setItem('kcon_requests', JSON.stringify(idolRequests)); }

    function getInitialPosts() {
        return [{ id: 9001, category: 'kpop', author: 'K-Editor', date: '2026-03-12', lang: 'en', title: "Welcome to K-community!", content: "Enjoy K-Pop voting and share your stories! [IMG_0]", images: ["https://images.unsplash.com/photo-1532452119098-a3650b3c46d3?w=800&auto=format&fit=crop"], likes: 0, views: 0, comments: [] }];
    }

    function updateUI() {
        const langData = t[currentLang];
        els.tabs.forEach(tab => {
            tab.classList.toggle('active', tab.dataset.category === currentCategory);
            tab.textContent = langData.cats[tab.dataset.category];
        });
        
        const oldBtn = document.getElementById('board-write-btn');
        if (oldBtn) oldBtn.remove();

        els.categoryTitle.innerHTML = langData.titles[currentCategory];
        
        if (currentCategory !== 'vote') {
            const writeBtn = document.createElement('button');
            writeBtn.id = 'board-write-btn';
            writeBtn.className = 'btn btn-primary';
            writeBtn.style.marginLeft = '1rem';
            writeBtn.style.fontSize = '0.8rem';
            writeBtn.textContent = langData.write;
            writeBtn.onclick = () => {
                document.getElementById('post-id').value = '';
                els.postTitle.value = ''; els.postContent.value = ''; currentPostImages = []; els.imagePreviews.innerHTML = '';
                els.modal.classList.add('active');
            };
            els.categoryTitle.appendChild(writeBtn);
        }

        els.categoryDesc.textContent = langData.descs[currentCategory];
        els.userDisplay.textContent = currentUser;
    }

    function renderContent() {
        if (currentCategory === 'vote') renderPoll();
        else renderPosts();
        renderTrending();
    }

    function renderPosts() {
        els.postsContainer.innerHTML = '';
        const filtered = posts.filter(p => p.category === currentCategory);
        if (filtered.length === 0) {
            els.postsContainer.innerHTML = `<div class="post-card" style="text-align:center; color:#888; padding: 2rem;">${t[currentLang].noPosts}</div>`;
            return;
        }

        filtered.sort((a, b) => b.id - a.id).forEach(post => {
            const el = document.createElement('article');
            el.className = 'post-card';
            if (expandedPostId === post.id) el.classList.add('expanded');

            let title = (post.lang === currentLang) ? post.title : (translationCache[`${post.id}_title_${currentLang}`] || t[currentLang].translating);
            let content = (post.lang === currentLang) ? post.content : (translationCache[`${post.id}_content_${currentLang}`] || t[currentLang].translating);

            if (post.lang !== currentLang && !translationCache[`${post.id}_title_${currentLang}`]) translatePost(post);

            if (post.images) {
                post.images.forEach((url, idx) => {
                    const imgTag = `<img src="${url}" loading="lazy">`;
                    if (content.includes(`[IMG_${idx}]`)) content = content.replace(`[IMG_${idx}]`, imgTag);
                    else if (!content.includes('[IMG_')) { if (idx === 0) content += `<div style="margin-top:1rem">${imgTag}</div>`; }
                });
            }

            const isLiked = myLikedPosts.includes(post.id);
            const isOwner = post.author === currentUser;

            el.innerHTML = `
                <div class="post-header"><div class="post-title">${title}</div></div>
                <div class="post-meta">
                    <div class="meta-left"><span>@${post.author}</span><span>•</span><span>${post.date}</span></div>
                    <div class="meta-right">
                        <span>👁 ${post.views}</span><span>💬 ${post.comments.length}</span>
                        <button class="btn-icon like-post-btn" style="color: ${isLiked ? 'var(--primary-color)' : 'inherit'}">
                            ${isLiked ? '❤️' : '🤍'} ${post.likes}
                        </button>
                    </div>
                </div>
                ${isOwner ? `<div class="post-mgmt-actions"><button class="btn-icon edit-btn">✎</button><button class="btn-icon delete-btn">🗑</button></div>` : ''}
                <div class="post-content">${content}</div>
                <div class="comments-section">
                    <div class="comment-list">${post.comments.map(c => renderComment(c)).join('')}</div>
                    <div class="comment-input-area">
                        <input type="text" class="comment-input" placeholder="...">
                        <button class="btn btn-primary add-comment-btn">Send</button>
                    </div>
                </div>
            `;

            el.onclick = (e) => {
                if (e.target.closest('button') || e.target.closest('input')) return;
                const isExp = !el.classList.contains('expanded');
                document.querySelectorAll('.post-card').forEach(c => c.classList.remove('expanded'));
                if (isExp) { el.classList.add('expanded'); expandedPostId = post.id; post.views++; savePosts(); el.querySelector('.meta-right span').textContent = `👁 ${post.views}`; }
                else expandedPostId = null;
            };

            el.querySelector('.like-post-btn').onclick = () => {
                const idx = myLikedPosts.indexOf(post.id);
                if (idx === -1) { myLikedPosts.push(post.id); post.likes++; }
                else { myLikedPosts.splice(idx, 1); post.likes--; }
                localStorage.setItem('kcon_liked_posts', JSON.stringify(myLikedPosts)); savePosts(); renderPosts();
            };

            if (isOwner) {
                el.querySelector('.delete-btn').onclick = () => { if(confirm(t[currentLang].confirmDelete)) { posts = posts.filter(p => p.id !== post.id); savePosts(); renderContent(); } };
                el.querySelector('.edit-btn').onclick = () => {
                    document.getElementById('post-id').value = post.id; els.postTitle.value = post.title; els.postContent.value = post.content;
                    currentPostImages = [...(post.images || [])]; els.imagePreviews.innerHTML = '';
                    currentPostImages.forEach(src => { const img = document.createElement('img'); img.src = src; img.className = 'preview-thumb'; els.imagePreviews.appendChild(img); });
                    els.modal.classList.add('active');
                };
            }

            el.querySelector('.add-comment-btn').onclick = () => {
                const inp = el.querySelector('.comment-input'); if(!inp.value.trim()) return;
                post.comments.push({ id: Date.now(), text: inp.value, author: currentUser, lang: currentLang });
                savePosts(); renderPosts();
            };
            els.postsContainer.appendChild(el);
        });
    }

    function renderComment(c) {
        let text = c.text;
        if (c.lang !== currentLang) {
            const key = `cmt_${c.id}_${currentLang}`;
            if (translationCache[key]) text = translationCache[key];
            else translateText(c.text, c.lang, currentLang, (res) => { translationCache[key] = res; });
        }
        return `<div class="comment-item"><b>@${c.author}</b>: ${text}</div>`;
    }

    function renderPoll() {
        const lang = t[currentLang];
        els.postsContainer.innerHTML = `<div class="poll-grid"></div><div class="request-board"><h3>${lang.reqTitle}</h3><div class="request-input-area"><input type="text" id="req-input" class="request-input" placeholder="${lang.reqPlace}"><button id="btn-submit-req" class="btn btn-primary">${lang.reqBtn}</button></div><div class="req-list"></div></div>`;
        const grid = els.postsContainer.querySelector('.poll-grid');
        
        // Use fixed order (no sort) as requested
        Object.entries(voteData).forEach(([key, data]) => {
            const el = document.createElement('div'); el.className = 'idol-card';
            const hasDisliked = myDislikes.includes(key);
            el.innerHTML = `
                <div class="idol-name">${data.name}</div>
                <div class="poll-actions">
                    <button class="poll-btn like" data-key="${key}">👍 <span class="count">${data.likes}</span></button>
                    <button class="poll-btn dislike ${hasDisliked ? 'disabled' : ''}" data-key="${key}">👎 <span class="count">${data.dislikes}</span></button>
                </div>`;
            grid.appendChild(el);
        });

        grid.onclick = (e) => {
            const btn = e.target.closest('.poll-btn'); if (!btn) return;
            const key = btn.dataset.key;
            if (!voteData[key]) return; // Safety check

            if (btn.classList.contains('like')) { 
                voteData[key].likes++; 
                if (voteData[key].likes > 0 && voteData[key].likes % 100 === 0) triggerFireworks(voteData[key].likes); 
                saveVotes(); 
                renderPoll(); 
            }
            else if (btn.classList.contains('dislike')) {
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
        const reqList = els.postsContainer.querySelector('.req-list');
        idolRequests.forEach((req, idx) => {
            const canDelete = req.author === currentUser || currentUser.toLowerCase().includes('admin');
            const item = document.createElement('div'); item.className = 'req-item';
            item.innerHTML = `<span>${req.text} <small style="color:#888">(@${req.author})</small></span>${canDelete ? `<span class="req-delete" data-idx="${idx}">🗑</span>` : ''}`;
            reqList.appendChild(item);
        });
        reqList.onclick = (e) => { if (e.target.classList.contains('req-delete')) { if (confirm(lang.confirmDelete)) { idolRequests.splice(e.target.dataset.idx, 1); saveRequests(); renderPoll(); } } };
        els.postsContainer.querySelector('#btn-submit-req').onclick = () => {
            const inp = document.getElementById('req-input'); if (inp.value.trim()) { idolRequests.push({ text: inp.value.trim(), author: currentUser }); saveRequests(); renderPoll(); }
        };
    }

    function triggerFireworks(score) { confetti({ particleCount: Math.min(200, 50 + score/5), spread: 70, origin: { y: 0.6 } }); }

    function renderTrending() {
        els.trendingList.innerHTML = '';
        const items = [];
        posts.sort((a,b) => (b.views + b.likes*2) - (a.views + a.likes*2)).slice(0, 3).forEach(p => items.push({ title: p.title, meta: `Post • ❤️ ${p.likes}`, id: p.id, cat: p.category }));
        Object.entries(voteData).sort(([,a], [,b]) => b.likes - a.likes).slice(0, 2).forEach(([k, d]) => items.push({ title: d.name, meta: `Idol • ❤️ ${d.likes}`, cat: 'vote' }));
        items.forEach((item, i) => {
            const li = document.createElement('li'); li.className = 'trending-item';
            li.innerHTML = `<div class="trending-rank">${i+1}</div><div class="trending-info"><div class="trending-title">${item.title}</div><div class="trending-meta">${item.meta}</div></div>`;
            li.onclick = () => { currentCategory = item.cat; if(item.id) expandedPostId = item.id; updateUI(); renderContent(); };
            els.trendingList.appendChild(li);
        });
        
        // --- Add Blogspot link to sidebar for SEO and AdSense Authority ---
        let blogBox = document.getElementById('blog-promo-box');
        if (!blogBox) {
            blogBox = document.createElement('div');
            blogBox.id = 'blog-promo-box';
            blogBox.style.cssText = "margin-top: 1.5rem; padding: 1rem; background: #fffbe6; border: 1px solid #ffe58f; border-radius: 12px; font-size: 0.85rem;";
            blogBox.innerHTML = `<strong>📖 All About Korea Blog</strong><p style="margin: 0.5rem 0; color: #666;">Explore more deep stories about Korea.</p><a href="https://ailaboutkorea.blogspot.com/" target="_blank" style="color: var(--primary-color); font-weight: 700; text-decoration: none;">Visit Blog →</a>`;
            els.trendingList.parentNode.appendChild(blogBox);
        }
    }

    async function translatePost(post) {
        const titleKey = `${post.id}_title_${currentLang}`;
        const contentKey = `${post.id}_content_${currentLang}`;
        if (translationCache[titleKey]) return;
        try {
            const [tT, tC] = await Promise.all([fetchTranslation(post.title, post.lang, currentLang), fetchTranslation(post.content, post.lang, currentLang)]);
            translationCache[titleKey] = tT; translationCache[contentKey] = tC; renderPosts();
        } catch (e) { console.error(e); }
    }

    async function fetchTranslation(text, source, target) {
        if (source === target) return text;
        try {
            const res = await fetch(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${source}|${target}`);
            const data = await res.json(); return data.responseData.translatedText;
        } catch (e) { return text; }
    }

    function setupDragAndDrop() {
        const zone = document.querySelector('.content-area');
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(name => zone.addEventListener(name, (e) => { e.preventDefault(); e.stopPropagation(); }, false));
        zone.addEventListener('drop', (e) => {
            Array.from(e.dataTransfer.files).forEach(file => {
                if (!file.type.startsWith('image/')) return;
                const reader = new FileReader(); reader.onload = (ev) => {
                    currentPostImages.push(ev.target.result); const idx = currentPostImages.length - 1;
                    const cursor = els.postContent.selectionStart;
                    els.postContent.value = els.postContent.value.slice(0, cursor) + `\n[IMG_${idx}]\n` + els.postContent.value.slice(cursor);
                    const img = document.createElement('img'); img.src = ev.target.result; img.className = 'preview-thumb'; els.imagePreviews.appendChild(img);
                }; reader.readAsDataURL(file);
            });
        }, false);
    }

    function setupEventListeners() {
        els.tabs.forEach(tab => tab.onclick = () => { currentCategory = tab.dataset.category; expandedPostId = null; updateUI(); renderContent(); });
        els.langBtns.forEach(btn => btn.onclick = () => {
            currentLang = btn.dataset.lang; els.langBtns.forEach(b => b.classList.remove('active')); btn.classList.add('active');
            localStorage.setItem('kcon_lang', currentLang); updateUI(); renderContent();
        });
        els.themeToggle.onclick = () => { currentTheme = currentTheme === 'light' ? 'dark' : 'light'; localStorage.setItem('kcon_theme', currentTheme); applyTheme(currentTheme); };
        els.btnNick.onclick = () => { const name = prompt("Nickname:", currentUser); if (name) { currentUser = name; localStorage.setItem('kcon_user', name); updateUI(); } };
        els.postForm.onsubmit = (e) => {
            e.preventDefault();
            const id = document.getElementById('post-id').value;
            const newPost = { id: id ? parseInt(id) : Date.now(), category: currentCategory, title: els.postTitle.value, content: els.postContent.value, author: currentUser, date: new Date().toLocaleDateString(), likes: 0, views: 0, comments: [], lang: currentLang, images: [...currentPostImages] };
            if (id) { const idx = posts.findIndex(p => p.id === parseInt(id)); if (idx !== -1) { newPost.likes = posts[idx].likes; newPost.views = posts[idx].views; newPost.comments = posts[idx].comments; posts[idx] = newPost; } }
            else posts.push(newPost);
            savePosts(); els.modal.classList.remove('active'); renderPosts();
        };
        document.getElementById('close-modal').onclick = () => els.modal.classList.remove('active');
        document.getElementById('cancel-post').onclick = () => els.modal.classList.remove('active');
    }

    function applyTheme(theme) { document.documentElement.setAttribute('data-theme', theme); }
});
