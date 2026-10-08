# Publicação estática com GitHub Pages

O dashboard é uma aplicação Vite. O build gera os arquivos estáticos em `dist/`, com a subpasta `/experiencia-digital-ruim/` configurada em `vite.config.ts`.

Para preparar o build local:

```bash
pnpm install --frozen-lockfile
pnpm typecheck
pnpm build
```

O workflow de GitHub Pages do repositório publica a versão da branch `RochaRafa`. A execução local dos comandos acima não publica o site. O conteúdo do dashboard vem do JSON versionado; publicar a interface não reconstrói os dados.

Consulte o [README](../README.md) para versões de Node/pnpm, execução local e testes da interface.
