document.addEventListener('DOMContentLoaded', () => {
    // --- State ---
    let posts = JSON.parse(localStorage.getItem('kcon_posts')) || getInitialPosts();
    let currentCategory = 'kpop';
    let currentTheme = localStorage.getItem('kcon_theme') || 'light';
    let currentLang = localStorage.getItem('kcon_lang') || 'en';

    const translations = {
        ko: {
            logo: "K-community",
            write: "글쓰기",
            modalTitle: "새 게시글 작성",
            modalEditTitle: "게시글 수정",
            labelCategory: "카테고리",
            labelTitle: "제목",
            labelContent: "내용",
            btnCancel: "취소",
            btnPost: "게시하기",
            btnUpdate: "수정하기",
            placeholderTitle: "제목을 입력하세요",
            placeholderContent: "생각을 공유해 보세요...",
            confirmDelete: "정말 이 게시글을 삭제하시겠습니까?",
            noPosts: "이 언어로 작성된 게시글이 없습니다. 첫 번째 글을 작성해 보세요!",
            categories: {
                kpop: { name: "K-팝 & 엔터", title: "K-Pop & 엔터테인먼트", desc: "K-Pop과 한국 연예계의 최신 소식을 만나보세요." },
                living: { name: "한국 생활", title: "한국 생활", desc: "한국 생활에 필요한 팁과 유용한 정보, 일상을 공유합니다." },
                food: { name: "음식 & 레시피", title: "한국 음식 & 레시피", desc: "맛있는 한국 음식 레시피와 맛집 정보를 발견해 보세요." },
                beauty: { name: "뷰티 & 스킨케어", title: "K-뷰티 & 스킨케어", desc: "K-뷰티의 비밀과 효과적인 스킨케어 루틴을 확인하세요." },
                travel: { name: "여행 & 명소", title: "한국 여행 & 숨은 명소", desc: "한국 곳곳의 유명 랜드마크와 숨겨진 보석 같은 명소를 탐험하세요." }
            }
        },
        en: {
            logo: "K-community",
            write: "Write Post",
            modalTitle: "Create New Post",
            modalEditTitle: "Edit Post",
            labelCategory: "Category",
            labelTitle: "Title",
            labelContent: "Content",
            btnCancel: "Cancel",
            btnPost: "Post to K-community",
            btnUpdate: "Update Post",
            placeholderTitle: "Enter post title",
            placeholderContent: "Share your thoughts...",
            confirmDelete: "Are you sure you want to delete this post?",
            noPosts: "No posts in this language yet. Be the first to write one!",
            categories: {
                kpop: { name: "K-Pop & Ent", title: "K-Pop & Entertainment", desc: "The latest from the world of K-Pop and Korean entertainment." },
                living: { name: "Living in Korea", title: "Living in Korea", desc: "Tips, advice, and stories about living in the Land of the Morning Calm." },
                food: { name: "Food & Recipes", title: "Food & Recipes", desc: "Discover delicious Korean recipes and the best places to eat." },
                beauty: { name: "Beauty & Skincare", title: "Beauty & Skincare", desc: "Unlock the secrets of K-Beauty and effective skincare routines." },
                travel: { name: "Travel & Spots", title: "Travel & Hidden Spots", desc: "Explore famous landmarks and hidden gems across South Korea." }
            }
        },
        ja: {
            logo: "K-community",
            write: "投稿する",
            modalTitle: "新規投稿作成",
            modalEditTitle: "投稿を編集",
            labelCategory: "カテゴリー",
            labelTitle: "タイトル",
            labelContent: "内容",
            btnCancel: "キャンセル",
            btnPost: "投稿する",
            btnUpdate: "更新する",
            placeholderTitle: "タイトルを入力してください",
            placeholderContent: "あなたの考えを共有しましょう...",
            confirmDelete: "この投稿を削除してもよろしいですか？",
            noPosts: "この言語の投稿はまだありません。最初の投稿をしてみましょう！",
            categories: {
                kpop: { name: "K-POP & 芸能", title: "K-POP & エンターテインメント", desc: "K-POPと韓国芸能界의最新ニュースをお届けします。" },
                living: { name: "韓国生活", title: "韓国生活", desc: "韓国での生活に関するヒント、アドバイス、ストーリーをご紹介します。" },
                food: { name: "料理 & レシ피", title: "料理 & レシピ", desc: "美味しい韓国料理のレシピやおすすめの飲食店を見つけましょう。" },
                beauty: { name: "ビューティー", title: "K-ビューティー & スキンケア", desc: "K-ビューティーの秘密と効果的なスキンケア法をチェックしましょう。" },
                travel: { name: "旅行 & スポット", title: "韓国旅行 & 穴場スポット", desc: "韓国各地の有名なランドマークや隠れた名所を探索しましょう。" }
            }
        },
        zh: {
            logo: "K-community",
            write: "发布文章",
            modalTitle: "创建新文章",
            modalEditTitle: "编辑文章",
            labelCategory: "类别",
            labelTitle: "标题",
            labelContent: "内容",
            btnCancel: "取消",
            btnPost: "发布到 K-community",
            btnUpdate: "更新文章",
            placeholderTitle: "输入文章标题",
            placeholderContent: "分享你的想法...",
            confirmDelete: "你确定要删除这文章吗？",
            noPosts: "该语言下暂无文章。快来发布第一篇吧！",
            categories: {
                kpop: { name: "K-Pop & 娱乐", title: "K-Pop & 娱乐", desc: "来自 K-Pop 和韩国娱乐界的最新动态。" },
                living: { name: "在韩生活", title: "在韩生活", desc: "关于在韩国生活的提示、建议和故事。" },
                food: { name: "美食 & 食谱", title: "美食 & 食谱", desc: "发现美味的韩国食谱和最佳就餐去处。" },
                beauty: { name: "美妆 & 护肤", title: "K-美妆 & 护肤", desc: "揭秘 K-Beauty 的秘密和有效的护肤程序。" },
                travel: { name: "旅游 & 景点", title: "韩国旅游 & 隐藏景点", desc: "探索韩国各地的著名地标和隐藏瑰宝。" }
            }
        },
        es: {
            logo: "K-community",
            write: "Publicar",
            modalTitle: "Crear Nueva Publicación",
            modalEditTitle: "Editar Publicación",
            labelCategory: "Categoría",
            labelTitle: "Título",
            labelContent: "Contenido",
            btnCancel: "Cancelar",
            btnPost: "Publicar en K-community",
            btnUpdate: "Actualizar",
            placeholderTitle: "Ingrese el título",
            placeholderContent: "Comparte tus pensamientos...",
            confirmDelete: "¿Estás seguro de que quieres eliminar esta publicación?",
            noPosts: "Aún no hay publicaciones en este idioma. ¡Sé el primero en escribir!",
            categories: {
                kpop: { name: "K-Pop y Ent", title: "K-Pop y Entretenimiento", desc: "Lo último del mundo del K-Pop y el entretenimiento coreano." },
                living: { name: "Vivir en Corea", title: "Vivir en Corea", desc: "Consejos, recomendaciones e historias sobre la vida en Corea." },
                food: { name: "Comida y Recetas", title: "Comida y Recetas", desc: "Descubre deliciosas recetas coreanas y los mejores lugares para comer." },
                beauty: { name: "Belleza y Piel", title: "Belleza y Cuidado de la Piel", desc: "Descubre los secretos de la K-Beauty y rutinas efectivas." },
                travel: { name: "Viajes y Lugares", title: "Viajes y Lugares Ocultos", desc: "Explora monumentos famosos y gemas ocultas en Corea del Sur." }
            }
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
    const modalHeaderTitle = document.querySelector('.modal-header h3');
    const closeModal = document.getElementById('close-modal');
    const cancelPost = document.getElementById('cancel-post');
    const postForm = document.getElementById('post-form');
    const postIdInput = document.getElementById('post-id');
    const submitBtn = postForm.querySelector('button[type="submit"]');
    const logoLink = document.getElementById('logo-link');
    const langSwitcher = document.getElementById('lang-switcher');

    // --- Initialization ---
    applyTheme(currentTheme);
    updateLanguage(currentLang);
    renderPosts();

    // --- Functions ---

    function getInitialPosts() {
        return [
            // English Posts
            { id: 1, lang: 'en', category: 'kpop', title: 'Aespa\'s New Album is Incredible!', content: 'I just listened to the whole album and the production quality is through the roof.', author: 'KPopFan99', date: new Date().toLocaleDateString() },
            { id: 2, lang: 'en', category: 'living', title: 'Best districts for expats in Seoul?', content: 'Moving to Seoul next month. Any advice?', author: 'SeoulBound', date: new Date().toLocaleDateString() },
            // Korean Posts
            { id: 3, lang: 'ko', category: 'kpop', title: '에스파 신곡 너무 좋아요!', content: '이번 앨범 수록곡까지 전부 취향저격이네요. 여러분은 어떤 곡이 제일 좋나요?', author: '한국팬', date: new Date().toLocaleDateString() },
            { id: 4, lang: 'ko', category: 'food', title: '서울 최고의 떡볶이 맛집 추천', content: '종로에 있는 작은 가게인데 정말 맵고 맛있어요.', author: '맛집탐방가', date: new Date().toLocaleDateString() },
            // Japanese Post
            { id: 5, lang: 'ja', category: 'travel', title: 'ソウルの隠れた名所', content: '北村韓屋村の裏通りがとても静かで綺麗でした。', author: '日本旅人', date: new Date().toLocaleDateString() },
            // Chinese Post
            { id: 6, lang: 'zh', category: 'beauty', title: '推荐韩国护肤品', content: '最近用了这款面霜，效果真的很棒！', author: '爱美之人', date: new Date().toLocaleDateString() },
            // Spanish Post
            { id: 7, lang: 'es', category: 'food', title: 'Mejor comida coreana', content: 'El Bibimbap es mi plato favorito. ¿Dónde puedo comer el mejor?', author: 'ViajeroES', date: new Date().toLocaleDateString() }
        ];
    }

    function renderPosts() {
        postsContainer.innerHTML = '';
        // Filter by Category AND Language
        const filteredPosts = posts.filter(post => 
            post.category === currentCategory && 
            (post.lang === currentLang || !post.lang) // Compatibility for old posts without lang
        );

        if (filteredPosts.length === 0) {
            postsContainer.innerHTML = `<div class="post-card"><p>${translations[currentLang].noPosts}</p></div>`;
            return;
        }

        const sortedPosts = [...filteredPosts].sort((a, b) => b.id - a.id);

        sortedPosts.forEach(post => {
            const postElement = document.createElement('article');
            postElement.className = 'post-card';
            postElement.innerHTML = `
                <div class="post-header">
                    <div class="post-meta">
                        <span>@${post.author}</span>
                        <span>•</span>
                        <span>${post.date}</span>
                    </div>
                    <div class="post-actions">
                        <button class="btn-icon edit" data-id="${post.id}" title="Edit">✎</button>
                        <button class="btn-icon delete" data-id="${post.id}" title="Delete">🗑</button>
                    </div>
                </div>
                <h3 class="post-title">${post.title}</h3>
                <div class="post-content">${post.content}</div>
            `;
            postsContainer.appendChild(postElement);
        });

        // Add Listeners for Edit/Delete
        postsContainer.querySelectorAll('.edit').forEach(btn => {
            btn.addEventListener('click', (e) => editPost(parseInt(e.target.dataset.id)));
        });
        postsContainer.querySelectorAll('.delete').forEach(btn => {
            btn.addEventListener('click', (e) => deletePost(parseInt(e.target.dataset.id)));
        });
    }

    function updateLanguage(lang) {
        currentLang = lang;
        localStorage.setItem('kcon_lang', lang);

        // Update active class on switcher
        document.querySelectorAll('.lang-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.lang === lang);
        });

        const t = translations[lang];

        // Update Header & Static UI
        btnWrite.textContent = t.write;
        logoLink.textContent = t.logo;
        
        // Update Tabs
        const tabs = document.querySelectorAll('.tab');
        tabs.forEach(tab => {
            const cat = tab.dataset.category;
            tab.textContent = t.categories[cat].name;
        });

        // Update Current Category Info
        categoryTitle.textContent = t.categories[currentCategory].title;
        categoryDesc.textContent = t.categories[currentCategory].desc;

        // Update Modal labels
        modalHeaderTitle.textContent = postIdInput.value ? t.modalEditTitle : t.modalTitle;
        document.querySelector('label[for="post-category"]').textContent = t.labelCategory;
        document.querySelector('label[for="post-title"]').textContent = t.labelTitle;
        document.querySelector('label[for="post-content"]').textContent = t.labelContent;
        document.getElementById('post-title').placeholder = t.placeholderTitle;
        document.getElementById('post-content').placeholder = t.placeholderContent;
        cancelPost.textContent = t.btnCancel;
        submitBtn.textContent = postIdInput.value ? t.btnUpdate : t.btnPost;

        // Re-render posts to update empty message and filter by new lang
        renderPosts();
    }

    function editPost(id) {
        const post = posts.find(p => p.id === id);
        if (!post) return;

        postIdInput.value = post.id;
        document.getElementById('post-category').value = post.category;
        document.getElementById('post-title').value = post.title;
        document.getElementById('post-content').value = post.content;

        updateLanguage(currentLang); // Update modal title/button text
        openModal();
    }

    function deletePost(id) {
        if (confirm(translations[currentLang].confirmDelete)) {
            posts = posts.filter(p => p.id !== id);
            savePosts();
            renderPosts();
        }
    }

    function applyTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('kcon_theme', theme);
    }

    function savePosts() {
        localStorage.setItem('kcon_posts', JSON.stringify(posts));
    }

    // --- Event Listeners ---

    langSwitcher.addEventListener('click', (e) => {
        const btn = e.target.closest('.lang-btn');
        if (btn) updateLanguage(btn.dataset.lang);
    });

    categoryTabs.addEventListener('click', (e) => {
        const tab = e.target.closest('.tab');
        if (!tab) return;
        document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        currentCategory = tab.dataset.category;
        updateLanguage(currentLang);
    });

    themeToggle.addEventListener('click', () => {
        currentTheme = currentTheme === 'light' ? 'dark' : 'light';
        applyTheme(currentTheme);
    });

    const openModal = () => modalOverlay.classList.add('active');
    const hideModal = () => {
        modalOverlay.classList.remove('active');
        postForm.reset();
        postIdInput.value = '';
        updateLanguage(currentLang);
    };

    btnWrite.addEventListener('click', openModal);
    closeModal.addEventListener('click', hideModal);
    cancelPost.addEventListener('click', hideModal);
    modalOverlay.addEventListener('click', (e) => { if (e.target === modalOverlay) hideModal(); });

    postForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const id = postIdInput.value;
        const postData = {
            category: document.getElementById('post-category').value,
            title: document.getElementById('post-title').value,
            content: document.getElementById('post-content').value,
        };

        if (id) {
            // Update
            const index = posts.findIndex(p => p.id === parseInt(id));
            if (index !== -1) {
                posts[index] = { ...posts[index], ...postData };
            }
        } else {
            // Create
            posts.push({
                id: Date.now(),
                ...postData,
                lang: currentLang, // Tag with current UI language
                author: 'User_' + Math.floor(Math.random() * 1000),
                date: new Date().toLocaleDateString()
            });
        }

        savePosts();
        currentCategory = postData.category;
        
        // Update active tab UI
        document.querySelectorAll('.tab').forEach(t => t.classList.toggle('active', t.dataset.category === currentCategory));
        
        updateLanguage(currentLang);
        hideModal();
    });

    logoLink.addEventListener('click', () => {
        const firstTab = document.querySelector('.tab');
        if (firstTab) firstTab.click();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });
});
