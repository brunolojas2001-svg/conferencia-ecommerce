/* =========================================================
           VARIÁVEIS
        ========================================================= */

        let products = [];

        let filtered = [];

        let currentIndex = 0;

        let imageIndex = 0;

        let imageMap = new Map();


        /* =========================================================
           ATALHO PARA ELEMENTOS
        ========================================================= */

        const $ = (id) => document.getElementById(id);


        /* =========================================================
           TEXTO NORMALIZADO
        ========================================================= */

        function norm(value) {

            return String(value ?? '')
                .trim();

        }


        /* =========================================================
           NORMALIZAÇÃO DE CHAVES

           Corrige diferenças como:

           CODPROD
           CodProd
           COD PROD
           Código do Produto
           CÓDIGO DO PRODUTO
        ========================================================= */

        function key(value) {

            return String(value ?? '')
                .normalize('NFD')
                .replace(/[\u0300-\u036f]/g, '')
                .replace(/\uFEFF/g, '')
                .trim()
                .replace(/\.0+$/, '')
                .replace(/[^a-zA-Z0-9]/g, '')
                .toLowerCase();

        }


        /* =========================================================
           LIMPA CÓDIGOS
        ========================================================= */

        function cleanCode(value) {

            return String(value ?? '')
                .trim()
                .replace(/\.0+$/, '');

        }


        /* =========================================================
           PROCURA CAMPO DA PLANILHA
        ========================================================= */

        function findField(row, names) {

            const keys = Object.keys(row);

            for (const name of names) {

                const wanted = key(name);

                const found = keys.find(
                    column => key(column) === wanted
                );

                if (found !== undefined) {

                    return cleanCode(row[found]);

                }

            }

            return '';

        }


        /* =========================================================
           ESCAPA HTML
        ========================================================= */

        function escapeHtml(value) {

            return String(value ?? '')
                .replace(/[&<>"']/g, character => {

                    const map = {

                        '&': '&amp;',
                        '<': '&lt;',
                        '>': '&gt;',
                        '"': '&quot;',
                        "'": '&#039;'

                    };

                    return map[character];

                });

        }


        /* =========================================================
           CONVERTE QUEBRAS DE LINHA

           A planilha pode trazer:

           \n
           \r\n
           |
           \r
        ========================================================= */

        function normalizeTechnicalText(value) {

            let text = String(value ?? '');

            text = text.replace(/\r\n/g, '\n');

            text = text.replace(/\r/g, '\n');

            text = text.replace(/\\n/gi, '\n');

            text = text.replace(/\\r/gi, '\n');

            text = text.replace(/\u00A0/g, ' ');

            return text.trim();

        }


        /* =========================================================
           TRANSFORMA INFORMAÇÕES TÉCNICAS EM LINHAS

           Entrada:

           Marca: Tramontina
           Referência: 1234
           Material: Aço inox

           OU:

           Marca: Tramontina|Referência: 1234|Material: Aço inox

           Saída:

           <div class="tech-row">
               <div class="tech-label">Marca</div>
               <div class="tech-value">Tramontina</div>
           </div>
        ========================================================= */

        function formatTech(value) {

            const raw = normalizeTechnicalText(value);

            if (!raw) {

                return `
                    <div class="tech-row">
                        <div class="tech-label">
                            Informação
                        </div>

                        <div class="tech-value">
                            Não informado.
                        </div>
                    </div>
                `;

            }


            /*
                Aceita tanto "|" quanto quebra de linha.
            */

            const parts = raw
                .replace(/\|+/g, '\n')
                .split('\n')
                .map(item => item.trim())
                .filter(Boolean);


            return parts.map(part => {

                /*
                    Procura o primeiro ":".
                */

                const separator = part.indexOf(':');


                /*
                    Caso exista:
                    Marca: Tramontina

                    Campo:
                    Marca

                    Valor:
                    Tramontina
                */

                if (separator !== -1) {

                    const label =
                        part
                            .slice(0, separator)
                            .trim();

                    const value =
                        part
                            .slice(separator + 1)
                            .trim();


                    return `
                        <div class="tech-row">

                            <div class="tech-label">
                                ${escapeHtml(label)}
                            </div>

                            <div class="tech-value">
                                ${escapeHtml(value || '—')}
                            </div>

                        </div>
                    `;

                }


                /*
                    Caso a informação não tenha ":".
                */

                return `
                    <div class="tech-row">

                        <div class="tech-label">
                            Informação
                        </div>

                        <div class="tech-value">
                            ${escapeHtml(part)}
                        </div>

                    </div>
                `;

            }).join('');

        }


        /* =========================================================
           IMAGENS
        ========================================================= */

        async function imageFilesToMap(files) {

            imageMap = new Map();


            const list = [...files].filter(file => {

                const extension =
                    (file.name.split('.').pop() || '')
                    .toLowerCase();


                const validExtensions = [
                    'jpg',
                    'jpeg',
                    'png',
                    'webp',
                    'gif',
                    'bmp',
                    'svg',
                    'avif'
                ];


                return (
                    (file.type &&
                        file.type.startsWith('image/'))
                    ||
                    validExtensions.includes(extension)
                );

            });


            for (const file of list) {

                const url =
                    URL.createObjectURL(file);


                const path =
                    file.webkitRelativePath ||
                    file.name;


                const parts =
                    path
                        .split('/')
                        .filter(Boolean);


                const filename =
                    parts[parts.length - 1];


                const stem =
                    filename
                        .replace(/\.[^.]+$/, '');


                const aliases = new Set();


                /*
                    Nome completo sem extensão
                */

                aliases.add(stem);


                /*
                    Nome da pasta
                */

                if (parts.length > 1) {

                    aliases.add(
                        parts[parts.length - 2]
                    );

                }


                /*
                    Se começar com número,
                    pega o código.

                    Exemplo:

                    12345_01.jpg

                    vira:

                    12345
                */

                const firstCode =
                    stem.match(/^\d+/)?.[0];


                if (firstCode) {

                    aliases.add(firstCode);

                }


                /*
                    Pastas intermediárias
                */

                parts.slice(0, -1).forEach(part => {

                    aliases.add(part);


                    const numeric =
                        part.match(/^\d+/)?.[0];


                    if (numeric) {

                        aliases.add(numeric);

                    }

                });


                /*
                    Adiciona os aliases ao mapa
                */

                aliases.forEach(alias => {

                    const normalized =
                        key(alias);


                    if (!normalized) {
                        return;
                    }


                    if (!imageMap.has(normalized)) {

                        imageMap.set(
                            normalized,
                            []
                        );

                    }


                    imageMap
                        .get(normalized)
                        .push({

                            url,

                            name: filename,

                            path

                        });

                });

            }

        }


        /* =========================================================
           PEGA IMAGENS DO PRODUTO
        ========================================================= */

        function getImages(product) {

            if (!product) {
                return [];
            }


            const code =
                cleanCode(product.CODPROD);


            const normalized =
                key(code);


            const images =
                imageMap.get(normalized) || [];


            /*
                Remove imagens duplicadas.
            */

            const seen = new Set();


            return images.filter(image => {

                if (seen.has(image.url)) {

                    return false;

                }


                seen.add(image.url);

                return true;

            });

        }


        /* =========================================================
           RENDERIZA CATÁLOGO
        ========================================================= */

        function render() {

            const searchValue =
                norm($('search').value)
                .normalize('NFD')
                .replace(/[\u0300-\u036f]/g, '')
                .toLowerCase();


            filtered =
                products.filter(product => {

                    const content = [

                        product.NOMEECOMMERCE,
                        product.DESCRICAO,
                        product.CODPROD,
                        product.CODFAB,
                        product.CODAUXILIAR,
                        product.DADOSTECNICOS,
                        product.INFORMACOESTECNICAS

                    ]
                    .join(' ')
                    .normalize('NFD')
                    .replace(/[\u0300-\u036f]/g, '')
                    .toLowerCase();


                    return (
                        !searchValue ||
                        content.includes(searchValue)
                    );

                });


            /*
                Produtos
            */

            if (filtered.length) {

                $('grid').innerHTML =
                    filtered.map((product, index) => {

                        const images =
                            getImages(product);


                        const image =
                            images[0]?.url;


                        const title =
                            product.NOMEECOMMERCE ||
                            product.DESCRICAO ||
                            'Produto sem nome';


                        return `
                            <article
                                class="product-card"
                                data-index="${index}"
                            >

                                <div class="thumb">

                                    ${
                                        image

                                        ?

                                        `
                                            <img
                                                src="${image}"
                                                alt="${escapeHtml(title)}"
                                            >
                                        `

                                        :

                                        `
                                            <div
                                                style="
                                                    color:#9aa3b1;
                                                    font-size:13px;
                                                "
                                            >
                                                Sem imagem
                                            </div>
                                        `
                                    }


                                    ${
                                        images.length

                                        ?

                                        `
                                            <span class="img-count">
                                                ${images.length}
                                                ${images.length === 1 ? 'imagem' : 'imagens'}
                                            </span>
                                        `

                                        :

                                        ''
                                    }

                                </div>


                                <div class="card-body">

                                    <div class="card-title">
                                        ${escapeHtml(title)}
                                    </div>


                                    <div class="desc">
                                        ${
                                            escapeHtml(
                                                product.DESCRICAO ||
                                                'Sem descrição'
                                            )
                                        }
                                    </div>


                                    <div class="codes">

                                        <span class="code">
                                            CODPROD:
                                            ${escapeHtml(product.CODPROD || '—')}
                                        </span>


                                        ${
                                            product.CODFAB

                                            ?

                                            `
                                                <span class="code">
                                                    CODFAB:
                                                    ${escapeHtml(product.CODFAB)}
                                                </span>
                                            `

                                            :

                                            ''
                                        }

                                    </div>

                                </div>

                            </article>
                        `;

                    }).join('');

            }

            else {

                $('grid').innerHTML = `
                    <div
                        class="empty"
                        style="grid-column:1/-1"
                    >

                        <h2>
                            Nenhum produto encontrado
                        </h2>

                        <p>
                            Tente outro termo de pesquisa.
                        </p>

                    </div>
                `;

            }


            /*
                Estatísticas
            */

            const withImages =
                products.filter(
                    product =>
                        getImages(product).length > 0
                ).length;


            const withoutImages =
                products.length - withImages;


            $('stats').innerHTML = `

                <span class="pill">
                    <b>${filtered.length}</b>
                    produtos
                </span>

                <span class="pill">
                    <b>${withImages}</b>
                    com imagem
                </span>

                <span class="pill">
                    <b>${withoutImages}</b>
                    sem imagem
                </span>

            `;


            /*
                Clique nos produtos
            */

            $('grid')
                .querySelectorAll('.product-card')
                .forEach(card => {

                    card.addEventListener(
                        'click',
                        () => {

                            const index =
                                Number(
                                    card.dataset.index
                                );


                            openDetail(index);

                        }
                    );

                });


            /*
                Mostra / esconde catálogo
            */

            const hasProducts =
                products.length > 0;


            $('empty').style.display =
                hasProducts
                    ? 'none'
                    : 'block';


            $('catalog').style.display =
                hasProducts
                    ? 'block'
                    : 'none';

        }


        /* =========================================================
           ABRE DETALHES
        ========================================================= */

        function openDetail(index) {

            currentIndex = index;

            imageIndex = 0;


            const product =
                filtered[index];


            if (!product) {
                return;
            }


            $('modal').classList.add('show');


            renderDetail();

        }


        /* =========================================================
           RENDERIZA DETALHES
        ========================================================= */

        function renderDetail() {

            const product =
                filtered[currentIndex];


            if (!product) {
                return;
            }


            const images =
                getImages(product);


            /*
                Código
            */

            $('detailCode').textContent =
                'CODPROD ' +
                (product.CODPROD || '—');


            /*
                Nome
            */

            $('detailTitle').textContent =
                product.NOMEECOMMERCE ||
                product.DESCRICAO ||
                'Produto sem nome';


            /*
                Descrição
            */

            $('detailDesc').textContent =
                product.DESCRICAO ||
                'Sem descrição';


            /*
                Dados técnicos
            */

            $('detailData').textContent =
                product.DADOSTECNICOS ||
                'Não informado.';


            /*
                INFORMAÇÕES TÉCNICAS

                Aqui está a principal alteração.

                Exemplo:

                Marca: Tramontina
                Referência: 1234
                Material: Aço inox

                Cada uma fica em uma linha.
            */

            $('detailInfo').innerHTML =
                formatTech(
                    product.INFORMACOESTECNICAS
                );


            /*
                Códigos
            */

            $('detailCodprod').textContent =
                product.CODPROD || '—';


            $('detailCodfab').textContent =
                product.CODFAB || '—';


            $('detailCodauxiliar').textContent =
                product.CODAUXILIAR || '—';


            $('detailImages').textContent =
                images.length;


            /*
                Imagem principal
            */

            const mainImage =
                $('mainImg');


            const noImage =
                $('noImageMessage');


            if (images.length) {

                mainImage.src =
                    images[imageIndex].url;


                mainImage.style.display =
                    'block';


                noImage.style.display =
                    'none';

            }

            else {

                mainImage.removeAttribute('src');

                mainImage.style.display =
                    'none';


                noImage.style.display =
                    'block';

            }


            /*
                Miniaturas
            */

            $('thumbs').innerHTML =
                images.map((image, index) => {

                    return `

                        <button
                            type="button"
                            class="${index === imageIndex ? 'active' : ''}"
                            data-index="${index}"
                            title="${escapeHtml(image.name)}"
                        >

                            <img
                                src="${image.url}"
                                alt=""
                            >

                        </button>

                    `;

                }).join('');


            $('thumbs')
                .querySelectorAll('button')
                .forEach(button => {

                    button.addEventListener(
                        'click',
                        event => {

                            event.stopPropagation();


                            imageIndex =
                                Number(
                                    button.dataset.index
                                );


                            renderDetail();

                        }
                    );

                });

        }


        /* =========================================================
           ALTERAR IMAGEM
        ========================================================= */

        function changeImage(direction) {

            const images =
                getImages(
                    filtered[currentIndex]
                );


            if (!images.length) {
                return;
            }


            imageIndex =
                (
                    imageIndex +
                    direction +
                    images.length
                )
                %
                images.length;


            renderDetail();

        }


        /* =========================================================
           PRÓXIMO / ANTERIOR PRODUTO
        ========================================================= */

        function changeProduct(direction) {

            if (!filtered.length) {
                return;
            }


            const nextIndex =
                currentIndex + direction;


            if (
                nextIndex < 0 ||
                nextIndex >= filtered.length
            ) {

                return;

            }


            currentIndex =
                nextIndex;


            imageIndex = 0;


            renderDetail();

        }


        /* =========================================================
           EVENTOS DA GALERIA
        ========================================================= */

        $('prevImg').addEventListener(
            'click',
            event => {

                event.stopPropagation();

                changeImage(-1);

            }
        );


        $('nextImg').addEventListener(
            'click',
            event => {

                event.stopPropagation();

                changeImage(1);

            }
        );


        /* =========================================================
           ZOOM
        ========================================================= */

        $('mainImg').addEventListener(
            'click',
            () => {

                if (!$('mainImg').src) {
                    return;
                }


                $('zoomImg').src =
                    $('mainImg').src;


                $('zoom').classList.add('show');

            }
        );


        $('closeZoom').addEventListener(
            'click',
            () => {

                $('zoom').classList.remove('show');

            }
        );


        $('zoom').addEventListener(
            'click',
            event => {

                if (
                    event.target === $('zoom')
                ) {

                    $('zoom').classList.remove(
                        'show'
                    );

                }

            }
        );


        /* =========================================================
           VOLTAR PARA VITRINE
        ========================================================= */

        $('backBtn').addEventListener(
            'click',
            () => {

                $('modal').classList.remove(
                    'show'
                );


                setTimeout(() => {

                    const card =
                        document.querySelector(
                            `.product-card[data-index="${currentIndex}"]`
                        );


                    if (card) {

                        card.scrollIntoView({
                            behavior: 'smooth',
                            block: 'center'
                        });

                    }

                }, 100);

            }
        );


        /* =========================================================
           PRODUTO ANTERIOR
        ========================================================= */

        $('prevProduct').addEventListener(
            'click',
            () => {

                changeProduct(-1);

            }
        );


        /* =========================================================
           PRÓXIMO PRODUTO
        ========================================================= */

        $('nextProduct').addEventListener(
            'click',
            () => {

                changeProduct(1);

            }
        );


        /* =========================================================
           BUSCA
        ========================================================= */

        $('search').addEventListener(
            'input',
            () => {

                render();

            }
        );


        /* =========================================================
           IMPORTAR PLANILHA
        ========================================================= */

        $('sheetInput').addEventListener(
            'change',
            async event => {

                const file =
                    event.target.files[0];


                if (!file) {
                    return;
                }


                $('sheetName').textContent =
                    file.name;


                try {

                    /*
                        Verifica se SheetJS carregou.
                    */

                    if (
                        typeof XLSX === 'undefined'
                    ) {

                        alert(
                            'A biblioteca da planilha não carregou. ' +
                            'Verifique sua conexão com a internet e recarregue a página.'
                        );

                        return;

                    }


                    /*
                        Lê arquivo
                    */

                    const data =
                        await file.arrayBuffer();


                    const workbook =
                        XLSX.read(
                            data,
                            {
                                type: 'array'
                            }
                        );


                    /*
                        Primeira aba
                    */

                    if (
                        !workbook.SheetNames.length
                    ) {

                        alert(
                            'A planilha não possui nenhuma aba.'
                        );

                        return;

                    }


                    const firstSheet =
                        workbook.SheetNames[0];


                    const worksheet =
                        workbook.Sheets[firstSheet];


                    /*
                        Converte para JSON
                    */

                    const rows =
                        XLSX.utils.sheet_to_json(
                            worksheet,
                            {
                                defval: ''
                            }
                        );


                    if (!rows.length) {

                        products = [];

                        render();


                        alert(
                            'A planilha está vazia.'
                        );

                        return;

                    }


                    /*
                        Converte cada linha da planilha
                    */

                    products =
                        rows
                        .map(row => {

                            return {

                                CODPROD:
                                    findField(
                                        row,
                                        [
                                            'CODPROD',
                                            'COD PROD',
                                            'CÓD PROD',
                                            'Código do Produto',
                                            'Codigo do Produto'
                                        ]
                                    ),


                                CODFAB:
                                    findField(
                                        row,
                                        [
                                            'CODFAB',
                                            'COD FAB',
                                            'Código de fábrica',
                                            'Código de Fabrica',
                                            'Codigo de Fabrica'
                                        ]
                                    ),


                                CODAUXILIAR:
                                    findField(
                                        row,
                                        [
                                            'CODAUXILIAR',
                                            'COD AUXILIAR',
                                            'Código auxiliar',
                                            'Código Auxiliar'
                                        ]
                                    ),


                                DESCRICAO:
                                    findField(
                                        row,
                                        [
                                            'DESCRICAO',
                                            'DESCRIÇÃO',
                                            'Descrição'
                                        ]
                                    ),


                                NOMEECOMMERCE:
                                    findField(
                                        row,
                                        [
                                            'NOMEECOMMERCE',
                                            'NOME ECOMMERCE',
                                            'NOME E-COMMERCE',
                                            'NOME ECOMMERCE'
                                        ]
                                    ),


                                DADOSTECNICOS:
                                    findField(
                                        row,
                                        [
                                            'DADOSTECNICOS',
                                            'DADOS TECNICOS',
                                            'DADOS TÉCNICOS',
                                            'Dados Técnicos'
                                        ]
                                    ),


                                INFORMACOESTECNICAS:
                                    findField(
                                        row,
                                        [
                                            'INFORMACOESTECNICAS',
                                            'INFORMAÇÕES TÉCNICAS',
                                            'INFORMACOES TECNICAS',
                                            'Informações Técnicas'
                                        ]
                                    )

                            };

                        })
                        .filter(product => {

                            return (
                                product.CODPROD ||
                                product.NOMEECOMMERCE ||
                                product.DESCRICAO
                            );

                        });


                    /*
                        Renderiza
                    */

                    render();


                }

                catch (error) {

                    console.error(
                        'Erro ao ler planilha:',
                        error
                    );


                    alert(
                        'Erro ao ler a planilha:\n\n' +
                        error.message
                    );

                }

            }
        );


        /* =========================================================
           IMPORTAR PASTA DE IMAGENS
        ========================================================= */

        $('folderInput').addEventListener(
            'change',
            async event => {

                const files =
                    event.target.files;


                if (!files.length) {
                    return;
                }


                $('folderName').textContent =
                    `${files.length} imagem(ns) encontrada(s) na pasta`;


                try {

                    await imageFilesToMap(files);


                    render();

                }

                catch (error) {

                    console.error(
                        'Erro ao carregar imagens:',
                        error
                    );


                    alert(
                        'Erro ao carregar as imagens:\n\n' +
                        error.message
                    );

                }

            }
        );


        /* =========================================================
           CLIQUE NOS CARDS DE IMPORTAÇÃO
        ========================================================= */

        $('dropSheet').addEventListener(
            'click',
            event => {

                if (
                    event.target.closest('label')
                ) {
                    return;
                }


                $('sheetInput').click();

            }
        );


        $('dropFolder').addEventListener(
            'click',
            event => {

                if (
                    event.target.closest('label')
                ) {
                    return;
                }


                $('folderInput').click();

            }
        );


        /* =========================================================
           LIMPAR TUDO
        ========================================================= */

        $('clearBtn').addEventListener(
            'click',
            () => {

                products = [];

                filtered = [];

                currentIndex = 0;

                imageIndex = 0;

                imageMap.clear();


                /*
                    Limpa inputs
                */

                $('sheetInput').value = '';

                $('folderInput').value = '';


                /*
                    Textos
                */

                $('sheetName').textContent =
                    'Nenhuma planilha selecionada';


                $('folderName').textContent =
                    'Nenhuma pasta selecionada';


                /*
                    Limpa catálogo
                */

                $('grid').innerHTML = '';

                $('stats').innerHTML = '';


                /*
                    Fecha modal
                */

                $('modal').classList.remove(
                    'show'
                );


                $('zoom').classList.remove(
                    'show'
                );


                /*
                    Atualiza tela
                */

                render();


                window.scrollTo({
                    top: 0,
                    behavior: 'smooth'
                });

            }
        );


        /* =========================================================
           TECLADO
        ========================================================= */

        document.addEventListener(
            'keydown',
            event => {

                /*
                    ESC fecha zoom
                */

                if (
                    event.key === 'Escape'
                ) {

                    $('zoom').classList.remove(
                        'show'
                    );


                    $('modal').classList.remove(
                        'show'
                    );

                    return;

                }


                /*
                    Só funciona dentro do modal
                */

                if (
                    !$('modal').classList.contains(
                        'show'
                    )
                ) {

                    return;

                }


                /*
                    Esquerda = imagem anterior
                */

                if (
                    event.key === 'ArrowLeft'
                ) {

                    changeImage(-1);

                }


                /*
                    Direita = próxima imagem
                */

                if (
                    event.key === 'ArrowRight'
                ) {

                    changeImage(1);

                }


                /*
                    PageUp = produto anterior
                */

                if (
                    event.key === 'PageUp'
                ) {

                    changeProduct(-1);

                }


                /*
                    PageDown = próximo produto
                */

                if (
                    event.key === 'PageDown'
                ) {

                    changeProduct(1);

                }

            }
        );


        /* =========================================================
           FECHAR MODAL CLICANDO FORA
        ========================================================= */

        $('modal').addEventListener(
            'click',
            event => {

                if (
                    event.target === $('modal')
                ) {

                    $('modal').classList.remove(
                        'show'
                    );

                }

            }
        );


        /* =========================================================
           INICIALIZAÇÃO
        ========================================================= */

        render();
