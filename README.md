# Conferência de Produtos — Lojas 2001

Site estático para conferência de produtos a partir de planilhas Excel/CSV e uma pasta de imagens.

## Estrutura

```text
conferencia-produtos/
├── index.html
├── style.css
├── app.js
├── vercel.json
├── .gitignore
├── README.md
└── assets/
    └── logo.svg
```

## Como usar

1. Abra o site.
2. Selecione a planilha `.xlsx`, `.xls` ou `.csv`.
3. Selecione a pasta de imagens.
4. O sistema vincula as imagens ao produto pelo `CODPROD`.
5. Clique em um produto para abrir a visualização detalhada.

A biblioteca SheetJS e as fontes Google são carregadas por CDN, portanto o navegador precisa de acesso à internet.

## Publicar no GitHub

Envie **todos os arquivos e a pasta `assets`** para a raiz do repositório.

Depois, no GitHub:
`Settings` → `Pages` → `Deploy from a branch` → branch `main` → pasta `/ (root)`.

## Publicar na Vercel

Na Vercel, importe o repositório do GitHub.

Como este é um site estático:
- Framework Preset: `Other`
- Build Command: deixe vazio
- Output Directory: deixe vazio
- Install Command: deixe vazio

A Vercel publica o `index.html` diretamente.

## Observação

A seleção de pasta de imagens usa `webkitdirectory`, recurso suportado principalmente por navegadores modernos baseados em Chromium, incluindo Chrome e Edge.
