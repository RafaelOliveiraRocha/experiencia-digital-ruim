# Metodologia

## Fonte

Dados públicos do Consumidor.gov.br, baixados no portal de dados do Ministério da Justiça e Segurança Pública.

URL de referência: https://dados.mj.gov.br/dataset/reclamacoes-do-consumidor-gov-br

## Arquivos usados

- basecompleta2026-01.csv
- basecompleta2026-02.csv
- basecompleta2026-03.csv
- basecompleta2026-04.csv

## Recorte

O recorte principal considera reclamações com Data Finalização entre janeiro e abril de 2026.

Importante: a Data Abertura pode estar em meses anteriores, porque uma reclamação aberta em 2025 pode ter sido finalizada em 2026.

## Volume processado

- Linhas brutas: 1.380.388
- Linhas usadas na análise: 1.380.388
- Linhas fora do recorte de finalização: 0

## Métricas

### Taxa de resposta
Reclamações com Respondida = S dividido pelo total de reclamações.

### Taxa de resolução
Reclamações com Avaliação Reclamação = Resolvida dividido por reclamações avaliadas como Resolvida ou Não Resolvida.

### Nota média
Média do campo Nota do Consumidor, considerando registros com nota disponível.

### Tempo médio de resposta
Média do campo Tempo Resposta.

## IAD - Índice de Atrito Digital

O IAD é uma proxy analítica de 0 a 100 criada para comparar setores.

Composição:

- 30% volume relativo
- 30% taxa de não resolução
- 25% baixa satisfação
- 15% tempo médio de resposta

O volume foi normalizado com log para reduzir a dominância de setores muito grandes. As demais dimensões foram normalizadas para comparação entre setores.

## Limitações

- A base representa reclamações registradas publicamente, não todo o universo de consumidores.
- Mais reclamações podem refletir maior base de clientes ou maior uso do canal.
- Resolução alta não significa necessariamente satisfação alta.
- O IAD não é uma nota oficial e não deve ser usado como julgamento absoluto.
- O objetivo é gerar leitura exploratória e hipóteses de investigação.
