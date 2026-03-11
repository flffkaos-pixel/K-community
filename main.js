document.addEventListener('DOMContentLoaded', () => {
    // --- State ---
    let currentUser = localStorage.getItem('kcon_user');
    if (!currentUser) {
        currentUser = 'User_' + Math.floor(Math.random() * 1000);
        localStorage.setItem('kcon_user', currentUser);
    }

    let likedPosts = JSON.parse(localStorage.getItem('kcon_liked')) || [];
    
    // FORCE RESET: News Update (v7)
    const resetVersion = "v7";
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
            confirmDeleteComment: "このコメントを削除しますか？", noPosts: "このカテゴリー에는 아직 投稿がありません。",
            labelComments: "コメント", btnSendComment: "送信", placeholderComment: "コメントを書く...", loggedInAs: "ログイン中: ",
            prev: "前へ", next: "次へ", page: "ページ",
            categories: {
                kpop: { name: "K-POP & 芸能", title: "K-POP & エン터테인먼트", desc: "K-POPと韓国芸能界の最新ニュースをお届けします。" },
                living: { name: "韓国生活", title: "韓国生活", desc: "韓国での生活に関するヒント、アドバイス、ストーリーをご紹介します。" },
                food: { name: "料理 & レシ피", title: "料理 & レシピ", desc: "美味しい韓国料理のレシピやおすすめの飲食店を見つけましょう。" },
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
            categories: {
                kpop: { name: "K-Pop & 娱乐", title: "K-Pop & 娱乐", desc: "来自 K-Pop 和韩国娱乐界的最新动态。" },
                living: { name: "在韩生活", title: "在韩生活", desc: "关于在韩国生活的提示、建议和故事。" },
                food: { name: "美食 & 食谱", title: "美食 & 食谱", desc: "发现美味의韩国食谱和最佳就餐去处。" },
                beauty: { name: "美妆 & 护肤", title: "K-美妆 & 护肤", desc: "揭秘 K-Beauty 的秘密和有效的护肤程序。" },
                travel: { name: "旅游 & 景点", title: "韩国旅游 & 隐藏景点", desc: "探索韩国各地的著名地标和隐藏瑰宝。" }
            }
        },
        es: {
            logo: "K-community", write: "Publicar", modalTitle: "Crear Nueva Publicación", modalEditTitle: "Editar Publicación",
            labelCategory: "Categoría", labelTitle: "Título", labelContent: "Content", labelImage: "Añadir Imagen",
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
        const newsPosts = [
            {
                id: 9001,
                category: 'kpop',
                author: 'GlobalEditor',
                date: '2026-03-11',
                titles: {
                    ko: "최예나, 'Catch Catch'로 컴백 - 2세대 감성 저격",
                    en: "Choi Yena Comeback with 'Catch Catch' - Retro 2nd Gen Vibes",
                    ja: "チェ・イェナ、'Catch Catch'でカムバック - 第2世代の感性を狙撃",
                    zh: "崔叡娜以 'Catch Catch' 回归 - 瞄准二代团感性",
                    es: "Regreso de Choi Yena con 'Catch Catch' - Vibras de la 2da generación"
                },
                contents: {
                    ko: "최예나가 새로운 앨범 'Catch Catch'와 함께 레트로한 무드로 돌아왔습니다. 이번 앨범은 2세대 K-Pop의 향수를 불러일으키며, 5,000개의 챌린지 영상 달성을 목표로 하고 있습니다. 유재석과의 협업 희망 소식과 정형돈의 작사 비하인드 등 흥미로운 이야기도 전해졌습니다.",
                    en: "Choi Yena is back with her new album 'Catch Catch', featuring a retro concept. Drawing inspiration from 2nd-gen K-Pop, she aims for 5,000 challenge videos. She also shared her desire to collaborate with Yoo Jae-suk and behind-the-scenes stories about Jung Hyung-don writing lyrics.",
                    ja: "チェ・イェナがニューアルバム「Catch Catch」と共にレトロなムードで帰ってきました。今回のアルバムは第2世代K-Popの郷愁を呼び起こし、5,000個のチャレンジ動画達成を目標としています。ユ・ジェソクとのコラボ希望や、チョン・ヒョンドンの作詞秘話など興味深いニュースも伝えられました。",
                    zh: "崔叡娜带着新专辑 'Catch Catch' 以复古风格回归。这张专辑唤起了二代 K-Pop 的怀旧感，目标是达成 5,000 个挑战视频。她还表达了与刘在石合作的愿望，并分享了郑亨敦为其创作歌词的幕后故事。",
                    es: "Choi Yena ha regresado con un ambiente retro en su nuevo álbum 'Catch Catch'. Inspirado en el K-Pop de la segunda generación, busca alcanzar los 5,000 videos de desafío. También compartió su deseo de colaborar con Yoo Jae-suk y anécdotas sobre Jung Hyung-don escribiendo sus letras."
                },
                comments: [], views: 1540, likes: 420
            },
            {
                id: 9002,
                category: 'kpop',
                author: 'NewsHub',
                date: '2026-03-11',
                titles: {
                    ko: "태민, 갤럭시코퍼레이션으로 이적 - 지드래곤과 한솥밥",
                    en: "Taemin Moves to Galaxy Corp - Joining G-Dragon's Agency",
                    ja: "テミン、ギャラクシーコーポレーションへ移籍 - G-DRAGONと同じ事務所に",
                    zh: "泰民签约 Galaxy Corp - 与权志龙成为同门",
                    es: "Taemin se muda a Galaxy Corp - Se une a la agencia de G-Dragon"
                },
                contents: {
                    ko: "샤이니 태민이 지드래곤의 소속사인 갤럭시코퍼레이션과 전속계약을 체결했습니다. 송강호, 김종국 등 거물급 아티스트들이 포진한 이곳에서 태민은 솔로 아티스트로서의 새로운 막을 열게 되었습니다.",
                    en: "SHINee's Taemin has officially signed with Galaxy Corporation, the same agency as G-Dragon. Joining stars like Song Kang-ho and Kim Jong-kook, Taemin is set to start a new chapter in his career as a solo artist.",
                    ja: "SHINeeのテミンが、G-DRAGONの所属事務所であるギャラクシーコーポレーションと専属契約を締結しました。ソン・ガンホ、キム・ジョングクなど大物アーティストが所属するこの場所で、テミンはソロアーティストとしての新たな幕を開けることになりました。",
                    zh: "SHINee 泰民已正式与权志龙所属的 Galaxy Corporation 签署专属合约。在该公司汇集了宋康昊、金钟国等重量级艺人的背景下，泰民将开启其作为个人艺术家的崭新篇章。",
                    es: "Taemin de SHINee ha firmado oficialmente con Galaxy Corporation, la misma agencia que G-Dragon. Uniéndose a estrellas como Song Kang-ho y Kim Jong-kook, Taemin está listo para comenzar un nuevo capítulo en su carrera como solista."
                },
                comments: [], views: 2890, likes: 850
            },
            {
                id: 9003,
                category: 'kpop',
                author: 'DailyK',
                date: '2026-03-11',
                titles: {
                    ko: "데이식스 원필, 3월 솔로 컴백 → 5월 단독 콘서트 개최",
                    en: "DAY6 Wonpil Solo Comeback in March → Solo Concert in May",
                    ja: "DAY6 ウォンピル、3月にソロカムバック → 5月に単独コンサート開催",
                    zh: "DAY6 元弼 3 月个人回归 → 5 月举办个人演唱会",
                    es: "Wonpil de DAY6 regresa como solista en marzo → Concierto en mayo"
                },
                contents: {
                    ko: "DAY6의 원필이 이번 달 솔로 앨범으로 돌아옵니다. 컴백에 이어 5월에는 팬들과 가까이 소통할 수 있는 단독 콘서트 개최 소식까지 전하며 팬들의 기대감을 높이고 있습니다.",
                    en: "Wonpil of DAY6 is returning with a solo album this month. Following the comeback, he has also announced a standalone concert in May to engage with fans, raising high expectations.",
                    ja: "DAY6のウォンピルが今月、ソロアルバムで帰ってきます。カムバックに続き、5月にはファンと近くで交流できる単独コンサートの開催ニュースまで伝え、ファンの期待を高めています。",
                    zh: "DAY6 的元弼将于本月带着个人专辑回归。继回归之后，他还宣布将于 5 月举办个人演唱会与粉丝近距离交流，引发了高度期待。",
                    es: "Wonpil de DAY6 regresa con un álbum solista este mes. Tras el regreso, también ha anunciado un concierto en solitario en mayo para interactuar con sus fans, generando grandes expectativas."
                },
                comments: [], views: 1200, likes: 310
            },
            {
                id: 9004,
                category: 'kpop',
                author: 'Insight',
                date: '2026-03-11',
                titles: {
                    ko: "엔하이픈 희승, 팀 탈퇴 후 솔로 전향 - 소속사 공식 발표",
                    en: "ENHYPEN Heeseung Leaves Group for Solo Career - Official Update",
                    ja: "ENHYPEN ヒスン、グループ脱退後にソロ転向 - 事務所が公式発表",
                    zh: "ENHYPEN 羲承退出组合转向个人发展 - 官方正式发布",
                    es: "Heeseung deja ENHYPEN para seguir una carrera solista - Actualización oficial"
                },
                contents: {
                    ko: "엔하이픈의 희승이 그룹 활동을 마무리하고 솔로 아티스트로서 새로운 도전에 나섭니다. 소속사는 희승의 결정을 존중하며, 희승 또한 자필 편지를 통해 팬들에게 미안함과 고마움을 전했습니다.",
                    en: "Heeseung has officially withdrawn from ENHYPEN to pursue a solo career. The agency stated they respect his decision, and Heeseung shared a handwritten letter expressing his gratitude and apologies to fans.",
                    ja: "ENHYPENのヒスンがグループ活動を終了し、ソロアーティストとして新たな挑戦に乗り出します。事務所はヒスンの決定を尊重し、ヒスンも自筆の手紙を通じてファンに申し訳なさと感謝の気持ちを伝えました。",
                    zh: "ENHYPEN 的羲承已正式退出组合，开启个人艺术家的新挑战。经纪公司表示尊重其决定，羲承也通过亲笔信表达了对粉丝的歉意与感谢。",
                    es: "Heeseung se ha retirado oficialmente de ENHYPEN para seguir una carrera como solista. La agencia declaró que respetan su decisión, y Heeseung compartió una carta escrita a mano expresando su gratitud y disculpas a los fans."
                },
                comments: [], views: 4500, likes: 1200
            },
            {
                id: 9005,
                category: 'kpop',
                author: 'MusicBiz',
                date: '2026-03-11',
                titles: {
                    ko: "박진영, JYP 사내이사 사임 - 크리에이티브 프로듀서 집중",
                    en: "J.Y. Park Resigns as Internal Director - Focusing on Production",
                    ja: "パク・ジニョン、JYP社内取締役を辞任 - クリエイティブプロデューサーに集中",
                    zh: "朴振英辞去 JYP 内部董事职务 - 专注于创意制作",
                    es: "J.Y. Park renuncia como director interno - Se enfocará en la producción"
                },
                contents: {
                    ko: "JYP 엔터테인먼트의 수장 박진영이 사내이사직에서 물러납니다. 경영보다는 본업인 아티스트 양성 및 크리에이티브 프로듀싱에 더 집중하기 위한 결정으로 알려졌습니다.",
                    en: "J.Y. Park has stepped down from his position as an internal director at JYP Entertainment. This move allows him to focus more on his core roles in artist development and creative production.",
                    ja: "JYPエンターテインメントの首長パク・ジニョンが社内取締役職を辞任します。経営よりも本業であるアーティスト養成やクリエイティブプロデューシングにより集中するための決定とされています。",
                    zh: "JYP 娱乐掌门人朴振英将辞去内部董事职务。据悉，此举是为了能够更专注于艺人培养和创意制作等核心业务，而非日常经营。",
                    es: "J.Y. Park ha dejado su cargo como director interno en JYP Entertainment. Este movimiento le permite enfocarse más en sus roles principales de desarrollo de artistas y producción creativa."
                },
                comments: [], views: 980, likes: 150
            }
        ];

        const generatedPosts = [...newsPosts];
        const categories = ['kpop', 'living', 'food', 'beauty', 'travel'];
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
            for (let i = 0; i < 25; i++) {
                const titleObj = {
                    ko: `샘플 ${cat} 주제 ${i+1}`,
                    en: `Sample ${cat} topic ${i+1}`,
                    ja: `サンプル ${cat} テーマ ${i+1}`,
                    zh: `示例 ${cat} 主题 ${i+1}`,
                    es: `Ejemplo ${cat} tema ${i+1}`
                };
                const author = authors[i % authors.length];
                const date = new Date(Date.now() - Math.floor(Math.random() * 1000000000)).toLocaleDateString();
                const contents = {};
                ['ko', 'en', 'ja', 'zh', 'es'].forEach(l => {
                    contents[l] = bodyTemplates[l].replace('{cat}', cat).replace('{title}', titleObj[l]);
                });
                generatedPosts.push({ id: postId++, category: cat, titles: titleObj, contents: contents, author: author, date: date, comments: [], views: Math.floor(Math.random() * 200), likes: Math.floor(Math.random() * 50) });
            }
        });

        return generatedPosts;
    }

    function renderPosts() {
        postsContainer.innerHTML = '';
        const filteredPosts = posts.filter(post => post.category === currentCategory);
        if (filteredPosts.length === 0) { postsContainer.innerHTML = `<div class="post-card"><p>${translations[currentLang].noPosts}</p></div>`; paginationContainer.innerHTML = ''; return; }
        const sortedPosts = [...filteredPosts].sort((a, b) => b.id - a.id);
        const totalPages = Math.ceil(sortedPosts.length / pageSize);
        if (currentPage > totalPages) currentPage = totalPages; if (currentPage < 1) currentPage = 1;
        const startIdx = (currentPage - 1) * pageSize;
        const pagedPosts = sortedPosts.slice(startIdx, startIdx + pageSize);

        pagedPosts.forEach(post => {
            const postElement = document.createElement('article');
            postElement.className = 'post-card';
            if (post.id === expandedPostId) postElement.classList.add('expanded');
            postElement.dataset.id = post.id;
            const displayTitle = post.titles ? post.titles[currentLang] : post.title;
            const displayContent = post.contents ? post.contents[currentLang] : post.content;
            let imageHtml = post.image ? `<div class="post-image-container"><img src="${post.image}" alt="Post image"></div>` : '';
            let commentsHtml = '';
            if (post.comments) { post.comments.forEach(comment => { const isCommentAuthor = comment.author === currentUser; commentsHtml += `<div class="comment-item"><div class="comment-header"><span>@${comment.author} • ${comment.date}</span><div class="comment-actions">${isCommentAuthor ? `<button class="btn-icon delete-comment" data-post-id="${post.id}" data-comment-id="${comment.id}">🗑</button>` : ''}</div></div><div class="comment-content">${comment.text}</div></div>`; }); }
            const isPostAuthor = post.author === currentUser; const isLiked = likedPosts.includes(post.id);
            postElement.innerHTML = `<div class="post-header"><h3 class="post-title">${displayTitle}</h3><div class="post-actions"><button class="btn-icon like-btn ${isLiked ? 'active' : ''}" data-id="${post.id}">${isLiked ? '❤️' : '🤍'} ${post.likes || 0}</button>${isPostAuthor ? `<button class="btn-icon edit" data-id="${post.id}" title="Edit">✎</button><button class="btn-icon delete" data-id="${post.id}" title="Delete">🗑</button>` : ''}</div></div><div class="post-meta" style="margin-bottom: 0.5rem;"><span>@${post.author}</span><span>•</span><span>${post.date}</span><span style="margin-left: auto;">👁 ${post.views || 0}</span></div><div class="post-content">${displayContent}</div>${imageHtml}<div class="comments-section"><h4 style="font-size: 0.9rem; margin-bottom: 0.75rem;">${translations[currentLang].labelComments} (${post.comments ? post.comments.length : 0})</h4><div class="comments-list">${commentsHtml}</div><div class="comment-input-area" onclick="event.stopPropagation();"><input type="text" class="comment-input" placeholder="${translations[currentLang].placeholderComment}" data-post-id="${post.id}"><button class="btn btn-primary add-comment-btn" data-post-id="${post.id}" style="padding: 0.4rem 0.8rem; font-size: 0.8rem;">${translations[currentLang].btnSendComment}</button></div></div>`;
            postElement.addEventListener('click', (e) => { if (e.target.closest('.post-actions') || e.target.closest('.comment-input-area') || e.target.closest('.delete-comment')) return; const isExpanding = !postElement.classList.contains('expanded'); document.querySelectorAll('.post-card').forEach(card => card.classList.remove('expanded')); if (isExpanding) { postElement.classList.add('expanded'); expandedPostId = post.id; incrementViews(post.id); } else { expandedPostId = null; } });
            postsContainer.appendChild(postElement);
        });
        renderPagination(totalPages);
        postsContainer.querySelectorAll('.like-btn').forEach(btn => btn.addEventListener('click', (e) => { e.stopPropagation(); toggleLike(parseInt(e.target.closest('.like-btn').dataset.id)); }));
        postsContainer.querySelectorAll('.edit').forEach(btn => btn.addEventListener('click', (e) => { e.stopPropagation(); editPost(parseInt(e.target.dataset.id)); }));
        postsContainer.querySelectorAll('.delete').forEach(btn => btn.addEventListener('click', (e) => { e.stopPropagation(); deletePost(parseInt(e.target.dataset.id)); }));
        postsContainer.querySelectorAll('.add-comment-btn').forEach(btn => btn.addEventListener('click', (e) => { e.stopPropagation(); const pid = parseInt(e.target.getAttribute('data-post-id')); const input = postsContainer.querySelector(`.comment-input[data-post-id="${pid}"]`); addComment(pid, input.value); }));
        postsContainer.querySelectorAll('.comment-input').forEach(input => input.addEventListener('keypress', (e) => { if (e.key === 'Enter') { e.stopPropagation(); const pid = parseInt(e.target.getAttribute('data-post-id')); addComment(pid, e.target.value); } }));
        postsContainer.querySelectorAll('.delete-comment').forEach(btn => btn.addEventListener('click', (e) => { e.stopPropagation(); const pid = parseInt(e.target.getAttribute('data-post-id')); const cid = parseInt(e.target.getAttribute('data-comment-id')); deleteComment(pid, cid); }));
    }

    function renderPagination(totalPages) { paginationContainer.innerHTML = ''; if (totalPages <= 1) return; const t = translations[currentLang]; const prevBtn = document.createElement('button'); prevBtn.className = 'btn btn-secondary'; prevBtn.textContent = t.prev; prevBtn.disabled = currentPage === 1; prevBtn.onclick = () => { currentPage--; renderPosts(); window.scrollTo(0, 0); }; const nextBtn = document.createElement('button'); nextBtn.className = 'btn btn-secondary'; nextBtn.textContent = t.next; nextBtn.disabled = currentPage === totalPages; nextBtn.onclick = () => { currentPage++; renderPosts(); window.scrollTo(0, 0); }; const pageInfo = document.createElement('span'); pageInfo.textContent = `${t.page} ${currentPage} / ${totalPages}`; paginationContainer.appendChild(prevBtn); paginationContainer.appendChild(pageInfo); paginationContainer.appendChild(nextBtn); }
    function incrementViews(postId) { const post = posts.find(p => p.id === postId); if (post) { post.views = (post.views || 0) + 1; savePosts(); const viewSpan = postsContainer.querySelector(`.post-card[data-id="${postId}"] .post-meta span:last-child`); if (viewSpan) viewSpan.textContent = `👁 ${post.views}`; } }
    function toggleLike(postId) { const post = posts.find(p => p.id === postId); if (!post) return; const isLiked = likedPosts.includes(postId); if (isLiked) { post.likes = Math.max(0, (post.likes || 0) - 1); likedPosts = likedPosts.filter(id => id !== postId); } else { post.likes = (post.likes || 0) + 1; likedPosts.push(postId); } localStorage.setItem('kcon_liked', JSON.stringify(likedPosts)); savePosts(); renderPosts(); }
    function addComment(postId, text) { if (!text.trim()) return; const postIndex = posts.findIndex(p => p.id === postId); if (postIndex === -1) return; posts[postIndex].comments.push({ id: Date.now(), text: text, author: currentUser, date: new Date().toLocaleDateString() }); expandedPostId = postId; savePosts(); renderPosts(); }
    function deleteComment(postId, commentId) { const postIndex = posts.findIndex(p => p.id === postId); if (postIndex === -1) return; const comment = posts[postIndex].comments.find(c => c.id === commentId); if (comment.author !== currentUser || !confirm(translations[currentLang].confirmDeleteComment)) return; posts[postIndex].comments = posts[postIndex].comments.filter(c => c.id !== commentId); expandedPostId = postId; savePosts(); renderPosts(); }
    function handleImageUpload(e) { const file = e.target.files[0]; if (!file) return; if (file.size > 1024 * 1024) { alert("Image too large! (<1MB)"); postImageInput.value = ''; return; } const reader = new FileReader(); reader.onload = (event) => { currentPostImage = event.target.result; imagePreview.innerHTML = `<img src="${currentPostImage}" alt="Preview">`; imagePreview.style.display = 'block'; }; reader.readAsDataURL(file); }
    function updateLanguage(lang) { currentLang = lang; localStorage.setItem('kcon_lang', lang); document.querySelectorAll('.lang-btn').forEach(btn => btn.classList.toggle('active', btn.dataset.lang === lang)); const t = translations[lang]; btnWrite.textContent = t.write; logoLink.textContent = t.logo; userDisplay.textContent = t.loggedInAs + currentUser; document.querySelectorAll('.tab').forEach(tab => tab.textContent = t.categories[tab.dataset.category].name); categoryTitle.textContent = t.categories[currentCategory].title; categoryDesc.textContent = t.categories[currentCategory].desc; modalHeaderTitle.textContent = postIdInput.value ? t.modalEditTitle : t.modalTitle; document.querySelector('label[for="post-category"]').textContent = t.labelCategory; document.querySelector('label[for="post-title"]').textContent = t.labelTitle; document.querySelector('label[for="post-content"]').textContent = t.labelContent; document.getElementById('label-image').textContent = t.labelImage; document.getElementById('post-title').placeholder = t.placeholderTitle; document.getElementById('post-content').placeholder = t.placeholderContent; cancelPost.textContent = t.btnCancel; submitBtn.textContent = postIdInput.value ? t.btnUpdate : t.btnPost; renderPosts(); }
    function editPost(id) { const post = posts.find(p => p.id === id); if (!post || post.author !== currentUser) return; postIdInput.value = post.id; document.getElementById('post-category').value = post.category; document.getElementById('post-title').value = post.titles ? post.titles[currentLang] : post.title; document.getElementById('post-content').value = post.contents ? post.contents[currentLang] : post.content; if (post.image) { currentPostImage = post.image; imagePreview.innerHTML = `<img src="${currentPostImage}" alt="Preview">`; imagePreview.style.display = 'block'; } updateLanguage(currentLang); openModal(); }
    function deletePost(id) { const post = posts.find(p => p.id === id); if (!post || post.author !== currentUser || !confirm(translations[currentLang].confirmDelete)) return; posts = posts.filter(p => p.id !== id); savePosts(); renderPosts(); }
    function applyTheme(theme) { document.documentElement.setAttribute('data-theme', theme); localStorage.setItem('kcon_theme', theme); }
    function savePosts() { localStorage.setItem('kcon_posts', JSON.stringify(posts)); }
    langSwitcher.addEventListener('click', (e) => { const btn = e.target.closest('.lang-btn'); if (btn) updateLanguage(btn.dataset.lang); });
    categoryTabs.addEventListener('click', (e) => { const tab = e.target.closest('.tab'); if (!tab) return; document.querySelectorAll('.tab').forEach(t => t.classList.remove('active')); tab.classList.add('active'); currentCategory = tab.dataset.category; currentPage = 1; expandedPostId = null; updateLanguage(currentLang); });
    themeToggle.addEventListener('click', () => { currentTheme = currentTheme === 'light' ? 'dark' : 'light'; applyTheme(currentTheme); });
    postImageInput.addEventListener('change', handleImageUpload);
    const openModal = () => modalOverlay.classList.add('active');
    const hideModal = () => { modalOverlay.classList.remove('active'); postForm.reset(); postIdInput.value = ''; currentPostImage = null; imagePreview.style.display = 'none'; imagePreview.innerHTML = ''; updateLanguage(currentLang); };
    btnWrite.addEventListener('click', openModal); closeModal.addEventListener('click', hideModal); cancelPost.addEventListener('click', hideModal); modalOverlay.addEventListener('click', (e) => { if (e.target === modalOverlay) hideModal(); });
    postForm.addEventListener('submit', (e) => { e.preventDefault(); const id = postIdInput.value; const postData = { category: document.getElementById('post-category').value, title: document.getElementById('post-title').value, content: document.getElementById('post-content').value, image: currentPostImage }; if (id) { const index = posts.findIndex(p => p.id === parseInt(id)); if (index !== -1) { if (posts[index].author !== currentUser) return; posts[index] = { ...posts[index], ...postData, titles: null, contents: null }; } } else { posts.push({ id: Date.now(), ...postData, lang: currentLang, author: currentUser, date: new Date().toLocaleDateString(), comments: [], views: 0, likes: 0 }); } savePosts(); currentCategory = postData.category; currentPage = 1; document.querySelectorAll('.tab').forEach(t => t.classList.toggle('active', t.dataset.category === currentCategory)); updateLanguage(currentLang); hideModal(); });
    logoLink.addEventListener('click', () => { const firstTab = document.querySelector('.tab'); if (firstTab) firstTab.click(); window.scrollTo({ top: 0, behavior: 'smooth' }); });
});
