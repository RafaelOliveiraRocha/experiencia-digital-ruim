# Quanto custa uma experiência digital ruim?

Projeto público de BI e produto de dados criado para analisar sinais de atrito, resolução e satisfação nas relações de consumo digitais no Brasil.

A base usada nesta versão foi processada a partir de quatro arquivos oficiais do Consumidor.gov.br:

- Janeiro de 2026
- Fevereiro de 2026
- Março de 2026
- Abril de 2026

O recorte principal usa `Data Finalização`, porque os arquivos mensais trazem reclamações finalizadas no mês de referência.

## O que o projeto entrega

- Dashboard interativo em React + Vite + TypeScript
- Versão PT-BR e EN com seletor de idioma
- KPIs, rankings e gráficos exploratórios
- Filtro global multi-seleção com recálculo dos indicadores
- IAD, Índice de Atrito Digital
- Leituras guiadas pelos dados, sem simular chatbot
- Metodologia e conteúdos editoriais para LinkedIn
- Dados processados em JSON leve

## Como rodar localmente

```bash
pnpm install
pnpm dev
```

Depois abra:

```txt
http://localhost:3000/
```

## Como gerar build

```bash
pnpm build
```

O build final será gerado na pasta:

```txt
dist/
```

## Como publicar gratuitamente

### Vercel

1. Suba este projeto para um repositório no GitHub.
2. Acesse a Vercel.
3. Importe o repositório.
4. Use as configurações padrão para Vite.
5. Build command: `pnpm build`
6. Output directory: `dist`

### Netlify

1. Suba este projeto para um repositório no GitHub.
2. Acesse a Netlify.
3. Importe o repositório.
4. Build command: `pnpm build`
5. Publish directory: `dist`

### GitHub Pages

Para GitHub Pages, pode ser necessário ajustar `base` no `vite.config.ts` se o deploy for em subpasta.

## Como reproduzir os dados

Os CSVs brutos não foram incluídos no zip final porque são grandes. Para reproduzir:

1. Crie uma pasta `raw_data/` na raiz do projeto.
2. Coloque nela os arquivos CSV baixados do Consumidor.gov.br.
3. Rode:

```bash
python3 scripts/build_dataset.py --raw-dir raw_data --out-dir src/data
```

Isso atualiza:

```txt
src/data/dashboardData.json
```

E também gera um resumo em:

```txt
docs/data_qa_summary.md
```

## Metodologia resumida

O IAD combina quatro dimensões:

- 30% volume relativo
- 30% taxa de não resolução
- 25% baixa satisfação
- 15% tempo médio de resposta

O índice é uma proxy exploratória. Ele não é uma nota oficial e não deve ser lido como julgamento absoluto de qualidade.

## Conteúdos incluídos

A pasta `content/` contém:

- artigo em português
- artigo em inglês
- post para LinkedIn
- roteiro de carrossel
- metodologia completa

## Autor

Rafael Rocha

Data Analyst | BI, Data Products & AI

Portfólio: https://rafaeloliveirarocha.github.io/
