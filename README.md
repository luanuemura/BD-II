# Temporal — Trajetórias e Eventos

Sistema genérico para rastreamento temporal de entidades, trajetórias e eventos, com análises usando SQL avançado (LAG, LEAD, funções de janela, intervalos TSTZRANGE).

## Stack

| Camada     | Tecnologia                               |
|------------|------------------------------------------|
| Frontend   | React 18 + TypeScript + Vite             |
| Backend    | Python + FastAPI + psycopg3              |
| Banco      | PostgreSQL (TSTZRANGE, GiST index, JSONB)|
| Mapas      | Leaflet (react-leaflet)                  |
| API        | REST JSON                                |

---

## Pré-requisitos

- Python 3.10+
- Node.js 18+ (com npm ou pnpm)
- PostgreSQL 14+

---

## 1. Banco de Dados

```sql
-- Criar o banco (no psql ou pgAdmin):
CREATE DATABASE temporal_db;

-- Executar o script (via terminal):
psql -U postgres -d temporal_db -f database.sql
```

O script cria:
- 4 tabelas: `entidade`, `evento`, `trajetoria`, `ponto_trajetoria`
- Índices GiST em colunas `periodo` (TSTZRANGE)
- Índices BTree em foreign keys
- Dados de exemplo (3 entidades, 20 eventos, 2 trajetórias com 32 pontos)

---

## 2. Backend (FastAPI)

```powershell
cd backend

# Copiar e editar variáveis de ambiente
Copy-Item .env.example .env
# Editar .env e preencher DATABASE_URL

# Instalar dependências
pip install -r requirements.txt

# Iniciar servidor
uvicorn main:app --reload
```

Acesse a documentação interativa da API: http://localhost:8000/docs

### Variável de ambiente (`.env`):
```
DATABASE_URL=postgresql://postgres:SUA_SENHA@localhost:5432/temporal_db
```

### Rotas disponíveis:

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/entidades` | Listar entidades |
| POST | `/entidades` | Criar entidade |
| GET | `/entidades/{id}` | Detalhes |
| PUT | `/entidades/{id}` | Atualizar |
| DELETE | `/entidades/{id}` | Excluir |
| GET | `/entidades/{id}/historico` | Histórico com duração |
| GET | `/entidades/{id}/trajetorias` | Trajetórias da entidade |
| GET | `/eventos` | Listar (filtros: `?tipo=X&entidade_id=Y`) |
| POST | `/eventos` | Criar evento |
| GET | `/eventos/{id}` | Detalhes |
| PUT | `/eventos/{id}` | Atualizar |
| DELETE | `/eventos/{id}` | Excluir |
| GET | `/trajetorias` | Listar trajetórias |
| POST | `/trajetorias` | Criar trajetória |
| GET | `/trajetorias/{id}` | Detalhes + pontos |
| DELETE | `/trajetorias/{id}` | Excluir |
| POST | `/trajetorias/{id}/pontos` | Adicionar ponto |
| DELETE | `/trajetorias/{id}/pontos/{pid}` | Remover ponto |
| GET | `/analise/sequencia/{id}` | **LAG / LEAD** |
| GET | `/analise/janela/{id}` | **ROW_NUMBER, RANK, SUM/AVG OVER** |
| GET | `/analise/intervalos/{id}` | **Gaps e sobreposições** |
| GET | `/analise/resumo` | Resumo geral |

---

## 3. Frontend (React)

```powershell
cd frontend

# Instalar dependências
npm install
# ou: pnpm install

# Iniciar servidor de desenvolvimento
npm run dev
# ou: pnpm dev
```

Acesse: http://localhost:5173

O Vite faz proxy automático: `/api/*` → `http://localhost:8000/*`

### Abas da interface:

| Aba | Funcionalidade |
|-----|----------------|
| Entidades | CRUD completo + histórico em timeline + link para mapa |
| Eventos | Listagem com filtros por tipo e entidade + CRUD |
| Trajetórias | Mapa Leaflet interativo com Polylines e tooltips |
| Análise Temporal | LAG/LEAD, funções de janela, intervalos/gaps, resumo |

---

## Conceitos de BD II demonstrados

### TSTZRANGE
```sql
-- Período do evento com timezone
periodo TSTZRANGE NOT NULL
-- Acessando início e fim:
lower(periodo) AS inicio
upper(periodo) AS fim
```

### LAG / LEAD
```sql
LAG(tipo_evento)  OVER (ORDER BY lower(periodo)) AS tipo_anterior,
LEAD(tipo_evento) OVER (ORDER BY lower(periodo)) AS tipo_proximo
```

### Funções de Janela
```sql
ROW_NUMBER() OVER (ORDER BY lower(periodo)) AS posicao,
RANK()       OVER (ORDER BY lower(periodo)) AS rank_temporal,
SUM(EXTRACT(EPOCH FROM (upper(periodo) - lower(periodo))))
    OVER (ORDER BY lower(periodo)) AS duracao_acumulada_segundos,
AVG(EXTRACT(EPOCH FROM (upper(periodo) - lower(periodo))))
    OVER (ORDER BY lower(periodo) ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW)
    AS duracao_media_movel_segundos
```

### Detecção de Gaps e Sobreposições
```sql
CASE
    WHEN fim_anterior IS NULL THEN NULL
    WHEN inicio < fim_anterior THEN 'sobreposição'
    WHEN inicio = fim_anterior THEN 'adjacente'
    ELSE 'gap'
END AS relacao_anterior
```

### Índices GiST para TSTZRANGE
```sql
CREATE INDEX idx_evento_periodo ON evento USING GIST (periodo);
-- Suporta operadores: &&, @>, <@, =, <<, >>
```
