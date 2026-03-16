import { db } from './firebase-config.js';
import { 
    collection, 
    addDoc, 
    onSnapshot, 
    query, 
    orderBy, 
    doc, 
    updateDoc, 
    increment, 
    deleteDoc,
    setDoc
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

document.addEventListener('DOMContentLoaded', () => {
    // --- Global State ---
    const ADMIN_NICK = "운영자";
    const ADMIN_PW = "admin1234";

    let currentUser = localStorage.getItem('kcon_user') || 'User_' + Math.floor(Math.random() * 9999);
    localStorage.setItem('kcon_user', currentUser);

    let posts = [];
    let voteData = {};
    let idolRequests = [];
    let isConnected = false;

    let currentCategory = 'vote';
    let currentLang = localStorage.getItem('kcon_lang') || 'ko';
    let currentTheme = localStorage.getItem('kcon_theme') || 'light';
    let currentPostImages = [];
    let expandedPostId = null;

    const translationCache = {};
    const translatingIds = new Set(); 

    const t = {
        ko: {
            loading: "서버 연결 중...", noPosts: "게시글이 없습니다.", write: "글쓰기",
            confirmDelete: "삭제하시겠습니까?", translating: "번역 중...",
            reqTitle: "➕ 아이돌 추가 요청", reqPlace: "이름 입력...", reqBtn: "요청",
            trendingTitle: "🔥 지금 인기 있는 글",
            blogTitle: "📖 올 어바웃 코리아 블로그",
            blogDesc: "한국에 대한 더 깊은 이야기들을 만나보세요.",
            cats: { vote: "아이돌 투표", kpop: "K-Pop", living: "한국 생활", food: "음식", beauty: "뷰티", travel: "여행" },
            titles: { vote: "아이돌 인기 투표", kpop: "K-Pop & 엔터", living: "한국 생활 정보", food: "K-푸드 & 레시피", beauty: "K-뷰티 & 스타일", travel: "한국 여행 가이드" },
            descs: { vote: "무제한 투표!", kpop: "K-Pop 뉴스", living: "생활 꿀팁", food: "맛있는 음식", beauty: "뷰티 트렌드", travel: "여행 가이드" }
        },
        en: {
            loading: "Connecting...", noPosts: "No posts yet.", write: "Write",
            confirmDelete: "Delete this?", translating: "Translating...",
            reqTitle: "➕ Request New Idol", reqPlace: "Idol name...", reqBtn: "Request",
            trendingTitle: "🔥 Trending Now",
            blogTitle: "📖 All About Korea Blog",
            blogDesc: "Explore more deep stories about Korea.",
            cats: { vote: "Idol Poll", kpop: "K-Pop", living: "Living", food: "Food", beauty: "Beauty", travel: "Travel" },
            titles: { vote: "Idol Popularity Poll", kpop: "K-Pop & Entertainment", living: "Living in Korea", food: "K-Food & Recipes", beauty: "K-Beauty & Style", travel: "Korea Travel Guide" },
            descs: { vote: "Unlimited votes!", kpop: "K-Pop News", living: "Life tips", food: "Food stories", beauty: "Beauty trends", travel: "Travel guide" }
        },
        ja: {
            write: "投稿", loading: "接続中...", translating: "翻訳中...",
            trendingTitle: "🔥 今人気の投稿", blogTitle: "📖 All About Korea ブログ",
            cats: { vote: "投票", kpop: "K-POP", living: "生活", food: "グルメ", beauty: "ビューティー", travel: "旅行" },
            titles: { vote: "人気投票", kpop: "K-POPニュース", living: "韓国生活", food: "グルメ情報", beauty: "K-뷰티", travel: "旅行ガイド" }
        },
        zh: {
            write: "发布", loading: "连接中...", translating: "翻译中...",
            trendingTitle: "🔥 热门内容", blogTitle: "📖 All About Korea 博客",
            cats: { vote: "偶像投票", kpop: "K-Pop", living: "生活", food: "美食", beauty: "美妆", travel: "旅游" },
            titles: { vote: "人气投票", kpop: "K-Pop 娱乐", living: "韩国生活", food: "韩国美食", beauty: "韩国美妆", travel: "韩国旅游" }
        },
        es: {
            write: "Escribir", loading: "Conectando...", translating: "Traduciendo...",
            trendingTitle: "🔥 Tendencias", blogTitle: "📖 Blog All About Korea",
            cats: { vote: "Votación", kpop: "K-Pop", living: "Vida", food: "Comida", beauty: "Belleza", travel: "Viajes" },
            titles: { vote: "Votación de Ídolos", kpop: "Noticias K-Pop", living: "Vida en Corea", food: "Comida Coreana", beauty: "Belleza K", travel: "Guía de Viaje" }
        }
    };

    const els = {
        postsContainer: document.getElementById('posts-container'),
        trendingList: document.getElementById('trending-list'),
        trendingTitle: document.getElementById('trending-title'),
        tabs: document.querySelectorAll('.tab'),
        modal: document.getElementById('modal-overlay'),
        postForm: document.getElementById('post-form'),
        postTitle: document.getElementById('post-title'),
        postContent: document.getElementById('post-content'),
        imagePreviews: document.getElementById('image-previews'),
        categoryTitle: document.getElementById('category-title'),
        categoryDesc: document.getElementById('category-desc'),
        userDisplay: document.getElementById('user-display'),
        btnNick: document.getElementById('btn-change-nickname'),
        langBtns: document.querySelectorAll('.lang-btn'),
        themeToggle: document.getElementById('theme-toggle')
    };

    const startSync = () => {
        onSnapshot(query(collection(db, "posts"), orderBy("createdAt", "desc")), (snapshot) => {
            isConnected = true;
            posts = snapshot.docs.map(doc => ({ firebaseId: doc.id, ...doc.data() }));
            renderContent();
        }, (err) => {
            console.error("Firebase Error:", err);
            els.postsContainer.innerHTML = `<div style="color:red;padding:2rem;text-align:center;">서버 연결 오류.</div>`;
        });

        onSnapshot(collection(db, "votes"), (snapshot) => {
            snapshot.forEach(doc => { voteData[doc.id] = doc.data(); });
            if (currentCategory === 'vote') renderPoll();
        });

        onSnapshot(collection(db, "requests"), (snapshot) => {
            idolRequests = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            if (currentCategory === 'vote') renderPoll();
        });
    };

    init();

    function init() {
        applyTheme(currentTheme);
        updateUI();
        startSync();
        setupEventListeners();
        setupDragAndDrop();
    }

    function updateUI() {
        const langData = t[currentLang] || t.en;
        els.langBtns.forEach(btn => btn.classList.toggle('active', btn.dataset.lang === currentLang));
        els.tabs.forEach(tab => {
            tab.classList.toggle('active', tab.dataset.category === currentCategory);
            tab.textContent = (langData.cats && langData.cats[tab.dataset.category]) ? langData.cats[tab.dataset.category] : tab.dataset.category;
        });
        
        const oldBtn = document.getElementById('board-write-btn');
        if (oldBtn) oldBtn.remove();
        els.categoryTitle.innerHTML = (langData.titles && langData.titles[currentCategory]) ? langData.titles[currentCategory] : currentCategory;
        
        if (currentCategory !== 'vote') {
            const writeBtn = document.createElement('button');
            writeBtn.id = 'board-write-btn';
            writeBtn.className = 'btn btn-primary';
            writeBtn.style.marginLeft = '1rem';
            writeBtn.style.fontSize = '0.8rem';
            writeBtn.textContent = langData.write || "Write";
            writeBtn.onclick = () => {
                document.getElementById('post-id').value = '';
                els.postForm.reset();
                els.imagePreviews.innerHTML = '';
                currentPostImages = [];
                els.modal.classList.add('active');
            };
            els.categoryTitle.appendChild(writeBtn);
        }
        els.categoryDesc.textContent = (langData.descs && langData.descs[currentCategory]) ? langData.descs[currentCategory] : "";
        els.userDisplay.textContent = currentUser;
        els.userDisplay.style.color = (currentUser === ADMIN_NICK) ? "var(--primary-color)" : "inherit";
        
        if (els.trendingTitle) els.trendingTitle.textContent = langData.trendingTitle || "Trending Now";
    }

    function renderContent() {
        if (!isConnected) {
            els.postsContainer.innerHTML = `<div style="text-align:center; padding:2rem; color:#888;">${(t[currentLang]||t.en).loading}</div>`;
            return;
        }
        if (currentCategory === 'vote') renderPoll();
        else renderPosts();
        renderTrending();
    }

    function renderPosts() {
        els.postsContainer.innerHTML = '';
        const filtered = posts.filter(p => p.category === currentCategory);
        if (filtered.length === 0) {
            els.postsContainer.innerHTML = `<div style="text-align:center; color:#888; padding: 2rem;">${(t[currentLang]||t.en).noPosts}</div>`;
            return;
        }

        filtered.forEach(post => {
            const el = document.createElement('article');
            el.className = 'post-card';
            if (expandedPostId === post.firebaseId) el.classList.add('expanded');

            let displayTitle = post.title;
            let displayContent = post.content;

            if (post.lang !== currentLang) {
                const titleKey = `t_${post.firebaseId}_${currentLang}`;
                const contentKey = `c_${post.firebaseId}_${currentLang}`;
                if (translationCache[titleKey]) {
                    displayTitle = translationCache[titleKey];
                    displayContent = translationCache[contentKey];
                } else {
                    displayTitle = (t[currentLang] || t.en).translating || "Translating...";
                    if (!translatingIds.has(post.firebaseId + currentLang)) {
                        translatingIds.add(post.firebaseId + currentLang);
                        translatePost(post);
                    }
                }
            }

            const isLiked = (JSON.parse(localStorage.getItem('kcon_liked_posts')) || []).includes(post.firebaseId);
            const isOwner = post.author === currentUser;
            const isAdmin = currentUser === ADMIN_NICK;

            el.innerHTML = `
                <div class="post-header"><div class="post-title">${displayTitle}</div></div>
                <div class="post-meta">
                    <div class="meta-left"><span>@${post.author}</span><span>•</span><span>${post.date}</span></div>
                    <div class="meta-right">
                        <span>👁 ${post.views || 0}</span><span>💬 ${post.comments ? post.comments.length : 0}</span>
                        <button class="btn-icon like-post-btn" style="color: ${isLiked ? 'var(--primary-color)' : 'inherit'}">
                            ${isLiked ? '❤️' : '🤍'} ${post.likes || 0}
                        </button>
                    </div>
                </div>
                <div class="post-mgmt-actions">
                    ${(isOwner || isAdmin) ? `<button class="btn-icon delete-btn">🗑</button>` : ''}
                </div>
                <div class="post-content">
                    <div style="white-space: pre-wrap; margin-bottom: 1rem;">${displayContent}</div>
                    ${post.images ? post.images.map(img => `<img src="${img}" style="margin-top:10px; border-radius:8px; max-width:100%; display:block;">`).join('') : ''}
                </div>
            `;

            el.onclick = async (e) => {
                if (e.target.closest('button')) return;
                const isExp = !el.classList.contains('expanded');
                expandedPostId = isExp ? post.firebaseId : null;
                if (isExp) await updateDoc(doc(db, "posts", post.firebaseId), { views: increment(1) });
                renderPosts();
            };

            const delBtn = el.querySelector('.delete-btn');
            if (delBtn) delBtn.onclick = async (e) => { 
                e.stopPropagation();
                if(confirm((t[currentLang]||t.en).confirmDelete)) await deleteDoc(doc(db, "posts", post.firebaseId)); 
            };

            const likeBtn = el.querySelector('.like-post-btn');
            likeBtn.onclick = async (e) => {
                e.stopPropagation();
                let liked = JSON.parse(localStorage.getItem('kcon_liked_posts')) || [];
                const idx = liked.indexOf(post.firebaseId);
                if (idx === -1) {
                    liked.push(post.firebaseId);
                    await updateDoc(doc(db, "posts", post.firebaseId), { likes: increment(1) });
                } else {
                    liked.splice(idx, 1);
                    await updateDoc(doc(db, "posts", post.firebaseId), { likes: increment(-1) });
                }
                localStorage.setItem('kcon_liked_posts', JSON.stringify(liked));
            };

            els.postsContainer.appendChild(el);
        });
    }

    async function translatePost(post) {
        const titleKey = `t_${post.firebaseId}_${currentLang}`;
        const contentKey = `c_${post.firebaseId}_${currentLang}`;
        try {
            const [tT, tC] = await Promise.all([
                fetchTranslation(post.title, post.lang, currentLang),
                fetchTranslation(post.content, post.lang, currentLang)
            ]);
            translationCache[titleKey] = tT;
            translationCache[contentKey] = tC;
            renderPosts();
        } catch (e) { console.error(e); }
    }

    async function fetchTranslation(text, source, target) {
        if (!text || source === target) return text;
        const lines = text.split('\n');
        const chunks = [];
        let currentChunk = "";
        for (const line of lines) {
            if (line.length > 450) {
                if (currentChunk) { chunks.push(currentChunk); currentChunk = ""; }
                let tempLine = line;
                while (tempLine.length > 450) { chunks.push(tempLine.substring(0, 450)); tempLine = tempLine.substring(450); }
                currentChunk = tempLine;
            } 
            else if ((currentChunk.length + line.length + 1) < 450) { currentChunk += (currentChunk ? '\n' : '') + line; } 
            else { chunks.push(currentChunk); currentChunk = line; }
        }
        if (currentChunk) chunks.push(currentChunk);
        try {
            const translatedChunks = await Promise.all(chunks.map(async (chunk) => {
                if (!chunk.trim()) return chunk;
                const res = await fetch(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(chunk)}&langpair=${source}|${target}`);
                const data = await res.json();
                return (data.responseStatus == 200) ? data.responseData.translatedText : chunk;
            }));
            return translatedChunks.join('\n');
        } catch (e) { return text; }
    }

    function renderPoll() {
        const lang = t[currentLang] || t.en;
        els.postsContainer.innerHTML = `<div class="poll-grid"></div><div class="request-board"><h3>${lang.reqTitle || "Idol Requests"}</h3><div class="request-input-area"><input type="text" id="req-input" class="request-input" placeholder="${lang.reqPlace}"><button id="btn-submit-req" class="btn btn-primary">${lang.reqBtn || "Request"}</button></div><div class="req-list"></div></div>`;
        const grid = els.postsContainer.querySelector('.poll-grid');
        
        const idols = [
            { key: 'bts', name: 'BTS', img: 'bts.jpg' },
            { key: 'aespa', name: 'Aespa', img: 'aespa.jpg' },
            { key: 'seventeen', name: 'Seventeen' },
            { key: 'enhypen', name: 'Enhypen' },
            { key: 'skz', name: 'Stray Kids' },
            { key: 'ive', name: 'IVE' },
            { key: 'newjeans', name: 'NewJeans' },
            { key: 'riize', name: 'RIIZE' }
        ];

        idols.forEach(idol => {
            const data = voteData[idol.key] || { name: idol.name, likes: 0 };
            const card = document.createElement('div'); 
            card.className = 'idol-card';
            
            if (idol.img) {
                card.style.background = `linear-gradient(rgba(0,0,0,0.4), rgba(0,0,0,0.4)), url("${idol.img}") center/cover no-repeat`;
                card.style.color = 'white';
            }

            card.innerHTML = `
                <div class="idol-name" style="${idol.img ? 'color: white;' : ''}">${data.name}</div>
                <div class="poll-actions">
                    <button class="poll-btn like" data-key="${idol.key}">👍 <span class="count">${data.likes}</span></button>
                </div>`;
            card.querySelector('.like').onclick = async () => {
                await setDoc(doc(db, "votes", idol.key), { name: idol.name, likes: increment(1) }, { merge: true });
            };
            grid.appendChild(card);
        });

        const reqList = els.postsContainer.querySelector('.req-list');
        idolRequests.forEach(req => {
            const item = document.createElement('div'); item.className = 'req-item';
            const isAdmin = currentUser === ADMIN_NICK;
            item.innerHTML = `<span>${req.text} <small>(@${req.author})</small></span>${(isAdmin || req.author === currentUser) ? `<span class="req-delete" style="cursor:pointer">🗑</span>` : ''}`;
            if (item.querySelector('.req-delete')) {
                item.querySelector('.req-delete').onclick = async () => { if(confirm(lang.confirmDelete)) await deleteDoc(doc(db, "requests", req.id)); };
            }
            reqList.appendChild(item);
        });

        els.postsContainer.querySelector('#btn-submit-req').onclick = async () => {
            const inp = document.getElementById('req-input');
            if (inp.value.trim()) {
                await addDoc(collection(db, "requests"), { text: inp.value.trim(), author: currentUser, createdAt: Date.now() });
                inp.value = '';
            }
        };
    }

    function renderTrending() {
        if (!els.trendingList) return;
        const langData = t[currentLang] || t.en;
        els.trendingList.innerHTML = '';
        
        let blogBox = document.getElementById('blog-promo-box');
        if (!blogBox) {
            blogBox = document.createElement('div');
            blogBox.id = 'blog-promo-box';
            blogBox.style.cssText = "margin-top: 1rem; padding: 1rem; background: #fffbe6; border: 1px solid #ffe58f; border-radius: 12px; font-size: 0.85rem;";
            els.trendingList.parentNode.appendChild(blogBox);
        }
        blogBox.innerHTML = `<strong>${langData.blogTitle}</strong><p style="margin: 0.5rem 0; color: #666;">${langData.blogDesc}</p><a href="https://ailaboutkorea.blogspot.com/" target="_blank" style="color: var(--primary-color); font-weight: 700; text-decoration: none;">Visit Blog →</a>`;

        const items = [];
        const sortedPosts = [...posts].sort((a,b) => ((b.views||0) + (b.likes||0)*2) - ((a.views||0) + (a.likes||0)*2)).slice(0, 3);
        sortedPosts.forEach(p => items.push({ title: p.title, meta: `Post • ❤️ ${p.likes||0}`, id: p.firebaseId, cat: p.category, lang: p.lang }));

        Object.entries(voteData).sort(([,a], [,b]) => b.likes - a.likes).slice(0, 2).forEach(([k, d]) => items.push({ title: d.name, meta: `Idol • ❤️ ${d.likes}`, cat: 'vote' }));

        items.forEach(async (item, i) => {
            const li = document.createElement('li'); li.className = 'trending-item';
            let displayTitle = item.title;
            if (item.lang && item.lang !== currentLang) {
                const key = `trend_${item.id}_${currentLang}`;
                displayTitle = translationCache[key] || await fetchTranslation(item.title, item.lang, currentLang).then(res => { translationCache[key] = res; return res; });
            }
            li.innerHTML = `<div class="trending-rank">${i+1}</div><div class="trending-info"><div class="trending-title">${displayTitle}</div><div class="trending-meta">${item.meta}</div></div>`;
            li.onclick = () => { currentCategory = item.cat; if(item.id) expandedPostId = item.id; updateUI(); renderContent(); };
            els.trendingList.appendChild(li);
        });
    }

    function setupEventListeners() {
        els.tabs.forEach(tab => tab.onclick = () => { currentCategory = tab.dataset.category; expandedPostId = null; updateUI(); renderContent(); });
        els.langBtns.forEach(btn => btn.onclick = () => {
            currentLang = btn.dataset.lang; 
            localStorage.setItem('kcon_lang', currentLang); 
            updateUI(); renderContent();
        });
        els.themeToggle.onclick = () => {
            currentTheme = currentTheme === 'light' ? 'dark' : 'light';
            localStorage.setItem('kcon_theme', currentTheme);
            applyTheme(currentTheme);
        };
        els.btnNick.onclick = () => { 
            const name = prompt("Nickname:"); 
            if (name) { 
                if (name === ADMIN_NICK) {
                    if (prompt("Admin Password:") !== ADMIN_PW) { alert("Wrong Password"); return; }
                }
                currentUser = name; 
                localStorage.setItem('kcon_user', name); 
                updateUI(); renderContent();
            } 
        };
        document.getElementById('close-modal').onclick = () => els.modal.classList.remove('active');
        document.getElementById('cancel-post').onclick = () => els.modal.classList.remove('active');
        els.postForm.onsubmit = async (e) => {
            e.preventDefault();
            const btn = els.postForm.querySelector('button[type="submit"]');
            btn.disabled = true;
            try {
                await addDoc(collection(db, "posts"), { 
                    category: currentCategory, title: els.postTitle.value, content: els.postContent.value, 
                    author: currentUser, date: new Date().toLocaleDateString(), likes: 0, views: 0, 
                    comments: [], lang: currentLang, images: currentPostImages, createdAt: Date.now()
                });
                els.modal.classList.remove('active'); els.postForm.reset(); currentPostImages = [];
            } catch (err) { alert("Error: " + err.message); }
            finally { btn.disabled = false; }
        };
    }

    function setupDragAndDrop() {
        const zone = document.querySelector('.content-area');
        if (!zone) return;
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(name => zone.addEventListener(name, (e) => { e.preventDefault(); e.stopPropagation(); }));
        zone.addEventListener('drop', (e) => {
            Array.from(e.dataTransfer.files).forEach(file => {
                if (!file.type.startsWith('image/')) return;
                const reader = new FileReader(); reader.onload = (ev) => {
                    currentPostImages.push(ev.target.result);
                    const img = document.createElement('img'); img.src = ev.target.result; img.className = 'preview-thumb'; els.imagePreviews.appendChild(img);
                }; reader.readAsDataURL(file);
            });
        });
    }

    function applyTheme(theme) { document.documentElement.setAttribute('data-theme', theme); }
});
