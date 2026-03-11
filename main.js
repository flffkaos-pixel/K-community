document.addEventListener('DOMContentLoaded', () => {
    // --- State ---
    let currentUser = localStorage.getItem('kcon_user');
    if (!currentUser) {
        currentUser = 'User_' + Math.floor(Math.random() * 1000);
        localStorage.setItem('kcon_user', currentUser);
    }

    let likedPosts = JSON.parse(localStorage.getItem('kcon_liked')) || [];
    
    // FORCE RESET: Clear posts for fresh start (v6)
    const resetVersion = "v6";
    if (localStorage.getItem('kcon_posts_version') !== resetVersion) {
        localStorage.removeItem('kcon_posts');
        localStorage.setItem('kcon_posts_version', resetVersion);
    }

    let rawPosts = JSON.parse(localStorage.getItem('kcon_posts'));
    
    if (!rawPosts) {
        rawPosts = []; // Return empty array instead of generating posts
        localStorage.setItem('kcon_posts', JSON.stringify(rawPosts));
    }
    
    let posts = rawPosts;
    let currentCategory = 'kpop';
    let currentTheme = localStorage.getItem('kcon_theme') || 'light';
    let currentLang = localStorage.getItem('kcon_lang') || 'en';
    let currentPostImage = null;
    let expandedPostId = null;
    
    let currentPage = 1;
    const pageSize = 10;

    const translations = {
        ko: {
            logo: "K-community", write: "글쓰기", modalTitle: "새 게시글 작성", modalEditTitle: "게시글 수정",
            labelCategory: "카테고리", labelTitle: "제목", labelContent: "내용", labelImage: "사진 추가",
            btnCancel: "취소", btnPost: "게시하기", btnUpdate: "수정하기", placeholderTitle: "제목을 입력하세요",
            placeholderContent: "생각을 공유해 보세요...", confirmDelete: "정말 이 게시글을 삭제하시겠습니까?",
            confirmDeleteComment: "이 댓글을 삭제하시겠습니까?", noPosts: "이 카테고리에 게시글이 없습니다.",
            labelComments: "댓글", btnSendComment: "등록", placeholderComment: "댓글을 입력하세요...", loggedInAs: "내 아이디: ",
            prev: "이전", next: "다음", page: "페이지",
            categories: {
                kpop: { name: "K-팝 & 엔터", title: "K-Pop & 엔터테인먼트", desc: "K-Pop과 한국 연예계의 최신 소식을 만나보세요." },
                living: { name: "한국 생활", title: "한국 생활", desc: "한국 생활에 필요한 팁과 유용한 정보, 일상을 공유합니다." },
                food: { name: "음식 & 레시피", title: "한국 음식 & 레시피", desc: "맛있는 한국 음식 레시피와 맛집 정보를 발견해 보세요." },
                beauty: { name: "뷰티 & 스킨케어", title: "K-뷰티 & 스킨케어", desc: "K-뷰티의 비밀과 효과적인 스킨케어 루틴을 확인하세요." },
                travel: { name: "여행 & 명소", title: "한국 여행 & 숨은 명소", desc: "한국 곳곳의 유명 랜드마크와 숨겨진 보석 같은 명소를 탐험하세요." }
            }
        },
        en: {
            logo: "K-community", write: "Write Post", modalTitle: "Create New Post", modalEditTitle: "Edit Post",
            labelCategory: "Category", labelTitle: "Title", labelContent: "Content", labelImage: "Add Image",
            btnCancel: "Cancel", btnPost: "Post to K-community", btnUpdate: "Update Post", placeholderTitle: "Enter post title",
            placeholderContent: "Share your thoughts...", confirmDelete: "Are you sure you want to delete this post?",
            confirmDeleteComment: "Delete this comment?", noPosts: "No posts in this category yet.",
            labelComments: "Comments", btnSendComment: "Post", placeholderComment: "Write a comment...", loggedInAs: "Logged in as: ",
            prev: "Prev", next: "Next", page: "Page",
            categories: {
                kpop: { name: "K-Pop & Ent", title: "K-Pop & Entertainment", desc: "The latest from the world of K-Pop and Korean entertainment." },
                living: { name: "Living in Korea", title: "Living in Korea", desc: "Tips, advice, and stories about living in the Land of the Morning Calm." },
                food: { name: "Food & Recipes", title: "Food & Recipes", desc: "Discover delicious Korean recipes and the best places to eat." },
                beauty: { name: "Beauty & Skincare", title: "Beauty & Skincare", desc: "Unlock the secrets of K-Beauty and effective skincare routines." },
                travel: { name: "Travel & Spots", title: "Travel & Hidden Spots", desc: "Explore famous landmarks and hidden gems across South Korea." }
            }
        },
        ja: {
            logo: "K-community", write: "投稿する", modalTitle: "新規投稿作成", modalEditTitle: "投稿を編集",
            labelCategory: "カテゴリー", labelTitle: "タイトル", labelContent: "内容", labelImage: "写真を追加",
            btnCancel: "キャンセル", btnPost: "投稿する", btnUpdate: "更新する", placeholderTitle: "タイトルを入力してください",
            placeholderContent: "あなたの考えを共有しましょう...", confirmDelete: "この投稿を削除してもよろしいですか？",
            confirmDeleteComment: "このコメントを削除しますか？", noPosts: "このカテゴリーにはまだ投稿がありません。",
            labelComments: "コメント", btnSendComment: "送信", placeholderComment: "コメントを書く...", loggedInAs: "ログイン中: ",
            prev: "前へ", next: "次へ", page: "ページ",
            categories: {
                kpop: { name: "K-POP & 芸能", title: "K-POP & エンターテインメント", desc: "K-POPと韓国芸能界の最新ニュースをお届けします。" },
                living: { name: "韓国生活", title: "韓国生活", desc: "韓国での生活に関するヒント、アドバイス、ストーリーをご紹介します。" },
                food: { name: "料理 & レシピ", title: "料理 & レシピ", desc: "美味しい韓国料理のレシピやおすすめの飲食店を見つけましょう。" },
                beauty: { name: "ビューティー", title: "K-ビューティー & スキンケア", desc: "K-ビューティーの秘密と効果的なスキンケア法をチェックしましょう。" },
                travel: { name: "旅行 & スポット", title: "韓国旅行 & 穴場スポット", desc: "韓国各地の有名なランドマークや隠れた名所を探索しましょう。" }
            }
        },
        zh: {
            logo: "K-community", write: "发布文章", modalTitle: "创建新文章", modalEditTitle: "编辑文章",
            labelCategory: "类别", labelTitle: "标题", labelContent: "内容", labelImage: "添加图片",
            btnCancel: "取消", btnPost: "发布到 K-community", btnUpdate: "更新文章", placeholderTitle: "输入文章标题",
            placeholderContent: "分享你的想法...", confirmDelete: "你确定要删除这文章吗？",
            confirmDeleteComment: "确定要删除这条评论吗？", noPosts: "该类别下暂无文章。",
            labelComments: "评论", btnSendComment: "发布", placeholderComment: "写下你的评论...", loggedInAs: "当前用户: ",
            prev: "上一页", next: "下一页", page: "页",
            categories: {
                kpop: { name: "K-Pop & 娱乐", title: "K-Pop & 娱乐", desc: "来自 K-Pop 和韩国娱乐界的最新动态。" },
                living: { name: "在韩生活", title: "在韩生活", desc: "关于在韩国生活的提示、建议和故事。" },
                food: { name: "美食 & 食谱", title: "美食 & 食谱", desc: "发现美味的韩国食谱和最佳就餐去处。" },
                beauty: { name: "美妆 & 护肤", title: "K-美妆 & 护肤", desc: "揭秘 K-Beauty 的秘密和有效的护肤程序。" },
                travel: { name: "旅游 & 景点", title: "韩国旅游 & 隐藏景点", desc: "探索韩国各地的著名地标和隐藏瑰宝。" }
            }
        },
        es: {
            logo: "K-community", write: "Publicar", modalTitle: "Crear Nueva Publicación", modalEditTitle: "Editar Publicación",
            labelCategory: "Categoría", labelTitle: "Título", labelContent: "Contenido", labelImage: "Añadir Imagen",
            btnCancel: "Cancelar", btnPost: "Publicar en K-community", btnUpdate: "Actualizar", placeholderTitle: "Ingrese el título",
            placeholderContent: "Comparte tus pensamientos...", confirmDelete: "¿Estás seguro de que quieres eliminar esta publicación?",
            confirmDeleteComment: "¿Eliminar este comentario?", noPosts: "Aún no hay publicaciones en esta categoría.",
            labelComments: "Comentarios", btnSendComment: "Enviar", placeholderComment: "Escribe un comentario...", loggedInAs: "Usuario: ",
            prev: "Ant", next: "Sig", page: "Página",
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
    const postImageInput = document.getElementById('post-image');
    const imagePreview = document.getElementById('image-preview');
    const submitBtn = postForm.querySelector('button[type="submit"]');
    const logoLink = document.getElementById('logo-link');
    const langSwitcher = document.getElementById('lang-switcher');
    const userDisplay = document.getElementById('user-display');

    const mainContent = document.querySelector('.content-container');
    const paginationContainer = document.createElement('div');
    paginationContainer.className = 'pagination-container';
    paginationContainer.style.cssText = 'display: flex; justify-content: center; gap: 1rem; margin-top: 2rem; align-items: center; padding-bottom: 2rem;';
    mainContent.appendChild(paginationContainer);

    // --- Initialization ---
    applyTheme(currentTheme);
    updateLanguage(currentLang);
    renderPosts();

    // --- Functions ---

    function getInitialPosts() {
        const generatedPosts = [];
        const categories = ['kpop', 'living', 'food', 'beauty', 'travel'];
        
        const contentData = {
            kpop: [
                { ko: "뉴진스의 새로운 콜라보레이션 소식!", en: "New Jeans' New Collaboration News!", ja: "New Jeansの新しいコラボニュース！", zh: "New Jeans 新合作消息！", es: "¡Nuevas noticias de colaboración de New Jeans!" },
                { ko: "BTS 부산 콘서트 세트리스트 공유", en: "BTS Busan Concert Setlist Share", ja: "BTS釜山コンサートのセットリスト共有", zh: "BTS 釜山演唱会歌单分享", es: "Compartir lista de canciones del concierto de BTS en Busan" },
                { ko: "에스파 'Supernova' 가사 해석", en: "Aespa 'Supernova' Lyrics Analysis", ja: "Aespa「Supernova」歌詞の解釈", zh: "Aespa 'Supernova' 歌词解析", es: "Análisis de la letra de 'Supernova' de Aespa" }
            ],
            living: [
                { ko: "마포구에서 반려동물과 살기 좋은 동네", en: "Pet-friendly neighborhoods in Mapo-gu", ja: "麻浦区でペットと暮らしやすい街", zh: "麻浦区适合宠物居住的社区", es: "Barrios aptos para mascotas en Mapo-gu" },
                { ko: "외국인을 위한 건강보험 가이드", en: "Health Insurance Guide for Expats", ja: "外国人のための健康保険ガイド", zh: "外籍人士健康保险指南", es: "Guía de seguro médico para expatriados" },
                { ko: "한국에서 은행 계좌 개설하는 법", en: "How to open a bank account in Korea", ja: "韓国で銀行口座を開設する方法", zh: "如何在韩国开设银行账户", es: "Cómo abrir una cuenta bancaria en Corea" }
            ],
            food: [
                { ko: "김치찌개 맛있게 끓이는 비법", en: "Secret to Delicious Kimchi Jjigae", ja: "キムチチゲを美味しく作る秘訣", zh: "美味泡菜汤的秘诀", es: "Secreto para un delicioso Kimchi Jjigae" },
                { ko: "서울의 숨겨진 떡볶이 맛집들", en: "Hidden Tteokbokki Spots in Seoul", ja: "ソウルの隠れたトッポッキの名店", zh: "首尔隐藏的辣炒年糕店", es: "Lugares ocultos de Tteokbokki en Seúl" },
                { ko: "전통 시장에서 꼭 먹어야 할 음식", en: "Must-eat food at Traditional Markets", ja: "伝統市場で必ず食べるべき料理", zh: "传统市场必吃美食", es: "Comida imprescindible en los mercados tradicionales" }
            ],
            beauty: [
                { ko: "유리 피부를 위한 10단계 스킨케어", en: "10-Step Skincare for Glass Skin", ja: "ガラス肌のための10ステップスキンケア", zh: "打造玻璃肌的10步护肤法", es: "Cuidado de la piel de 10 pasos para una piel de cristal" },
                { ko: "올리브영에서 꼭 사야 할 아이템 5가지", en: "5 Must-buy items at Olive Young", ja: "オリーブヤングで必ず買うべき5つのアイテム", zh: "欧利芙洋必买的5件单品", es: "5 artículos imprescindibles en Olive Young" },
                { ko: "한국의 최신 메이크업 트렌드", en: "Latest Makeup Trends in Korea", ja: "韓国の最新メイクアップトレンド", zh: "韩国最新化妆趋势", es: "Últimas tendencias de maquillaje en Corea" }
            ],
            travel: [
                { ko: "익선동의 숨겨진 골목길 탐방", en: "Hidden Alleys of Ikseon-dong", ja: "益善洞の隠れた路地裏探訪", zh: "探访益善洞隐藏的小巷", es: "Explorando los callejones ocultos de Ikseon-dong" },
                { ko: "제주도 렌터카 여행 꿀팁", en: "Jeju Island Car Rental Tips", ja: "済州島レンタカー旅行のコツ", zh: "济州岛租车旅行秘诀", es: "Consejos para alquilar un coche en la isla de Jeju" },
                { ko: "경복궁 야간 개장 관람 후기", en: "Review of Gyeongbokgung Night Opening", ja: "景福宮夜間特別観覧のレビュー", zh: "景福宫夜间开放观赏心得", es: "Reseña de la apertura nocturna de Gyeongbokgung" }
            ]
        };

        const authors = ["AlexJ", "Minji_SEOUL", "Yuki_99", "Li_Wei", "Carlos_ES"];

        const bodyTemplates = {
            ko: "이 포스트는 한국의 {cat}에 대한 유용한 정보를 담고 있습니다. 주제: {title}. 궁금한 점은 댓글로 남겨주세요!",
            en: "This post contains useful information about {cat} in Korea. Topic: {title}. Feel free to leave a comment!",
            ja: "このポストは韓国の {cat} に関する有益な情報を含んでいます。テーマ: {title}。気になる点はコメント欄にお願いします！",
            zh: "这篇文章包含有关韩国 {cat} 的有用信息。主题：{title}。如有任何问题，请在评论区留言！",
            es: "Esta publicación contiene información útil sobre {cat} en Corea. Tema: {title}. ¡No dudes en dejar un comentario!"
        };

        let postId = 1;
        categories.forEach(cat => {
            for (let i = 0; i < 30; i++) {
                const titleObj = contentData[cat][i % contentData[cat].length];
                const author = authors[i % authors.length];
                const date = new Date(Date.now() - Math.floor(Math.random() * 1000000000)).toLocaleDateString();
                
                const contents = {};
                ['ko', 'en', 'ja', 'zh', 'es'].forEach(l => {
                    contents[l] = bodyTemplates[l].replace('{cat}', cat).replace('{title}', titleObj[l]);
                });

                generatedPosts.push({
                    id: postId++,
                    category: cat,
                    titles: titleObj,
                    contents: contents,
                    author: author,
                    date: date,
                    comments: [],
                    views: Math.floor(Math.random() * 500) + 50,
                    likes: Math.floor(Math.random() * 100) + 10
                });
            }
        });

        return generatedPosts;
    }

    function renderPosts() {
        postsContainer.innerHTML = '';
        const filteredPosts = posts.filter(post => post.category === currentCategory);

        if (filteredPosts.length === 0) {
            postsContainer.innerHTML = `<div class="post-card"><p>${translations[currentLang].noPosts}</p></div>`;
            paginationContainer.innerHTML = '';
            return;
        }

        const sortedPosts = [...filteredPosts].sort((a, b) => b.id - a.id);
        const totalPages = Math.ceil(sortedPosts.length / pageSize);
        if (currentPage > totalPages) currentPage = totalPages;
        if (currentPage < 1) currentPage = 1;

        const startIdx = (currentPage - 1) * pageSize;
        const pagedPosts = sortedPosts.slice(startIdx, startIdx + pageSize);

        pagedPosts.forEach(post => {
            const postElement = document.createElement('article');
            postElement.className = 'post-card';
            if (post.id === expandedPostId) postElement.classList.add('expanded');
            postElement.dataset.id = post.id;
            
            // Critical Fix: Explicitly use currentLang
            const displayTitle = post.titles ? post.titles[currentLang] : post.title;
            const displayContent = post.contents ? post.contents[currentLang] : post.content;

            let imageHtml = '';
            if (post.image) {
                imageHtml = `<div class="post-image-container"><img src="${post.image}" alt="Post image"></div>`;
            }

            let commentsHtml = '';
            if (post.comments) {
                post.comments.forEach(comment => {
                    const isCommentAuthor = comment.author === currentUser;
                    commentsHtml += `
                        <div class="comment-item">
                            <div class="comment-header">
                                <span>@${comment.author} • ${comment.date}</span>
                                <div class="comment-actions">
                                    ${isCommentAuthor ? `<button class="btn-icon delete-comment" data-post-id="${post.id}" data-comment-id="${comment.id}">🗑</button>` : ''}
                                </div>
                            </div>
                            <div class="comment-content">${comment.text}</div>
                        </div>
                    `;
                });
            }

            const isPostAuthor = post.author === currentUser;
            const isLiked = likedPosts.includes(post.id);

            postElement.innerHTML = `
                <div class="post-header">
                    <h3 class="post-title">${displayTitle}</h3>
                    <div class="post-actions">
                        <button class="btn-icon like-btn ${isLiked ? 'active' : ''}" data-id="${post.id}">${isLiked ? '❤️' : '🤍'} ${post.likes || 0}</button>
                        ${isPostAuthor ? `
                            <button class="btn-icon edit" data-id="${post.id}" title="Edit">✎</button>
                            <button class="btn-icon delete" data-id="${post.id}" title="Delete">🗑</button>
                        ` : ''}
                    </div>
                </div>
                <div class="post-meta" style="margin-bottom: 0.5rem;">
                    <span>@${post.author}</span>
                    <span>•</span>
                    <span>${post.date}</span>
                    <span style="margin-left: auto;">👁 ${post.views || 0}</span>
                </div>
                <div class="post-content">${displayContent}</div>
                ${imageHtml}
                <div class="comments-section">
                    <h4 style="font-size: 0.9rem; margin-bottom: 0.75rem;">${translations[currentLang].labelComments} (${post.comments ? post.comments.length : 0})</h4>
                    <div class="comments-list">${commentsHtml}</div>
                    <div class="comment-input-area" onclick="event.stopPropagation();">
                        <input type="text" class="comment-input" placeholder="${translations[currentLang].placeholderComment}" data-post-id="${post.id}">
                        <button class="btn btn-primary add-comment-btn" data-post-id="${post.id}" style="padding: 0.4rem 0.8rem; font-size: 0.8rem;">${translations[currentLang].btnSendComment}</button>
                    </div>
                </div>
            `;
            
            postElement.addEventListener('click', (e) => {
                if (e.target.closest('.post-actions') || e.target.closest('.comment-input-area') || e.target.closest('.delete-comment')) return;
                const isExpanding = !postElement.classList.contains('expanded');
                document.querySelectorAll('.post-card').forEach(card => card.classList.remove('expanded'));
                if (isExpanding) {
                    postElement.classList.add('expanded');
                    expandedPostId = post.id;
                    incrementViews(post.id);
                } else {
                    expandedPostId = null;
                }
            });

            postsContainer.appendChild(postElement);
        });

        renderPagination(totalPages);

        // Event Listeners
        postsContainer.querySelectorAll('.like-btn').forEach(btn => btn.addEventListener('click', (e) => { e.stopPropagation(); toggleLike(parseInt(e.target.closest('.like-btn').dataset.id)); }));
        postsContainer.querySelectorAll('.edit').forEach(btn => btn.addEventListener('click', (e) => { e.stopPropagation(); editPost(parseInt(e.target.dataset.id)); }));
        postsContainer.querySelectorAll('.delete').forEach(btn => btn.addEventListener('click', (e) => { e.stopPropagation(); deletePost(parseInt(e.target.dataset.id)); }));
        postsContainer.querySelectorAll('.add-comment-btn').forEach(btn => btn.addEventListener('click', (e) => { e.stopPropagation(); const pid = parseInt(e.target.getAttribute('data-post-id')); const input = postsContainer.querySelector(`.comment-input[data-post-id="${pid}"]`); addComment(pid, input.value); }));
        postsContainer.querySelectorAll('.comment-input').forEach(input => input.addEventListener('keypress', (e) => { if (e.key === 'Enter') { e.stopPropagation(); const pid = parseInt(e.target.getAttribute('data-post-id')); addComment(pid, e.target.value); } }));
        postsContainer.querySelectorAll('.delete-comment').forEach(btn => btn.addEventListener('click', (e) => { e.stopPropagation(); const pid = parseInt(e.target.getAttribute('data-post-id')); const cid = parseInt(e.target.getAttribute('data-comment-id')); deleteComment(pid, cid); }));
    }

    function renderPagination(totalPages) {
        paginationContainer.innerHTML = '';
        if (totalPages <= 1) return;
        const t = translations[currentLang];
        const prevBtn = document.createElement('button');
        prevBtn.className = 'btn btn-secondary';
        prevBtn.textContent = t.prev;
        prevBtn.disabled = currentPage === 1;
        prevBtn.onclick = () => { currentPage--; renderPosts(); window.scrollTo(0, 0); };
        const nextBtn = document.createElement('button');
        nextBtn.className = 'btn btn-secondary';
        nextBtn.textContent = t.next;
        nextBtn.disabled = currentPage === totalPages;
        nextBtn.onclick = () => { currentPage++; renderPosts(); window.scrollTo(0, 0); };
        const pageInfo = document.createElement('span');
        pageInfo.textContent = `${t.page} ${currentPage} / ${totalPages}`;
        paginationContainer.appendChild(prevBtn);
        paginationContainer.appendChild(pageInfo);
        paginationContainer.appendChild(nextBtn);
    }

    function incrementViews(postId) {
        const post = posts.find(p => p.id === postId);
        if (post) { post.views = (post.views || 0) + 1; savePosts(); const viewSpan = postsContainer.querySelector(`.post-card[data-id="${postId}"] .post-meta span:last-child`); if (viewSpan) viewSpan.textContent = `👁 ${post.views}`; }
    }

    function toggleLike(postId) {
        const post = posts.find(p => p.id === postId);
        if (!post) return;
        const isLiked = likedPosts.includes(postId);
        if (isLiked) { post.likes = Math.max(0, (post.likes || 0) - 1); likedPosts = likedPosts.filter(id => id !== postId); }
        else { post.likes = (post.likes || 0) + 1; likedPosts.push(postId); }
        localStorage.setItem('kcon_liked', JSON.stringify(likedPosts));
        savePosts(); renderPosts();
    }

    function addComment(postId, text) {
        if (!text.trim()) return;
        const postIndex = posts.findIndex(p => p.id === postId);
        if (postIndex === -1) return;
        posts[postIndex].comments.push({ id: Date.now(), text: text, author: currentUser, date: new Date().toLocaleDateString() });
        expandedPostId = postId; savePosts(); renderPosts();
    }

    function deleteComment(postId, commentId) {
        const postIndex = posts.findIndex(p => p.id === postId);
        if (postIndex === -1) return;
        const comment = posts[postIndex].comments.find(c => c.id === commentId);
        if (comment.author !== currentUser || !confirm(translations[currentLang].confirmDeleteComment)) return;
        posts[postIndex].comments = posts[postIndex].comments.filter(c => c.id !== commentId);
        expandedPostId = postId; savePosts(); renderPosts();
    }

    function handleImageUpload(e) {
        const file = e.target.files[0];
        if (!file) return;
        if (file.size > 1024 * 1024) { alert("Image too large! (<1MB)"); postImageInput.value = ''; return; }
        const reader = new FileReader();
        reader.onload = (event) => { currentPostImage = event.target.result; imagePreview.innerHTML = `<img src="${currentPostImage}" alt="Preview">`; imagePreview.style.display = 'block'; };
        reader.readAsDataURL(file);
    }

    function updateLanguage(lang) {
        currentLang = lang;
        localStorage.setItem('kcon_lang', lang);
        document.querySelectorAll('.lang-btn').forEach(btn => btn.classList.toggle('active', btn.dataset.lang === lang));
        const t = translations[lang];
        btnWrite.textContent = t.write; logoLink.textContent = t.logo; userDisplay.textContent = t.loggedInAs + currentUser;
        document.querySelectorAll('.tab').forEach(tab => tab.textContent = t.categories[tab.dataset.category].name);
        categoryTitle.textContent = t.categories[currentCategory].title; categoryDesc.textContent = t.categories[currentCategory].desc;
        modalHeaderTitle.textContent = postIdInput.value ? t.modalEditTitle : t.modalTitle;
        document.querySelector('label[for="post-category"]').textContent = t.labelCategory;
        document.querySelector('label[for="post-title"]').textContent = t.labelTitle;
        document.querySelector('label[for="post-content"]').textContent = t.labelContent;
        document.getElementById('label-image').textContent = t.labelImage;
        document.getElementById('post-title').placeholder = t.placeholderTitle;
        document.getElementById('post-content').placeholder = t.placeholderContent;
        cancelPost.textContent = t.btnCancel; submitBtn.textContent = postIdInput.value ? t.btnUpdate : t.btnPost;
        renderPosts();
    }

    function editPost(id) {
        const post = posts.find(p => p.id === id);
        if (!post || post.author !== currentUser) return;
        postIdInput.value = post.id;
        document.getElementById('post-category').value = post.category;
        document.getElementById('post-title').value = post.titles ? post.titles[currentLang] : post.title;
        document.getElementById('post-content').value = post.contents ? post.contents[currentLang] : post.content;
        if (post.image) { currentPostImage = post.image; imagePreview.innerHTML = `<img src="${currentPostImage}" alt="Preview">`; imagePreview.style.display = 'block'; }
        updateLanguage(currentLang); openModal();
    }

    function deletePost(id) {
        const post = posts.find(p => p.id === id);
        if (!post || post.author !== currentUser || !confirm(translations[currentLang].confirmDelete)) return;
        posts = posts.filter(p => p.id !== id); savePosts(); renderPosts();
    }

    function applyTheme(theme) { document.documentElement.setAttribute('data-theme', theme); localStorage.setItem('kcon_theme', theme); }
    function savePosts() { localStorage.setItem('kcon_posts', JSON.stringify(posts)); }

    langSwitcher.addEventListener('click', (e) => { const btn = e.target.closest('.lang-btn'); if (btn) updateLanguage(btn.dataset.lang); });
    categoryTabs.addEventListener('click', (e) => { const tab = e.target.closest('.tab'); if (!tab) return; document.querySelectorAll('.tab').forEach(t => t.classList.remove('active')); tab.classList.add('active'); currentCategory = tab.dataset.category; currentPage = 1; expandedPostId = null; updateLanguage(currentLang); });
    themeToggle.addEventListener('click', () => { currentTheme = currentTheme === 'light' ? 'dark' : 'light'; applyTheme(currentTheme); });
    postImageInput.addEventListener('change', handleImageUpload);
    const openModal = () => modalOverlay.classList.add('active');
    const hideModal = () => { modalOverlay.classList.remove('active'); postForm.reset(); postIdInput.value = ''; currentPostImage = null; imagePreview.style.display = 'none'; imagePreview.innerHTML = ''; updateLanguage(currentLang); };
    btnWrite.addEventListener('click', openModal); closeModal.addEventListener('click', hideModal); cancelPost.addEventListener('click', hideModal); modalOverlay.addEventListener('click', (e) => { if (e.target === modalOverlay) hideModal(); });

    postForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const id = postIdInput.value;
        const postData = { category: document.getElementById('post-category').value, title: document.getElementById('post-title').value, content: document.getElementById('post-content').value, image: currentPostImage };
        if (id) {
            const index = posts.findIndex(p => p.id === parseInt(id));
            if (index !== -1) { if (posts[index].author !== currentUser) return; posts[index] = { ...posts[index], ...postData, titles: null, contents: null }; }
        } else {
            posts.push({ id: Date.now(), ...postData, lang: currentLang, author: currentUser, date: new Date().toLocaleDateString(), comments: [], views: 0, likes: 0 });
        }
        savePosts(); currentCategory = postData.category; currentPage = 1; document.querySelectorAll('.tab').forEach(t => t.classList.toggle('active', t.dataset.category === currentCategory)); updateLanguage(currentLang); hideModal();
    });

    logoLink.addEventListener('click', () => { const firstTab = document.querySelector('.tab'); if (firstTab) firstTab.click(); window.scrollTo({ top: 0, behavior: 'smooth' }); });
});
