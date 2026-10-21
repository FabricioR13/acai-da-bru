// ─── FIREBASE CONFIG ──────────────────────────────────────────────────────────
const firebaseConfig = {
  apiKey: "AIzaSyCLBk9GA0kisT7aCm5HFBuRBqvShaycfys",
  authDomain: "acai-da-bru-41a8d.firebaseapp.com",
  projectId: "acai-da-bru-41a8d",
  storageBucket: "acai-da-bru-41a8d.firebasestorage.app",
  messagingSenderId: "356703842862",
  appId: "1:356703842862:web:d3de3f91843e4cfaf625bf"
};
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
// ─────────────────────────────────────────────────────────────────────────────

// ─── CRÉDITO DO PRODUTOR (TF SOLUTIONS) ────────────────────────────────────────
// WhatsApp da TF Solutions, produtora deste site/sistema — usado só no link de
// crédito do rodapé (não é dado da loja, não vem do Firestore).
const TF_SOLUTIONS_WHATSAPP = "5551982165186";
// ─────────────────────────────────────────────────────────────────────────────

document.addEventListener("DOMContentLoaded", async () => {
    // --- SELETORES GLOBAIS ---
    const cartIcon = document.querySelector(".cart-icon"),
        cartSidebar = document.querySelector(".cart-sidebar"),
        cartOverlay = document.querySelector(".cart-overlay"),
        closeCartBtn = document.querySelector(".close-cart-btn"),
        cartBody = document.querySelector(".cart-body"),
        cartBadge = document.querySelector(".cart-badge"),
        cartIconTotalElem = document.getElementById("cart-icon-total");
    const deliveryToggleBtns = document.querySelectorAll(".delivery-btn");
    const deliveryForm = document.getElementById("delivery-form-container"),
        pickupForm = document.getElementById("pickup-form-container");
    const trocoContainer = document.getElementById("troco-container");
    const couponInput = document.getElementById("coupon-input"),
        applyCouponBtn = document.getElementById("apply-coupon-btn"),
        couponFeedback = document.getElementById("coupon-feedback");
    const subtotalElem = document.getElementById("cart-subtotal"),
        cartDiscountElem = document.getElementById("cart-discount"),
        discountLineElem = document.querySelector(".discount-line"),
        totalElem = document.getElementById("cart-total");
    const finishOrderBtn = document.getElementById("finish-order-btn"),
        finishOrderTotalElem = document.getElementById("finish-order-total");
    // Seletores da barra inferior
    const viewCartBanner = document.querySelector(".view-cart-banner");
    const bannerTotalElem = document.getElementById("banner-total");
    const viewCartBannerBtn = document.querySelector(".view-cart-banner-btn");

    // Seletores das etapas do carrinho (1: itens, 2: entrega/retirada, 3: pagamento,
    // 4: identificação, 5: resumo — mais a tela de sucesso, fora da numeração)
    const cartStepsIndicator = document.getElementById("cart-steps-indicator"),
        cartStepsWrap = document.querySelector(".cart-steps-wrap"),
        cartSteps = document.querySelectorAll(".cart-step[data-step]"),
        cartStepDots = document.querySelectorAll(".cart-step-dot"),
        cartItemsCountElem = document.getElementById("cart-items-count"),
        cartStep1TotalElem = document.getElementById("cart-step1-total-valor"),
        cartNavButtons = document.getElementById("cart-nav-buttons"),
        cartNavVoltar = document.getElementById("cart-nav-voltar"),
        cartNavAvancar = document.getElementById("cart-nav-avancar"),
        cartNavAvancarTotalElem = document.getElementById("cart-nav-avancar-total"),
        cartStepSucesso = document.getElementById("cart-step-sucesso"),
        pedidoSucessoCodigoElem = document.getElementById("pedido-sucesso-codigo"),
        novoPedidoBtn = document.getElementById("cart-btn-novo-pedido"),
        resumoItensBloco = document.getElementById("resumo-itens-bloco"),
        resumoEntregaBloco = document.getElementById("resumo-entrega-bloco"),
        resumoPagamentoBloco = document.getElementById("resumo-pagamento-bloco"),
        resumoIdentificacaoBloco = document.getElementById("resumo-identificacao-bloco");
    let etapaAtual = 1;
    let etapaMaxAlcancada = 1;
    const idsPedidoGerados = new Set();

    // Seletores do modal de detalhes do produto (carrossel de fotos)
    const detailOverlay = document.getElementById("detail-overlay"),
        detailModal = document.getElementById("detail-modal"),
        detailClose = document.getElementById("detail-close"),
        detailTrack = document.getElementById("detail-carousel-track"),
        detailPrev = document.getElementById("detail-prev"),
        detailNext = document.getElementById("detail-next"),
        detailDots = document.getElementById("detail-dots"),
        detailBadgeDestaque = document.getElementById("detail-badge-destaque"),
        detailCodigoEl = document.getElementById("detail-codigo"),
        detailNomeEl = document.getElementById("detail-nome"),
        detailDetailsEl = document.getElementById("detail-details"),
        detailDescricaoEl = document.getElementById("detail-descricao"),
        detailTagEl = document.getElementById("detail-tag"),
        detailPriceEl = document.getElementById("detail-price"),
        detailComprarBtn = document.getElementById("detail-comprar-btn"),
        detailSizeGroup = document.getElementById("detail-size-group"),
        detailSizeSelect = document.getElementById("detail-size-select"),
        detailInclusoGroup = document.getElementById("detail-incluso-group"),
        detailInclusoLabel = document.getElementById("detail-incluso-label"),
        detailInclusoSelect = document.getElementById("detail-incluso-select"),
        detailComplementosGroup = document.getElementById("detail-complementos-group"),
        detailComplementosContador = document.getElementById("detail-complementos-contador"),
        detailComplementosLista = document.getElementById("detail-complementos-lista"),
        detailAdicionaisGroup = document.getElementById("detail-adicionais-group"),
        detailAdicionaisLista = document.getElementById("detail-adicionais-lista");

    // Seletores do logo (ícone padrão ou imagem própria, definida pelo admin)
    const logoImgEl = document.getElementById("logo-img");

    // Seletores para o sistema de filtro
    const searchInput = document.querySelector(".search-input");

    // --- CARREGAR PRODUTOS DO FIREBASE ---
    let produtos = [];
    try {
        const snap = await db.collection("produtos")
            .where("ativo", "!=", false)
            .get();
        produtos = snap.docs.map(d => ({ ...d.data() }));
    } catch (e) {
        console.error("Erro ao carregar produtos do Firebase:", e);
    }

    // --- CARREGAR CUPONS DO FIREBASE ---
    let coupons = [];
    try {
        const cuponsSnap = await db.collection("cupons").get();
        coupons = cuponsSnap.docs.map((d) => ({ docId: d.id, ...d.data() }));
    } catch (e) {
        console.error("Erro ao carregar cupons do Firebase:", e);
    }

    // --- CARREGAR CATEGORIAS DO FIREBASE ---
    // A barra de categorias da loja é montada a partir da coleção "categorias":
    // basta cadastrar/editar categorias pelo admin, sem precisar mexer neste arquivo.
    const CATEGORIAS_PADRAO = [
        { id: "promocoes", nome: "Promoções", icone: "fa-tags", ordem: 1 },
        { id: "acai", nome: "Açaí", icone: "fa-bowl-food", ordem: 2 },
        { id: "especiais", nome: "Especiais da Bru", icone: "fa-star", ordem: 3 },
        { id: "bebidas", nome: "Bebidas", icone: "fa-bottle-water", ordem: 4 },
    ];
    let categorias = [];
    try {
        const categoriasSnap = await db.collection("categorias").get();
        categorias = categoriasSnap.docs
            .map((d) => ({ ...d.data() }))
            .filter((c) => c.id !== "all"); // "Todos" já é gerado automaticamente
    } catch (e) {
        console.error("Erro ao carregar categorias do Firebase:", e);
    }
    if (!categorias.length) categorias = CATEGORIAS_PADRAO;
    // O Firestore devolve as categorias em ordem alfabética do ID — o campo "ordem"
    // (opcional) define a sequência na loja; sem ele, a categoria vai pro final.
    categorias.sort((a, b) => (a.ordem ?? 99) - (b.ordem ?? 99));

    // --- CARREGAR CONFIGURAÇÕES DA LOJA DO FIREBASE ---
    const CONFIG_PADRAO = {
        nomeLoja: "Açaí da Bru",
        whatsapp: "5551993126436",
        retiradaDias: [0, 1, 2, 3, 4, 5, 6],
        retiradaHoraInicio: "08:00",
        retiradaHoraFim: "18:00",
        retiradaIntervalo: 60,
        retiradaPausaInicio: "",
        retiradaPausaFim: "",
        bannerUrl: "assets/fundo-hero.jpg",
        // Entrega: taxa por bairro (editável no admin → Configurações)
        taxasEntrega: [
            { bairro: "Campo Belo", taxa: 3 },
            { bairro: "Recanto dos Girassóis", taxa: 3 },
            { bairro: "Hortênsias", taxa: 3 },
            { bairro: "Camélias", taxa: 3 },
            { bairro: "Jardim Betânia", taxa: 6 },
            { bairro: "Sítio Piranga", taxa: 6 },
            { bairro: "Chácara das Rosas", taxa: 6 },
            { bairro: "Brigadeiro", taxa: 8 },
            { bairro: "Guajuviras", taxa: 8 },
        ],
        aceitarOutrosBairros: true,
        tempoEntrega: "40 a 45 minutos",
        // Cada complemento além dos grátis, em qualquer açaí
        precoComplementoExtra: 2,
        corPrimaria: "#7A1F4B",
        corSecundaria: "#2B0D1E",
        corDestaque: "#D4A24C",
        heroTag: "Açaí tem amor em cada colher",
        heroTitulo: "Mais que açaí, é sobre momentos doces e especiais",
        heroSubtitulo: "Do seu jeito, do seu gosto — peça em poucos cliques",
        heroCorFundo: "#2B0D1E",
        heroCorFundoFim: "#7A1F4B",
        logoUrl: "assets/logo.jpg",
        entregaDisponivel: true,
        retiradaDisponivel: false, // a Bru só faz entrega
        sobreNome: "Açaí da Bru",
        sobreTexto: "Açaí de qualidade, feito com carinho e montado do seu jeito. Siga a gente no Instagram e fique de olho nas promoções da semana!",
        sobreFoto: "assets/copo-quadrado.jpg",
        sobreLink: "https://www.instagram.com/acaidabru_cb/",
    };
    let configLoja = { ...CONFIG_PADRAO };
    try {
        const configDoc = await db.collection("configuracoes").doc("geral").get();
        if (configDoc.exists) configLoja = { ...CONFIG_PADRAO, ...configDoc.data() };
    } catch (e) {
        console.error("Erro ao carregar configurações da loja:", e);
    }

    // --- ESTADO DA APLICAÇÃO ---
    // (declarado antes de aplicarConfiguracoesDaLoja porque ela pode ajustar tipoEntrega)
    let carrinho = [],
        tipoEntrega = "delivery",
        appliedCoupon = null;

    // Variáveis de estado para filtros
    // null = todos os produtos (chip "Todos"); senão, o id da categoria escolhida.
    let categoriaAtiva = null;
    let termoBusca = "";

    // Calcula se uma cor hexadecimal é "clara" (pra decidir se o texto por cima
    // dela deve ficar branco ou escuro, e continuar legível).
    const corEhClara = (hex) => {
        const c = (hex || "").replace("#", "");
        if (c.length !== 6) return false;
        const r = parseInt(c.substr(0, 2), 16) / 255,
            g = parseInt(c.substr(2, 2), 16) / 255,
            b = parseInt(c.substr(4, 2), 16) / 255;
        const lin = (v) => (v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4));
        const luminancia = 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
        return luminancia > 0.5;
    };

    const aplicarConfiguracoesDaLoja = () => {
        document.title = configLoja.nomeLoja;

        const root = document.documentElement;
        if (configLoja.corPrimaria) root.style.setProperty("--primary-color", configLoja.corPrimaria);
        if (configLoja.corSecundaria) root.style.setProperty("--secondary-color", configLoja.corSecundaria);
        if (configLoja.corDestaque) root.style.setProperty("--accent-color", configLoja.corDestaque);

        const logoTitleEl = document.querySelector(".logo h1");
        if (logoTitleEl) logoTitleEl.textContent = configLoja.nomeLoja;

        // Logo: imagem própria (definida pelo admin) — sem imagem cadastrada, o espaço fica vazio
        if (configLoja.logoUrl) {
            logoImgEl.src = configLoja.logoUrl;
            logoImgEl.alt = configLoja.nomeLoja;
            logoImgEl.hidden = false;
        } else {
            logoImgEl.hidden = true;
        }
        // Com logo cadastrado, o nome em texto fica só para leitores de tela (o logo já traz o nome)
        document.querySelector(".logo")?.classList.toggle("logo--com-imagem", !!configLoja.logoUrl);

        const heroTagEl = document.querySelector(".hero-tag"),
            heroTituloEl = document.querySelector(".hero-content h2"),
            heroSubtituloEl = document.querySelector(".hero-content p"),
            heroSectionEl = document.querySelector(".hero-section");
        if (heroTagEl && configLoja.heroTag) heroTagEl.textContent = configLoja.heroTag;
        if (heroTituloEl && configLoja.heroTitulo) heroTituloEl.textContent = configLoja.heroTitulo;
        if (heroSubtituloEl && configLoja.heroSubtitulo) heroSubtituloEl.textContent = configLoja.heroSubtitulo;
        if (heroSectionEl && configLoja.bannerUrl) {
            // Foto de fundo (definida pelo admin em "Foto de fundo do hero") com uma camada escura
            // por cima, pra manter o texto branco legível — no lugar do degradê de cores.
            heroSectionEl.style.backgroundImage = `linear-gradient(to bottom, rgba(43,13,30,.55), rgba(43,13,30,.8)), url("${configLoja.bannerUrl}")`;
            heroSectionEl.classList.add("hero-section--foto");
            heroSectionEl.classList.remove("hero-section--claro");
        } else if (heroSectionEl && configLoja.heroCorFundo) {
            if (configLoja.heroCorFundoFim) {
                // Degradê entre as duas cores escolhidas pelo admin
                root.style.setProperty("--hero-bg-color", `linear-gradient(135deg, ${configLoja.heroCorFundo}, ${configLoja.heroCorFundoFim})`);
                // Só troca pra texto escuro se as DUAS cores forem claras — com uma cor escura no meio,
                // o texto branco continua legível em praticamente todo o degradê.
                heroSectionEl.classList.toggle("hero-section--claro", corEhClara(configLoja.heroCorFundo) && corEhClara(configLoja.heroCorFundoFim));
            } else {
                root.style.setProperty("--hero-bg-color", configLoja.heroCorFundo);
                // Se a cor escolhida for clara, troca o texto/tag pra tons escuros (senão fica ilegível)
                heroSectionEl.classList.toggle("hero-section--claro", corEhClara(configLoja.heroCorFundo));
            }
        }

        const footerEl = document.querySelector("footer p");
        if (footerEl) {
            const ano = new Date().getFullYear();
            footerEl.textContent = `${ano} - ${configLoja.nomeLoja}. Todos os direitos reservados`;
        }

        // Crédito da TF Solutions (produtora do site/sistema) no rodapé
        const footerCreditLinkEl = document.getElementById("footer-credit-link");
        if (footerCreditLinkEl) {
            const msg = "Olá! Vi o site da " + configLoja.nomeLoja + " e queria saber mais sobre esse site/sistema.";
            footerCreditLinkEl.href = `https://wa.me/${TF_SOLUTIONS_WHATSAPP}?text=${encodeURIComponent(msg)}`;
        }

        const pickupDateInput = document.getElementById("pickup-date");
        if (pickupDateInput) {
            const hoje = new Date();
            pickupDateInput.min = hoje.toISOString().split("T")[0];
        }

        const pickupTimeSelect = document.getElementById("pickup-time");
        if (pickupTimeSelect) {
            const [hIni, mIni] = configLoja.retiradaHoraInicio.split(":").map(Number);
            const [hFim, mFim] = configLoja.retiradaHoraFim.split(":").map(Number);
            const inicioMin = hIni * 60 + mIni;
            const fimMin = hFim * 60 + mFim;
            const passo = configLoja.retiradaIntervalo || 60;
            // Horário bloqueado pelo admin (ex: pausa/compromisso pessoal) — some das opções, se configurado
            let pausaInicioMin = null, pausaFimMin = null;
            if (configLoja.retiradaPausaInicio && configLoja.retiradaPausaFim) {
                const [hPI, mPI] = configLoja.retiradaPausaInicio.split(":").map(Number);
                const [hPF, mPF] = configLoja.retiradaPausaFim.split(":").map(Number);
                pausaInicioMin = hPI * 60 + mPI;
                pausaFimMin = hPF * 60 + mPF;
            }
            let opcoes = `<option value="" disabled selected>Selecione</option>`;
            for (let m = inicioMin; m <= fimMin; m += passo) {
                if (pausaInicioMin !== null && m >= pausaInicioMin && m < pausaFimMin) continue;
                const h = String(Math.floor(m / 60)).padStart(2, "0");
                const min = String(m % 60).padStart(2, "0");
                opcoes += `<option value="${h}:${min}">${h}:${min}</option>`;
            }
            pickupTimeSelect.innerHTML = opcoes;
        }

        // Disponibilidade de Entrega/Retirada (configurável pelo admin, ex: motoboy indisponível no dia)
        const entregaBtn = document.querySelector('.delivery-btn[data-option="delivery"]');
        const pickupBtn = document.querySelector('.delivery-btn[data-option="pickup"]');
        const entregaDisponivel = configLoja.entregaDisponivel !== false;
        const retiradaDisponivel = configLoja.retiradaDisponivel !== false;
        if (entregaBtn) entregaBtn.hidden = !entregaDisponivel;
        if (pickupBtn) pickupBtn.hidden = !retiradaDisponivel;
        // Só uma modalidade (ex: a loja só entrega): esconde a escolha e ajusta o título da etapa
        const umaOpcaoSo = entregaDisponivel !== retiradaDisponivel;
        const toggleEl = document.querySelector("#cart-step-2 .options-toggle");
        if (toggleEl) toggleEl.hidden = umaOpcaoSo;
        const tituloEtapa2 = document.querySelector("#cart-step-2 .cart-step-title");
        if (tituloEtapa2) tituloEtapa2.textContent = umaOpcaoSo
            ? (entregaDisponivel ? "Endereço de entrega" : "Agende a retirada")
            : "Como você quer receber?";
        if (!entregaDisponivel && retiradaDisponivel) {
            tipoEntrega = "pickup";
            entregaBtn?.classList.remove("active");
            entregaBtn?.setAttribute("aria-selected", "false");
            pickupBtn?.classList.add("active");
            pickupBtn?.setAttribute("aria-selected", "true");
            deliveryForm.style.display = "none";
            pickupForm.style.display = "block";
        } else if (entregaDisponivel && !retiradaDisponivel) {
            tipoEntrega = "delivery";
            pickupBtn?.classList.remove("active");
            pickupBtn?.setAttribute("aria-selected", "false");
            entregaBtn?.classList.add("active");
            entregaBtn?.setAttribute("aria-selected", "true");
            pickupForm.style.display = "none";
            deliveryForm.style.display = "block";
        }

        // Seção "Sobre a empreendedora" (opcional — só aparece se houver texto configurado)
        const aboutSection = document.getElementById("about-section");
        if (aboutSection && configLoja.sobreTexto) {
            const aboutNomeEl = document.getElementById("about-nome"),
                aboutTextoEl = document.getElementById("about-texto"),
                aboutPhotoEl = document.getElementById("about-photo");
            aboutNomeEl.textContent = configLoja.sobreNome || "";
            aboutTextoEl.textContent = configLoja.sobreTexto;
            if (configLoja.sobreFoto) {
                aboutPhotoEl.src = configLoja.sobreFoto;
                aboutPhotoEl.alt = configLoja.sobreNome || "";
                aboutPhotoEl.hidden = false;
            } else {
                aboutPhotoEl.hidden = true;
            }
            const aboutLinkEl = document.getElementById("about-link");
            if (aboutLinkEl) {
                if (configLoja.sobreLink) {
                    aboutLinkEl.href = configLoja.sobreLink;
                    aboutLinkEl.hidden = false;
                } else {
                    aboutLinkEl.hidden = true;
                }
            }
            const aboutWhatsappEl = document.getElementById("about-whatsapp-link");
            if (aboutWhatsappEl) {
                if (configLoja.whatsapp) {
                    const msg = "Olá! Vi a loja " + configLoja.nomeLoja + " e gostaria de saber mais.";
                    aboutWhatsappEl.href = `https://wa.me/${configLoja.whatsapp}?text=${encodeURIComponent(msg)}`;
                    aboutWhatsappEl.hidden = false;
                } else {
                    aboutWhatsappEl.hidden = true;
                }
            }
            aboutSection.hidden = false;
            const navSobreEl = document.getElementById("nav-sobre-link");
            if (navSobreEl) navSobreEl.hidden = false;
        }
    };
    aplicarConfiguracoesDaLoja();

    const formatarMoeda = (v) =>
        v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
    // Código do produto: usa o código cadastrado pelo admin (etiqueta própria dele) ou,
    // se não tiver, o número sequencial do produto — sempre existe um código pra mostrar,
    // pra facilitar a empreendedora identificar a peça certa na hora de separar o pedido.
    const codigoDoProduto = (p) => p.codigo || `#${p.id}`;
    const getScrollbarWidth = () =>
        window.innerWidth - document.documentElement.clientWidth;
    const lockScroll = () => {
        document.body.style.paddingRight = `${getScrollbarWidth()}px`;
        document.body.classList.add("no-scroll");
    };
    const unlockScroll = () => {
        document.body.style.paddingRight = "";
        document.body.classList.remove("no-scroll");
    };
    const abrirCarrinho = () => {
        cartSidebar.classList.add("show");
        cartOverlay.classList.add("show");
        lockScroll();
    };
    const fecharCarrinho = () => {
        cartSidebar.classList.remove("show");
        cartOverlay.classList.remove("show");
        unlockScroll();
    };

    // --- ETAPAS DO CARRINHO (1: itens · 2: entrega/retirada · 3: pagamento · 4: identificação · 5: resumo) ---
    // Gera um código de pedido de 8 caracteres (2 letras + 6 alfanuméricos), sem usar
    // caracteres fáceis de confundir (O/0, I/1). Não há como garantir 100% de unicidade
    // contra pedidos antigos sem gravar todos os pedidos no Firestore (o que mudaria o
    // schema do banco) — mas o espaço de combinações é enorme (mais de 600 bilhões), então
    // a chance de repetição é desprezível na prática. Dentro da mesma sessão, ainda
    // evitamos repetir gerando de novo em caso de colisão.
    const gerarIdPedido = () => {
        const LETRAS = "ABCDEFGHJKLMNPQRSTUVWXYZ";
        const ALFANUM = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
        const sorteia = (chars) => chars[Math.floor(Math.random() * chars.length)];
        let id;
        do {
            id = sorteia(LETRAS) + sorteia(LETRAS);
            for (let i = 0; i < 6; i++) id += sorteia(ALFANUM);
        } while (idsPedidoGerados.has(id));
        idsPedidoGerados.add(id);
        return id;
    };

    // Endereço de entrega montado a partir dos campos: "Rua X, 123 — Bairro Y"
    const enderecoCompleto = () => {
        const rua = document.getElementById("delivery-address").value.trim();
        const numero = document.getElementById("delivery-numero").value.trim();
        const selectBairro = document.getElementById("delivery-bairro");
        const bairro = selectBairro.value === "__outro"
            ? document.getElementById("delivery-bairro-outro").value.trim()
            : selectBairro.value;
        return `${rua}${numero ? `, ${numero}` : ""}${bairro ? ` — ${bairro}` : ""}`;
    };

    const validarCampos = (ids) => {
        let valid = true;
        ids.forEach((id) => {
            const el = document.getElementById(id);
            if (!el) return;
            let isFieldValid = el.value.trim() !== "";

            // CEP é opcional: vazio vale; preenchido precisa ter os 8 dígitos
            if (id === "delivery-cep") {
                const digitos = el.value.replace(/\D/g, "").length;
                isFieldValid = digitos === 0 || digitos === 8;
            }
            // Celular: DDD + 9 dígitos = 11 números, nem mais nem menos
            if (id.includes("telefone") && isFieldValid) {
                isFieldValid = el.value.replace(/\D/g, "").length === 11;
            }

            if (id.includes("nome") && isFieldValid) {
                if (el.value.trim().split(" ").filter((word) => word).length < 2) {
                    isFieldValid = false;
                }
            }

            if (!isFieldValid) {
                el.classList.add("error");
                valid = false;
            } else {
                el.classList.remove("error");
            }
        });
        if (!valid) {
            alert("Confira os campos marcados em vermelho. O celular precisa ter DDD + 9 dígitos, e o CEP (se preenchido) 8 dígitos.");
        }
        return valid;
    };

    const validarEtapaAtual = () => {
        if (etapaAtual === 1) {
            if (carrinho.length === 0) {
                alert("Seu carrinho está vazio. Adicione produtos antes de continuar.");
                return false;
            }
            return true;
        }
        if (etapaAtual === 2) {
            if (tipoEntrega === "pickup") {
                const dataInput = document.getElementById("pickup-date");
                if (dataInput.value) {
                    const [ano, mes, dia] = dataInput.value.split("-").map(Number);
                    const diaSemana = new Date(ano, mes - 1, dia).getDay();
                    if (!configLoja.retiradaDias.includes(diaSemana)) {
                        dataInput.classList.add("error");
                        alert("A loja não realiza retiradas no dia selecionado. Escolha outra data.");
                        return false;
                    }
                }
                return validarCampos(["pickup-date", "pickup-time"]);
            }
            return validarCampos(["delivery-cep", "delivery-address", "delivery-numero", "delivery-bairro",
                ...(document.getElementById("delivery-bairro").value === "__outro" ? ["delivery-bairro-outro"] : [])]);
        }
        if (etapaAtual === 4) {
            return validarCampos(["identificacao-nome", "identificacao-telefone"]);
        }
        return true;
    };

    const renderResumo = () => {
        const subtotal = carrinho.reduce((acc, item) => acc + item.preco * item.quantidade, 0);
        const discountAmount = calcularDesconto(subtotal);

        resumoItensBloco.innerHTML = `
            <h5>Itens (${carrinho.reduce((acc, i) => acc + i.quantidade, 0)})</h5>
            <ul class="resumo-lista">
                ${carrinho.map((item) => `
                    <li>
                        <span>${item.quantidade}x [${codigoDoProduto(item)}] ${item.nome}${detalhesDoItem(item).length ? ` (${detalhesDoItem(item).join(" · ")})` : ""}</span>
                        <span class="resumo-item-valor">${formatarMoeda(item.preco * item.quantidade)}</span>
                    </li>`).join("")}
            </ul>`;

        if (tipoEntrega === "delivery") {
            const cep = document.getElementById("delivery-cep").value.trim();
            resumoEntregaBloco.innerHTML = `
                <h5>Entrega</h5>
                <p>Endereço: ${enderecoCompleto()}</p>
                ${cep ? `<p>CEP: ${cep}</p>` : ""}
                <p>Taxa de entrega: ${textoTaxaEntrega()}</p>
                ${configLoja.tempoEntrega ? `<p>Tempo estimado: ${configLoja.tempoEntrega}</p>` : ""}`;
        } else {
            const dataInput = document.getElementById("pickup-date").value;
            const hora = document.getElementById("pickup-time").value;
            let dataFormatada = "";
            if (dataInput) {
                const [year, month, day] = dataInput.split("-");
                dataFormatada = `${day}/${month}/${year}`;
            }
            resumoEntregaBloco.innerHTML = `
                <h5>Retirada</h5>
                <p>Data: ${dataFormatada}</p>
                <p>Hora: ${hora}</p>`;
        }

        const paymentMethod = document.querySelector('input[name="payment"]:checked')?.value || "";
        const precisaTalher = document.getElementById("talher-checkbox")?.checked;
        const observacoes = document.getElementById("observacoes-input")?.value.trim();
        let pagamentoHtml = `<h5>Pagamento</h5><p>${paymentMethod}`;
        if (paymentMethod === "Dinheiro") {
            const troco = document.getElementById("troco-para").value;
            pagamentoHtml += troco ? ` (Troco para R$ ${troco})` : " (Não precisa de troco)";
        }
        pagamentoHtml += "</p>";
        if (appliedCoupon) pagamentoHtml += `<p>Cupom: ${appliedCoupon.codigo} (- ${formatarMoeda(discountAmount)})</p>`;
        if (precisaTalher) pagamentoHtml += `<p>Colher/canudo descartável: Sim</p>`;
        if (observacoes) pagamentoHtml += `<p>Observações: ${observacoes}</p>`;
        resumoPagamentoBloco.innerHTML = pagamentoHtml;

        const nome = document.getElementById("identificacao-nome").value;
        const telefone = document.getElementById("identificacao-telefone").value;
        resumoIdentificacaoBloco.innerHTML = `
            <h5>Seus dados</h5>
            <p>${nome}</p>
            <p>${telefone}</p>`;
    };

    const mostrarEtapa = (n) => {
        etapaAtual = n;
        if (n > etapaMaxAlcancada) etapaMaxAlcancada = n;
        cartSteps.forEach((el) => { el.hidden = Number(el.dataset.step) !== n; });
        cartStepDots.forEach((dot) => {
            const step = Number(dot.dataset.step);
            dot.classList.toggle("active", step === n);
            // "done" também controla se o ponto é clicável (CSS: cursor:pointer só em .done) —
            // por isso usa etapaMaxAlcancada (até onde o cliente já validou), não só "step < n".
            dot.classList.toggle("done", step !== n && step <= etapaMaxAlcancada);
        });
        cartNavVoltar.hidden = n === 1;
        cartNavAvancar.hidden = n === 5;
        finishOrderBtn.hidden = n !== 5;
        if (n === 5) renderResumo();
        cartStepsWrap.scrollTop = 0;
    };

    const mostrarSucesso = (pedidoId) => {
        cartSteps.forEach((el) => { el.hidden = true; });
        cartStepsIndicator.hidden = true;
        cartNavButtons.hidden = true;
        pedidoSucessoCodigoElem.textContent = pedidoId;
        cartStepSucesso.hidden = false;
        cartStepsWrap.scrollTop = 0;
    };

    const iniciarNovoPedido = () => {
        carrinho = [];
        appliedCoupon = null;
        couponInput.value = "";
        couponFeedback.textContent = "";
        couponFeedback.classList.remove("success", "error");
        const talherCheckbox = document.getElementById("talher-checkbox");
        if (talherCheckbox) talherCheckbox.checked = false;
        const observacoesInput = document.getElementById("observacoes-input");
        if (observacoesInput) observacoesInput.value = "";
        atualizarCarrinho();
        cartStepsIndicator.hidden = false;
        cartNavButtons.hidden = false;
        cartStepSucesso.hidden = true;
        etapaMaxAlcancada = 1;
        mostrarEtapa(1);
        fecharCarrinho();
    };

    // --- MODAL DE DETALHES DO PRODUTO (carrossel de fotos) ---
    // Mostra a foto principal + fotos extras (campo "galeria", cadastrado no admin) num
    // carrossel, além dos detalhes do produto. Abre ao clicar na foto do card.
    let detailFotos = [];
    let detailIndice = 0;
    let detailProdutoAtual = null;

    const renderDetailCarrossel = () => {
        detailTrack.innerHTML = detailFotos
            .map((src) => `<img src="${src}" alt="${detailProdutoAtual ? detailProdutoAtual.nome : ""}">`)
            .join("");
        const multiplas = detailFotos.length > 1;
        detailPrev.hidden = !multiplas;
        detailNext.hidden = !multiplas;
        detailDots.hidden = !multiplas;
        if (multiplas) {
            detailDots.innerHTML = detailFotos
                .map((_, i) => `<span data-i="${i}"></span>`)
                .join("");
        }
        atualizarPosicaoCarrossel();
    };

    const atualizarPosicaoCarrossel = () => {
        detailTrack.style.transform = `translateX(-${detailIndice * 100}%)`;
        detailDots.querySelectorAll("span").forEach((dot, i) => {
            dot.classList.toggle("active", i === detailIndice);
        });
    };

    const moverCarrossel = (delta) => {
        if (!detailFotos.length) return;
        detailIndice = (detailIndice + delta + detailFotos.length) % detailFotos.length;
        atualizarPosicaoCarrossel();
    };

    // Normaliza as opções de "tamanhos" do produto — sempre devolve pelo menos um
    // tamanho (mesmo produtos sem variação viram um único tamanho "padrão" internamente,
    // pra não precisar duplicar lógica de preço/complementos em outro lugar).
    const tamanhosDoProduto = (produto) => {
        if (Array.isArray(produto.tamanhos) && produto.tamanhos.length) return produto.tamanhos;
        return [{ nome: null, preco: Number(produto.preco) || 0, complementosGratis: 0 }];
    };

    // Estado da seleção atual no modal de detalhes (reseta toda vez que abre um produto)
    let detailTamanhoIdx = 0;
    // Complementos escolhidos POR COPO: produto normal tem 1 copo; combo (campo "copos",
    // ex: Combo Casal = 2) tem um bloco de complementos pra cada copo.
    let detailComplementosPorCopo = [[]];
    let detailAdicionaisSelecionados = [];

    const detailTamanhoAtual = () => {
        const tamanhos = tamanhosDoProduto(detailProdutoAtual);
        return tamanhos[detailTamanhoIdx] || tamanhos[0];
    };
    const coposDoProduto = (produto) => Math.max(1, Number(produto?.copos) || 1);
    // Preço de cada complemento além dos grátis. Vale para qualquer açaí: usa o valor do
    // produto (campo "precoComplementoExtra") ou o padrão da loja (Configurações). 0 = não permite extra.
    const precoComplementoExtra = (produto) => {
        const v = produto?.precoComplementoExtra ?? configLoja.precoComplementoExtra;
        return Number(v) > 0 ? Number(v) : 0;
    };
    const limiteGratisPorCopo = () => Number(detailTamanhoAtual()?.complementosGratis) || 0;
    const qtdComplementosExtras = () => {
        const limite = limiteGratisPorCopo();
        return detailComplementosPorCopo.reduce((acc, sel) => acc + Math.max(0, sel.length - limite), 0);
    };

    const detailPrecoUnitario = () => {
        const base = detailTamanhoAtual()?.preco || 0;
        const adicionais = detailAdicionaisSelecionados.reduce((acc, a) => acc + (Number(a.preco) || 0), 0);
        const extras = qtdComplementosExtras() * precoComplementoExtra(detailProdutoAtual);
        return base + adicionais + extras;
    };

    const renderDetailComplementos = () => {
        const lista = Array.isArray(detailProdutoAtual?.complementosLista) ? detailProdutoAtual.complementosLista : [];
        const limite = limiteGratisPorCopo();
        const precoExtra = precoComplementoExtra(detailProdutoAtual);
        const copos = coposDoProduto(detailProdutoAtual);
        if (!lista.length || limite <= 0) { detailComplementosGroup.hidden = true; return; }
        detailComplementosGroup.hidden = false;

        const dicaEl = document.getElementById("detail-complementos-dica");
        if (dicaEl) {
            dicaEl.textContent = `${limite} grátis${copos > 1 ? " por copo" : ""}`
                + (precoExtra ? ` · cada complemento a mais + ${formatarMoeda(precoExtra)}` : "");
        }

        const contador = (sel) => {
            const extras = Math.max(0, sel.length - limite);
            return extras ? `${limite}/${limite} grátis + ${extras} extra${extras > 1 ? "s" : ""}` : `${sel.length}/${limite}`;
        };
        const itensHtml = (sel, copoIdx) => {
            const atingiuLimite = sel.length >= limite;
            return lista.map((nome) => {
                const marcado = sel.includes(nome);
                // Sem preço de extra configurado, mantém o comportamento antigo: trava no limite grátis
                const desabilitado = !marcado && atingiuLimite && !precoExtra;
                const ehExtra = !marcado && atingiuLimite && precoExtra;
                return `<label class="detail-checklist-item${marcado ? " selecionado" : ""}${desabilitado ? " desabilitado" : ""}">
                    <span class="detail-checklist-item-nome"><input type="checkbox" data-copo="${copoIdx}" data-complemento="${nome}" ${marcado ? "checked" : ""} ${desabilitado ? "disabled" : ""}> ${nome}</span>
                    ${ehExtra ? `<span class="detail-checklist-item-preco">+ ${formatarMoeda(precoExtra)}</span>` : ""}
                </label>`;
            }).join("");
        };

        detailComplementosLista.classList.toggle("multi-copos", copos > 1);
        if (copos > 1) {
            detailComplementosContador.textContent = "";
            const nomeTamanho = detailTamanhoAtual()?.nome || "";
            const tamanhoCopo = (nomeTamanho.match(/\d+\s*ml/i) || [""])[0];
            detailComplementosLista.innerHTML = detailComplementosPorCopo.map((sel, i) => `
                <div class="copo-bloco">
                    <p class="copo-titulo"><i class="fa-solid fa-ice-cream" aria-hidden="true"></i> ${i + 1}º açaí${tamanhoCopo ? ` (${tamanhoCopo})` : ""}
                        <span class="detail-option-counter${sel.length >= limite ? " limite-atingido" : ""}">${contador(sel)}</span></p>
                    <div class="detail-checklist">${itensHtml(sel, i)}</div>
                </div>`).join("");
        } else {
            const sel = detailComplementosPorCopo[0];
            detailComplementosContador.textContent = `(${contador(sel)})`;
            detailComplementosContador.classList.toggle("limite-atingido", sel.length >= limite);
            detailComplementosLista.innerHTML = itensHtml(sel, 0);
        }
    };

    const renderDetailAdicionais = () => {
        const lista = Array.isArray(detailProdutoAtual?.adicionaisPagos) ? detailProdutoAtual.adicionaisPagos : [];
        if (!lista.length) { detailAdicionaisGroup.hidden = true; return; }
        detailAdicionaisGroup.hidden = false;
        detailAdicionaisLista.innerHTML = lista.map((item) => {
            const marcado = detailAdicionaisSelecionados.some((a) => a.nome === item.nome);
            return `<label class="detail-checklist-item${marcado ? " selecionado" : ""}">
                <span class="detail-checklist-item-nome"><input type="checkbox" data-adicional="${item.nome}" ${marcado ? "checked" : ""}> ${item.nome}</span>
                <span class="detail-checklist-item-preco">+ ${formatarMoeda(Number(item.preco) || 0)}</span>
            </label>`;
        }).join("");
    };

    const atualizarPrecoDetalhe = () => {
        detailPriceEl.textContent = formatarMoeda(detailPrecoUnitario());
    };

    const abrirDetalhe = (produtoId) => {
        const produto = produtos.find((p) => p.id === produtoId);
        if (!produto) return;
        detailProdutoAtual = produto;
        detailFotos = [produto.imagem, ...(Array.isArray(produto.galeria) ? produto.galeria : [])].filter(Boolean);
        detailIndice = 0;
        renderDetailCarrossel();

        detailBadgeDestaque.hidden = !produto.destaque;
        detailCodigoEl.textContent = `Código: ${codigoDoProduto(produto)}`;
        detailNomeEl.textContent = produto.nome;
        detailDetailsEl.hidden = true;

        detailDescricaoEl.textContent = produto.descricao || "";

        const esgotado = produto.estoque !== undefined && produto.estoque !== null && Number(produto.estoque) <= 0;
        if (esgotado) {
            detailTagEl.textContent = "Esgotado";
            detailTagEl.className = "product-tag tag-esgotado";
            detailTagEl.hidden = false;
        } else if (produto.disponibilidade === "encomenda") {
            detailTagEl.textContent = `Sob encomenda${produto.prazoDias ? ` · ${produto.prazoDias} dias` : ""}`;
            detailTagEl.className = "product-tag tag-encomenda";
            detailTagEl.hidden = false;
        } else {
            detailTagEl.hidden = true;
        }

        // Reseta a seleção sempre que abre um produto
        detailTamanhoIdx = 0;
        detailComplementosPorCopo = Array.from({ length: coposDoProduto(produto) }, () => []);
        detailAdicionaisSelecionados = [];

        const tamanhos = tamanhosDoProduto(produto);
        const temTamanhos = tamanhos.length > 1;
        if (temTamanhos) {
            detailSizeSelect.innerHTML = tamanhos
                .map((t, i) => `<option value="${i}">${t.nome} — ${formatarMoeda(t.preco)}</option>`)
                .join("");
            detailSizeSelect.value = "0";
            detailSizeGroup.hidden = false;
        } else {
            detailSizeGroup.hidden = true;
        }

        if (produto.opcaoInclusa && Array.isArray(produto.opcaoInclusa.opcoes) && produto.opcaoInclusa.opcoes.length) {
            detailInclusoLabel.textContent = produto.opcaoInclusa.label || "Escolha uma opção";
            detailInclusoSelect.innerHTML =
                `<option value="" selected disabled>Escolha</option>` +
                produto.opcaoInclusa.opcoes.map((o) => `<option value="${o}">${o}</option>`).join("");
            detailInclusoGroup.hidden = false;
        } else {
            detailInclusoGroup.hidden = true;
        }

        renderDetailComplementos();
        renderDetailAdicionais();
        atualizarPrecoDetalhe();

        detailComprarBtn.disabled = esgotado;
        detailComprarBtn.textContent = esgotado ? "Esgotado" : "Adicionar ao carrinho";

        detailOverlay.classList.add("show");
        detailModal.classList.add("show");
        lockScroll();
    };

    const fecharDetalhe = () => {
        detailOverlay.classList.remove("show");
        detailModal.classList.remove("show");
        detailProdutoAtual = null;
        unlockScroll();
    };

    detailClose.addEventListener("click", fecharDetalhe);
    detailOverlay.addEventListener("click", fecharDetalhe);
    detailPrev.addEventListener("click", () => moverCarrossel(-1));
    detailNext.addEventListener("click", () => moverCarrossel(1));
    detailDots.addEventListener("click", (e) => {
        const dot = e.target.closest("span[data-i]");
        if (!dot) return;
        detailIndice = Number.parseInt(dot.dataset.i);
        atualizarPosicaoCarrossel();
    });

    detailSizeSelect.addEventListener("change", () => {
        detailTamanhoIdx = Number(detailSizeSelect.value) || 0;
        // Muda de tamanho pode reduzir o limite de complementos grátis — descarta os que passarem do limite
        // (com complemento extra pago, o que passar do novo limite vira extra; sem ele, corta)
        const novoLimite = limiteGratisPorCopo();
        if (!precoComplementoExtra(detailProdutoAtual)) {
            detailComplementosPorCopo = detailComplementosPorCopo.map((sel) => sel.slice(0, novoLimite));
        }
        renderDetailComplementos();
        atualizarPrecoDetalhe();
    });

    detailComplementosLista.addEventListener("change", (e) => {
        const input = e.target.closest("input[data-complemento]");
        if (!input) return;
        const nome = input.dataset.complemento;
        const copoIdx = Number(input.dataset.copo) || 0;
        let sel = detailComplementosPorCopo[copoIdx] || [];
        if (input.checked) {
            if (!sel.includes(nome)) sel = [...sel, nome];
        } else {
            sel = sel.filter((c) => c !== nome);
        }
        detailComplementosPorCopo[copoIdx] = sel;
        // Mantém a rolagem de cada lista no lugar ao redesenhar
        const rolagens = [...detailComplementosLista.querySelectorAll(".detail-checklist")].map((l) => l.scrollTop);
        const rolagemPrincipal = detailComplementosLista.scrollTop;
        renderDetailComplementos();
        detailComplementosLista.scrollTop = rolagemPrincipal;
        detailComplementosLista.querySelectorAll(".detail-checklist").forEach((l, i) => { l.scrollTop = rolagens[i] || 0; });
        atualizarPrecoDetalhe();
    });

    detailAdicionaisLista.addEventListener("change", (e) => {
        const input = e.target.closest("input[data-adicional]");
        if (!input) return;
        const nome = input.dataset.adicional;
        const item = (detailProdutoAtual.adicionaisPagos || []).find((a) => a.nome === nome);
        if (!item) return;
        if (input.checked) {
            if (!detailAdicionaisSelecionados.some((a) => a.nome === nome)) detailAdicionaisSelecionados.push(item);
        } else {
            detailAdicionaisSelecionados = detailAdicionaisSelecionados.filter((a) => a.nome !== nome);
        }
        renderDetailAdicionais();
        atualizarPrecoDetalhe();
    });

    detailComprarBtn.addEventListener("click", () => {
        if (!detailProdutoAtual || detailComprarBtn.disabled) return;
        if (!detailSizeGroup.hidden && !detailSizeSelect.value) {
            alert("Escolha o tamanho antes de adicionar ao carrinho.");
            detailSizeSelect.focus();
            return;
        }
        if (!detailInclusoGroup.hidden && !detailInclusoSelect.value) {
            alert(`Escolha "${detailInclusoLabel.textContent}" antes de adicionar ao carrinho.`);
            detailInclusoSelect.focus();
            return;
        }
        adicionarAoCarrinho(detailProdutoAtual.id, null, {
            tamanho: detailSizeGroup.hidden ? null : detailTamanhoAtual().nome,
            opcaoInclusa: detailInclusoGroup.hidden ? null : detailInclusoSelect.value,
            complementos: detailComplementosPorCopo.flat(),
            complementosPorCopo: coposDoProduto(detailProdutoAtual) > 1 ? detailComplementosPorCopo.map((sel) => [...sel]) : null,
            complementosExtras: qtdComplementosExtras(),
            adicionais: [...detailAdicionaisSelecionados],
            preco: detailPrecoUnitario(),
            precoBase: Number(detailTamanhoAtual()?.preco) || 0,
            nomeTamanhoBase: detailTamanhoAtual()?.nome || "",
            limiteGratis: limiteGratisPorCopo(),
            precoExtra: precoComplementoExtra(detailProdutoAtual),
        });
        fecharDetalhe();
    });

    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape" && detailModal.classList.contains("show")) fecharDetalhe();
        if (detailModal.classList.contains("show") && detailFotos.length > 1) {
            if (e.key === "ArrowLeft") moverCarrossel(-1);
            if (e.key === "ArrowRight") moverCarrossel(1);
        }
    });

    const animacaoVoarParaCarrinho = (productCard) => {
        const productImg = productCard.querySelector(".product-img"),
            imgRect = productImg.getBoundingClientRect(),
            cartRect = cartIcon.getBoundingClientRect(),
            flyingImg = document.createElement("img");
        flyingImg.src = productImg.src;
        flyingImg.classList.add("product-image-fly");
        flyingImg.style.left = `${imgRect.left}px`;
        flyingImg.style.top = `${imgRect.top}px`;
        flyingImg.style.width = `${imgRect.width}px`;
        flyingImg.style.height = `${imgRect.height}px`;
        document.body.appendChild(flyingImg);
        requestAnimationFrame(() => {
            flyingImg.style.left = `${cartRect.left + cartRect.width / 2}px`;
            flyingImg.style.top = `${cartRect.top + cartRect.height / 2}px`;
            flyingImg.style.width = "0px";
            flyingImg.style.height = "0px";
            flyingImg.style.opacity = "0";
        });
        flyingImg.addEventListener("transitionend", () => flyingImg.remove());
    };

    // Ponto único pra trocar de categoria — chamado pelos ladrilhos de categoria
    // e pelo botão "voltar às categorias".
    // Promoções com data de término ("promoAte": "AAAA-MM-DD") saem da loja sozinhas
    // depois desse dia — sem precisar lembrar de desativar no admin.
    const promoVencida = (p) => {
        if (!p.promoAte) return false;
        const fim = new Date(`${p.promoAte}T23:59:59`);
        return !Number.isNaN(fim.getTime()) && fim < new Date();
    };
    produtos = produtos.filter((p) => !promoVencida(p));

    // --- CARROSSEL DE PROMOÇÕES (logo abaixo do topo) ---
    // Mostra os produtos marcados como "destaque" usando a arte da promoção
    // (campo "banner" ou a primeira foto da galeria). Clicar abre o produto.
    const promoSection = document.getElementById("promocoes"),
        promoTrack = document.getElementById("promo-track"),
        promoDots = document.getElementById("promo-dots");
    const renderPromocoes = () => {
        const promos = produtos.filter((p) => p.destaque);
        if (!promoSection || !promos.length) {
            if (promoSection) promoSection.hidden = true;
            return;
        }
        promoTrack.innerHTML = promos
            .map((p) => {
                const arte = p.banner || (Array.isArray(p.galeria) && p.galeria[0]) || p.imagem;
                return `
                <button class="promo-card" type="button" data-id="${p.id}" aria-label="Ver promoção: ${p.nome}">
                    <img class="promo-card-arte" src="${arte}" alt="${p.nome}" loading="lazy">
                    <span class="promo-card-rodape">
                        <span class="promo-card-nome">${p.nome}</span>
                        <span class="promo-card-cta">${formatarMoeda(Math.min(...tamanhosDoProduto(p).map((t) => Number(t.preco) || 0)))} <i class="fa-solid fa-arrow-right" aria-hidden="true"></i></span>
                    </span>
                </button>`;
            })
            .join("");
        promoDots.innerHTML = promos.length > 1
            ? promos.map((_, i) => `<button class="promo-dot${i === 0 ? " active" : ""}" type="button" data-idx="${i}" aria-label="Promoção ${i + 1}"></button>`).join("")
            : "";
        promoSection.hidden = false;
    };
    const promoIndiceAtual = () => {
        const cards = [...promoTrack.children];
        const centro = promoTrack.scrollLeft + promoTrack.clientWidth / 2;
        let melhor = 0, dist = Infinity;
        cards.forEach((c, i) => {
            const d = Math.abs(c.offsetLeft + c.offsetWidth / 2 - centro);
            if (d < dist) { dist = d; melhor = i; }
        });
        return melhor;
    };
    const irParaPromo = (i) => {
        const card = promoTrack.children[i];
        if (!card) return;
        promoTrack.scrollTo({ left: card.offsetLeft - (promoTrack.clientWidth - card.offsetWidth) / 2, behavior: "smooth" });
    };
    if (promoTrack) {
        promoTrack.addEventListener("scroll", () => {
            const i = promoIndiceAtual();
            promoDots.querySelectorAll(".promo-dot").forEach((d, j) => d.classList.toggle("active", j === i));
        }, { passive: true });
        promoDots.addEventListener("click", (e) => {
            const dot = e.target.closest(".promo-dot");
            if (dot) irParaPromo(Number(dot.dataset.idx));
        });
        document.getElementById("promo-prev")?.addEventListener("click", () => irParaPromo(Math.max(0, promoIndiceAtual() - 1)));
        document.getElementById("promo-next")?.addEventListener("click", () => irParaPromo(Math.min(promoTrack.children.length - 1, promoIndiceAtual() + 1)));
        // Passa sozinho a cada 5s; para quando o cliente mexe no carrossel
        let promoAuto = setInterval(() => {
            const total = promoTrack.children.length;
            if (total > 1 && promoTrack.scrollWidth > promoTrack.clientWidth + 4) irParaPromo((promoIndiceAtual() + 1) % total);
        }, 5000);
        ["pointerdown", "touchstart", "wheel"].forEach((ev) =>
            promoTrack.addEventListener(ev, () => clearInterval(promoAuto), { passive: true, once: true }));
    }

    const selecionarCategoria = (categoriaId) => {
        categoriaAtiva = categoriaId === "all" ? null : categoriaId;
        filtrarEMostrarProdutos();
    };

    // Barra de filtros (chips) acima dos produtos: "Todos" + uma por categoria que tenha produto.
    const renderFiltros = () => {
        const heading = document.getElementById("products-heading");
        const comProduto = categorias.filter((c) => produtos.some((p) => p.categoria === c.id));
        const chip = (id, nome, icone) => `
            <button class="category-chip${(categoriaAtiva || "all") === id ? " active" : ""}" type="button" data-category="${id}">
                ${icone ? `<i class="fa-solid ${icone}" aria-hidden="true"></i>` : ""}${nome}
            </button>`;
        heading.innerHTML = `<div class="category-chips" role="tablist" aria-label="Filtrar por categoria">
            ${chip("all", "Todos", "fa-border-all")}
            ${comProduto.map((c) => chip(c.id, c.nome, c.icone)).join("")}
        </div>`;
        heading.hidden = false;
    };

    const cardDoProduto = (p) => {
        const tagEncomenda =
            p.disponibilidade === "encomenda"
                ? `<span class="product-tag tag-encomenda">Sob encomenda${p.prazoDias ? ` · ${p.prazoDias} dias` : ""}</span>`
                : "";
        const esgotado =
            p.estoque !== undefined &&
            p.estoque !== null &&
            Number(p.estoque) <= 0;
        const tagEsgotado = esgotado
            ? `<span class="product-tag tag-esgotado">Esgotado</span>`
            : "";
        const badgeDestaque = p.destaque
            ? `<span class="product-badge-destaque"><i class="fa-solid fa-star" aria-hidden="true"></i> Promoção</span>`
            : "";
        // Preço: produto com um único tamanho mostra o valor fixo; com vários
        // tamanhos mostra "A partir de" com o menor preço cadastrado.
        const tamanhos = tamanhosDoProduto(p);
        const precos = tamanhos.map((t) => Number(t.preco) || 0);
        const precoTexto = tamanhos.length > 1
            ? `A partir de ${formatarMoeda(Math.min(...precos))}`
            : formatarMoeda(precos[0]);
        // Produto com qualquer tipo de personalização sempre abre os detalhes antes de ir
        // pro carrinho — só produtos 100% simples adicionam direto.
        const precisaDetalhe = tamanhos.length > 1
            || (p.opcaoInclusa && Array.isArray(p.opcaoInclusa.opcoes) && p.opcaoInclusa.opcoes.length)
            || (Array.isArray(p.complementosLista) && p.complementosLista.length && tamanhos.some(t => Number(t.complementosGratis) > 0))
            || (Array.isArray(p.adicionaisPagos) && p.adicionaisPagos.length);
        return `
            <div class="product-card${esgotado ? " produto-esgotado" : ""}" data-id="${p.id}" data-precisa-detalhe="${precisaDetalhe ? "1" : ""}">
                ${badgeDestaque}
                <img class="product-img" src="${p.imagem}" alt="${p.nome}" loading="lazy">
                <div class="product-info">
                    <p class="product-code">Código: ${codigoDoProduto(p)}</p>
                    <h3 class="product-name">${p.nome}</h3>
                    <p class="product-description">${p.descricao}</p>
                    ${esgotado ? tagEsgotado : tagEncomenda}
                    <p class="product-price">${precoTexto}</p>
                    <button class="product-button"${esgotado ? " disabled" : ""}>${esgotado ? "Esgotado" : (precisaDetalhe ? "Escolher" : "Adicionar ao carrinho")}</button>
                </div>
            </div>
        `;
    };

    // Função para filtrar e mostrar produtos.
    // Sem filtro: todos os produtos já na primeira tela, agrupados por categoria.
    // Com categoria ou busca: só os que batem, numa grade única.
    const filtrarEMostrarProdutos = () => {
        renderFiltros();
        const container = document.querySelector(".products-container");
        const buscando = termoBusca.trim() !== "";

        let produtosFiltrados = produtos;
        if (categoriaAtiva) {
            produtosFiltrados = produtosFiltrados.filter((produto) => produto.categoria === categoriaAtiva);
        }
        if (buscando) {
            const termo = termoBusca.toLowerCase();
            produtosFiltrados = produtosFiltrados.filter(
                (produto) =>
                    produto.nome.toLowerCase().includes(termo) ||
                    (produto.descricao || "").toLowerCase().includes(termo),
            );
        }
        // Produtos em destaque aparecem primeiro (mantendo a ordem entre eles estável)
        produtosFiltrados = [...produtosFiltrados].sort(
            (a, b) => (b.destaque ? 1 : 0) - (a.destaque ? 1 : 0),
        );

        if (produtosFiltrados.length === 0) {
            container.innerHTML = `
                <div style="grid-column: 1 / -1; text-align: center; padding: 3rem; color: #999;">
                    <i class="fa-solid fa-box-open" style="font-size: 3rem; margin-bottom: 1rem;"></i>
                    <p style="font-size: 1.2rem; font-weight: 600;">Nenhum produto encontrado</p>
                </div>`;
            return;
        }

        if (!categoriaAtiva && !buscando) {
            const grupos = categorias
                .map((c) => ({ c, itens: produtosFiltrados.filter((p) => p.categoria === c.id) }))
                .filter((g) => g.itens.length);
            const semCategoria = produtosFiltrados.filter((p) => !categorias.some((c) => c.id === p.categoria));
            if (semCategoria.length) grupos.push({ c: { nome: "Outros" }, itens: semCategoria });
            container.innerHTML = grupos
                .map((g) => `<h3 class="products-group-title">${g.c.nome}</h3>${g.itens.map(cardDoProduto).join("")}`)
                .join("");
            return;
        }

        container.innerHTML =
            (buscando ? `<h3 class="products-group-title">Resultado da busca</h3>` : "") +
            produtosFiltrados.map(cardDoProduto).join("");
    };

    // Produtos personalizados (tamanho/opção/complementos/adicionais) geram uma "chave"
    // própria no carrinho pra cada combinação diferente, assim dá pra ter o mesmo produto
    // configurado de jeitos diferentes como itens separados. O controle de estoque continua
    // somando as quantidades de TODAS as combinações do mesmo produto, já que o estoque é
    // cadastrado por produto, não por combinação.
    const adicionarAoCarrinho = (produtoId, productCard, opcoes) => {
        const produto = produtos.find((p) => p.id === produtoId);
        if (!produto) return;
        opcoes = opcoes || {};
        const tamanho = opcoes.tamanho || null;
        const opcaoInclusa = opcoes.opcaoInclusa || null;
        const complementos = Array.isArray(opcoes.complementos) ? opcoes.complementos : [];
        const adicionais = Array.isArray(opcoes.adicionais) ? opcoes.adicionais : [];
        const complementosPorCopo = Array.isArray(opcoes.complementosPorCopo) ? opcoes.complementosPorCopo : null;
        const complementosExtras = Number(opcoes.complementosExtras) || 0;
        const precoBase = opcoes.precoBase !== undefined ? Number(opcoes.precoBase) : null;
        const nomeTamanhoBase = opcoes.nomeTamanhoBase || "";
        const limiteGratis = Number(opcoes.limiteGratis) || 0;
        const precoExtra = Number(opcoes.precoExtra) || 0;
        const preco = opcoes.preco !== undefined ? opcoes.preco : (tamanhosDoProduto(produto)[0]?.preco || Number(produto.preco) || 0);

        const chave = [
            produtoId,
            tamanho || "",
            opcaoInclusa || "",
            complementosPorCopo
                ? complementosPorCopo.map((sel) => [...sel].sort().join(",")).join("|")
                : [...complementos].sort().join(","),
            adicionais.map((a) => a.nome).sort().join(","),
        ].join("__");

        const qtdAtualTotal = carrinho
            .filter((item) => item.id === produtoId)
            .reduce((acc, item) => acc + item.quantidade, 0);
        if (
            produto.estoque !== undefined &&
            produto.estoque !== null &&
            qtdAtualTotal + 1 > Number(produto.estoque)
        ) {
            alert(
                `Ops! Só temos ${produto.estoque} unidade(s) de "${produto.nome}" disponível(is) no momento.`,
            );
            return;
        }

        if (productCard) animacaoVoarParaCarrinho(productCard);
        const itemNoCarrinho = carrinho.find((item) => item._chave === chave);
        if (itemNoCarrinho) itemNoCarrinho.quantidade++;
        else carrinho.push({
            ...produto,
            preco,
            quantidade: 1,
            tamanhoSelecionado: tamanho,
            opcaoInclusaSelecionada: opcaoInclusa,
            complementosSelecionados: complementos,
            complementosPorCopo,
            complementosExtras,
            precoBase,
            nomeTamanhoBase,
            limiteGratis,
            precoExtra,
            adicionaisSelecionados: adicionais,
            _chave: chave,
        });
        atualizarCarrinho();
    };

    // Monta a lista de personalização de um item do carrinho (tamanho, opção inclusa,
    // complementos grátis e adicionais pagos) pra reaproveitar no carrinho, no resumo e
    // na mensagem do WhatsApp.
    const detalhesDoItem = (item) => {
        const partes = [];
        if (item.tamanhoSelecionado) partes.push(item.tamanhoSelecionado);
        if (item.opcaoInclusaSelecionada) partes.push(item.opcaoInclusaSelecionada);
        if (item.complementosPorCopo?.length > 1) {
            item.complementosPorCopo.forEach((sel, i) =>
                partes.push(`${i + 1}º açaí: ${sel.length ? sel.join(", ") : "sem complementos"}`));
        } else if (item.complementosSelecionados?.length) {
            partes.push(`Complementos: ${item.complementosSelecionados.join(", ")}`);
        }
        if (item.complementosExtras) partes.push(`${item.complementosExtras} complemento${item.complementosExtras > 1 ? "s" : ""} extra${item.complementosExtras > 1 ? "s" : ""}`);
        if (item.adicionaisSelecionados?.length) partes.push(`Adicionais: ${item.adicionaisSelecionados.map(a => a.nome).join(", ")}`);
        return partes;
    };

    const alterarQuantidade = (chave, acao) => {
        const item = carrinho.find((i) => i._chave === chave);
        if (!item) return;
        if (acao === "aumentar") {
            const produto = produtos.find((p) => p.id === item.id);
            const qtdAtualTotal = carrinho
                .filter((i) => i.id === item.id)
                .reduce((acc, i) => acc + i.quantidade, 0);
            if (
                produto &&
                produto.estoque !== undefined &&
                produto.estoque !== null &&
                qtdAtualTotal + 1 > Number(produto.estoque)
            ) {
                alert(
                    `Ops! Só temos ${produto.estoque} unidade(s) de "${produto.nome}" disponível(is) no momento.`,
                );
                return;
            }
            item.quantidade++;
        } else if (acao === "diminuir") {
            item.quantidade--;
            if (item.quantidade <= 0)
                carrinho = carrinho.filter((i) => i._chave !== chave);
        }
        atualizarCarrinho();
    };

    const atualizarCarrinho = () => {
        if (carrinho.length === 0) {
            cartBody.innerHTML = `<div class="cart-empty"><i class="fa-solid fa-box-open"></i><p>Seu carrinho está vazio.</p></div>`;
        } else {
            cartBody.innerHTML = carrinho
                .map(
                    (item) =>
                        `<div class="cart-item" data-key="${item._chave}">
                            <img src="${item.imagem}" alt="${item.nome}" class="cart-item-img">
                            <div class="cart-item-info">
                                <p class="cart-item-codigo">Código: ${codigoDoProduto(item)}</p>
                                <h4 class="cart-item-name">${item.nome}</h4>
                                ${detalhesDoItem(item).map(d => `<p class="cart-item-desc">${d}</p>`).join("")}
                                <p class="cart-item-price">${formatarMoeda(item.preco)}${item.quantidade > 1 ? ` <span class="cart-item-price-total">(${item.quantidade}x = ${formatarMoeda(item.preco * item.quantidade)})</span>` : ""}</p>
                                <div class="cart-item-controls">
                                    <button class="quantity-btn" data-action="diminuir">-</button>
                                    <span class="quantity">${item.quantidade}</span>
                                    <button class="quantity-btn" data-action="aumentar">+</button>
                                </div>
                            </div>
                            <button class="remove-item-btn">&times;</button>
                        </div>`,
                )
                .join("");
        }
        const qtdTotalItens = carrinho.reduce((acc, item) => acc + item.quantidade, 0);
        cartItemsCountElem.textContent = `${qtdTotalItens} ${qtdTotalItens === 1 ? "item" : "itens"}`;
        const subtotal = carrinho.reduce(
            (acc, item) => acc + item.preco * item.quantidade,
            0,
        );

        if (
            appliedCoupon &&
            appliedCoupon.valorMinimo &&
            subtotal < appliedCoupon.valorMinimo
        ) {
            appliedCoupon = null;
            couponFeedback.textContent =
                "Cupom removido: o pedido não atinge mais o valor mínimo exigido.";
            couponFeedback.classList.remove("success");
            couponFeedback.classList.add("error");
        }

        const discountAmount = calcularDesconto(subtotal);
        const taxaEntrega = carrinho.length ? taxaEntregaAtual() : 0;
        const total = subtotal - discountAmount + taxaEntrega;
        subtotalElem.textContent = formatarMoeda(subtotal);
        const linhaTaxa = document.querySelector(".delivery-fee-line");
        if (linhaTaxa) {
            const mostrar = tipoEntrega === "delivery" && textoTaxaEntrega();
            linhaTaxa.style.display = mostrar ? "flex" : "none";
            document.getElementById("cart-delivery-fee").textContent = textoTaxaEntrega();
        }
        if (discountAmount > 0) {
            cartDiscountElem.textContent = `- ${formatarMoeda(discountAmount)}`;
            discountLineElem.style.display = "flex";
        } else {
            discountLineElem.style.display = "none";
        }
        totalElem.textContent = formatarMoeda(total);
        cartBadge.textContent = qtdTotalItens;
        cartIconTotalElem.textContent = formatarMoeda(total);
        cartStep1TotalElem.textContent = formatarMoeda(total);
        cartNavAvancarTotalElem.textContent = `(${formatarMoeda(total)})`;
        finishOrderTotalElem.textContent = `— ${formatarMoeda(total)}`;
        cartNavAvancar.disabled = carrinho.length === 0 && etapaAtual === 1;
        finishOrderBtn.disabled = carrinho.length === 0;

        if (carrinho.length > 0 && window.innerWidth <= 768) {
            bannerTotalElem.textContent = formatarMoeda(total);
            viewCartBanner.classList.add("show");
        } else {
            viewCartBanner.classList.remove("show");
        }
    };

    const calcularDesconto = (subtotal) => {
        if (!appliedCoupon) return 0;
        if (appliedCoupon.tipo === "fixo")
            return Math.min(appliedCoupon.valor, subtotal);
        return subtotal * (appliedCoupon.valor / 100);
    };

    const applyCoupon = () => {
        const code = couponInput.value.trim().toUpperCase();
        const subtotal = carrinho.reduce(
            (acc, item) => acc + item.preco * item.quantidade,
            0,
        );
        const foundCoupon = coupons.find((c) => c.codigo === code);
        couponFeedback.classList.remove("success", "error");

        if (!foundCoupon) {
            appliedCoupon = null;
            couponFeedback.textContent = "Cupom inválido.";
            couponFeedback.classList.add("error");
        } else if (foundCoupon.ativo === false) {
            appliedCoupon = null;
            couponFeedback.textContent = "Este cupom não está mais disponível.";
            couponFeedback.classList.add("error");
        } else if (
            foundCoupon.validade &&
            new Date(`${foundCoupon.validade}T23:59:59`) < new Date()
        ) {
            appliedCoupon = null;
            couponFeedback.textContent = "Este cupom expirou.";
            couponFeedback.classList.add("error");
        } else if (
            foundCoupon.valorMinimo &&
            subtotal < foundCoupon.valorMinimo
        ) {
            appliedCoupon = null;
            couponFeedback.textContent = `Pedido mínimo de ${formatarMoeda(
                foundCoupon.valorMinimo,
            )} para usar este cupom.`;
            couponFeedback.classList.add("error");
        } else {
            appliedCoupon = foundCoupon;
            couponFeedback.textContent = "Cupom aplicado!";
            couponFeedback.classList.add("success");
        }
        atualizarCarrinho();
    };

    // --- MENSAGEM DO WHATSAPP: CADA ITEM COM SEUS VALORES ---
    // Mostra de onde sai o valor de cada item (preço do tamanho + complementos extras +
    // adicionais), pra loja conferir a conta antes de confirmar o pedido.
    const itemDetalhadoWhatsApp = (item, n) => {
        const linhas = [];
        const titulo = `${item.nome}${item.tamanhoSelecionado ? ` (${item.tamanhoSelecionado})` : ""}`;
        linhas.push(`*${n}) ${item.quantidade}x ${titulo}* [${codigoDoProduto(item)}]`);

        const base = item.precoBase ?? null;
        // Linha do preço base: usa o nome do tamanho mesmo quando o produto tem um só (ex: "2 açaís de 400ml")
        const nomeBase = item.tamanhoSelecionado || !item.nomeTamanhoBase ? titulo : `${item.nome} (${item.nomeTamanhoBase})`;
        if (base !== null) linhas.push(`   • ${nomeBase}: ${formatarMoeda(base)}`);
        if (item.opcaoInclusaSelecionada) linhas.push(`   • ${item.opcaoInclusa?.label || "Opção"}: ${item.opcaoInclusaSelecionada}`);

        // Complementos: os primeiros (até o limite) são grátis; o que passar é extra pago
        const limite = Number(item.limiteGratis) || 0;
        const precoExtra = Number(item.precoExtra) || 0;
        const blocos = item.complementosPorCopo?.length > 1
            ? item.complementosPorCopo.map((sel, i) => ({ rotulo: `${i + 1}º açaí — `, sel }))
            : (item.complementosSelecionados?.length ? [{ rotulo: "", sel: item.complementosSelecionados }] : []);
        blocos.forEach(({ rotulo, sel }) => {
            const gratis = limite ? sel.slice(0, limite) : sel;
            const extras = limite ? sel.slice(limite) : [];
            const C = rotulo ? "complementos" : "Complementos";
            linhas.push(`   • ${rotulo}${C} grátis: ${gratis.length ? gratis.join(", ") : "nenhum"}`);
            if (extras.length) {
                linhas.push(`   • ${rotulo}${C} extras: ${extras.join(", ")} (${extras.length} x ${formatarMoeda(precoExtra)}) = ${formatarMoeda(extras.length * precoExtra)}`);
            }
        });

        (item.adicionaisSelecionados || []).forEach((a) => {
            linhas.push(`   • + ${a.nome}: ${formatarMoeda(Number(a.preco) || 0)}`);
        });

        const totalItem = item.preco * item.quantidade;
        linhas.push(item.quantidade > 1
            ? `   *Valor do item: ${formatarMoeda(item.preco)} x ${item.quantidade} = ${formatarMoeda(totalItem)}*`
            : `   *Valor do item: ${formatarMoeda(totalItem)}*`);
        return linhas.join("\n");
    };

    // --- NUMERAÇÃO DIÁRIA DOS PEDIDOS ---
    // Contador no Firestore por dia (contadores/pedidos-AAAA-MM-DD): cada pedido soma 1, e no
    // dia seguinte começa outro documento — então a numeração "zera" sozinha à meia-noite.
    // As regras do Firestore só deixam o site somar exatamente +1 (ver regras.md).
    const hojeEmSaoPaulo = () => {
        const partes = Object.fromEntries(new Intl.DateTimeFormat("en-CA", {
            timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit",
        }).formatToParts(new Date()).map((p) => [p.type, p.value]));
        return { iso: `${partes.year}-${partes.month}-${partes.day}`, br: `${partes.day}/${partes.month}` };
    };
    const proximoNumeroDoDia = async () => {
        const ref = db.collection("contadores").doc(`pedidos-${hojeEmSaoPaulo().iso}`);
        const somarUm = () => db.runTransaction(async (t) => {
            const doc = await t.get(ref);
            const proximo = (doc.exists ? Number(doc.data().total) || 0 : 0) + 1;
            t.set(ref, { total: proximo });
            return proximo;
        });
        // Dois pedidos no mesmo instante: o que chegar depois é recusado pela regra (+1 sobre
        // um valor que já mudou). Espera um pouquinho e tenta de novo, pegando o número seguinte.
        const transacao = (async () => {
            for (let tentativa = 1; ; tentativa++) {
                try { return await somarUm(); }
                catch (e) {
                    if (tentativa >= 5 || !["permission-denied", "aborted", "failed-precondition"].includes(e.code)) throw e;
                    await new Promise((r) => setTimeout(r, 150 + Math.random() * 350));
                }
            }
        })();
        // Sem internet boa ou com as regras ainda não publicadas: não trava o pedido,
        // cai no código aleatório de antes depois de alguns segundos.
        const limite = new Promise((_, rej) => setTimeout(() => rej(new Error("tempo esgotado")), 5000));
        return Promise.race([transacao, limite]);
    };

    // --- DADOS DO CLIENTE SALVOS NO CELULAR (localStorage) ---
    // Ficam só no navegador do próprio cliente; nada disso vai para o banco.
    const CHAVE_CLIENTE = "acaidabru:cliente";
    const lerClienteSalvo = () => {
        try { return JSON.parse(localStorage.getItem(CHAVE_CLIENTE) || "null"); } catch (e) { return null; }
    };
    const salvarCliente = () => {
        try {
            if (!document.getElementById("salvar-dados-checkbox")?.checked) {
                localStorage.removeItem(CHAVE_CLIENTE);
                return;
            }
            const v = (id) => document.getElementById(id)?.value.trim() || "";
            const anterior = lerClienteSalvo() || {};
            const dados = { ...anterior, nome: v("identificacao-nome"), telefone: v("identificacao-telefone") };
            // Endereço só é atualizado quando o pedido é de entrega (retirada não apaga o endereço salvo)
            if (tipoEntrega === "delivery") Object.assign(dados, {
                cep: v("delivery-cep"), rua: v("delivery-address"), numero: v("delivery-numero"),
                bairro: v("delivery-bairro"), bairroOutro: v("delivery-bairro-outro"),
            });
            localStorage.setItem(CHAVE_CLIENTE, JSON.stringify(dados));
        } catch (e) { /* navegador sem armazenamento (aba anônima etc.) — segue sem salvar */ }
    };
    const preencherClienteSalvo = () => {
        const c = lerClienteSalvo();
        if (!c) return;
        const set = (id, valor) => { const el = document.getElementById(id); if (el && valor && !el.value) el.value = valor; };
        set("identificacao-nome", c.nome);
        set("identificacao-telefone", c.telefone);
        set("delivery-cep", c.cep);
        set("delivery-address", c.rua);
        set("delivery-numero", c.numero);
        const select = document.getElementById("delivery-bairro");
        if (c.bairro && [...select.options].some((o) => o.value === c.bairro)) {
            select.value = c.bairro;
            set("delivery-bairro-outro", c.bairroOutro);
            select.dispatchEvent(new Event("change"));
        }
        document.getElementById("dados-salvos-aviso").hidden = false;
    };
    document.getElementById("dados-salvos-limpar").addEventListener("click", () => {
        try { localStorage.removeItem(CHAVE_CLIENTE); } catch (e) { /* ignora */ }
        ["identificacao-nome", "identificacao-telefone", "delivery-cep", "delivery-address", "delivery-numero", "delivery-bairro-outro"]
            .forEach((id) => { document.getElementById(id).value = ""; });
        const select = document.getElementById("delivery-bairro");
        select.value = "";
        select.dispatchEvent(new Event("change"));
        document.getElementById("dados-salvos-aviso").hidden = true;
        document.getElementById("delivery-address").focus();
    });

    const finalizarPedido = async () => {
        // Rede de segurança: os campos já foram validados etapa a etapa, mas confere
        // de novo aqui (ex: caso o cliente volte numa etapa pelos pontinhos e apague algo).
        if (carrinho.length === 0) {
            alert("Seu carrinho está vazio.");
            return;
        }

        const fieldsToValidate = tipoEntrega === "delivery"
            ? ["delivery-cep", "delivery-address", "delivery-numero", "delivery-bairro",
                ...(document.getElementById("delivery-bairro").value === "__outro" ? ["delivery-bairro-outro"] : []),
                "identificacao-nome", "identificacao-telefone"]
            : ["pickup-date", "pickup-time", "identificacao-nome", "identificacao-telefone"];

        if (!validarCampos(fieldsToValidate)) return;
        if (finishOrderBtn.dataset.enviando) return;

        // Abre a aba do WhatsApp já no clique (antes de esperar o banco) — senão o celular
        // bloqueia a janela por achar que não foi o cliente que pediu.
        const janelaWhats = window.open("", "_blank");
        finishOrderBtn.dataset.enviando = "1";
        const textoBotao = finishOrderBtn.innerHTML;
        finishOrderBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin" aria-hidden="true"></i> Gerando nº do pedido...`;

        let numeroDoDia = null;
        try { numeroDoDia = await proximoNumeroDoDia(); }
        catch (e) { console.warn("Numeração diária indisponível, usando código aleatório:", e); }
        finishOrderBtn.innerHTML = textoBotao;
        delete finishOrderBtn.dataset.enviando;

        const pedidoId = numeroDoDia ? String(numeroDoDia) : gerarIdPedido();
        const cabecalhoPedido = numeroDoDia
            ? `*Pedido nº ${numeroDoDia}* — ${hojeEmSaoPaulo().br}`
            : `*Nº do Pedido:* #${pedidoId}`;
        const numeroWhatsApp = configLoja.whatsapp;
        const itensPedido = carrinho.map((item, i) => itemDetalhadoWhatsApp(item, i + 1)).join("\n\n");
        const subtotal = carrinho.reduce(
            (acc, item) => acc + item.preco * item.quantidade,
            0,
        );
        const discountAmount = calcularDesconto(subtotal);
        let cupomInfo = "";
        if (appliedCoupon) {
            cupomInfo = `\n*Cupom Aplicado:* ${appliedCoupon.codigo} (${formatarMoeda(
                discountAmount,
            )})`;
        }

        const taxaEntrega = taxaEntregaAtual();
        const taxaInfo = tipoEntrega === "delivery" ? `\n*Taxa de entrega:* ${textoTaxaEntrega()}` : "";
        const total = subtotal - discountAmount + taxaEntrega;
        const qtdItens = carrinho.reduce((acc, i) => acc + i.quantidade, 0);
        const bairroTaxa = tipoEntrega === "delivery" && bairroEscolhido() ? ` (${bairroEscolhido()})` : "";
        let mensagem = `*-- NOVO PEDIDO ${configLoja.nomeLoja} --*\n${cabecalhoPedido}\n\n`
            + `🧾 *ITENS DO PEDIDO*\n\n${itensPedido}\n\n`
            + `-------------------------\n`
            + `*Subtotal (${qtdItens} ${qtdItens === 1 ? "item" : "itens"}):* ${formatarMoeda(subtotal)}`
            + (appliedCoupon ? `\n*Desconto (cupom ${appliedCoupon.codigo}):* - ${formatarMoeda(discountAmount)}` : "")
            + (tipoEntrega === "delivery" ? `\n*Taxa de entrega${bairroTaxa}:* ${textoTaxaEntrega()}` : "")
            + `\n💰 *TOTAL: ${formatarMoeda(total)}*`
            + `\n-------------------------\n\n`;

        const paymentMethod = document.querySelector(
            'input[name="payment"]:checked',
        ).value;
        let paymentInfo = `*Forma de Pagamento:* ${paymentMethod}`;
        if (paymentMethod === "Dinheiro") {
            const troco = document.getElementById("troco-para").value;
            paymentInfo += troco
                ? ` (Troco para R$ ${troco})`
                : " (Não precisa de troco)";
        }
        const precisaTalher = document.getElementById("talher-checkbox")?.checked;
        const observacoes = document.getElementById("observacoes-input")?.value.trim();
        if (precisaTalher) paymentInfo += `\n*Colher/canudo descartável:* Sim`;
        if (observacoes) paymentInfo += `\n*Observações:* ${observacoes}`;

        const nome = document.getElementById("identificacao-nome").value;
        const telefone = document.getElementById("identificacao-telefone").value;

        if (tipoEntrega === "delivery") {
            const cep = document.getElementById("delivery-cep").value.trim();

            mensagem += `*Tipo de Pedido:* Entrega${configLoja.tempoEntrega ? ` (estimativa: ${configLoja.tempoEntrega})` : ""}\n\n*Nome:* ${nome}\n*Telefone:* ${telefone}\n*Endereço:* ${enderecoCompleto()}${cep ? `\n*CEP:* ${cep}` : ""}\n\n${paymentInfo}`;
        } else {
            const dataInput = document.getElementById("pickup-date").value;
            const hora = document.getElementById("pickup-time").value;
            const [year, month, day] = dataInput.split("-");
            const dataFormatada = `${day}/${month}/${year}`;

            mensagem += `*Tipo de Pedido:* Retirada\n\n*Nome para Retirada:* ${nome}\n*Telefone:* ${telefone}\n*Data Agendada:* ${dataFormatada}\n*Hora Agendada:* ${hora}\n\n${paymentInfo}`;
        }

        const url = `https://wa.me/${numeroWhatsApp}?text=${encodeURIComponent(mensagem)}`;
        if (janelaWhats && !janelaWhats.closed) janelaWhats.location.href = url;
        else window.location.href = url;
        salvarCliente();
        mostrarSucesso(numeroDoDia ? `Nº ${numeroDoDia}` : pedidoId);
    };

    // --- EVENT LISTENERS ---
    cartIcon.addEventListener("click", abrirCarrinho);
    closeCartBtn.addEventListener("click", fecharCarrinho);
    cartOverlay.addEventListener("click", fecharCarrinho);
    applyCouponBtn.addEventListener("click", applyCoupon);
    finishOrderBtn.addEventListener("click", finalizarPedido);
    viewCartBannerBtn.addEventListener("click", abrirCarrinho);

    // Chips de filtro acima da grade de produtos (recriados a cada render, por isso delegado)
    document.getElementById("products-heading").addEventListener("click", (e) => {
        const chip = e.target.closest(".category-chip");
        if (!chip) return;
        selecionarCategoria(chip.dataset.category);
    });

    // Clicar numa promoção do carrossel abre o produto
    promoTrack?.addEventListener("click", (e) => {
        const card = e.target.closest(".promo-card");
        if (card) abrirDetalhe(Number.parseInt(card.dataset.id));
    });

    // Event listener para campo de busca
    searchInput.addEventListener("input", (e) => {
        termoBusca = e.target.value;
        filtrarEMostrarProdutos();
    });

    document
        .querySelector(".products-container")
        .addEventListener("click", (e) => {
            const productCard = e.target.closest(".product-card");
            if (!productCard) return;
            const produtoId = Number.parseInt(productCard.dataset.id);
            if (e.target.matches(".product-button") && !productCard.dataset.precisaDetalhe) {
                // Produto sem nenhuma personalização (tamanho único, sem complementos/adicionais/opção)
                // adiciona direto ao carrinho, sem precisar abrir o modal.
                adicionarAoCarrinho(produtoId, productCard, {});
            } else {
                // Qualquer outro clique no card (foto, nome, descrição, ou o botão quando o
                // produto precisa de escolha) abre os detalhes pra o cliente personalizar.
                abrirDetalhe(produtoId);
            }
        });
    cartBody.addEventListener("click", (e) => {
        const cartItem = e.target.closest(".cart-item");
        if (cartItem) {
            const chave = cartItem.dataset.key;
            if (e.target.matches(".quantity-btn"))
                alterarQuantidade(chave, e.target.dataset.action);
            if (e.target.matches(".remove-item-btn")) {
                carrinho = carrinho.filter((i) => i._chave !== chave);
                atualizarCarrinho();
            }
        }
    });

    deliveryToggleBtns.forEach((btn) =>
        btn.addEventListener("click", () => {
            deliveryToggleBtns.forEach((b) => b.classList.remove("active"));
            btn.classList.add("active");
            tipoEntrega = btn.dataset.option;
            if (tipoEntrega === "delivery") {
                deliveryForm.style.display = "block";
                pickupForm.style.display = "none";
            } else {
                deliveryForm.style.display = "none";
                pickupForm.style.display = "block";
            }
            atualizarCarrinho();
        }),
    );

    document.querySelectorAll('input[name="payment"]').forEach((radio) => {
        radio.addEventListener("change", (e) => {
            trocoContainer.style.display =
                e.target.value === "Dinheiro" ? "block" : "none";
            document
                .querySelectorAll(".payment-option")
                .forEach((label) => label.classList.remove("selected"));
            e.target.closest(".payment-option").classList.add("selected");
        });
    });

    // --- MÁSCARAS DOS CAMPOS ---
    // Celular: só números, no máximo 11 (DDD + 9 dígitos), formatado como (51) 99999-9999
    const telefoneInput = document.getElementById("identificacao-telefone");
    telefoneInput.addEventListener("input", () => {
        const d = telefoneInput.value.replace(/\D/g, "").slice(0, 11);
        let v = d;
        if (d.length > 2) v = `(${d.slice(0, 2)}) ${d.slice(2)}`;
        if (d.length > 7) v = `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
        telefoneInput.value = v;
        if (d.length === 11) telefoneInput.classList.remove("error");
    });

    // CEP: só números, formatado como 00000-000. Com os 8 dígitos, busca rua e bairro
    // no ViaCEP (serviço gratuito dos Correios) — se falhar, o cliente digita normalmente.
    const cepInput = document.getElementById("delivery-cep");
    let ultimoCepBuscado = "";
    cepInput.addEventListener("input", async () => {
        const d = cepInput.value.replace(/\D/g, "").slice(0, 8);
        cepInput.value = d.length > 5 ? `${d.slice(0, 5)}-${d.slice(5)}` : d;
        if (d.length === 0 || d.length === 8) cepInput.classList.remove("error");
        if (d.length !== 8 || d === ultimoCepBuscado) return;
        ultimoCepBuscado = d;
        try {
            const resp = await fetch(`https://viacep.com.br/ws/${d}/json/`);
            const dados = await resp.json();
            if (dados.erro) return;
            const ruaEl = document.getElementById("delivery-address"),
                bairroEl = document.getElementById("delivery-bairro");
            if (dados.logradouro && !ruaEl.value.trim()) { ruaEl.value = dados.logradouro; ruaEl.classList.remove("error"); }
            // Seleciona o bairro da lista se o nome bater (ignorando acento/maiúscula)
            if (dados.bairro && !bairroEl.value) {
                const op = [...bairroEl.options].find((o) => o.value && o.value !== "__outro"
                    && o.value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase() === dados.bairro.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase());
                if (op) { bairroEl.value = op.value; bairroEl.dispatchEvent(new Event("change")); }
            }
            document.getElementById("delivery-numero").focus();
        } catch (e) {
            console.warn("Não foi possível consultar o CEP:", e);
        }
    });

    // Remove o erro ao digitar
    document
        .querySelectorAll(
            "#delivery-form-container input[required], #pickup-form-container input[required], #pickup-form-container select[required], #cart-step-4 input[required]",
        )
        .forEach((input) => {
            input.addEventListener("input", () => {
                if (input.value.trim() !== "") input.classList.remove("error");
            });
        });

    // Navegação entre as 5 etapas do carrinho
    cartNavAvancar.addEventListener("click", () => {
        if (!validarEtapaAtual()) return;
        if (etapaAtual < 5) mostrarEtapa(etapaAtual + 1);
    });
    cartNavVoltar.addEventListener("click", () => {
        if (etapaAtual > 1) mostrarEtapa(etapaAtual - 1);
    });
    cartStepsIndicator.addEventListener("click", (e) => {
        const dot = e.target.closest(".cart-step-dot");
        if (!dot) return;
        const step = Number(dot.dataset.step);
        if (step <= etapaMaxAlcancada) mostrarEtapa(step);
    });
    novoPedidoBtn.addEventListener("click", iniciarNovoPedido);

    // Clicar no logo volta pro topo (substitui o link "Início" do menu, que não cabia no celular)
    document.querySelector(".logo")?.addEventListener("click", () => window.scrollTo({ top: 0, behavior: "smooth" }));

    // --- ENTREGA: TAXA POR BAIRRO ---
    // Lista de bairros/taxas vem de configuracoes/geral.taxasEntrega (editável no admin).
    const OPCAO_OUTRO_BAIRRO = "__outro";
    const bairroSelect = document.getElementById("delivery-bairro"),
        bairroOutroGroup = document.getElementById("delivery-bairro-outro-group"),
        bairroOutroInput = document.getElementById("delivery-bairro-outro"),
        deliveryFeeNotice = document.getElementById("delivery-fee-notice");
    const taxasEntrega = () => (Array.isArray(configLoja.taxasEntrega) ? configLoja.taxasEntrega : [])
        .filter((t) => t && t.bairro)
        .map((t) => ({ bairro: String(t.bairro).trim(), taxa: Number(t.taxa) || 0 }));
    const semAcento = (t) => String(t || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();

    const montarBairros = () => {
        const lista = taxasEntrega();
        const porTaxa = {};
        lista.forEach((t) => { (porTaxa[t.taxa] = porTaxa[t.taxa] || []).push(t.bairro); });
        bairroSelect.innerHTML = `<option value="" disabled selected>Selecione</option>` +
            Object.keys(porTaxa).map(Number).sort((a, b) => a - b).map((taxa) => `
                <optgroup label="Taxa ${formatarMoeda(taxa)}">
                    ${porTaxa[taxa].map((b) => `<option value="${b}">${b}</option>`).join("")}
                </optgroup>`).join("") +
            (configLoja.aceitarOutrosBairros !== false ? `<option value="${OPCAO_OUTRO_BAIRRO}">Outro bairro (taxa a combinar)</option>` : "");
    };

    const bairroEscolhido = () => bairroSelect.value === OPCAO_OUTRO_BAIRRO
        ? bairroOutroInput.value.trim()
        : bairroSelect.value;
    // null = taxa a combinar (bairro fora da lista) ou bairro ainda não escolhido
    const taxaDoBairro = () => {
        const t = taxasEntrega().find((x) => x.bairro === bairroSelect.value);
        return t ? t.taxa : null;
    };
    const taxaEntregaAtual = () => (tipoEntrega === "delivery" ? (taxaDoBairro() || 0) : 0);
    const textoTaxaEntrega = () => {
        if (bairroSelect.value === OPCAO_OUTRO_BAIRRO) return "a combinar pelo WhatsApp";
        const t = taxaDoBairro();
        return t === null ? "" : (t > 0 ? formatarMoeda(t) : "Grátis");
    };

    const atualizarAvisoEntrega = () => {
        const tempo = configLoja.tempoEntrega ? `<i class="fa-regular fa-clock" aria-hidden="true"></i> Tempo estimado de entrega: <strong>${configLoja.tempoEntrega}</strong>` : "";
        let taxa = "Escolha o bairro para ver a taxa de entrega.";
        if (bairroSelect.value === OPCAO_OUTRO_BAIRRO) taxa = "Para bairros fora da lista, a taxa é combinada pelo WhatsApp.";
        else if (taxaDoBairro() !== null) taxa = `<i class="fa-solid fa-motorcycle" aria-hidden="true"></i> Taxa de entrega para <strong>${bairroSelect.value}</strong>: <strong>${textoTaxaEntrega()}</strong>`;
        deliveryFeeNotice.innerHTML = `${taxa}${tempo ? `<br>${tempo}` : ""}`;
    };

    bairroSelect.addEventListener("change", () => {
        const outro = bairroSelect.value === OPCAO_OUTRO_BAIRRO;
        bairroOutroGroup.hidden = !outro;
        bairroOutroInput.required = outro;
        bairroSelect.classList.remove("error");
        if (outro) bairroOutroInput.focus();
        atualizarAvisoEntrega();
        atualizarCarrinho();
    });
    bairroOutroInput.addEventListener("input", () => {
        if (bairroOutroInput.value.trim()) bairroOutroInput.classList.remove("error");
    });

    montarBairros();
    atualizarAvisoEntrega();
    preencherClienteSalvo();

    // Cupom: sem nenhum cupom ativo e válido cadastrado, o campo nem aparece no carrinho
    const temCupomAtivo = coupons.some((c) => c.ativo !== false
        && !(c.validade && new Date(`${c.validade}T23:59:59`) < new Date()));
    if (!temCupomAtivo) {
        document.querySelector(".coupon-container")?.setAttribute("hidden", "");
        couponFeedback.hidden = true;
    }

    // --- INICIALIZAÇÃO ---
    renderPromocoes();
    filtrarEMostrarProdutos();
    atualizarCarrinho();
    mostrarEtapa(1);
});
