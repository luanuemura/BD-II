import { useState, useEffect } from 'react';
import { getHistorico } from '../api';
import type { Evento } from '../types';

interface Props {
  entidadeId: number;
}

const TIPO_COLOR: Record<string, string> = {
  deslocamento: '#1a6fc4',
  parada:       '#d4a017',
  incidente:    '#c0392b',
};

function fmt(dt: string | null) {
  if (!dt) return '—';
  return new Date(dt).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
}

function formatDuracao(duracao: string | null): string {
  if (!duracao) return '—';
  // O intervalo pode vir como "HH:MM:SS" ou "X days HH:MM:SS"
  return duracao;
}

export default function HistoricoTimeline({ entidadeId }: Props) {
  const [eventos, setEventos] = useState<(Evento & { duracao?: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true); setErro(null);
    getHistorico(entidadeId)
      .then(data => setEventos(data as (Evento & { duracao?: string })[]))
      .catch(() => setErro('Erro ao carregar histórico.'))
      .finally(() => setLoading(false));
  }, [entidadeId]);

  if (loading) return <div style={{ padding: 20, color: '#666' }}>⏳ Carregando...</div>;
  if (erro) return <div style={{ color: '#c0392b', padding: 12, backgroundColor: '#fdecea', borderRadius: 6 }}>{erro}</div>;
  if (!eventos.length) return <div style={{ color: '#888', padding: 16 }}>Nenhum evento registrado.</div>;

  return (
    <div style={{ position: 'relative', paddingLeft: 32 }}>
      {/* Linha vertical da timeline */}
      <div style={{
        position: 'absolute', left: 11, top: 0, bottom: 0,
        width: 2, backgroundColor: '#dde3ea',
      }} />

      {eventos.map((ev, idx) => {
        const cor = TIPO_COLOR[ev.tipo_evento ?? ''] ?? '#888';
        return (
          <div key={ev.id_evento} style={{ position: 'relative', marginBottom: 24 }}>
            {/* Círculo */}
            <div style={{
              position: 'absolute', left: -27, top: 2,
              width: 14, height: 14, borderRadius: '50%',
              backgroundColor: cor, border: '2px solid #fff',
              boxShadow: `0 0 0 2px ${cor}44`,
            }} />

            {/* Card */}
            <div style={{
              backgroundColor: '#f9fbff', border: `1px solid ${cor}44`,
              borderLeft: `3px solid ${cor}`,
              borderRadius: 8, padding: '10px 14px',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8 }}>
                <div>
                  <span style={{
                    padding: '2px 8px', borderRadius: 12, fontSize: 11, fontWeight: 700,
                    backgroundColor: cor + '22', color: cor, marginRight: 8,
                  }}>
                    {ev.tipo_evento ?? 'evento'}
                  </span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#222' }}>
                    {ev.descricao || <em style={{ color: '#aaa' }}>sem descrição</em>}
                  </span>
                </div>
                <span style={{ fontSize: 11, color: '#888' }}>#{ev.id_evento}</span>
              </div>

              <div style={{ marginTop: 8, display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                <div style={{ fontSize: 12, color: '#555' }}>
                  🕐 <strong>Início:</strong> {fmt(ev.inicio)}
                </div>
                <div style={{ fontSize: 12, color: '#555' }}>
                  🕐 <strong>Fim:</strong> {fmt(ev.fim)}
                </div>
                {(ev as unknown as { duracao: string }).duracao && (
                  <div style={{ fontSize: 12, color: '#555' }}>
                    ⏱️ <strong>Duração:</strong> {formatDuracao((ev as unknown as { duracao: string }).duracao)}
                  </div>
                )}
              </div>

              {ev.latitude != null && (
                <div style={{ marginTop: 6, fontSize: 12, color: '#1a8c67' }}>
                  📍 {ev.latitude?.toFixed(5)}, {ev.longitude?.toFixed(5)}
                </div>
              )}

              {/* Linha do tempo horizontal */}
              {idx < eventos.length - 1 && (
                <div style={{ marginTop: 10, height: 4, backgroundColor: '#eee', borderRadius: 2, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: '100%', backgroundColor: cor + '44' }} />
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
