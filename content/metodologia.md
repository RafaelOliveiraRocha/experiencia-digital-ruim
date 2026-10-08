# Metodologia

Estudo exploratório autoral de Rafael Rocha, publicado em maio de 2026. O título orienta uma investigação de atrito; o projeto não estima custos monetários.

## Fonte, período e cobertura

Fonte: [Consumidor.gov.br — portal de dados do Ministério da Justiça e Segurança Pública](https://dados.mj.gov.br/dataset/reclamacoes-do-consumidor-gov-br).

Arquivos registrados: `basecompleta2026-01.csv`, `basecompleta2026-02.csv`, `basecompleta2026-03.csv` e `basecompleta2026-04.csv`. O JSON e o resumo de qualidade registram **1.380.388 linhas brutas e usadas**, com zero exclusões por finalização fora de janeiro–abril/2026.

O script lê todos os CSVs da pasta, com `;` e `utf-8-sig`, em chunks de 100 mil. Requer: `Região`, `UF`, `Data Abertura`, `Data Finalização`, `Tempo Resposta`, `Segmento de Mercado`, `Área`, `Grupo Problema`, `Problema`, `Como Comprou Contratou`, `Respondida`, `Avaliação Reclamação` e `Nota do Consumidor`.

O filtro usa os primeiros sete caracteres de `Data Finalização`, esperando `YYYY-MM`, entre `2026-01` e `2026-04`. A abertura não define o recorte e pode ser anterior a 2026. O volume conta **linhas, sem deduplicação por identificador**. Textos ausentes/vazios viram `Não informado`; números inválidos viram ausentes.

Setores elegíveis têm **pelo menos 300 reclamações** no período. Os **39 setores** do JSON somam **1.379.792 registros**; os **596** restantes participam dos KPIs globais, mas não do ranking/seletor. Nenhum filtro altera essa população de referência do IAD.

## Indicadores e denominadores

| Indicador | Numerador | Denominador |
|---|---|---|
| Resposta | Registros com `Respondida = S` | Total de linhas |
| Resolução | Avaliações `Resolvida` | Avaliações `Resolvida` ou `Não Resolvida` |
| Satisfação | Soma de notas numéricas disponíveis | Contagem dessas notas |
| Demora | Soma de tempos numéricos disponíveis | Contagem desses tempos |

Tempos/notas não são restringidos pelo flag de resposta. Taxas e médias sem denominador ficam ausentes. Na interface, somam-se numeradores e denominadores dos setores selecionados antes de dividir; não se calcula média simples das médias ou taxas. A participação do recorte divide seu volume pelas 1.380.388 linhas globais.

## IAD canônico

O **Índice de Atrito Digital (IAD)** é um índice exploratório autoral de **0–100**, produzido por `scripts/build_dataset.py`. **Valores maiores indicam maior atrito segundo esta combinação**. Não é uma nota oficial nem julgamento absoluto de qualidade.

No ranking de setores, todas as referências são calculadas sobre a população fixa de setores elegíveis, após o limite de 300 reclamações:

1. **Volume (30%):** `log1p(total)` normalizado por min–max entre os setores. Não usa participação de mercado ou base de clientes.
2. **Não resolução (30%):** `1 − taxa de resolução`, com a taxa limitada a `[0, 1]`.
3. **Baixa satisfação (25%):** `1 − (nota média − 1) / 4`, com a nota média limitada a `[1, 5]`.
4. **Demora (15%):** média limitada inferiormente a zero e superiormente ao **p95 das médias dos setores elegíveis**, depois normalizada por min–max dos valores limitados. O p95 usa `Series.quantile(0.95)` do pandas, com interpolação linear padrão.

```text
IAD = 100 × (0,30 × volumeScore
           + 0,30 × nonResolutionScore
           + 0,25 × lowSatisfactionScore
           + 0,15 × delayScore)
```

Se todos os valores de volume ou demora forem iguais, o respectivo componente normalizado é zero, conforme a regra original.

### Ausentes

Antes de calcular componentes e p95, o Python preenche médias/taxas ausentes com valores **globais**, ponderados pelos denominadores da base completa. Sem denominador global, preserva os fallbacks:

| Campo | Valor global | Fallback |
|---|---|---:|
| Resolução | Resolvidas / avaliadas | 0,5 |
| Satisfação | Soma de notas / contagem de notas | 3 |
| Demora | Soma de tempos / contagem de tempos | 5 dias |

As imputações servem aos componentes do IAD; os indicadores originais ausentes continuam ausentes na exportação. Não são convertidos em componente favorável zero na interface.

### Precisão

O Python calcula antes dos arredondamentos de exportação e aplica `.round(1)` ao IAD. O JSON guarda IAD com uma casa, médias com duas, taxas/componentes e somas com quatro, e participação com seis. Contagens são inteiras. O filtro recompõe taxas/médias pelas somas e contagens exportadas; pequenas diferenças de arredondamento desses indicadores podem ocorrer. **O IAD é lido do JSON, sem recomputar a fórmula ou renormalizar na interface.**

## Apresentação conforme a seleção

- **Sem filtro:** “Maior IAD entre setores”, identificando o setor: **Bancos, Financeiras e Administradoras de Cartão: 78,2**. Não é um IAD da base global.
- **Um setor:** mesmo índice no ranking, resumo e benchmark: **Estabelecimentos de Ensino: 70,4**.
- **Vários setores:** volumes, taxas e médias agregados; índices individuais nomeados. Não há média de IADs nem índice combinado.

A seleção altera as agregações exibidas, mas mantém o IAD de cada setor armazenado no JSON.

## Limitações e reprodução

A base representa reclamações do canal público, não todos os consumidores. Mais registros podem refletir maior base de clientes ou adesão ao canal. Resolução alta não implica satisfação alta; a fonte não demonstra jornadas específicas de bots ou custos em dinheiro. O objetivo é formular hipóteses e priorizar investigação.

O dashboard usa o JSON versionado, sem API em tempo de execução. A reconstrução integral requer os quatro CSVs de origem, não incluídos no repositório; o JSON agregado não permite recuperar os registros individuais. Siga o [README](../README.md). O QA é escrito em `docs/data_qa_summary.md` relativo ao diretório corrente, mesmo com outro `--out-dir`: execute a reconstrução opcional fora do checkout para preservar o QA histórico.
