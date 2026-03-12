document.addEventListener('DOMContentLoaded', () => {
    // --- State ---
    let currentUser = localStorage.getItem('kcon_user');
    if (!currentUser) {
        currentUser = 'User_' + Math.floor(Math.random() * 1000);
        localStorage.setItem('kcon_user', currentUser);
    }

    let likedPosts = JSON.parse(localStorage.getItem('kcon_liked')) || [];
    
    // FORCE RESET: UI Update (v13 - Post Translation & Managed Buttons)
    const resetVersion = "v13";
    if (localStorage.getItem('kcon_posts_version') !== resetVersion) {
        localStorage.removeItem('kcon_posts');
        localStorage.setItem('kcon_posts_version', resetVersion);
    }

    let rawPosts = JSON.parse(localStorage.getItem('kcon_posts'));
    
    if (!rawPosts) {
        rawPosts = getInitialPosts();
        localStorage.setItem('kcon_posts', JSON.stringify(rawPosts));
    }
    
    let posts = rawPosts;
    let currentCategory = 'kpop';
    let currentTheme = localStorage.getItem('kcon_theme') || 'light';
    let currentLang = localStorage.getItem('kcon_lang') || 'en';
    let currentPostImages = []; 
    let expandedPostId = null;
    
    let currentPage = 1;
    const pageSize = 10;

    const translationCache = {};

    const translations = {
        ko: {
            logo: "K-community", write: "글쓰기", modalTitle: "새 게시글 작성", modalEditTitle: "게시글 수정",
            labelCategory: "카테고리", labelTitle: "제목", labelContent: "내용", labelImage: "사진 추가",
            btnCancel: "취소", btnPost: "게시하기", btnUpdate: "수정하기", placeholderTitle: "제목을 입력하세요",
            placeholderContent: "생각을 공유해 보세요...", confirmDelete: "정말 이 게시글을 삭제하시겠습니까?",
            confirmDeleteComment: "이 댓글을 삭제하시겠습니까?", noPosts: "이 카테고리에 게시글이 없습니다.",
            labelComments: "댓글", btnSendComment: "등록", placeholderComment: "댓글을 입력하세요...", loggedInAs: "내 아이디: ",
            prev: "이전", next: "다음", page: "페이지",
            translating: "번역 중...", trending: "🔥 실시간 인기글", changeNickname: "닉네임 변경",
            promptNickname: "새로운 닉네임을 입력하세요:", btnEdit: "수정", btnDelete: "삭제",
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
            labelComments: "Comments", btnSendComment: "Post", placeholderComment: "Write a comment...", loggedInAs: "User: ",
            prev: "Prev", next: "Next", page: "Page",
            translating: "Translating...", trending: "🔥 Trending Now", changeNickname: "Change Nickname",
            promptNickname: "Enter your new nickname:", btnEdit: "Edit", btnDelete: "Delete",
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
            labelCategory: "カテゴリー", labelTitle: "タイトル", labelContent: "内容", labelImage: "写真追加",
            btnCancel: "キャンセル", btnPost: "投稿する", btnUpdate: "更新する", placeholderTitle: "タイトルを入力してください",
            placeholderContent: "あなたの考えを共有しましょう...", confirmDelete: "この投稿を削除해도 よろしいですか？",
            confirmDeleteComment: "このコメントを削除しますか？", noPosts: "このカテゴリーにはまだ投稿がありません。",
            labelComments: "コメント", btnSendComment: "送信", placeholderComment: "コメントを書く...", loggedInAs: "ログイン中: ",
            prev: "前へ", next: "次へ", page: "ページ",
            translating: "翻訳中...", trending: "🔥 人気の投稿", changeNickname: "名前変更",
            promptNickname: "新しいニックネームを入力してください:", btnEdit: "修正", btnDelete: "削除",
            categories: {
                kpop: { name: "K-POP & 芸能", title: "K-POP & エン터テイン먼트", desc: "K-POPと韓国芸能界의 最新ニュースをお届けします。" },
                living: { name: "韓国生活", title: "韓国生活", desc: "韓国での生活に関するヒント, アドバイス, ストーリーをご紹介します。" },
                food: { name: "料理 & レシピ", title: "料理 & レシ피", desc: "美味しい韓国料理のレシピやおすすめの飲食店を見つけましょう。" },
                beauty: { name: "ビューティー", title: "K-ビューティー & 스킨케어", desc: "K-뷰티의 비밀과 효과적인 스킨케어 루틴을 확인하세요." },
                travel: { name: "旅行 & スポット", title: "한국 여행 & 숨은 명소", desc: "한국 곳곳의 유명 랜드마크와 숨겨진 보석 같은 명소를 탐험하세요." }
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
            translating: "翻译中...", trending: "🔥 热门文章", changeNickname: "更改昵称",
            promptNickname: "请输入新的昵称:", btnEdit: "编辑", btnDelete: "删除",
            categories: {
                kpop: { name: "K-Pop & 娱乐", title: "K-Pop & 娱乐", desc: "来自 K-Pop 和韩国娱乐界的最新动态。" },
                living: { name: "在韩生活", title: "在韩生活", desc: "关于在韩国生活的提示、建议 and 故事。" },
                food: { name: "美食 & 食谱", title: "美食 & 食谱", desc: "发现美味的韩国食谱 and 最佳就餐去处。" },
                beauty: { name: "美妆 & 护肤", title: "K-美妆 & 护肤", desc: "揭秘 K-Beauty 的秘密 and 有效的护肤程序。" },
                travel: { name: "旅游 & 景点", title: "韩国旅游 & 隐藏景点", desc: "探索韩国各地的著名地标 and 隐藏瑰宝。" }
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
            translating: "Traduciendo...", trending: "🔥 Tendencias", changeNickname: "Cambiar Nick",
            promptNickname: "Ingrese su nuevo apodo:", btnEdit: "Editar", btnDelete: "Borrar",
            categories: {
                kpop: { name: "K-Pop y Ent", title: "K-Pop y Entretenimiento", desc: "Lo último del mundo del K-Pop y el entretenimiento coreano." },
                living: { name: "Vivir en Corea", title: "Vivir en Corea", desc: "Consejos, recomendaciones e historias sobre la vida en Corea." },
                food: { name: "Comida y Recetas", title: "Comida y Recetas", desc: "Descubre deliciosas recetas coreanas and los mejores lugares para comer." },
                beauty: { name: "Belleza y Piel", title: "Belleza y Cuidado de la Piel", desc: "Descubre los secretos de la K-Beauty and rutinas efectivas." },
                travel: { name: "Viajes y Lugares", title: "Viajes y Lugares Ocultos", desc: "Explora monumentos famosos and gemas ocultas en Corea del Sur." }
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
    const imagePreviews = document.getElementById('image-previews');
    const submitBtn = postForm.querySelector('button[type="submit"]');
    const logoLink = document.getElementById('logo-link');
    const langSwitcher = document.getElementById('lang-switcher');
    const userDisplay = document.getElementById('user-display');
    const btnChangeNickname = document.getElementById('btn-change-nickname');
    const trendingList = document.getElementById('trending-list');
    const trendingTitle = document.getElementById('trending-title');

    const paginationContainer = document.createElement('div');
    paginationContainer.className = 'pagination-container';
    paginationContainer.style.cssText = 'display: flex; justify-content: center; gap: 1rem; margin-top: 2rem; align-items: center; padding-bottom: 2rem;';
    document.querySelector('.posts-section').appendChild(paginationContainer);

    // --- Initialization ---
    applyTheme(currentTheme);
    updateLanguage(currentLang);
    renderPosts();
    renderTrending();

    // --- Functions ---

    function getInitialPosts() {
        return [
            {
                id: 9001, category: 'kpop', author: 'GlobalEditor', date: '2026-03-11', lang: 'ko',
                titles: { ko: "최예나, 'Catch Catch'로 컴백 - 2세대 감성 저격", en: "Choi Yena Comeback with 'Catch Catch'", ja: "チェ・イェナ、'Catch Catch'でカムバック", zh: "崔叡娜以 'Catch Catch' 回归", es: "Regreso de Choi Yena" },
                contents: { ko: "최예나가 새로운 앨범 'Catch Catch'와 함께 레트로한 무드로 돌아왔습니다. [IMG_0] 이번 앨범은 2세대 K-Pop의 향수를 불러일으키며, 5,000개의 챌린지 영상 달성을 목표로 하고 있습니다.", en: "Choi Yena is back with her new album 'Catch Catch'. [IMG_0] This album brings back retro vibes.", ja: "チェ・イェナがニューアルバム「Catch Catch」と共に帰ってきました。[IMG_0]", zh: "崔叡娜带着新专辑 'Catch Catch' 回归。[IMG_0]", es: "Choi Yena ha regresado con un ambiente retro en su nuevo álbum 'Catch Catch'. [IMG_0]" },
                images: ["https://images.unsplash.com/photo-1514525253344-f81f3fbb166e?w=800&auto=format&fit=crop"],
                comments: [ { id: 101, text: "너무 기대돼요!", author: "예나팬", date: "2026-03-12", lang: "ko" } ], views: 1540, likes: 420
            }
        ];
    }

    async function triggerTranslation(item, targetLang, type = 'comment') {
        const cacheKey = `${item.id}_${targetLang}_${type}`;
        if (translationCache[cacheKey]) return;
        
        const textToTranslate = type === 'post_title' ? item.title : (type === 'post_content' ? item.content : item.text);
        const sourceLang = item.lang || 'ko';

        try {
            const response = await fetch(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(textToTranslate)}&langpair=${sourceLang}|${targetLang}`);
            const data = await response.json();
            if (data.responseData && data.responseData.translatedText) {
                translationCache[cacheKey] = data.responseData.translatedText;
                if (currentLang !== targetLang) return;
                
                if (type === 'comment') {
                    const el = document.querySelector(`.comment-item[data-comment-id="${item.id}"] .comment-content`);
                    if (el) el.textContent = data.responseData.translatedText;
                } else if (type === 'post_title') {
                    const el = document.querySelector(`.post-card[data-id="${item.id}"] .post-title`);
                    if (el) el.textContent = data.responseData.translatedText;
                } else if (type === 'post_content') {
                    renderPosts(); // Re-render content to handle IMG tags correctly
                }
            }
        } catch (error) { console.error("Translation error:", error); }
    }

    function renderPosts() {
        postsContainer.innerHTML = '';
        const filteredPosts = posts.filter(post => post.category === currentCategory);
        if (filteredPosts.length === 0) { postsContainer.innerHTML = `<div class="post-card"><p>${translations[currentLang].noPosts}</p></div>`; paginationContainer.innerHTML = ''; return; }
        const sortedPosts = [...filteredPosts].sort((a, b) => b.id - a.id);
        const totalPages = Math.ceil(sortedPosts.length / pageSize);
        if (currentPage > totalPages) currentPage = totalPages;
        const startIdx = (currentPage - 1) * pageSize;
        const pagedPosts = sortedPosts.slice(startIdx, startIdx + pageSize);

        pagedPosts.forEach(post => {
            const postElement = document.createElement('article');
            postElement.className = 'post-card';
            if (post.id === expandedPostId) postElement.classList.add('expanded');
            postElement.dataset.id = post.id;
            
            // Post Translation Logic
            let displayTitle = post.titles ? (post.titles[currentLang] || post.titles['en']) : post.title;
            let displayContent = post.contents ? (post.contents[currentLang] || post.contents['en']) : post.content;
            
            if (!post.titles || !post.titles[currentLang]) {
                const titleCacheKey = `${post.id}_${currentLang}_post_title`;
                const contentCacheKey = `${post.id}_${currentLang}_post_content`;
                if (post.lang && post.lang !== currentLang) {
                    if (translationCache[titleCacheKey]) displayTitle = translationCache[titleCacheKey];
                    else { displayTitle = translations[currentLang].translating; triggerTranslation(post, currentLang, 'post_title'); }
                    
                    if (translationCache[contentCacheKey]) displayContent = translationCache[contentCacheKey];
                    else { displayContent = translations[currentLang].translating; triggerTranslation(post, currentLang, 'post_content'); }
                }
            }

            // Inline Images
            if (post.images && post.images.length > 0) {
                post.images.forEach((imgUrl, idx) => {
                    const imgHtml = `<img src="${imgUrl}" alt="Post image ${idx}" loading="lazy">`;
                    if (displayContent.includes(`[IMG_${idx}]`)) displayContent = displayContent.replace(`[IMG_${idx}]`, imgHtml);
                    else if (idx === 0 && !displayContent.includes('[IMG_')) displayContent += `<div class="post-images-bottom">${imgHtml}</div>`;
                });
            }

            const postComments = post.comments || [];
            let commentsHtml = '';
            postComments.forEach(comment => {
                const cacheKey = `${comment.id}_${currentLang}_comment`;
                const isMatchingLang = !comment.lang || comment.lang === currentLang;
                const displayText = isMatchingLang ? comment.text : (translationCache[cacheKey] || translations[currentLang].translating);
                if (!isMatchingLang && !translationCache[cacheKey]) triggerTranslation(comment, currentLang, 'comment');
                commentsHtml += `<div class="comment-item" data-comment-id="${comment.id}">
                    <div class="comment-header"><span>@${comment.author} • ${comment.date} ${comment.lang ? `(${comment.lang.toUpperCase()})` : ''}</span>
                    ${comment.author === currentUser ? `<button class="btn-icon delete-comment" data-post-id="${post.id}" data-comment-id="${comment.id}">🗑</button>` : ''}</div>
                    <div class="comment-content">${displayText}</div></div>`;
            });

            postElement.innerHTML = `<div class="post-header"><h3 class="post-title">${displayTitle}</h3><div class="post-actions"><button class="btn-icon like-btn ${likedPosts.includes(post.id) ? 'active' : ''}" data-id="${post.id}">${likedPosts.includes(post.id) ? '❤️' : '🤍'} ${post.likes || 0}</button></div></div><div class="post-meta"><span>@${post.author}</span><span>•</span><span>${post.date}</span><div style="margin-left: auto; text-align: right;"><div><span>👁 ${post.views || 0}</span> <span>💬 ${postComments.length}</span></div>${post.author === currentUser ? `<div class="post-mgmt-actions"><button class="btn-icon edit" data-id="${post.id}">${translations[currentLang].btnEdit}</button><button class="btn-icon delete" data-id="${post.id}">${translations[currentLang].btnDelete}</button></div>` : ''}</div></div><div class="post-content">${displayContent}</div><div class="comments-section"><h4 style="font-size: 0.9rem; margin-bottom: 0.75rem;">${translations[currentLang].labelComments} (${postComments.length})</h4><div class="comments-list">${commentsHtml}</div><div class="comment-input-area" onclick="event.stopPropagation();"><input type="text" class="comment-input" placeholder="${translations[currentLang].placeholderComment}" data-post-id="${post.id}"><button class="btn btn-primary add-comment-btn" data-post-id="${post.id}" style="padding: 0.4rem 0.8rem; font-size: 0.8rem;">${translations[currentLang].btnSendComment}</button></div></div>`;
            
            postElement.onclick = (e) => { if (e.target.closest('.post-actions') || e.target.closest('.comment-input-area') || e.target.closest('.delete-comment') || e.target.closest('.post-mgmt-actions')) return; const isExpanding = !postElement.classList.contains('expanded'); document.querySelectorAll('.post-card').forEach(card => card.classList.remove('expanded')); if (isExpanding) { postElement.classList.add('expanded'); expandedPostId = post.id; incrementViews(post.id); } else expandedPostId = null; };
            postsContainer.appendChild(postElement);
        });
        renderPagination(totalPages);
    }

    function renderTrending() {
        trendingList.innerHTML = '';
        const topPosts = [...posts].sort((a, b) => ((b.views || 0) + (b.likes || 0) * 2) - ((a.views || 0) + (a.likes || 0) * 2)).slice(0, 5);
        topPosts.forEach((post, idx) => {
            const displayTitle = post.titles ? (post.titles[currentLang] || post.titles['en']) : (post.lang === currentLang ? post.title : (translationCache[`${post.id}_${currentLang}_post_title`] || post.title));
            const item = document.createElement('li'); item.className = 'trending-item';
            item.innerHTML = `<span class="trending-rank">${idx + 1}</span><div class="trending-info"><div class="trending-item-title">${displayTitle}</div><div class="trending-meta">@${post.author} • 👁 ${post.views || 0}</div></div>`;
            item.onclick = () => { currentCategory = post.category; expandedPostId = post.id; updateLanguage(currentLang); window.scrollTo({ top: 0, behavior: 'smooth' }); };
            trendingList.appendChild(item);
        });
    }

    function renderPagination(totalPages) { paginationContainer.innerHTML = ''; if (totalPages <= 1) return; const t = translations[currentLang]; const prevBtn = document.createElement('button'); prevBtn.className = 'btn btn-secondary'; prevBtn.textContent = t.prev; prevBtn.disabled = currentPage === 1; prevBtn.onclick = () => { currentPage--; renderPosts(); window.scrollTo(0, 0); }; const nextBtn = document.createElement('button'); nextBtn.className = 'btn btn-secondary'; nextBtn.textContent = t.next; nextBtn.disabled = currentPage === totalPages; nextBtn.onclick = () => { currentPage++; renderPosts(); window.scrollTo(0, 0); }; const pageInfo = document.createElement('span'); pageInfo.textContent = `${t.page} ${currentPage} / ${totalPages}`; paginationContainer.appendChild(prevBtn); paginationContainer.appendChild(pageInfo); paginationContainer.appendChild(nextBtn); }
    function incrementViews(postId) { const post = posts.find(p => p.id === postId); if (post) { post.views = (post.views || 0) + 1; savePosts(); renderTrending(); } }
    function toggleLike(postId) { const post = posts.find(p => p.id === postId); if (!post) return; const isLiked = likedPosts.includes(postId); if (isLiked) { post.likes = Math.max(0, (post.likes || 0) - 1); likedPosts = likedPosts.filter(id => id !== postId); } else { post.likes = (post.likes || 0) + 1; likedPosts.push(postId); } localStorage.setItem('kcon_liked', JSON.stringify(likedPosts)); savePosts(); renderPosts(); renderTrending(); }
    function addComment(postId, text) { if (!text.trim()) return; const postIndex = posts.findIndex(p => p.id === postId); if (postIndex === -1) return; posts[postIndex].comments.push({ id: Date.now(), text: text, author: currentUser, date: new Date().toLocaleDateString(), lang: currentLang }); savePosts(); renderPosts(); }
    function deleteComment(postId, commentId) { const postIndex = posts.findIndex(p => p.id === postId); if (postIndex === -1) return; const comment = posts[postIndex].comments.find(c => c.id === commentId); if (comment.author !== currentUser || !confirm(translations[currentLang].confirmDeleteComment)) return; posts[postIndex].comments = posts[postIndex].comments.filter(c => c.id !== commentId); savePosts(); renderPosts(); }
    
    function handleImageUpload(e) {
        const files = Array.from(e.target.files);
        files.forEach(file => {
            if (file.size > 1024 * 1024) { alert("Image too large! (<1MB)"); return; }
            const reader = new FileReader();
            reader.onload = (event) => {
                currentPostImages.push(event.target.result);
                const idx = currentPostImages.length - 1;
                const thumb = document.createElement('img'); thumb.src = event.target.result; thumb.className = 'image-preview-item'; thumb.onclick = () => insertAtCursor(document.getElementById('post-content'), ` [IMG_${idx}] `);
                imagePreviews.appendChild(thumb);
            };
            reader.readAsDataURL(file);
        });
    }

    function insertAtCursor(myField, myValue) {
        if (document.selection) { myField.focus(); sel = document.selection.createRange(); sel.text = myValue; }
        else if (myField.selectionStart || myField.selectionStart == '0') {
            var startPos = myField.selectionStart; var endPos = myField.selectionEnd;
            myField.value = myField.value.substring(0, startPos) + myValue + myField.value.substring(endPos, myField.value.length);
        } else myField.value += myValue;
    }

    function updateLanguage(lang) {
        currentLang = lang; localStorage.setItem('kcon_lang', lang);
        document.querySelectorAll('.lang-btn').forEach(btn => btn.classList.toggle('active', btn.dataset.lang === lang));
        const t = translations[lang];
        btnWrite.textContent = t.write; logoLink.textContent = t.logo; userDisplay.textContent = t.loggedInAs + currentUser; trendingTitle.textContent = t.trending;
        document.querySelectorAll('.tab').forEach(tab => tab.textContent = t.categories[tab.dataset.category].name);
        categoryTitle.textContent = t.categories[currentCategory].title; categoryDesc.textContent = t.categories[currentCategory].desc;
        modalHeaderTitle.textContent = postIdInput.value ? t.modalEditTitle : t.modalTitle;
        document.getElementById('post-title').placeholder = t.placeholderTitle; document.getElementById('post-content').placeholder = t.placeholderContent;
        cancelPost.textContent = t.btnCancel; submitBtn.textContent = postIdInput.value ? t.btnUpdate : t.btnPost;
        renderPosts(); renderTrending();
    }

    function applyTheme(theme) { document.documentElement.setAttribute('data-theme', theme); localStorage.setItem('kcon_theme', theme); }
    function savePosts() { localStorage.setItem('kcon_posts', JSON.stringify(posts)); }

    langSwitcher.onclick = (e) => { const btn = e.target.closest('.lang-btn'); if (btn) updateLanguage(btn.dataset.lang); };
    categoryTabs.onclick = (e) => { const tab = e.target.closest('.tab'); if (!tab) return; document.querySelectorAll('.tab').forEach(t => t.classList.remove('active')); tab.classList.add('active'); currentCategory = tab.dataset.category; currentPage = 1; expandedPostId = null; updateLanguage(currentLang); };
    themeToggle.onclick = () => { currentTheme = (currentTheme === 'light' ? 'dark' : 'light'); applyTheme(currentTheme); };
    postImageInput.onchange = handleImageUpload;
    btnChangeNickname.onclick = () => { const nick = prompt(translations[currentLang].promptNickname, currentUser); if (nick && nick.trim()) { currentUser = nick.trim(); localStorage.setItem('kcon_user', currentUser); updateLanguage(currentLang); } };
    btnWrite.onclick = () => modalOverlay.classList.add('active');
    const hideModal = () => { modalOverlay.classList.remove('active'); postForm.reset(); postIdInput.value = ''; currentPostImages = []; imagePreviews.innerHTML = ''; };
    closeModal.onclick = hideModal; cancelPost.onclick = hideModal;
    modalOverlay.onclick = (e) => { if (e.target === modalOverlay) hideModal(); };

    postForm.onsubmit = (e) => {
        e.preventDefault();
        const id = postIdInput.value;
        const postData = { category: document.getElementById('post-category').value, title: document.getElementById('post-title').value, content: document.getElementById('post-content').value, images: currentPostImages, lang: currentLang };
        if (id) {
            const index = posts.findIndex(p => p.id === parseInt(id));
            if (index !== -1 && posts[index].author === currentUser) posts[index] = { ...posts[index], ...postData, titles: null, contents: null };
        } else posts.push({ id: Date.now(), ...postData, author: currentUser, date: new Date().toLocaleDateString(), comments: [], views: 0, likes: 0 });
        savePosts(); updateLanguage(currentLang); hideModal();
    };

    postsContainer.onclick = (e) => {
        const btn = e.target.closest('button'); if (!btn) return;
        const pid = parseInt(btn.dataset.id || btn.dataset.postId);
        if (btn.classList.contains('like-btn')) toggleLike(pid);
        else if (btn.classList.contains('edit')) { 
            const post = posts.find(p => p.id === pid); if (post) {
                postIdInput.value = post.id; document.getElementById('post-category').value = post.category;
                document.getElementById('post-title').value = post.title; document.getElementById('post-content').value = post.content;
                currentPostImages = [...(post.images || [])];
                imagePreviews.innerHTML = '';
                currentPostImages.forEach((img, idx) => {
                    const thumb = document.createElement('img'); thumb.src = img; thumb.className = 'image-preview-item'; thumb.onclick = () => insertAtCursor(document.getElementById('post-content'), ` [IMG_${idx}] `);
                    imagePreviews.appendChild(thumb);
                });
                modalOverlay.classList.add('active');
            }
        } else if (btn.classList.contains('delete')) { if (confirm(translations[currentLang].confirmDelete)) { posts = posts.filter(p => p.id !== pid); savePosts(); renderPosts(); renderTrending(); } }
        else if (btn.classList.contains('add-comment-btn')) { const input = postsContainer.querySelector(`.comment-input[data-post-id="${pid}"]`); addComment(pid, input.value); input.value = ''; }
        else if (btn.classList.contains('delete-comment')) deleteComment(parseInt(btn.dataset.postId), parseInt(btn.dataset.commentId));
    };
});
