import { useState, useEffect } from 'react';
import { getEventos, excluirEvento } from '../api';
import type { Evento, Entidade } from '../types';

interface Props {
  refresh: number;
  entidades: Entidade[];
  onDelete: () => void;
}

const thStyle: React.CSSProperties = {
  textAlign: 'left', padding: '10px 12px', backgroundColor: '#eaf0fb',
  fontWeight: 600, fontSize: 13, borderBottom: '2px solid #cdd6e8',
};
const tdStyle: React.CSSProperties = {
  padding: '10px 12px', borderBottom: '1px solid #eee', fontSize: 13, verticalAlign: 'middle',
};

const TIPO_COLOR: Record<string, { bg: string; fg: string }> = {
  deslocamento: { bg: '#e8f8f5', fg: '#1a8c67' },
  parada:       { bg: '#fef9e7', fg: '#d4a017' },
  incidente:    { bg: '#fdecea', fg: '#c0392b' },
};

function fmt(dt: string | null) {
  if (!dt) return '—';
  return new Date(dt).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
}

export default function EventoList({ refresh, entidades, onDelete }: Props) {
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [filtroTipo, setFiltroTipo] = useState('');
  const [filtroEntidade, setFiltroEntidade] = useState<number | undefined>(undefined);

  const carregar = () => {
    setLoading(true); setErro(null);
    getEventos({ tipo: filtroTipo || undefined, entidade_id: filtroEntidade })
      .then(setEventos)
      .catch(() => setErro('Erro ao carregar eventos.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { carregar(); }, [refresh, filtroTipo, filtroEntidade]);

  const handleExcluir = async (ev: Evento) => {
    if (!confirm(`Excluir evento "${ev.tipo_evento} — ${ev.descricao}"?`)) return;
    try { await excluirEvento(ev.id_evento); onDelete(); }
    catch { alert('Erro ao excluir evento.'); }
  };

  const tiposDistintos = Array.from(new Set(eventos.map(e => e.tipo_evento).filter(Boolean)));

  return (
    <div>
      {/* Filtros */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap', backgroundColor: '#fff', padding: 16, borderRadius: 8, boxShadow: '0 1px 4px rgba(0,0,0,0.07)' }}>
        <div>
          <label style={{ fontSize: 12, fontWeight: 600, color: '#555', display: 'block', marginBottom: 4 }}>Tipo de evento</label>
          <select
            value={filtroTipo}
            onChange={e => setFiltroTipo(e.target.value)}
            style={{ padding: '6px 10px', border: '1px solid #ccc', borderRadius: 6, fontSize: 13 }}>
            <option value="">Todos</option>
            {tiposDistintos.map(t => <option key={t!} value={t!}>{t}</option>)}
            {!tiposDistintos.includes('deslocamento') && <option value="deslocamento">deslocamento</option>}
            {!tiposDistintos.includes('parada') && <option value="parada">parada</option>}
            {!tiposDistintos.includes('incidente') && <option value="incidente">incidente</option>}
          </select>
        </div>
        <div>
          <label style={{ fontSize: 12, fontWeight: 600, color: '#555', display: 'block', marginBottom: 4 }}>Entidade</label>
          <select
            value={filtroEntidade ?? ''}
            onChange={e => setFiltroEntidade(e.target.value ? Number(e.target.value) : undefined)}
            style={{ padding: '6px 10px', border: '1px solid #ccc', borderRadius: 6, fontSize: 13 }}>
            <option value="">Todas</option>
            {entidades.map(e => <option key={e.id_entidade} value={e.id_entidade}>{e.nome}</option>)}
          </select>
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-end' }}>
          <button onClick={() => { setFiltroTipo(''); setFiltroEntidade(undefined); }}
            style={{ padding: '6px 14px', border: '1px solid #ccc', borderRadius: 6, cursor: 'pointer', backgroundColor: '#fff', fontSize: 13, color: '#555' }}>
            Limpar
          </button>
        </div>
      </div>

      {loading && <div style={{ padding: 24, color: '#666' }}>⏳ Carregando eventos...</div>}
      {erro && <div style={{ padding: 16, color: '#c0392b', backgroundColor: '#fdecea', borderRadius: 6 }}>{erro}</div>}
      {!loading && !erro && !eventos.length && <div style={{ padding: 24, color: '#888' }}>Nenhum evento encontrado.</div>}

      {!loading && eventos.length > 0 && (
        <div style={{ overflowX: 'auto', backgroundColor: '#fff', borderRadius: 8, boxShadow: '0 1px 6px rgba(0,0,0,0.08)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={thStyle}>ID</th>
                <th style={thStyle}>Entidade</th>
                <th style={thStyle}>Tipo</th>
                <th style={thStyle}>Descrição</th>
                <th style={thStyle}>Início</th>
                <th style={thStyle}>Fim</th>
                <th style={thStyle}>Localização</th>
                <th style={thStyle}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {eventos.map(ev => {
                const cor = TIPO_COLOR[ev.tipo_evento ?? ''] ?? { bg: '#f4f4f4', fg: '#555' };
                return (
                  <tr key={ev.id_evento}
                    onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#f9fbff')}
                    onMouseLeave={e => (e.currentTarget.style.backgroundColor = '')}>
                    <td style={tdStyle}><code>{ev.id_evento}</code></td>
                    <td style={{ ...tdStyle, fontWeight: 600 }}>{ev.entidade_nome}</td>
                    <td style={tdStyle}>
                      <span style={{ padding: '2px 8px', borderRadius: 12, fontSize: 11, fontWeight: 600, backgroundColor: cor.bg, color: cor.fg }}>
                        {ev.tipo_evento ?? '—'}
                      </span>
                    </td>
                    <td style={{ ...tdStyle, maxWidth: 220, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {ev.descricao || <span style={{ color: '#aaa' }}>—</span>}
                    </td>
                    <td style={{ ...tdStyle, whiteSpace: 'nowrap', color: '#555' }}>{fmt(ev.inicio)}</td>
                    <td style={{ ...tdStyle, whiteSpace: 'nowrap', color: '#555' }}>{fmt(ev.fim)}</td>
                    <td style={tdStyle}>
                      {ev.latitude != null
                        ? <span style={{ color: '#1a8c67', fontSize: 12 }}>📍 {ev.latitude.toFixed(4)}, {ev.longitude?.toFixed(4)}</span>
                        : <span style={{ color: '#aaa', fontSize: 12 }}>sem GPS</span>}
                    </td>
                    <td style={tdStyle}>
                      <button onClick={() => handleExcluir(ev)}
                        style={{ padding: '4px 10px', fontSize: 12, cursor: 'pointer', borderRadius: 4, border: '1px solid #e74c3c', backgroundColor: '#fff', color: '#e74c3c' }}>
                        🗑️ Excluir
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
