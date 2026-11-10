import { useState, useEffect } from 'react';
import { getAnaliseSequencia, getAnaliseJanela, getAnaliseIntervalos, getResumo } from '../api';
import type { Entidade, EventoComAnalise, AnaliseJanela, AnaliseIntervalo, Resumo } from '../types';

interface Props {
  entidades: Entidade[];
}

const thStyle: React.CSSProperties = {
  textAlign: 'left', padding: '8px 10px', backgroundColor: '#eaf0fb',
  fontWeight: 600, fontSize: 12, borderBottom: '2px solid #cdd6e8',
};
const tdStyle: React.CSSProperties = { padding: '8px 10px', borderBottom: '1px solid #eee', fontSize: 12 };

function fmt(dt: string | null) {
  if (!dt) return '—';
  return new Date(dt).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
}

function fmtSeg(s: number | null) {
  if (s == null) return '—';
  if (s < 60) return `${s.toFixed(0)}s`;
  if (s < 3600) return `${(s / 60).toFixed(1)} min`;
  return `${(s / 3600).toFixed(2)} h`;
}

function CardResumo({ label, value, cor }: { label: string; value: string | number; cor: string }) {
  return (
    <div style={{ backgroundColor: '#fff', borderRadius: 10, padding: '18px 24px', boxShadow: '0 1px 6px rgba(0,0,0,0.08)', borderTop: `4px solid ${cor}`, minWidth: 150 }}>
      <div style={{ fontSize: 28, fontWeight: 700, color: cor }}>{value}</div>
      <div style={{ fontSize: 13, color: '#666', marginTop: 4 }}>{label}</div>
    </div>
  );
}

export default function AnaliseTemporalPanel({ entidades }: Props) {
  const [entidadeId, setEntidadeId] = useState<number>(entidades[0]?.id_entidade ?? 0);
  const [sequencia, setSequencia] = useState<EventoComAnalise[]>([]);
  const [janela, setJanela] = useState<AnaliseJanela[]>([]);
  const [intervalos, setIntervalos] = useState<AnaliseIntervalo[]>([]);
  const [resumo, setResumo] = useState<Resumo | null>(null);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    if (!entidadeId) return;
    setLoading(true); setErro(null);
    Promise.all([
      getAnaliseSequencia(entidadeId),
      getAnaliseJanela(entidadeId),
      getAnaliseIntervalos(entidadeId),
      getResumo(),
    ])
      .then(([seq, jan, intv, res]) => {
        setSequencia(seq); setJanela(jan); setIntervalos(intv); setResumo(res);
      })
      .catch(() => setErro('Erro ao carregar análises. Verifique o backend.'))
      .finally(() => setLoading(false));
  }, [entidadeId]);

  // Update default entidade when list loads
  useEffect(() => {
    if (entidades.length && !entidadeId) setEntidadeId(entidades[0].id_entidade);
  }, [entidades]);

  return (
    <div>
      <h2 style={{ marginTop: 0 }}>📊 Análise Temporal</h2>

      {/* Selector */}
      <div style={{ backgroundColor: '#fff', borderRadius: 8, padding: 16, boxShadow: '0 1px 4px rgba(0,0,0,0.07)', marginBottom: 24, display: 'flex', alignItems: 'center', gap: 16 }}>
        <label style={{ fontSize: 13, fontWeight: 600, color: '#444' }}>Entidade:</label>
        <select
          value={entidadeId}
          onChange={e => setEntidadeId(Number(e.target.value))}
          style={{ padding: '8px 12px', border: '1px solid #ccc', borderRadius: 6, fontSize: 14 }}>
          {entidades.map(e => <option key={e.id_entidade} value={e.id_entidade}>{e.nome}</option>)}
        </select>
      </div>

      {loading && <div style={{ padding: 24, color: '#666' }}>⏳ Carregando análises...</div>}
      {erro && <div style={{ color: '#c0392b', backgroundColor: '#fdecea', borderRadius: 6, padding: 12, marginBottom: 16 }}>{erro}</div>}

      {/* Resumo geral */}
      {resumo && (
        <section style={{ marginBottom: 32 }}>
          <h3 style={{ marginBottom: 16, color: '#1a3a5c' }}>🔢 Resumo Geral</h3>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 24 }}>
            <CardResumo label="Entidades" value={resumo.total_entidades} cor="#1a6fc4" />
            <CardResumo label="Eventos" value={resumo.total_eventos} cor="#27ae60" />
            <CardResumo label="Trajetórias" value={resumo.total_trajetorias} cor="#8e44ad" />
            <CardResumo label="Pontos de Rota" value={resumo.total_pontos} cor="#e67e22" />
            <CardResumo label="Tipos de Evento" value={resumo.tipos_evento_distintos} cor="#16a085" />
            <CardResumo label="Eventos c/ GPS" value={resumo.eventos_com_localizacao} cor="#c0392b" />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div style={{ backgroundColor: '#fff', borderRadius: 8, padding: 16, boxShadow: '0 1px 4px rgba(0,0,0,0.07)' }}>
              <div style={{ fontWeight: 600, marginBottom: 10, fontSize: 13, color: '#444' }}>Eventos por Tipo</div>
              {resumo.eventos_por_tipo.map(et => (
                <div key={et.tipo_evento} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '4px 0', borderBottom: '1px solid #f0f0f0' }}>
                  <span>{et.tipo_evento}</span>
                  <strong>{et.quantidade}</strong>
                </div>
              ))}
            </div>
            <div style={{ backgroundColor: '#fff', borderRadius: 8, padding: 16, boxShadow: '0 1px 4px rgba(0,0,0,0.07)' }}>
              <div style={{ fontWeight: 600, marginBottom: 10, fontSize: 13, color: '#444' }}>Eventos por Entidade</div>
              {resumo.eventos_por_entidade.map(ee => (
                <div key={ee.nome} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '4px 0', borderBottom: '1px solid #f0f0f0' }}>
                  <span>{ee.nome}</span>
                  <strong>{ee.total_eventos}</strong>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {!loading && sequencia.length > 0 && (
        <>
          {/* LAG/LEAD */}
          <section style={{ marginBottom: 32 }}>
            <h3 style={{ color: '#1a3a5c', marginBottom: 8 }}>↔️ Sequência de Eventos (LAG / LEAD)</h3>
            <p style={{ fontSize: 13, color: '#666', marginBottom: 12 }}>
              Para cada evento, mostra o evento anterior (<code>LAG</code>) e o próximo (<code>LEAD</code>).
            </p>
            <div style={{ overflowX: 'auto', backgroundColor: '#fff', borderRadius: 8, boxShadow: '0 1px 6px rgba(0,0,0,0.08)' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={thStyle}>Evento</th>
                    <th style={thStyle}>Tipo</th>
                    <th style={thStyle}>Início</th>
                    <th style={thStyle}>Fim</th>
                    <th style={{ ...thStyle, backgroundColor: '#f0eaf8' }}>← Anterior</th>
                    <th style={{ ...thStyle, backgroundColor: '#f0eaf8' }}>Início Anterior</th>
                    <th style={{ ...thStyle, backgroundColor: '#eaf4ee' }}>Próximo →</th>
                    <th style={{ ...thStyle, backgroundColor: '#eaf4ee' }}>Início Próximo</th>
                  </tr>
                </thead>
                <tbody>
                  {sequencia.map(ev => (
                    <tr key={ev.id_evento}
                      onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#f9fbff')}
                      onMouseLeave={e => (e.currentTarget.style.backgroundColor = '')}>
                      <td style={{ ...tdStyle, fontWeight: 600 }}>{ev.descricao?.slice(0, 30) || '—'}</td>
                      <td style={tdStyle}><span style={{ fontSize: 11, fontWeight: 600, padding: '2px 6px', borderRadius: 10, backgroundColor: '#e8f0fe', color: '#1a6fc4' }}>{ev.tipo_evento}</span></td>
                      <td style={{ ...tdStyle, whiteSpace: 'nowrap' }}>{fmt(ev.inicio)}</td>
                      <td style={{ ...tdStyle, whiteSpace: 'nowrap' }}>{fmt(ev.fim)}</td>
                      <td style={{ ...tdStyle, backgroundColor: '#faf5ff', color: '#6c3483' }}>{ev.tipo_anterior ?? <em style={{ color: '#ccc' }}>primeiro</em>}</td>
                      <td style={{ ...tdStyle, backgroundColor: '#faf5ff', color: '#6c3483', whiteSpace: 'nowrap' }}>{fmt(ev.inicio_anterior)}</td>
                      <td style={{ ...tdStyle, backgroundColor: '#f0fff4', color: '#1e8449' }}>{ev.tipo_proximo ?? <em style={{ color: '#ccc' }}>último</em>}</td>
                      <td style={{ ...tdStyle, backgroundColor: '#f0fff4', color: '#1e8449', whiteSpace: 'nowrap' }}>{fmt(ev.inicio_proximo)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* Funções de Janela */}
          <section style={{ marginBottom: 32 }}>
            <h3 style={{ color: '#1a3a5c', marginBottom: 8 }}>🪟 Funções de Janela</h3>
            <p style={{ fontSize: 13, color: '#666', marginBottom: 12 }}>
              <code>ROW_NUMBER()</code>, <code>RANK()</code>, <code>SUM() OVER (...)</code> e <code>AVG() OVER (...)</code>.
            </p>
            <div style={{ overflowX: 'auto', backgroundColor: '#fff', borderRadius: 8, boxShadow: '0 1px 6px rgba(0,0,0,0.08)' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={thStyle}>Posição</th>
                    <th style={thStyle}>Rank</th>
                    <th style={thStyle}>Tipo</th>
                    <th style={thStyle}>Descrição</th>
                    <th style={thStyle}>Duração</th>
                    <th style={thStyle}>Duração Acumulada</th>
                    <th style={thStyle}>Duração Média Móvel</th>
                  </tr>
                </thead>
                <tbody>
                  {janela.map(j => (
                    <tr key={j.id_evento}
                      onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#f9fbff')}
                      onMouseLeave={e => (e.currentTarget.style.backgroundColor = '')}>
                      <td style={{ ...tdStyle, textAlign: 'center', fontWeight: 700, color: '#1a6fc4' }}>{j.posicao}</td>
                      <td style={{ ...tdStyle, textAlign: 'center', color: '#8e44ad' }}>{j.rank_temporal}</td>
                      <td style={tdStyle}>{j.tipo_evento}</td>
                      <td style={{ ...tdStyle, maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{j.descricao}</td>
                      <td style={tdStyle}>{j.duracao ?? '—'}</td>
                      <td style={{ ...tdStyle, color: '#1e8449', fontWeight: 600 }}>{fmtSeg(j.duracao_acumulada_segundos)}</td>
                      <td style={{ ...tdStyle, color: '#e67e22' }}>{fmtSeg(j.duracao_media_movel_segundos)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* Intervalos e Gaps */}
          <section style={{ marginBottom: 32 }}>
            <h3 style={{ color: '#1a3a5c', marginBottom: 8 }}>📐 Intervalos e Gaps</h3>
            <p style={{ fontSize: 13, color: '#666', marginBottom: 12 }}>
              Detecta sobreposições, eventos adjacentes e gaps (lacunas) entre eventos consecutivos.
            </p>
            <div style={{ overflowX: 'auto', backgroundColor: '#fff', borderRadius: 8, boxShadow: '0 1px 6px rgba(0,0,0,0.08)' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={thStyle}>Tipo</th>
                    <th style={thStyle}>Descrição</th>
                    <th style={thStyle}>Início</th>
                    <th style={thStyle}>Fim</th>
                    <th style={thStyle}>Anterior</th>
                    <th style={thStyle}>Relação</th>
                    <th style={thStyle}>Gap</th>
                    <th style={thStyle}>Sobreposição</th>
                  </tr>
                </thead>
                <tbody>
                  {intervalos.map(iv => {
                    const relCor = iv.relacao_anterior === 'gap' ? '#c0392b'
                      : iv.relacao_anterior === 'sobreposição' ? '#e67e22'
                      : iv.relacao_anterior === 'adjacente' ? '#27ae60'
                      : '#aaa';
                    return (
                      <tr key={iv.id_evento}
                        onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#f9fbff')}
                        onMouseLeave={e => (e.currentTarget.style.backgroundColor = '')}>
                        <td style={tdStyle}>{iv.tipo_evento}</td>
                        <td style={{ ...tdStyle, maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{iv.descricao}</td>
                        <td style={{ ...tdStyle, whiteSpace: 'nowrap' }}>{fmt(iv.inicio)}</td>
                        <td style={{ ...tdStyle, whiteSpace: 'nowrap' }}>{fmt(iv.fim)}</td>
                        <td style={{ ...tdStyle, color: '#888' }}>{iv.tipo_anterior ?? <em style={{ color: '#ccc' }}>—</em>}</td>
                        <td style={tdStyle}>
                          {iv.relacao_anterior
                            ? <span style={{ padding: '2px 8px', borderRadius: 12, fontSize: 11, fontWeight: 700, backgroundColor: relCor + '22', color: relCor }}>{iv.relacao_anterior}</span>
                            : <span style={{ color: '#ccc', fontSize: 11 }}>primeiro</span>}
                        </td>
                        <td style={{ ...tdStyle, color: '#c0392b' }}>{fmtSeg(iv.gap_segundos)}</td>
                        <td style={{ ...tdStyle, color: '#e67e22' }}>{fmtSeg(iv.sobreposicao_segundos)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}

      {!loading && !erro && sequencia.length === 0 && entidadeId && (
        <div style={{ padding: 24, color: '#888', backgroundColor: '#fff', borderRadius: 8, boxShadow: '0 1px 4px rgba(0,0,0,0.07)' }}>
          Nenhum evento encontrado para esta entidade.
        </div>
      )}
    </div>
  );
}
