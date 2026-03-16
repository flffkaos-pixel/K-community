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
    const ADMIN_NICK = "운영자";
    const ADMIN_PW = "admin1234";

    let currentUser = localStorage.getItem('kcon_user') || 'User_' + Math.floor(Math.random() * 9999);
    localStorage.setItem('kcon_user', currentUser);

    let posts = [];
    let voteData = {};
    let idolRequests = [];
    let isConnected = false; // 연결 상태 확인용

    let currentCategory = 'vote';
    let currentLang = localStorage.getItem('kcon_lang') || 'en';
    let currentTheme = localStorage.getItem('kcon_theme') || 'light';
    let currentPostImages = [];
    let expandedPostId = null;

    const t = {
        ko: {
            loading: "서버에 연결 중입니다...",
            noPosts: "게시글이 없습니다. 첫 글을 남겨보세요!",
            write: "글쓰기", confirmDelete: "삭제하시겠습니까?",
            cats: { vote: "아이돌 투표", kpop: "K-Pop", living: "한국 생활", food: "음식", beauty: "뷰티", travel: "여행" },
            titles: { vote: "아이돌 인기 투표", kpop: "K-Pop & 엔터", living: "한국 생활 정보", food: "K-푸드 & 레시피", beauty: "K-뷰티 & 스타일", travel: "한국 여행 가이드" },
            descs: { vote: "무제한 투표!", kpop: "K-Pop 뉴스", living: "생활 꿀팁", food: "맛있는 음식", beauty: "뷰티 트렌드", travel: "여행 가이드" }
        },
        en: {
            loading: "Connecting to server...",
            noPosts: "No posts yet. Be the first to post!",
            write: "Write", confirmDelete: "Delete this?",
            cats: { vote: "Idol Poll", kpop: "K-Pop", living: "Living", food: "Food", beauty: "Beauty", travel: "Travel" },
            titles: { vote: "Idol Popularity Poll", kpop: "K-Pop & Entertainment", living: "Living in Korea", food: "K-Food & Recipes", beauty: "K-Beauty & Style", travel: "Korea Travel Guide" },
            descs: { vote: "Unlimited votes!", kpop: "K-Pop News", living: "Life tips", food: "Food stories", beauty: "Beauty trends", travel: "Travel guide" }
        }
    };

    const els = {
        postsContainer: document.getElementById('posts-container'),
        tabs: document.querySelectorAll('.tab'),
        modal: document.getElementById('modal-overlay'),
        postForm: document.getElementById('post-form'),
        postTitle: document.getElementById('post-title'),
        postContent: document.getElementById('post-content'),
        imagePreviews: document.getElementById('image-previews'),
        categoryTitle: document.getElementById('category-title'),
        categoryDesc: document.getElementById('category-desc'),
        userDisplay: document.getElementById('user-display'),
        btnNick: document.getElementById('btn-change-nickname')
    };

    // --- Firebase Sync ---
    const startSync = () => {
        // 게시글 동기화
        const postsQuery = query(collection(db, "posts"), orderBy("createdAt", "desc"));
        onSnapshot(postsQuery, (snapshot) => {
            isConnected = true;
            posts = snapshot.docs.map(doc => ({ firebaseId: doc.id, ...doc.data() }));
            renderContent();
        }, (err) => {
            console.error("Firebase Error:", err);
            els.postsContainer.innerHTML = `<div style="color:red; padding:2rem; text-align:center;">연결 오류: Firebase 콘솔에서 Firestore를 활성화했는지 확인해주세요.</div>`;
        });

        // 투표 동기화
        onSnapshot(collection(db, "votes"), (snapshot) => {
            snapshot.forEach(doc => { voteData[doc.id] = doc.data(); });
            renderContent();
        });

        // 요청 동기화
        onSnapshot(collection(db, "requests"), (snapshot) => {
            idolRequests = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            renderContent();
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
        els.tabs.forEach(tab => {
            tab.classList.toggle('active', tab.dataset.category === currentCategory);
            tab.textContent = langData.cats[tab.dataset.category] || tab.dataset.category;
        });
        
        const oldBtn = document.getElementById('board-write-btn');
        if (oldBtn) oldBtn.remove();
        els.categoryTitle.innerHTML = langData.titles[currentCategory] || currentCategory;
        
        if (currentCategory !== 'vote') {
            const writeBtn = document.createElement('button');
            writeBtn.id = 'board-write-btn';
            writeBtn.className = 'btn btn-primary';
            writeBtn.style.marginLeft = '1rem';
            writeBtn.style.fontSize = '0.8rem';
            writeBtn.textContent = langData.write;
            writeBtn.onclick = () => {
                document.getElementById('post-id').value = '';
                els.postForm.reset();
                els.imagePreviews.innerHTML = '';
                currentPostImages = [];
                els.modal.classList.add('active');
            };
            els.categoryTitle.appendChild(writeBtn);
        }
        els.categoryDesc.textContent = langData.descs[currentCategory] || "";
        els.userDisplay.textContent = currentUser;
        els.userDisplay.style.color = (currentUser === ADMIN_NICK) ? "var(--primary-color)" : "inherit";
    }

    function renderContent() {
        if (!isConnected) {
            els.postsContainer.innerHTML = `<div style="text-align:center; padding:2rem; color:#888;">${(t[currentLang]||t.en).loading}</div>`;
            return;
        }
        if (currentCategory === 'vote') renderPoll();
        else renderPosts();
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

            const isLiked = (JSON.parse(localStorage.getItem('kcon_liked_posts')) || []).includes(post.firebaseId);
            const isOwner = post.author === currentUser;
            const isAdmin = currentUser === ADMIN_NICK;

            el.innerHTML = `
                <div class="post-header"><div class="post-title">${post.title}</div></div>
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
                    ${isOwner ? `<button class="btn-icon edit-btn">✎</button>` : ''}
                    ${(isOwner || isAdmin) ? `<button class="btn-icon delete-btn">🗑</button>` : ''}
                </div>
                <div class="post-content">
                    ${post.content}
                    ${post.images ? post.images.map(img => `<img src="${img}" style="margin-top:10px; border-radius:8px; max-width:100%;">`).join('') : ''}
                </div>
            `;

            el.onclick = async (e) => {
                if (e.target.closest('button')) return;
                const isExp = !el.classList.contains('expanded');
                if (isExp) { 
                    expandedPostId = post.firebaseId; 
                    await updateDoc(doc(db, "posts", post.firebaseId), { views: increment(1) });
                } else expandedPostId = null;
                renderPosts();
            };

            const delBtn = el.querySelector('.delete-btn');
            if (delBtn) delBtn.onclick = async () => { 
                if(confirm((t[currentLang]||t.en).confirmDelete)) await deleteDoc(doc(db, "posts", post.firebaseId)); 
            };

            els.postsContainer.appendChild(el);
        });
    }

    function renderPoll() {
        const lang = t[currentLang] || t.en;
        els.postsContainer.innerHTML = `<div class="poll-grid"></div><div class="request-board"><h3>${lang.reqTitle||"Idol Requests"}</h3><div class="req-list"></div></div>`;
        const grid = els.postsContainer.querySelector('.poll-grid');
        
        const idols = ['bts', 'aespa', 'seventeen', 'enhypen', 'skz', 'ive', 'newjeans', 'riize'];
        idols.forEach(key => {
            const data = voteData[key] || { name: key.toUpperCase(), likes: 0, dislikes: 0 };
            const card = document.createElement('div'); card.className = 'idol-card';
            card.innerHTML = `
                <div class="idol-name">${data.name}</div>
                <div class="poll-actions">
                    <button class="poll-btn like" onclick="window.updateVote('${key}', 'likes')">👍 ${data.likes}</button>
                </div>`;
            grid.appendChild(card);
        });
    }

    window.updateVote = async (key, type) => {
        const docRef = doc(db, "votes", key);
        await setDoc(docRef, { [type]: increment(1) }, { merge: true });
    };

    els.postForm.onsubmit = async (e) => {
        e.preventDefault();
        const btn = els.postForm.querySelector('button[type="submit"]');
        btn.disabled = true;
        btn.textContent = "...";

        const newPost = { 
            category: currentCategory, 
            title: els.postTitle.value, 
            content: els.postContent.value, 
            author: currentUser, 
            date: new Date().toLocaleDateString(), 
            likes: 0, views: 0, comments: [], 
            lang: currentLang, images: currentPostImages,
            createdAt: Date.now()
        };
        
        try {
            await addDoc(collection(db, "posts"), newPost);
            els.modal.classList.remove('active');
            els.postForm.reset();
            currentPostImages = [];
        } catch (error) {
            alert("Firestore 저장 실패! 규칙(Rules) 설정을 확인해주세요: " + error.message);
        } finally {
            btn.disabled = false;
            btn.textContent = "Post";
        }
    };

    els.btnNick.onclick = () => { 
        const name = prompt("Nickname:"); 
        if (name) { 
            if (name === ADMIN_NICK) {
                if (prompt("Admin Password:") !== ADMIN_PW) { alert("Wrong Password"); return; }
            }
            currentUser = name; 
            localStorage.setItem('kcon_user', name); 
            updateUI(); 
            renderContent();
        } 
    };

    els.tabs.forEach(tab => tab.onclick = () => { currentCategory = tab.dataset.category; expandedPostId = null; updateUI(); renderContent(); });
    document.getElementById('close-modal').onclick = () => els.modal.classList.remove('active');
    function applyTheme(theme) { document.documentElement.setAttribute('data-theme', theme); }
    function setupDragAndDrop() {} // 생략
    function setupEventListeners() {} // 생략
});
