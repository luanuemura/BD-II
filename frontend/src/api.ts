import axios from 'axios';
import type {
  Entidade, Evento, Trajetoria, PontoTrajetoria,
  EventoComAnalise, AnaliseJanela, AnaliseIntervalo, Resumo
} from './types';

const api = axios.create({ baseURL: '/api' });

// ─────────────────────────────────────────────
// ENTIDADES
// ─────────────────────────────────────────────

export const getEntidades = (): Promise<Entidade[]> =>
  api.get('/entidades').then(r => r.data);

export const getEntidade = (id: number): Promise<Entidade> =>
  api.get(`/entidades/${id}`).then(r => r.data);

export const criarEntidade = (data: { nome: string; tipo?: string; descricao?: string }): Promise<Entidade> =>
  api.post('/entidades', data).then(r => r.data);

export const atualizarEntidade = (id: number, data: Partial<Entidade>): Promise<Entidade> =>
  api.put(`/entidades/${id}`, data).then(r => r.data);

export const excluirEntidade = (id: number): Promise<void> =>
  api.delete(`/entidades/${id}`).then(() => undefined);

export const getHistorico = (id: number): Promise<Evento[]> =>
  api.get(`/entidades/${id}/historico`).then(r => r.data);

export const getTrajetoriasDaEntidade = (id: number): Promise<Trajetoria[]> =>
  api.get(`/entidades/${id}/trajetorias`).then(r => r.data);

// ─────────────────────────────────────────────
// EVENTOS
// ─────────────────────────────────────────────

export const getEventos = (params?: { tipo?: string; entidade_id?: number }): Promise<Evento[]> =>
  api.get('/eventos', { params }).then(r => r.data);

export const getEvento = (id: number): Promise<Evento> =>
  api.get(`/eventos/${id}`).then(r => r.data);

export const criarEvento = (data: {
  entidade_id: number;
  tipo_evento?: string;
  descricao?: string;
  inicio: string;
  fim: string;
  latitude?: number;
  longitude?: number;
  metadados?: Record<string, unknown>;
}): Promise<Evento> =>
  api.post('/eventos', data).then(r => r.data);

export const atualizarEvento = (id: number, data: Partial<{
  tipo_evento: string;
  descricao: string;
  inicio: string;
  fim: string;
  latitude: number;
  longitude: number;
  metadados: Record<string, unknown>;
}>): Promise<Evento> =>
  api.put(`/eventos/${id}`, data).then(r => r.data);

export const excluirEvento = (id: number): Promise<void> =>
  api.delete(`/eventos/${id}`).then(() => undefined);

// ─────────────────────────────────────────────
// TRAJETÓRIAS
// ─────────────────────────────────────────────

export const getTrajetorias = (): Promise<Trajetoria[]> =>
  api.get('/trajetorias').then(r => r.data);

export const getTrajetoria = (id: number): Promise<Trajetoria> =>
  api.get(`/trajetorias/${id}`).then(r => r.data);

export const criarTrajetoria = (data: {
  entidade_id: number;
  nome: string;
  descricao?: string;
  inicio: string;
  fim: string;
}): Promise<Trajetoria> =>
  api.post('/trajetorias', data).then(r => r.data);

export const excluirTrajetoria = (id: number): Promise<void> =>
  api.delete(`/trajetorias/${id}`).then(() => undefined);

export const adicionarPonto = (trajetoriaId: number, data: Omit<PontoTrajetoria, 'id_ponto' | 'trajetoria_id'>): Promise<PontoTrajetoria> =>
  api.post(`/trajetorias/${trajetoriaId}/pontos`, data).then(r => r.data);

export const removerPonto = (trajetoriaId: number, pontoId: number): Promise<void> =>
  api.delete(`/trajetorias/${trajetoriaId}/pontos/${pontoId}`).then(() => undefined);

// ─────────────────────────────────────────────
// ANÁLISE TEMPORAL
// ─────────────────────────────────────────────

export const getAnaliseSequencia = (entidadeId: number): Promise<EventoComAnalise[]> =>
  api.get(`/analise/sequencia/${entidadeId}`).then(r => r.data);

export const getAnaliseJanela = (entidadeId: number): Promise<AnaliseJanela[]> =>
  api.get(`/analise/janela/${entidadeId}`).then(r => r.data);

export const getAnaliseIntervalos = (entidadeId: number): Promise<AnaliseIntervalo[]> =>
  api.get(`/analise/intervalos/${entidadeId}`).then(r => r.data);

export const getResumo = (): Promise<Resumo> =>
  api.get('/analise/resumo').then(r => r.data);
