import os
import psycopg
from psycopg.rows import dict_row
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, Any
import json

load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL")

app = FastAPI(title="Temporal - Trajetórias e Eventos")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def conectar():
    return psycopg.connect(DATABASE_URL, row_factory=dict_row)


# ─────────────────────────────────────────────
# MODELOS PYDANTIC
# ─────────────────────────────────────────────

class EntidadeCreate(BaseModel):
    nome: str
    tipo: Optional[str] = None
    descricao: Optional[str] = None


class EntidadeUpdate(BaseModel):
    nome: Optional[str] = None
    tipo: Optional[str] = None
    descricao: Optional[str] = None


class EventoCreate(BaseModel):
    entidade_id: int
    tipo_evento: Optional[str] = None
    descricao: Optional[str] = None
    inicio: str   # ISO datetime string
    fim: str      # ISO datetime string
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    metadados: Optional[dict] = {}


class EventoUpdate(BaseModel):
    tipo_evento: Optional[str] = None
    descricao: Optional[str] = None
    inicio: Optional[str] = None
    fim: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    metadados: Optional[dict] = None


class TrajetoriaCreate(BaseModel):
    entidade_id: int
    nome: str
    descricao: Optional[str] = None
    inicio: str
    fim: str


class PontoCreate(BaseModel):
    sequencia: int
    latitude: float
    longitude: float
    altitude: Optional[float] = None
    timestamp: str
    velocidade: Optional[float] = None
    metadados: Optional[dict] = {}


# ─────────────────────────────────────────────
# HELPERS
# ─────────────────────────────────────────────

def serialize_value(v):
    if v is None:
        return None
    if hasattr(v, 'isoformat'):
        return v.isoformat()
    if hasattr(v, 'total_seconds'):
        return str(v)
    if 'Range' in type(v).__name__ or hasattr(v, 'lower'):
        return str(v)
    return v


def row_to_dict(row):
    """Converte row psycopg para dict serializável."""
    if row is None:
        return None
    d = dict(row)
    for k, v in d.items():
        d[k] = serialize_value(v)
    return d


def rows_to_list(rows):
    return [row_to_dict(r) for r in rows]


# ─────────────────────────────────────────────
# ROTAS BASE
# ─────────────────────────────────────────────

@app.get("/")
def inicio():
    return {"mensagem": "API Temporal funcionando!"}


# ─────────────────────────────────────────────
# ENTIDADES
# ─────────────────────────────────────────────

@app.get("/entidades")
def listar_entidades():
    with conectar() as conn:
        with conn.cursor() as cursor:
            cursor.execute("SELECT * FROM entidade ORDER BY id_entidade;")
            return rows_to_list(cursor.fetchall())


@app.post("/entidades", status_code=201)
def criar_entidade(body: EntidadeCreate):
    with conectar() as conn:
        with conn.cursor() as cursor:
            cursor.execute(
                """INSERT INTO entidade (nome, tipo, descricao)
                   VALUES (%s, %s, %s)
                   RETURNING *;""",
                (body.nome, body.tipo, body.descricao)
            )
            conn.commit()
            return row_to_dict(cursor.fetchone())


@app.get("/entidades/{id_entidade}")
def obter_entidade(id_entidade: int):
    with conectar() as conn:
        with conn.cursor() as cursor:
            cursor.execute(
                "SELECT * FROM entidade WHERE id_entidade = %s;",
                (id_entidade,)
            )
            row = cursor.fetchone()
    if row is None:
        raise HTTPException(status_code=404, detail="Entidade não encontrada")
    return row_to_dict(row)


@app.put("/entidades/{id_entidade}")
def atualizar_entidade(id_entidade: int, body: EntidadeUpdate):
    sets = []
    vals = []
    if body.nome is not None:
        sets.append("nome = %s"); vals.append(body.nome)
    if body.tipo is not None:
        sets.append("tipo = %s"); vals.append(body.tipo)
    if body.descricao is not None:
        sets.append("descricao = %s"); vals.append(body.descricao)
    if not sets:
        raise HTTPException(status_code=400, detail="Nenhum campo para atualizar")
    vals.append(id_entidade)
    with conectar() as conn:
        with conn.cursor() as cursor:
            cursor.execute(
                f"UPDATE entidade SET {', '.join(sets)} WHERE id_entidade = %s RETURNING *;",
                vals
            )
            conn.commit()
            row = cursor.fetchone()
    if row is None:
        raise HTTPException(status_code=404, detail="Entidade não encontrada")
    return row_to_dict(row)


@app.delete("/entidades/{id_entidade}", status_code=204)
def excluir_entidade(id_entidade: int):
    with conectar() as conn:
        with conn.cursor() as cursor:
            cursor.execute(
                "DELETE FROM entidade WHERE id_entidade = %s RETURNING id_entidade;",
                (id_entidade,)
            )
            conn.commit()
            if cursor.fetchone() is None:
                raise HTTPException(status_code=404, detail="Entidade não encontrada")


@app.get("/entidades/{id_entidade}/historico")
def consultar_historico(id_entidade: int):
    with conectar() as conn:
        with conn.cursor() as cursor:
            cursor.execute("""
                SELECT
                    e.nome,
                    ev.id_evento,
                    ev.tipo_evento,
                    ev.descricao,
                    lower(ev.periodo) AS inicio,
                    upper(ev.periodo) AS fim,
                    ev.latitude,
                    ev.longitude,
                    upper(ev.periodo) - lower(ev.periodo) AS duracao
                FROM entidade e
                JOIN evento ev ON e.id_entidade = ev.entidade_id
                WHERE e.id_entidade = %s
                ORDER BY lower(ev.periodo);
            """, (id_entidade,))
            return rows_to_list(cursor.fetchall())


@app.get("/entidades/{id_entidade}/trajetorias")
def trajetorias_da_entidade(id_entidade: int):
    with conectar() as conn:
        with conn.cursor() as cursor:
            cursor.execute(
                "SELECT * FROM trajetoria WHERE entidade_id = %s ORDER BY id_trajetoria;",
                (id_entidade,)
            )
            return rows_to_list(cursor.fetchall())


# ─────────────────────────────────────────────
# EVENTOS
# ─────────────────────────────────────────────

@app.get("/eventos")
def listar_eventos(
    tipo: Optional[str] = Query(None),
    entidade_id: Optional[int] = Query(None)
):
    conditions = []
    vals = []
    if tipo:
        conditions.append("ev.tipo_evento = %s")
        vals.append(tipo)
    if entidade_id:
        conditions.append("ev.entidade_id = %s")
        vals.append(entidade_id)
    where = ("WHERE " + " AND ".join(conditions)) if conditions else ""
    with conectar() as conn:
        with conn.cursor() as cursor:
            cursor.execute(f"""
                SELECT ev.*, e.nome AS entidade_nome,
                    lower(ev.periodo) AS inicio,
                    upper(ev.periodo) AS fim
                FROM evento ev
                JOIN entidade e ON ev.entidade_id = e.id_entidade
                {where}
                ORDER BY lower(ev.periodo);
            """, vals)
            return rows_to_list(cursor.fetchall())


@app.post("/eventos", status_code=201)
def criar_evento(body: EventoCreate):
    periodo = f"[{body.inicio}, {body.fim})"
    meta = json.dumps(body.metadados or {})
    with conectar() as conn:
        with conn.cursor() as cursor:
            cursor.execute("""
                INSERT INTO evento (entidade_id, tipo_evento, descricao, periodo, latitude, longitude, metadados)
                VALUES (%s, %s, %s, %s::tstzrange, %s, %s, %s::jsonb)
                RETURNING *, lower(periodo) AS inicio, upper(periodo) AS fim;
            """, (body.entidade_id, body.tipo_evento, body.descricao,
                  periodo, body.latitude, body.longitude, meta))
            conn.commit()
            return row_to_dict(cursor.fetchone())


@app.get("/eventos/{id_evento}")
def obter_evento(id_evento: int):
    with conectar() as conn:
        with conn.cursor() as cursor:
            cursor.execute("""
                SELECT ev.*, e.nome AS entidade_nome,
                    lower(ev.periodo) AS inicio,
                    upper(ev.periodo) AS fim
                FROM evento ev
                JOIN entidade e ON ev.entidade_id = e.id_entidade
                WHERE ev.id_evento = %s;
            """, (id_evento,))
            row = cursor.fetchone()
    if row is None:
        raise HTTPException(status_code=404, detail="Evento não encontrado")
    return row_to_dict(row)


@app.put("/eventos/{id_evento}")
def atualizar_evento(id_evento: int, body: EventoUpdate):
    sets = []
    vals = []
    if body.tipo_evento is not None:
        sets.append("tipo_evento = %s"); vals.append(body.tipo_evento)
    if body.descricao is not None:
        sets.append("descricao = %s"); vals.append(body.descricao)
    if body.inicio is not None and body.fim is not None:
        sets.append("periodo = %s::tstzrange")
        vals.append(f"[{body.inicio}, {body.fim})")
    if body.latitude is not None:
        sets.append("latitude = %s"); vals.append(body.latitude)
    if body.longitude is not None:
        sets.append("longitude = %s"); vals.append(body.longitude)
    if body.metadados is not None:
        sets.append("metadados = %s::jsonb"); vals.append(json.dumps(body.metadados))
    if not sets:
        raise HTTPException(status_code=400, detail="Nenhum campo para atualizar")
    vals.append(id_evento)
    with conectar() as conn:
        with conn.cursor() as cursor:
            cursor.execute(
                f"UPDATE evento SET {', '.join(sets)} WHERE id_evento = %s "
                f"RETURNING *, lower(periodo) AS inicio, upper(periodo) AS fim;",
                vals
            )
            conn.commit()
            row = cursor.fetchone()
    if row is None:
        raise HTTPException(status_code=404, detail="Evento não encontrado")
    return row_to_dict(row)


@app.delete("/eventos/{id_evento}", status_code=204)
def excluir_evento(id_evento: int):
    with conectar() as conn:
        with conn.cursor() as cursor:
            cursor.execute(
                "DELETE FROM evento WHERE id_evento = %s RETURNING id_evento;",
                (id_evento,)
            )
            conn.commit()
            if cursor.fetchone() is None:
                raise HTTPException(status_code=404, detail="Evento não encontrado")


# ─────────────────────────────────────────────
# TRAJETÓRIAS
# ─────────────────────────────────────────────

@app.get("/trajetorias")
def listar_trajetorias():
    with conectar() as conn:
        with conn.cursor() as cursor:
            cursor.execute("""
                SELECT t.*, e.nome AS entidade_nome,
                    lower(t.periodo) AS inicio,
                    upper(t.periodo) AS fim
                FROM trajetoria t
                JOIN entidade e ON t.entidade_id = e.id_entidade
                ORDER BY t.id_trajetoria;
            """)
            return rows_to_list(cursor.fetchall())


@app.post("/trajetorias", status_code=201)
def criar_trajetoria(body: TrajetoriaCreate):
    periodo = f"[{body.inicio}, {body.fim})"
    with conectar() as conn:
        with conn.cursor() as cursor:
            cursor.execute("""
                INSERT INTO trajetoria (entidade_id, nome, descricao, periodo)
                VALUES (%s, %s, %s, %s::tstzrange)
                RETURNING *, lower(periodo) AS inicio, upper(periodo) AS fim;
            """, (body.entidade_id, body.nome, body.descricao, periodo))
            conn.commit()
            return row_to_dict(cursor.fetchone())


@app.get("/trajetorias/{id_trajetoria}")
def obter_trajetoria(id_trajetoria: int):
    with conectar() as conn:
        with conn.cursor() as cursor:
            cursor.execute("""
                SELECT t.*, e.nome AS entidade_nome,
                    lower(t.periodo) AS inicio,
                    upper(t.periodo) AS fim
                FROM trajetoria t
                JOIN entidade e ON t.entidade_id = e.id_entidade
                WHERE t.id_trajetoria = %s;
            """, (id_trajetoria,))
            traj = cursor.fetchone()
            if traj is None:
                raise HTTPException(status_code=404, detail="Trajetória não encontrada")
            cursor.execute("""
                SELECT * FROM ponto_trajetoria
                WHERE trajetoria_id = %s
                ORDER BY sequencia;
            """, (id_trajetoria,))
            pontos = cursor.fetchall()
    d = row_to_dict(traj)
    d["pontos"] = rows_to_list(pontos)
    return d


@app.delete("/trajetorias/{id_trajetoria}", status_code=204)
def excluir_trajetoria(id_trajetoria: int):
    with conectar() as conn:
        with conn.cursor() as cursor:
            cursor.execute(
                "DELETE FROM trajetoria WHERE id_trajetoria = %s RETURNING id_trajetoria;",
                (id_trajetoria,)
            )
            conn.commit()
            if cursor.fetchone() is None:
                raise HTTPException(status_code=404, detail="Trajetória não encontrada")


@app.post("/trajetorias/{id_trajetoria}/pontos", status_code=201)
def adicionar_ponto(id_trajetoria: int, body: PontoCreate):
    meta = json.dumps(body.metadados or {})
    with conectar() as conn:
        with conn.cursor() as cursor:
            # Verifica existência
            cursor.execute(
                "SELECT id_trajetoria FROM trajetoria WHERE id_trajetoria = %s;",
                (id_trajetoria,)
            )
            if cursor.fetchone() is None:
                raise HTTPException(status_code=404, detail="Trajetória não encontrada")
            cursor.execute("""
                INSERT INTO ponto_trajetoria
                    (trajetoria_id, sequencia, latitude, longitude, altitude, timestamp, velocidade, metadados)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s::jsonb)
                RETURNING *;
            """, (id_trajetoria, body.sequencia, body.latitude, body.longitude,
                  body.altitude, body.timestamp, body.velocidade, meta))
            conn.commit()
            return row_to_dict(cursor.fetchone())


@app.delete("/trajetorias/{id_trajetoria}/pontos/{id_ponto}", status_code=204)
def remover_ponto(id_trajetoria: int, id_ponto: int):
    with conectar() as conn:
        with conn.cursor() as cursor:
            cursor.execute(
                "DELETE FROM ponto_trajetoria WHERE id_ponto = %s AND trajetoria_id = %s RETURNING id_ponto;",
                (id_ponto, id_trajetoria)
            )
            conn.commit()
            if cursor.fetchone() is None:
                raise HTTPException(status_code=404, detail="Ponto não encontrado")


# ─────────────────────────────────────────────
# ANÁLISE TEMPORAL
# ─────────────────────────────────────────────

@app.get("/analise/sequencia/{entidade_id}")
def analise_sequencia(entidade_id: int):
    """Eventos com LAG/LEAD - evento anterior e próximo."""
    with conectar() as conn:
        with conn.cursor() as cursor:
            cursor.execute("""
                SELECT
                    id_evento,
                    tipo_evento,
                    descricao,
                    lower(periodo) AS inicio,
                    upper(periodo) AS fim,
                    latitude,
                    longitude,
                    LAG(tipo_evento)  OVER (ORDER BY lower(periodo)) AS tipo_anterior,
                    LAG(descricao)    OVER (ORDER BY lower(periodo)) AS desc_anterior,
                    LAG(lower(periodo)) OVER (ORDER BY lower(periodo)) AS inicio_anterior,
                    LEAD(tipo_evento) OVER (ORDER BY lower(periodo)) AS tipo_proximo,
                    LEAD(descricao)   OVER (ORDER BY lower(periodo)) AS desc_proximo,
                    LEAD(lower(periodo)) OVER (ORDER BY lower(periodo)) AS inicio_proximo
                FROM evento
                WHERE entidade_id = %s
                ORDER BY lower(periodo);
            """, (entidade_id,))
            return rows_to_list(cursor.fetchall())


@app.get("/analise/janela/{entidade_id}")
def analise_janela(entidade_id: int):
    """Funções de janela: posição, rank, duração acumulada."""
    with conectar() as conn:
        with conn.cursor() as cursor:
            cursor.execute("""
                SELECT
                    id_evento,
                    tipo_evento,
                    descricao,
                    lower(periodo) AS inicio,
                    upper(periodo) AS fim,
                    upper(periodo) - lower(periodo) AS duracao,
                    ROW_NUMBER() OVER (ORDER BY lower(periodo)) AS posicao,
                    RANK()       OVER (ORDER BY lower(periodo)) AS rank_temporal,
                    SUM(EXTRACT(EPOCH FROM (upper(periodo) - lower(periodo))))
                        OVER (ORDER BY lower(periodo)) AS duracao_acumulada_segundos,
                    AVG(EXTRACT(EPOCH FROM (upper(periodo) - lower(periodo))))
                        OVER (ORDER BY lower(periodo) ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW)
                        AS duracao_media_movel_segundos
                FROM evento
                WHERE entidade_id = %s
                ORDER BY lower(periodo);
            """, (entidade_id,))
            return rows_to_list(cursor.fetchall())


@app.get("/analise/intervalos/{entidade_id}")
def analise_intervalos(entidade_id: int):
    """Sobreposição de intervalos e gaps entre eventos consecutivos."""
    with conectar() as conn:
        with conn.cursor() as cursor:
            cursor.execute("""
                WITH ordered AS (
                    SELECT
                        id_evento,
                        tipo_evento,
                        descricao,
                        periodo,
                        lower(periodo) AS inicio,
                        upper(periodo) AS fim,
                        LAG(upper(periodo)) OVER (ORDER BY lower(periodo)) AS fim_anterior,
                        LAG(tipo_evento)    OVER (ORDER BY lower(periodo)) AS tipo_anterior
                    FROM evento
                    WHERE entidade_id = %s
                    ORDER BY lower(periodo)
                )
                SELECT
                    id_evento,
                    tipo_evento,
                    descricao,
                    inicio,
                    fim,
                    tipo_anterior,
                    fim_anterior,
                    CASE
                        WHEN fim_anterior IS NULL THEN NULL
                        WHEN inicio < fim_anterior THEN 'sobreposição'
                        WHEN inicio = fim_anterior THEN 'adjacente'
                        ELSE 'gap'
                    END AS relacao_anterior,
                    CASE
                        WHEN fim_anterior IS NULL THEN NULL
                        WHEN inicio > fim_anterior
                            THEN EXTRACT(EPOCH FROM (inicio - fim_anterior))
                        ELSE NULL
                    END AS gap_segundos,
                    CASE
                        WHEN fim_anterior IS NOT NULL AND inicio < fim_anterior
                            THEN EXTRACT(EPOCH FROM (fim_anterior - inicio))
                        ELSE NULL
                    END AS sobreposicao_segundos
                FROM ordered
                ORDER BY inicio;
            """, (entidade_id,))
            return rows_to_list(cursor.fetchall())


@app.get("/analise/resumo")
def analise_resumo():
    """Resumo geral com contagens e estatísticas."""
    with conectar() as conn:
        with conn.cursor() as cursor:
            cursor.execute("""
                SELECT
                    (SELECT COUNT(*) FROM entidade) AS total_entidades,
                    (SELECT COUNT(*) FROM evento)   AS total_eventos,
                    (SELECT COUNT(*) FROM trajetoria) AS total_trajetorias,
                    (SELECT COUNT(*) FROM ponto_trajetoria) AS total_pontos,
                    (SELECT COUNT(DISTINCT tipo_evento) FROM evento) AS tipos_evento_distintos,
                    (SELECT COUNT(*) FROM evento WHERE latitude IS NOT NULL) AS eventos_com_localizacao;
            """)
            resumo = dict(cursor.fetchone())

            cursor.execute("""
                SELECT tipo_evento, COUNT(*) AS quantidade
                FROM evento
                GROUP BY tipo_evento
                ORDER BY quantidade DESC;
            """)
            por_tipo = rows_to_list(cursor.fetchall())

            cursor.execute("""
                SELECT e.nome, COUNT(ev.id_evento) AS total_eventos
                FROM entidade e
                LEFT JOIN evento ev ON e.id_entidade = ev.entidade_id
                GROUP BY e.id_entidade, e.nome
                ORDER BY total_eventos DESC;
            """)
            por_entidade = rows_to_list(cursor.fetchall())

    return {
        **resumo,
        "eventos_por_tipo": por_tipo,
        "eventos_por_entidade": por_entidade,
    }
