-- ============================================================
-- Temporal - Trajetórias e Eventos
-- Script de criação do banco de dados
-- ============================================================

-- Extensões
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- ============================================================
-- TABELAS
-- ============================================================

CREATE TABLE IF NOT EXISTS entidade (
    id_entidade  SERIAL PRIMARY KEY,
    nome         VARCHAR(255) NOT NULL,
    tipo         VARCHAR(100),
    descricao    TEXT,
    criado_em    TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS evento (
    id_evento    SERIAL PRIMARY KEY,
    entidade_id  INT NOT NULL REFERENCES entidade(id_entidade) ON DELETE CASCADE,
    tipo_evento  VARCHAR(100),
    descricao    TEXT,
    periodo      TSTZRANGE NOT NULL,
    latitude     DOUBLE PRECISION,
    longitude    DOUBLE PRECISION,
    metadados    JSONB DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS trajetoria (
    id_trajetoria SERIAL PRIMARY KEY,
    entidade_id   INT NOT NULL REFERENCES entidade(id_entidade) ON DELETE CASCADE,
    nome          VARCHAR(255) NOT NULL,
    descricao     TEXT,
    periodo       TSTZRANGE NOT NULL,
    criado_em     TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ponto_trajetoria (
    id_ponto      SERIAL PRIMARY KEY,
    trajetoria_id INT NOT NULL REFERENCES trajetoria(id_trajetoria) ON DELETE CASCADE,
    sequencia     INT NOT NULL,
    latitude      DOUBLE PRECISION NOT NULL,
    longitude     DOUBLE PRECISION NOT NULL,
    altitude      DOUBLE PRECISION,
    timestamp     TIMESTAMPTZ NOT NULL,
    velocidade    DOUBLE PRECISION,
    metadados     JSONB DEFAULT '{}'
);

-- ============================================================
-- ÍNDICES
-- ============================================================

-- GiST em periodo (suporte a operações de intervalo eficientes)
CREATE INDEX IF NOT EXISTS idx_evento_periodo        ON evento       USING GIST (periodo);
CREATE INDEX IF NOT EXISTS idx_trajetoria_periodo    ON trajetoria   USING GIST (periodo);

-- BTree em entidade_id para JOINs rápidos
CREATE INDEX IF NOT EXISTS idx_evento_entidade_id        ON evento           (entidade_id);
CREATE INDEX IF NOT EXISTS idx_trajetoria_entidade_id    ON trajetoria       (entidade_id);
CREATE INDEX IF NOT EXISTS idx_ponto_trajetoria_id       ON ponto_trajetoria (trajetoria_id);
CREATE INDEX IF NOT EXISTS idx_ponto_sequencia           ON ponto_trajetoria (trajetoria_id, sequencia);

-- ============================================================
-- DADOS DE EXEMPLO
-- ============================================================

-- Entidades
INSERT INTO entidade (nome, tipo, descricao) VALUES
    ('Carlos Silva',       'pessoa',   'Pesquisador de campo - monitoramento ambiental'),
    ('Veículo Patrulha 7', 'veículo',  'Viatura da Polícia Ambiental - SP'),
    ('Drone Alpha-3',      'objeto',   'Drone de monitoramento de áreas de preservação')
ON CONFLICT DO NOTHING;

-- ============================================================
-- EVENTOS - Entidade 1 (Carlos Silva) - São Paulo / SP
-- ============================================================
INSERT INTO evento (entidade_id, tipo_evento, descricao, periodo, latitude, longitude, metadados) VALUES
(1, 'deslocamento', 'Saída da base em São Paulo rumo a campo',
    '[2024-03-01 07:00:00+00, 2024-03-01 09:30:00+00)',
    -23.5505, -46.6333,
    '{"veiculo": "carro", "distancia_km": 120}'
),
(1, 'parada', 'Coleta de amostras - Margem do Rio Tietê',
    '[2024-03-01 09:30:00+00, 2024-03-01 11:00:00+00)',
    -23.5261, -46.5558,
    '{"amostras_coletadas": 5, "tipo": "agua"}'
),
(1, 'incidente', 'Equipamento de medição danificado por chuva',
    '[2024-03-01 10:45:00+00, 2024-03-01 11:15:00+00)',
    -23.5261, -46.5558,
    '{"gravidade": "media", "equipamento": "medidor pH"}'
),
(1, 'deslocamento', 'Deslocamento para Campinas',
    '[2024-03-01 11:00:00+00, 2024-03-01 13:30:00+00)',
    -22.9099, -47.0626,
    '{"veiculo": "carro", "distancia_km": 95}'
),
(1, 'parada', 'Reunião com equipe local em Campinas',
    '[2024-03-01 13:30:00+00, 2024-03-01 15:00:00+00)',
    -22.9099, -47.0626,
    '{"participantes": 4, "pauta": "relatório mensal"}'
),
(1, 'deslocamento', 'Retorno à base em São Paulo',
    '[2024-03-01 15:00:00+00, 2024-03-01 17:30:00+00)',
    -23.5505, -46.6333,
    '{"veiculo": "carro", "distancia_km": 95}'
),
(1, 'parada', 'Elaboração de relatório na base',
    '[2024-03-01 17:30:00+00, 2024-03-01 19:00:00+00)',
    -23.5505, -46.6333,
    '{"atividade": "relatório", "paginas": 12}'
);

-- ============================================================
-- EVENTOS - Entidade 2 (Veículo Patrulha 7) - RJ
-- ============================================================
INSERT INTO evento (entidade_id, tipo_evento, descricao, periodo, latitude, longitude, metadados) VALUES
(2, 'parada', 'Estacionado na base - início do turno',
    '[2024-03-02 06:00:00+00, 2024-03-02 06:30:00+00)',
    -22.9068, -43.1729,
    '{"km_odometro": 45200}'
),
(2, 'deslocamento', 'Patrulha pela Floresta da Tijuca',
    '[2024-03-02 06:30:00+00, 2024-03-02 09:00:00+00)',
    -22.9375, -43.2896,
    '{"km_percorridos": 35, "velocidade_media": 40}'
),
(2, 'incidente', 'Autuação por desmatamento irregular',
    '[2024-03-02 08:15:00+00, 2024-03-02 09:00:00+00)',
    -22.9500, -43.3000,
    '{"auto_numero": "AIF-2024-0312", "area_m2": 500}'
),
(2, 'deslocamento', 'Deslocamento para Petrópolis - ocorrência',
    '[2024-03-02 09:00:00+00, 2024-03-02 11:00:00+00)',
    -22.5096, -43.1729,
    '{"km_percorridos": 60, "motivo": "queimada"}'
),
(2, 'parada', 'Atendimento à ocorrência de queimada em Petrópolis',
    '[2024-03-02 11:00:00+00, 2024-03-02 14:30:00+00)',
    -22.5096, -43.1729,
    '{"bombeiros": true, "area_afetada_ha": 2.5}'
),
(2, 'deslocamento', 'Retorno ao Rio de Janeiro',
    '[2024-03-02 14:30:00+00, 2024-03-02 16:30:00+00)',
    -22.9068, -43.1729,
    '{"km_percorridos": 60}'
),
(2, 'parada', 'Fim do turno - abastecimento e manutenção',
    '[2024-03-02 16:30:00+00, 2024-03-02 18:00:00+00)',
    -22.9068, -43.1729,
    '{"km_odometro": 45355, "combustivel_litros": 40}'
);

-- ============================================================
-- EVENTOS - Entidade 3 (Drone Alpha-3)
-- ============================================================
INSERT INTO evento (entidade_id, tipo_evento, descricao, periodo, latitude, longitude, metadados) VALUES
(3, 'parada', 'Drone em modo standby - hangar',
    '[2024-03-03 08:00:00+00, 2024-03-03 08:30:00+00)',
    -23.5505, -46.6333,
    '{"bateria_pct": 100, "status": "pronto"}'
),
(3, 'deslocamento', 'Decolagem e voo de reconhecimento - Zona Norte SP',
    '[2024-03-03 08:30:00+00, 2024-03-03 10:00:00+00)',
    -23.4800, -46.6200,
    '{"altitude_m": 120, "velocidade_kmh": 60}'
),
(3, 'parada', 'Inspeção estacionária sobre área suspeita',
    '[2024-03-03 09:30:00+00, 2024-03-03 09:50:00+00)',
    -23.4700, -46.6100,
    '{"imagens_capturadas": 45, "resolucao": "4K"}'
),
(3, 'incidente', 'Perda temporária de sinal GPS',
    '[2024-03-03 09:50:00+00, 2024-03-03 09:55:00+00)',
    -23.4700, -46.6100,
    '{"duracao_segundos": 300, "causa": "interferencia"}'
),
(3, 'deslocamento', 'Retorno ao hangar - bateria baixa',
    '[2024-03-03 10:00:00+00, 2024-03-03 10:30:00+00)',
    -23.5505, -46.6333,
    '{"bateria_pct": 15, "modo": "retorno_automatico"}'
),
(3, 'parada', 'Recarga e manutenção pós-voo',
    '[2024-03-03 10:30:00+00, 2024-03-03 12:30:00+00)',
    -23.5505, -46.6333,
    '{"bateria_pct": 100, "km_total_voo": 45}'
);

-- ============================================================
-- TRAJETÓRIAS
-- ============================================================
INSERT INTO trajetoria (entidade_id, nome, descricao, periodo) VALUES
(1, 'Rota Campo 2024-03-01', 'Rota de pesquisa de campo - Carlos Silva - 01/03/2024',
    '[2024-03-01 07:00:00+00, 2024-03-01 17:30:00+00)'),
(2, 'Patrulha Tijuca-Petrópolis 2024-03-02', 'Rota de patrulha ambiental - Viatura 7 - 02/03/2024',
    '[2024-03-02 06:30:00+00, 2024-03-02 16:30:00+00)');

-- ============================================================
-- PONTOS - Trajetória 1 (Carlos Silva, SP → Campinas → SP)
-- ============================================================
INSERT INTO ponto_trajetoria (trajetoria_id, sequencia, latitude, longitude, altitude, timestamp, velocidade) VALUES
(1,  1, -23.5505, -46.6333, 760,  '2024-03-01 07:00:00+00', 0),
(1,  2, -23.5450, -46.6100, 755,  '2024-03-01 07:15:00+00', 50),
(1,  3, -23.5200, -46.5800, 740,  '2024-03-01 07:30:00+00', 80),
(1,  4, -23.5000, -46.5600, 730,  '2024-03-01 07:45:00+00', 90),
(1,  5, -23.4700, -46.5300, 720,  '2024-03-01 08:00:00+00', 95),
(1,  6, -23.4300, -46.5000, 710,  '2024-03-01 08:20:00+00', 100),
(1,  7, -23.3900, -46.4800, 700,  '2024-03-01 08:40:00+00', 100),
(1,  8, -23.3500, -46.4600, 690,  '2024-03-01 09:00:00+00', 90),
(1,  9, -23.5261, -46.5558, 720,  '2024-03-01 09:30:00+00', 0),
(1, 10, -23.2000, -46.8000, 680,  '2024-03-01 11:30:00+00', 100),
(1, 11, -23.0500, -46.9500, 660,  '2024-03-01 12:00:00+00', 100),
(1, 12, -22.9800, -47.0200, 640,  '2024-03-01 12:30:00+00', 90),
(1, 13, -22.9099, -47.0626, 630,  '2024-03-01 13:30:00+00', 0),
(1, 14, -23.1500, -46.8500, 660,  '2024-03-01 15:30:00+00', 100),
(1, 15, -23.3500, -46.7000, 700,  '2024-03-01 16:00:00+00', 100),
(1, 16, -23.5505, -46.6333, 760,  '2024-03-01 17:30:00+00', 0);

-- ============================================================
-- PONTOS - Trajetória 2 (Patrulha RJ - Tijuca → Petrópolis → RJ)
-- ============================================================
INSERT INTO ponto_trajetoria (trajetoria_id, sequencia, latitude, longitude, altitude, timestamp, velocidade) VALUES
(2,  1, -22.9068, -43.1729, 15,   '2024-03-02 06:30:00+00', 0),
(2,  2, -22.9150, -43.2000, 20,   '2024-03-02 06:50:00+00', 40),
(2,  3, -22.9250, -43.2400, 50,   '2024-03-02 07:10:00+00', 50),
(2,  4, -22.9375, -43.2896, 120,  '2024-03-02 07:40:00+00', 40),
(2,  5, -22.9450, -43.3000, 180,  '2024-03-02 08:00:00+00', 30),
(2,  6, -22.9500, -43.3000, 200,  '2024-03-02 08:15:00+00', 0),
(2,  7, -22.8500, -43.2600, 300,  '2024-03-02 09:15:00+00', 60),
(2,  8, -22.7500, -43.2300, 500,  '2024-03-02 09:35:00+00', 70),
(2,  9, -22.6500, -43.2000, 700,  '2024-03-02 09:50:00+00', 70),
(2, 10, -22.5500, -43.1850, 800,  '2024-03-02 10:10:00+00', 65),
(2, 11, -22.5096, -43.1729, 820,  '2024-03-02 11:00:00+00', 0),
(2, 12, -22.5500, -43.1850, 800,  '2024-03-02 14:40:00+00', 60),
(2, 13, -22.6500, -43.2000, 700,  '2024-03-02 15:00:00+00', 70),
(2, 14, -22.7500, -43.2300, 500,  '2024-03-02 15:20:00+00', 70),
(2, 15, -22.8500, -43.2600, 300,  '2024-03-02 15:40:00+00', 65),
(2, 16, -22.9068, -43.1729, 15,   '2024-03-02 16:30:00+00', 0);
