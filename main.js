import { db, auth } from './firebase-config.js';
import { 
    signInWithEmailAndPassword,
    onAuthStateChanged,
    signOut
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
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
    const ADMIN_EMAIL = "your-admin-email@example.com"; 
    const ADMIN_NICK = "운영자";

    const urlParams = new URLSearchParams(window.location.search);
    let currentCategory = urlParams.get('category') || 'vote';
    
    // Support ?lang= URL parameter
    const urlLang = urlParams.get('lang');
    if (urlLang) localStorage.setItem('kcon_lang', urlLang);
    
    let currentUser = localStorage.getItem('kcon_user') || 'User_' + Math.floor(Math.random() * 9999);
    let isAdmin = false;

    let posts = [];
    let voteData = {};
    let idolRequests = [];
    let isConnected = false;

    let currentLang = urlLang || localStorage.getItem('kcon_lang') || 'ko';
    let currentTheme = localStorage.getItem('kcon_theme') || 'light';
    let currentPostImages = [];
    let expandedPostId = null;

    const translationCache = {};
    const translatingIds = new Set(); 
    
    // --- Translation Queue System (Optimized) ---
    const translationQueue = [];
    let activeTasks = 0;
    const MAX_CONCURRENT = 5; // Process 5 requests at once for speed
    const QUEUE_DELAY = 50;   // Minimal delay between tasks

    function processQueue() {
        while (activeTasks < MAX_CONCURRENT && translationQueue.length > 0) {
            activeTasks++;
            const { task, resolve } = translationQueue.shift();
            
            task().then(resolve).finally(() => {
                activeTasks--;
                setTimeout(processQueue, QUEUE_DELAY);
            });
        }
    }

    function enqueueTranslation(text, source, target) {
        return new Promise((resolve) => {
            translationQueue.push({
                task: () => fetchTranslationInternal(text, source, target),
                resolve
            });
            processQueue();
        });
    }
    // -------------------------------

    const t = {
        ko: {
            loading: "서버 연결 중...", noPosts: "게시글이 없습니다.", write: "글쓰기",
            confirmDelete: "삭제하시겠습니까?", translating: "번역 중...",
            reqTitle: "➕ 아이돌 추가 요청", reqPlace: "이름 입력...", reqBtn: "요청",
            trendingTitle: "🔥 지금 인기 있는 글",
            blogTitle: "📖 올 어바웃 코리아 블로그",
            blogDesc: "한국에 대한 더 깊은 이야기들을 만나보세요.",
            welcomeTitle: "환영합니다! 🎉",
            welcomeMsg: "K-community에서 여러분의 소중한 이야기를 들려주세요! K-Pop, 한국 여행, 음식 등 어떤 주제든 좋습니다. 카테고리를 선택하고 '글쓰기' 버튼을 눌러 전 세계 친구들과 소통해 보세요.",
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
            welcomeTitle: "Welcome! 🎉",
            welcomeMsg: "Share your precious stories at K-community! K-Pop, Korea travel, food, or any topic is welcome. Select a category and click 'Write' to connect with friends worldwide.",
            cats: { vote: "Idol Poll", kpop: "K-Pop", living: "Living", food: "Food", beauty: "Beauty", travel: "Travel" },
            titles: { vote: "Idol Popularity Poll", kpop: "K-Pop & Entertainment", living: "Living in Korea", food: "K-Food & Recipes", beauty: "K-Beauty & Style", travel: "Korea Travel Guide" },
            descs: { vote: "Unlimited votes!", kpop: "K-Pop News", living: "Life tips", food: "Food stories", beauty: "Beauty trends", travel: "Travel guide" }
        },
        ja: {
            write: "投稿", loading: "接続中...", translating: "翻訳中...",
            trendingTitle: "🔥 今人気の投稿", blogTitle: "📖 All About Korea ブログ",
            blogDesc: "韓国に関するより深い話に 만나보세요.",
            welcomeTitle: "ようこそ！ 🎉",
            welcomeMsg: "K-communityであなたの貴重な話を共有してください！K-Pop、韓国旅行、食べ物など、どんなトピックでも大歓迎です。カテゴリーを選択して「投稿」をクリックし、世界中の友達とつながりましょう。",
            cats: { vote: "投票", kpop: "K-POP", living: "生活", food: "グルメ", beauty: "ビューティー", travel: "旅行" },
            titles: { vote: "人気投票", kpop: "K-POPニュース", living: "韓国生活", food: "グルメ情報", beauty: "K-뷰티", travel: "旅行ガイド" }
        },
        zh: {
            write: "发布", loading: "连接中...", translating: "翻译中...",
            trendingTitle: "🔥 热门内容", blogTitle: "📖 All About Korea 博客",
            blogDesc: "了解更多关于韩国的深度故事。",
            welcomeTitle: "欢迎！ 🎉",
            welcomeMsg: "在 K-community 分享您的精彩故事！无论是 K-Pop、韩国旅游、美食还是任何话题都欢迎。选择一个类别并点击“发布”，与世界各地的朋友交流。",
            cats: { vote: "偶像投票", kpop: "K-Pop", living: "生活", food: "美食", beauty: "美妆", travel: "旅游" },
            titles: { vote: "人气投票", kpop: "K-Pop 娱乐", living: "韩国生活", food: "韩国美食", beauty: "韩国美妆", travel: "韩国旅游" }
        },
        es: {
            write: "Escribir", loading: "Conectando...", translating: "Traduciendo...",
            trendingTitle: "🔥 Tendencias", blogTitle: "📖 Blog All About Korea",
            blogDesc: "Explora historias más profundas sobre Corea.",
            welcomeTitle: "¡Bienvenido! 🎉",
            welcomeMsg: "¡Comparte tus valiosas historias en K-community! K-Pop, viajes por Corea, comida o cualquier tema es bienvenido. Selecciona una categoría y haz clic en 'Escribir' para conectar con amigos de todo el mundo.",
            cats: { vote: "Votación", kpop: "K-Pop", living: "Vida", food: "Comida", beauty: "Belleza", travel: "Viajes" },
            titles: { vote: "Votación de Ídolos", kpop: "Noticias K-Pop", living: "Vida en Corea", food: "Comida Coreana", beauty: "Belleza K", travel: "Guía de Viaje" }
        },
        th: {
            write: "เขียน", loading: "กำลังเชื่อมต่อ...", translating: "กำลังแปล...",
            trendingTitle: "🔥 กำลังเป็นที่นิยม", blogTitle: "📖 บล็อก All About Korea",
            blogDesc: "สำรวจเรื่องราวเชิงลึกเกี่ยวกับเกาหลีเพิ่มเติม",
            welcomeTitle: "ยินดีต้อนรับ! 🎉",
            welcomeMsg: "แบ่งปันเรื่องราวที่มีค่าของคุณที่ K-community! ไม่ว่าจะเป็น K-Pop, การเที่ยวเกาหลี, อาหาร หรือหัวข้อใดๆ ก็ตาม เลือกหมวดหมู่แล้วคลิก 'เขียน' เพื่อเชื่อมต่อกับเพื่อนๆ ทั่วโลก",
            cats: { vote: "โหวตไอดอล", kpop: "K-Pop", living: "การใช้ชีวิต", food: "อาหาร", beauty: "ความงาม", travel: "การท่องเที่ยว" },
            titles: { vote: "โหวตยอดนิยมไอดอล", kpop: "K-Pop & บันเทิง", living: "การใช้ชีวิตในเกาหลี", food: "อาหารเกาหลี & สูตรอาหาร", beauty: "K-Beauty & สไตล์", travel: "คู่มือท่องเที่ยวเกาหลี" }
        },
        vi: {
            write: "Viết bài", loading: "Đang kết nối...", translating: "Đang dịch...",
            trendingTitle: "🔥 Đang thịnh hành", blogTitle: "📖 Blog All About Korea",
            blogDesc: "Khám phá thêm những câu chuyện sâu sắc về Hàn Quốc.",
            welcomeTitle: "Chào mừng! 🎉",
            welcomeMsg: "Chia sẻ những câu chuyện quý giá của bạn tại K-community! K-Pop, du lịch Hàn Quốc, ẩm thực hoặc bất kỳ chủ đề nào đều được chào đón. Chọn một danh mục và nhấp vào 'Viết bài' để kết nối với bạn bè trên toàn thế giới.",
            cats: { vote: "Bình chọn Idol", kpop: "K-Pop", living: "Đời sống", food: "Ẩm thực", beauty: "Làm đẹp", travel: "Du lịch" },
            titles: { vote: "Bình chọn độ nổi tiếng Idol", kpop: "K-Pop & Giải trí", living: "Sống tại Hàn Quốc", food: "Món ăn & Công thức", beauty: "K-Beauty & Phong cách", travel: "Cẩm nang du lịch Hàn Quốc" }
        },
        id: {
            write: "Tulis", loading: "Menghubungkan...", translating: "Menerjemahkan...",
            trendingTitle: "🔥 Tren Sekarang", blogTitle: "📖 Blog All About Korea",
            blogDesc: "Jelajahi lebih banyak cerita mendalam tentang Korea.",
            welcomeTitle: "Selamat Datang! 🎉",
            welcomeMsg: "Bagikan cerita berharga Anda di K-community! K-Pop, perjalanan Korea, makanan, atau topik apa pun dipersilakan. Pilih kategori dan klik 'Tulis' untuk terhubung dengan teman-teman di seluruh dunia.",
            cats: { vote: "Polling Idol", kpop: "K-Pop", living: "Kehidupan", food: "Makanan", beauty: "Kecantikan", travel: "Wisata" },
            titles: { vote: "Polling Popularitas Idol", kpop: "K-Pop & Hiburan", living: "Tinggal di Korea", food: "Makanan & Resep", beauty: "K-Beauty & Gaya", travel: "Panduan Wisata" }
        },
        fr: {
            write: "Écrire", loading: "Connexion...", translating: "Traduction...",
            trendingTitle: "🔥 Tendances", blogTitle: "📖 Blog All About Korea",
            blogDesc: "Explorez des histoires plus profondes sur la Corée.",
            welcomeTitle: "Bienvenue ! 🎉",
            welcomeMsg: "Partagez vos histoires précieuses sur K-community ! K-Pop, voyages en Corée, cuisine ou tout autre sujet sont les bienvenus. Sélectionnez une catégorie et cliquez sur 'Écrire' pour vous connecter avec des amis du monde entier.",
            cats: { vote: "Sondage Idol", kpop: "K-Pop", living: "Vie", food: "Cuisine", beauty: "Beauté", travel: "Voyage" },
            titles: { vote: "Sondage de popularité Idol", kpop: "K-Pop & Divertissement", living: "Vivre en Corée", food: "Cuisine & Recettes", beauty: "K-Beauty & Style", travel: "Guide de voyage" }
        },
        de: {
            write: "Schreiben", loading: "Verbinden...", translating: "Übersetzen...",
            trendingTitle: "🔥 Trends", blogTitle: "📖 All About Korea Blog",
            blogDesc: "Entdecke tiefere Geschichten über Korea.",
            welcomeTitle: "Willkommen! 🎉",
            welcomeMsg: "Teile deine wertvollen Geschichten in der K-community! K-Pop, Korea-Reisen, Essen oder jedes andere Thema ist willkommen. Wähle eine Kategorie und klicke auf 'Schreiben', um dich mit Freunden weltweit zu verbinden.",
            cats: { vote: "Idol-Umfrage", kpop: "K-Pop", living: "Leben", food: "Essen", beauty: "Schönheit", travel: "Reisen" },
            titles: { vote: "Idol-Beliebtheitsumfrage", kpop: "K-Pop & Unterhaltung", living: "Leben in Korea", food: "Essen & Rezepte", beauty: "K-Beauty & Stil", travel: "Reiseführer" }
        },
        pt: {
            write: "Escrever", loading: "Conectando...", translating: "Traduzindo...",
            trendingTitle: "🔥 Tendências", blogTitle: "📖 Blog All About Korea",
            blogDesc: "Explore histórias mais profundas sobre a Coreia.",
            welcomeTitle: "Bem-vindo! 🎉",
            welcomeMsg: "Compartilhe suas histórias preciosas na K-community! K-Pop, viagens à Coreia, comida ou qualquer tópico é bem-vindo. Selecione uma categoria e clique em 'Escrever' para se conectar com amigos de todo o mundo.",
            cats: { vote: "Votação Idol", kpop: "K-Pop", living: "Vida", food: "Comida", beauty: "Beleza", travel: "Viagem" },
            titles: { vote: "Votação de Popularidade Idol", kpop: "K-Pop & Entretenimento", living: "Viver na Coreia", food: "Comida & Receitas", beauty: "K-Beauty & Estilo", travel: "Guia de Viagem" }
        },
        ru: {
            write: "Написать", loading: "Подключение...", translating: "Перевод...",
            trendingTitle: "🔥 Сейчас в тренде", blogTitle: "📖 Блог All About Korea",
            blogDesc: "Узнайте больше глубоких историй о Корее.",
            welcomeTitle: "Добро пожаловать! 🎉",
            welcomeMsg: "Поделитесь своими драгоценными историями в K-community! K-Pop, путешествия по Корее, еда или любая другая тема приветствуются. Выберите категорию и нажмите «Написать», чтобы пообщаться с друзьями со всего мира.",
            cats: { vote: "Голосование", kpop: "K-Pop", living: "Жизнь", food: "Еда", beauty: "Красота", travel: "Путешествия" },
            titles: { vote: "Рейтинг айдолов", kpop: "K-Pop и шоу-бизнес", living: "Жизнь в Корее", food: "Еда и рецепты", beauty: "K-Beauty и стиль", travel: "Путеводитель" }
        },
        ar: {
            write: "كتابة", loading: "جاري الاتصال...", translating: "جاري الترجمة...",
            trendingTitle: "🔥 شائع الآن", blogTitle: "📖 مدونة كل شيء عن كوريا",
            blogDesc: "استكشف المزيد من القصص العميقة عن كوريا.",
            welcomeTitle: "أهلاً بك! 🎉",
            welcomeMsg: "شارك قصصك الثمينة في K-community! الكيبوب، السفر إلى كوريا، الطعام، أو أي موضوع مرحب به. اختر فئة وانقر على 'كتابة' للتواصل مع الأصدقاء في جميع أنحاء العالم.",
            cats: { vote: "تصويت", kpop: "K-Pop", living: "الحياة", food: "طعام", beauty: "جمال", travel: "سفر" },
            titles: { vote: "تصويت شعبية الآيدولز", kpop: "K-Pop والترفيه", living: "الحياة في كوريا", food: "الطعام والوصفات", beauty: "K-Beauty والأناقة", travel: "دليل السفر" }
        }
    };

    const els = {
        postsContainer: document.getElementById('posts-container'),
        trendingList: document.getElementById('trending-list'),
        trendingTitle: document.getElementById('trending-title'),
        tabs: document.querySelectorAll('.tab'),
        modal: document.getElementById('modal-overlay'),
        welcomePopup: document.getElementById('welcome-popup'),
        welcomeTitle: document.getElementById('welcome-title'),
        welcomeMessage: document.getElementById('welcome-message'),
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
        initCursorFollower();
        checkWelcomePopup();
    }

    function checkWelcomePopup() {
        const welcomeShown = localStorage.getItem('kcon_welcome_shown');
        if (!welcomeShown) {
            const langData = t[currentLang] || t.en;
            els.welcomeTitle.textContent = langData.welcomeTitle;
            els.welcomeMessage.textContent = langData.welcomeMsg;
            els.welcomePopup.classList.add('active');
        }
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

        // Update welcome popup if visible
        if (els.welcomePopup.classList.contains('active')) {
            els.welcomeTitle.textContent = langData.welcomeTitle;
            els.welcomeMessage.textContent = langData.welcomeMsg;
        }
    }

    function renderContent() {
        if (!isConnected) {
            els.postsContainer.innerHTML = `<div style="text-align:center; padding:2rem; color:#888;">${(t[currentLang]||t.en).loading}</div>`;
            return;
        }

        // URL 파라미터 확인 (SEO 및 개별 링크 공유용)
        const urlParams = new URLSearchParams(window.location.search);
        const postId = urlParams.get('id');
        if (postId && !expandedPostId) {
            expandedPostId = postId;
        }

        if (currentCategory === 'vote') renderPoll();
        else renderPosts();
        renderTrending();
    }

    function renderPosts() {
        els.postsContainer.innerHTML = '';
        const filtered = posts.filter(p => p.category === currentCategory);
        
        // 봇을 위한 숨겨진 링크 목록 생성 (SEO 자동화)
        updateCrawlerLinks(filtered);

        if (expandedPostId) {
            const index = filtered.findIndex(p => p.firebaseId === expandedPostId);
            if (index > -1) {
                const selectedPost = filtered.splice(index, 1)[0];
                filtered.unshift(selectedPost);
                updateMetaTags(selectedPost);
                // 구글을 위한 구조화 데이터 추가
                generateStructuredData(selectedPost);
            }
        }
        // ... (이하 동일한 렌더링 로직)

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
            const sourceLang = post.lang || 'ko';

            if (sourceLang !== currentLang) {
                const titleKey = `t_${post.firebaseId}_${currentLang}`;
                const contentKey = `c_${post.firebaseId}_${currentLang}`;
                if (translationCache[titleKey]) {
                    displayTitle = translationCache[titleKey];
                    displayContent = translationCache[contentKey];
                } else {
                    const transMsg = (t[currentLang] || t.en).translating || "Translating...";
                    displayTitle = transMsg;
                    displayContent = transMsg;
                    if (!translatingIds.has(post.firebaseId + currentLang)) {
                        translatingIds.add(post.firebaseId + currentLang);
                        translatePost(post, sourceLang);
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
                        <button class="btn-icon share-post-btn" title="Copy Link">🔗</button>
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
                if (isExp) {
                    expandedPostId = post.firebaseId;
                    // 주소창 변경 (공유 및 SEO용)
                    window.history.pushState({}, '', `?category=${currentCategory}&id=${post.firebaseId}`);
                    await updateDoc(doc(db, "posts", post.firebaseId), { views: increment(1) });
                    updateMetaTags(post);
                } else {
                    expandedPostId = null;
                    window.history.pushState({}, '', `?category=${currentCategory}`);
                }
                renderPosts();
            };

            const shareBtn = el.querySelector('.share-post-btn');
            shareBtn.onclick = (e) => {
                e.stopPropagation();
                const url = `${window.location.origin}${window.location.pathname}?id=${post.firebaseId}`;
                navigator.clipboard.writeText(url).then(() => alert("Link copied to clipboard!"));
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

    function updateMetaTags(post) {
        if (!post) return;
        document.title = `${post.title} | K-community`;
        const metaDesc = document.querySelector('meta[name="description"]');
        if (metaDesc) metaDesc.setAttribute('content', post.content.substring(0, 150));
        
        // Open Graph
        const ogTitle = document.querySelector('meta[property="og:title"]');
        if (ogTitle) ogTitle.setAttribute('content', post.title);
        const ogDesc = document.querySelector('meta[property="og:description"]');
        if (ogDesc) ogDesc.setAttribute('content', post.content.substring(0, 150));
    }

    // 구글 봇을 위한 숨겨진 링크 목록 생성 (sitemap.xml 수동 업데이트 대체)
    function updateCrawlerLinks(filteredPosts) {
        let crawlerDiv = document.getElementById('crawler-links');
        if (!crawlerDiv) {
            crawlerDiv = document.createElement('div');
            crawlerDiv.id = 'crawler-links';
            crawlerDiv.style.display = 'none'; // 사용자에게는 안 보임
            document.body.appendChild(crawlerDiv);
        }
        
        crawlerDiv.innerHTML = filteredPosts.map(p => 
            `<a href="?id=${p.firebaseId}">${p.title}</a>`
        ).join(' ');
    }

    // 구글 검색 결과에 상세 정보를 표시하기 위한 구조화 데이터 생성
    function generateStructuredData(post) {
        const scriptId = 'structured-data-script';
        let script = document.getElementById(scriptId);
        if (!script) {
            script = document.createElement('script');
            script.id = scriptId;
            script.type = 'application/ld+json';
            document.head.appendChild(script);
        }

        const data = {
            "@context": "https://schema.org",
            "@type": "BlogPosting",
            "headline": post.title,
            "description": post.content.substring(0, 150),
            "author": {
                "@type": "Person",
                "name": post.author
            },
            "datePublished": post.createdAt ? new Date(post.createdAt).toISOString() : new Date().toISOString(),
            "url": `${window.location.origin}${window.location.pathname}?id=${post.firebaseId}`
        };
        
        script.text = JSON.stringify(data);
    }

    async function translatePost(post, sourceLang) {
        const titleKey = `t_${post.firebaseId}_${currentLang}`;
        const contentKey = `c_${post.firebaseId}_${currentLang}`;
        
        const cachedTitle = localStorage.getItem(titleKey);
        const cachedContent = localStorage.getItem(contentKey);
        
        if (cachedTitle && cachedContent) {
            translationCache[titleKey] = cachedTitle;
            translationCache[contentKey] = cachedContent;
            renderPosts();
            return;
        }

        try {
            // Use 'auto' to let the API detect the source language automatically
            const [tT, tC] = await Promise.all([
                fetchTranslation(post.title, 'auto', currentLang),
                fetchTranslation(post.content, 'auto', currentLang)
            ]);

            if (tT !== null) {
                localStorage.setItem(titleKey, tT);
                translationCache[titleKey] = tT;
            } else {
                translationCache[titleKey] = post.title;
            }

            if (tC !== null) {
                localStorage.setItem(contentKey, tC);
                translationCache[contentKey] = tC;
            } else {
                translationCache[contentKey] = post.content;
            }

        } catch (e) { 
            console.error("Translation Error:", e);
            translationCache[titleKey] = post.title;
            translationCache[contentKey] = post.content;
        } finally {
            renderPosts();
        }
    }

    async function fetchTranslation(text, source, target) {
        return enqueueTranslation(text, source, target);
    }

    async function fetchTranslationInternal(text, source, target) {
        if (!text || !target) return text;
        if (source === target && source !== 'auto') return text;
        
        // Better cache key for content stability
        const cacheKey = `txt_${target}_${btoa(encodeURIComponent(text.substring(0, 100)))}_${text.length}`; 
        const cached = localStorage.getItem(cacheKey);
        if (cached && cached !== "null") return cached;

        // Split long text into chunks to avoid URL length limits (approx 1000 chars per chunk for safety)
        const maxChunkSize = 1000;
        if (text.length <= maxChunkSize) {
            return await fetchSingleGTX(text, target, cacheKey);
        }

        // Handle long text by chunking
        const chunks = [];
        for (let i = 0; i < text.length; i += maxChunkSize) {
            chunks.push(text.substring(i, i + maxChunkSize));
        }

        try {
            const results = await Promise.all(chunks.map(c => fetchSingleGTX(c, target)));
            if (results.some(r => r === null)) return null;
            const fullResult = results.join('');
            try { localStorage.setItem(cacheKey, fullResult); } catch(e) {}
            return fullResult;
        } catch (e) { return null; }
    }

    async function fetchSingleGTX(text, target, cacheKey = null) {
        const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${target}&dt=t&q=${encodeURIComponent(text)}`;
        try {
            const res = await fetch(url);
            if (!res.ok) return null;
            const data = await res.json();
            if (data && data[0]) {
                let translated = "";
                data[0].forEach(part => { if (part[0]) translated += part[0]; });
                if (translated && cacheKey) {
                    try { localStorage.setItem(cacheKey, translated); } catch(e) {}
                }
                return translated;
            }
            return null;
        } catch (e) { return null; }
    }

    function renderPoll() {
        const lang = t[currentLang] || t.en;
        els.postsContainer.innerHTML = `<div class="poll-grid"></div><div class="request-board"><h3>${lang.reqTitle || "Idol Requests"}</h3><div class="request-input-area"><input type="text" id="req-input" class="request-input" placeholder="${lang.reqPlace}"><button id="btn-submit-req" class="btn btn-primary">${lang.reqBtn || "Request"}</button></div><div class="req-list"></div></div>`;
        const grid = els.postsContainer.querySelector('.poll-grid');
        
        const idols = [
            { key: 'bts', name: 'BTS', img: 'bts.jpg' },
            { key: 'aespa', name: 'Aespa', img: 'aespa.jpg' },
            { key: 'seventeen', name: 'Seventeen', img: 'seventeen.jpg' },
            { key: 'enhypen', name: 'Enhypen', img: 'enhypen.jpg' },
            { key: 'skz', name: 'Stray Kids', img: 'straykids.jpg' },
            { key: 'ive', name: 'IVE', img: 'ive.jpg' },
            { key: 'newjeans', name: 'NewJeans', img: 'newjeans.jpg' },
            { key: 'riize', name: 'RIIZE', img: 'riize.jpg' }
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
            
            let displayText = req.text;
            const sl = req.lang || 'ko';
            if (sl !== currentLang) {
                const key = `req_${req.id}_${currentLang}`;
                if (translationCache[key]) displayText = translationCache[key];
                else {
                    displayText = (t[currentLang] || t.en).translating || "Translating...";
                    // Prevent repeated calls if already requested
                    if (!translatingIds.has(key)) {
                        translatingIds.add(key);
                        fetchTranslation(req.text, sl, currentLang).then(res => {
                            if (res !== null) {
                                translationCache[key] = res;
                            } else {
                                translationCache[key] = req.text; // Fallback
                            }
                            renderPoll();
                        });
                    }
                }
            }

            item.innerHTML = `<span>${displayText} <small>(@${req.author})</small></span>${(isAdmin || req.author === currentUser) ? `<span class="req-delete" style="cursor:pointer">🗑</span>` : ''}`;
            if (item.querySelector('.req-delete')) {
                item.querySelector('.req-delete').onclick = async () => { if(confirm(lang.confirmDelete)) await deleteDoc(doc(db, "requests", req.id)); };
            }
            reqList.appendChild(item);
        });

        els.postsContainer.querySelector('#btn-submit-req').onclick = async () => {
            const inp = document.getElementById('req-input');
            if (inp.value.trim()) {
                await addDoc(collection(db, "requests"), { 
                    text: inp.value.trim(), 
                    author: currentUser, 
                    createdAt: Date.now(),
                    lang: currentLang
                });
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
            const sl = item.lang || 'ko';
            if (sl !== currentLang) {
                const key = `trend_${item.id || item.title}_${currentLang}`;
                if (translationCache[key]) displayTitle = translationCache[key];
                else {
                    displayTitle = (t[currentLang] || t.en).translating || "Translating...";
                    if (!translatingIds.has(key)) {
                        translatingIds.add(key);
                        fetchTranslation(item.title, sl, currentLang).then(res => { 
                            if (res !== null) {
                                translationCache[key] = res; 
                            } else {
                                translationCache[key] = item.title; // Fallback
                            }
                            renderTrending(); 
                        });
                    }
                }
            }
            li.innerHTML = `<div class="trending-rank">${i+1}</div><div class="trending-info"><div class="trending-title">${displayTitle}</div><div class="trending-meta">${item.meta}</div></div>`;
            li.onclick = () => { currentCategory = item.cat; if(item.id) expandedPostId = item.id; updateUI(); renderContent(); };
            els.trendingList.appendChild(li);
        });
    }

    function initCursorFollower() {
        const idolImages = ['bts.jpg', 'aespa.jpg', 'seventeen.jpg', 'enhypen.jpg', 'straykids.jpg', 'ive.jpg', 'newjeans.jpg', 'riize.jpg'];
        const randomImg = idolImages[Math.floor(Math.random() * idolImages.length)];
        
        const follower = document.createElement('div');
        follower.className = 'cursor-character';
        follower.innerHTML = `<img src="${randomImg}" alt="follower">`;
        document.body.appendChild(follower);

        let mouseX = 0, mouseY = 0;
        let charX = 0, charY = 0;
        let lastX = 0;

        document.addEventListener('mousemove', (e) => {
            mouseX = e.clientX;
            mouseY = e.clientY;
        });

        function animate() {
            let dx = mouseX - charX - 30;
            let dy = mouseY - charY - 30;
            
            charX += dx * 0.08;
            charY += dy * 0.08;
            
            let scaleX = 1;
            if (charX > lastX + 0.5) scaleX = 1;
            else if (charX < lastX - 0.5) scaleX = -1;
            
            follower.style.transform = `translate(${charX}px, ${charY}px) scaleX(${scaleX})`;
            lastX = charX;
            
            requestAnimationFrame(animate);
        }
        animate();
    }

    // 인증 상태 감시
    onAuthStateChanged(auth, (user) => {
        if (user && user.email === ADMIN_EMAIL) {
            isAdmin = true;
            currentUser = "운영자";
        } else {
            isAdmin = false;
            currentUser = localStorage.getItem('kcon_user') || 'User_' + Math.floor(Math.random() * 9999);
        }
        updateUI();
        renderContent();
    });

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
        els.btnNick.onclick = async () => { 
            if (isAdmin) {
                if (confirm("운영자 로그아웃 하시겠습니까?")) {
                    await signOut(auth);
                    location.reload();
                }
                return;
            }

            const name = prompt("Nickname (또는 관리자 이메일):"); 
            if (name) { 
                if (name.includes("@")) { 
                    const pw = prompt("Admin Password:");
                    try {
                        await signInWithEmailAndPassword(auth, name, pw);
                        alert("관리자로 인증되었습니다.");
                    } catch (e) {
                        alert("인증 실패: " + e.message);
                    }
                } else {
                    currentUser = name; 
                    localStorage.setItem('kcon_user', name); 
                }
                updateUI(); renderContent();
            } 
        };
        document.getElementById('close-modal').onclick = () => els.modal.classList.remove('active');
        document.getElementById('cancel-post').onclick = () => els.modal.classList.remove('active');
        document.getElementById('close-welcome').onclick = () => {
            els.welcomePopup.classList.remove('active');
            localStorage.setItem('kcon_welcome_shown', 'true');
        };
        els.postForm.onsubmit = async (e) => {
            e.preventDefault();
            const btn = els.postForm.querySelector('button[type="submit"]');
            btn.disabled = true;
            try {
                const newPost = { 
                    category: currentCategory, title: els.postTitle.value, content: els.postContent.value, 
                    author: currentUser, date: new Date().toLocaleDateString(), likes: 0, views: 0, 
                    comments: [], lang: currentLang, images: currentPostImages, createdAt: Date.now()
                };
                const docRef = await addDoc(collection(db, "posts"), newPost);
                
                // --- Search Engine Indexing Request (IndexNow) ---
                notifySearchEngines(docRef.id);

                els.modal.classList.remove('active'); els.postForm.reset(); currentPostImages = [];
            } catch (err) { alert("Error: " + err.message); }
            finally { btn.disabled = false; }
        };

        async function notifySearchEngines(postId) {
            const host = "k-community.pages.dev";
            const postUrl = `https://${host}/board.html?id=${postId}`;
            const key = "7ed8b2c45a914e289d3f1c6b2e0a4f5d";
            
            // IndexNow API call (Bing, Yandex, etc.)
            // Naver also supports IndexNow compatibility.
            const indexNowUrl = `https://www.bing.com/IndexNow?url=${encodeURIComponent(postUrl)}&key=${key}`;
            
            try {
                // Using no-cors mode to avoid preflight issues, as IndexNow supports simple GET
                await fetch(indexNowUrl, { mode: 'no-cors' });
                console.log("Indexing request sent for:", postUrl);
            } catch (e) {
                console.error("Indexing request failed:", e);
            }
        }
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
