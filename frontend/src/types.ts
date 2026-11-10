// ─────────────────────────────────────────────
// Tipos de domínio
// ─────────────────────────────────────────────

export interface Entidade {
  id_entidade: number;
  nome: string;
  tipo: string | null;
  descricao: string | null;
  criado_em: string;
}

export interface Periodo {
  inicio: string | null;
  fim: string | null;
}

export interface Evento {
  id_evento: number;
  entidade_id: number;
  entidade_nome?: string;
  tipo_evento: string | null;
  descricao: string | null;
  periodo?: string;
  inicio: string | null;
  fim: string | null;
  latitude: number | null;
  longitude: number | null;
  metadados: Record<string, unknown>;
}

export interface Trajetoria {
  id_trajetoria: number;
  entidade_id: number;
  entidade_nome?: string;
  nome: string;
  descricao: string | null;
  periodo?: string;
  inicio: string | null;
  fim: string | null;
  criado_em: string;
  pontos?: PontoTrajetoria[];
}

export interface PontoTrajetoria {
  id_ponto: number;
  trajetoria_id: number;
  sequencia: number;
  latitude: number;
  longitude: number;
  altitude: number | null;
  timestamp: string;
  velocidade: number | null;
  metadados: Record<string, unknown>;
}

export interface EventoComAnalise extends Evento {
  tipo_anterior: string | null;
  desc_anterior: string | null;
  inicio_anterior: string | null;
  tipo_proximo: string | null;
  desc_proximo: string | null;
  inicio_proximo: string | null;
}

export interface AnaliseJanela {
  id_evento: number;
  tipo_evento: string | null;
  descricao: string | null;
  inicio: string | null;
  fim: string | null;
  duracao: string | null;
  posicao: number;
  rank_temporal: number;
  duracao_acumulada_segundos: number;
  duracao_media_movel_segundos: number;
}

export interface AnaliseIntervalo {
  id_evento: number;
  tipo_evento: string | null;
  descricao: string | null;
  inicio: string | null;
  fim: string | null;
  tipo_anterior: string | null;
  fim_anterior: string | null;
  relacao_anterior: string | null;
  gap_segundos: number | null;
  sobreposicao_segundos: number | null;
}

export interface Resumo {
  total_entidades: number;
  total_eventos: number;
  total_trajetorias: number;
  total_pontos: number;
  tipos_evento_distintos: number;
  eventos_com_localizacao: number;
  eventos_por_tipo: { tipo_evento: string; quantidade: number }[];
  eventos_por_entidade: { nome: string; total_eventos: number }[];
}
