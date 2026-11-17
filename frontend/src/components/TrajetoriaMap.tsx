import { useState, useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Polyline, Tooltip, CircleMarker, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { getTrajetorias, getTrajetoria, getEventos } from '../api';
import type { Trajetoria, Evento } from '../types';

// Corrige ícone padrão do Leaflet no Vite/Webpack
import iconUrl from 'leaflet/dist/images/marker-icon.png';
import iconShadowUrl from 'leaflet/dist/images/marker-shadow.png';
delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl;
L.Icon.Default.mergeOptions({ iconUrl, shadowUrl: iconShadowUrl });

const PALETTE = [
  '#1a6fc4', '#e74c3c', '#27ae60', '#8e44ad',
  '#e67e22', '#16a085', '#d35400', '#2c3e50',
  '#008080', '#b8860b'
];

const TIPO_EVENTO_COLOR: Record<string, string> = {
  deslocamento: '#1a6fc4',
  parada: '#d4a017',
  incidente: '#c0392b',
};

interface Props {
  filtroEntidadeId?: number;
  onClearFiltro: () => void;
}

interface GrupoEventosEntidade {
  entidade_id: number;
  entidade_nome: string;
  eventos: Evento[];
}

function fmt(dt: string | null) {
  if (!dt) return '—';
  return new Date(dt).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
}

// Componente para ajustar automaticamente o zoom/centro do mapa
function AjustarVisualizacao({ bounds }: { bounds: L.LatLngBounds | null }) {
  const map = useMap();
  useEffect(() => {
    if (bounds && bounds.isValid()) {
      try {
        map.fitBounds(bounds, { padding: [50, 50], maxZoom: 14 });
      } catch {
        // fallback silencioso caso bounds não seja válido
      }
    }
  }, [bounds, map]);
  return null;
}

export default function TrajetoriaMap({ filtroEntidadeId, onClearFiltro }: Props) {
  // Trajetórias contínuas (tabela trajetoria + ponto_trajetoria)
  const [trajetorias, setTrajetorias] = useState<Trajetoria[]>([]);
  const [selecionadasTraj, setSelecionadasTraj] = useState<number[]>([]);
  const [dadosTraj, setDadosTraj] = useState<Record<number, Trajetoria>>({});

  // Eventos com coordenadas (tabela evento)
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [selecionadasEntidadeEventos, setSelecionadasEntidadeEventos] = useState<number[]>([]);

  // Filtro de exibição ('todas' | 'gps' | 'eventos')
  const [modoVisualizacao, setModoVisualizacao] = useState<'todas' | 'gps' | 'eventos'>('todas');

  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  // Carrega trajetórias e eventos da API
  useEffect(() => {
    setLoading(true);
    setErro(null);

    Promise.all([getTrajetorias(), getEventos()])
      .then(([ts, evs]) => {
        setTrajetorias(ts);
        setEventos(evs);

        if (filtroEntidadeId) {
          // Se veio filtrado por uma entidade específica:
          const idsTraj = ts.filter(t => t.entidade_id === filtroEntidadeId).map(t => t.id_trajetoria);
          setSelecionadasTraj(idsTraj);
          setSelecionadasEntidadeEventos([filtroEntidadeId]);
        } else {
          // Seleciona por padrão as trajetórias GPS existentes
          setSelecionadasTraj(ts.map(t => t.id_trajetoria));

          // E também seleciona eventos das entidades que têm GPS mas não têm trajetórias contínuas (ex: Drone)
          const entidadesComTraj = new Set(ts.map(t => t.entidade_id));
          const entidadesSoComEventos = Array.from(
            new Set(
              evs
                .filter(e => e.latitude != null && e.longitude != null && !entidadesComTraj.has(e.entidade_id))
                .map(e => e.entidade_id)
            )
          );
          setSelecionadasEntidadeEventos(entidadesSoComEventos);
        }
      })
      .catch(() => setErro('Erro ao carregar dados do mapa. Verifique a conexão com a API.'))
      .finally(() => setLoading(false));
  }, [filtroEntidadeId]);

  // Carrega os pontos das trajetórias GPS selecionadas
  useEffect(() => {
    selecionadasTraj.forEach(id => {
      if (!dadosTraj[id]) {
        getTrajetoria(id).then(t => setDadosTraj(prev => ({ ...prev, [id]: t })));
      }
    });
  }, [selecionadasTraj]);

  // Agrupa eventos com coordenadas GPS por entidade (ordenados cronologicamente)
  const eventosPorEntidade: GrupoEventosEntidade[] = useMemo(() => {
    const mapa = new Map<number, GrupoEventosEntidade>();

    eventos
      .filter(e => e.latitude != null && e.longitude != null)
      .sort((a, b) => new Date(a.inicio || 0).getTime() - new Date(b.inicio || 0).getTime())
      .forEach(e => {
        if (!mapa.has(e.entidade_id)) {
          mapa.set(e.entidade_id, {
            entidade_id: e.entidade_id,
            entidade_nome: e.entidade_nome || `Entidade #${e.entidade_id}`,
            eventos: [],
          });
        }
        mapa.get(e.entidade_id)!.eventos.push(e);
      });

    return Array.from(mapa.values());
  }, [eventos]);

  // Toggle de seleção de trajetórias GPS
  const toggleTrajetoria = (id: number) => {
    setSelecionadasTraj(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  // Toggle de seleção de eventos por entidade
  const toggleEntidadeEventos = (entidadeId: number) => {
    setSelecionadasEntidadeEventos(prev =>
      prev.includes(entidadeId) ? prev.filter(x => x !== entidadeId) : [...prev, entidadeId]
    );
  };

  // Coleta todas as coordenadas atualmente ativas no mapa para calcular o enquadramento
  const todasCoordenadas = useMemo(() => {
    const coords: [number, number][] = [];

    if (modoVisualizacao === 'todas' || modoVisualizacao === 'gps') {
      selecionadasTraj.forEach(id => {
        const traj = dadosTraj[id];
        if (traj?.pontos) {
          traj.pontos.forEach(p => coords.push([p.latitude, p.longitude]));
        }
      });
    }

    if (modoVisualizacao === 'todas' || modoVisualizacao === 'eventos') {
      selecionadasEntidadeEventos.forEach(entId => {
        const grupo = eventosPorEntidade.find(g => g.entidade_id === entId);
        if (grupo) {
          grupo.eventos.forEach(ev => coords.push([ev.latitude!, ev.longitude!]));
        }
      });
    }

    return coords;
  }, [modoVisualizacao, selecionadasTraj, dadosTraj, selecionadasEntidadeEventos, eventosPorEntidade]);

  // Calcula o centro e bounds
  const mapBounds = useMemo(() => {
    if (todasCoordenadas.length === 0) return null;
    return L.latLngBounds(todasCoordenadas.map(c => L.latLng(c[0], c[1])));
  }, [todasCoordenadas]);

  const mapCenter: [number, number] = useMemo(() => {
    if (todasCoordenadas.length > 0) {
      const latMed = todasCoordenadas.reduce((s, c) => s + c[0], 0) / todasCoordenadas.length;
      const lngMed = todasCoordenadas.reduce((s, c) => s + c[1], 0) / todasCoordenadas.length;
      return [latMed, lngMed];
    }
    return [-23.55, -46.63]; // Default: São Paulo
  }, [todasCoordenadas]);

  if (loading) return <div style={{ padding: 24, color: '#666' }}>⏳ Carregando dados geográficos e temporais...</div>;
  if (erro) return <div style={{ padding: 16, color: '#c0392b', backgroundColor: '#fdecea', borderRadius: 6 }}>{erro}</div>;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div>
          <h2 style={{ margin: 0 }}>🗺️ Trajetórias e Eventos no Mapa</h2>
          <p style={{ margin: '4px 0 0 0', fontSize: 13, color: '#666' }}>
            Visualize trajetórias de GPS contínuas e trajetórias reconstruídas a partir de eventos cronológicos.
          </p>
        </div>
        {filtroEntidadeId && (
          <button
            onClick={onClearFiltro}
            style={{
              padding: '6px 14px', fontSize: 12, border: '1px solid #ccc',
              borderRadius: 6, cursor: 'pointer', backgroundColor: '#fff', color: '#555'
            }}>
            ✕ Limpar filtro de entidade
          </button>
        )}
      </div>

      {/* Painel de Controle e Seleção */}
      <div style={{ backgroundColor: '#fff', borderRadius: 8, padding: 16, boxShadow: '0 1px 4px rgba(0,0,0,0.07)', marginBottom: 16 }}>
        {/* Filtro de Tipo */}
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 14, paddingBottom: 12, borderBottom: '1px solid #eee' }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: '#444' }}>Exibir:</span>
          <button
            onClick={() => setModoVisualizacao('todas')}
            style={{
              padding: '4px 12px', fontSize: 12, borderRadius: 16, cursor: 'pointer',
              border: '1px solid #1a6fc4',
              backgroundColor: modoVisualizacao === 'todas' ? '#1a6fc4' : '#fff',
              color: modoVisualizacao === 'todas' ? '#fff' : '#1a6fc4',
              fontWeight: 600
            }}>
            🌟 Todas
          </button>
          <button
            onClick={() => setModoVisualizacao('gps')}
            style={{
              padding: '4px 12px', fontSize: 12, borderRadius: 16, cursor: 'pointer',
              border: '1px solid #27ae60',
              backgroundColor: modoVisualizacao === 'gps' ? '#27ae60' : '#fff',
              color: modoVisualizacao === 'gps' ? '#fff' : '#27ae60',
              fontWeight: 600
            }}>
            🚗 Trajetórias GPS Contínuas ({trajetorias.length})
          </button>
          <button
            onClick={() => setModoVisualizacao('eventos')}
            style={{
              padding: '4px 12px', fontSize: 12, borderRadius: 16, cursor: 'pointer',
              border: '1px solid #8e44ad',
              backgroundColor: modoVisualizacao === 'eventos' ? '#8e44ad' : '#fff',
              color: modoVisualizacao === 'eventos' ? '#fff' : '#8e44ad',
              fontWeight: 600
            }}>
            📍 Eventos com GPS Reconstruídos ({eventosPorEntidade.length})
          </button>
        </div>

        {/* Botões Trajetórias GPS */}
        {(modoVisualizacao === 'todas' || modoVisualizacao === 'gps') && trajetorias.length > 0 && (
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#27ae60', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>
              🚗 Trajetórias Contínuas (GPS):
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {trajetorias.map((t, i) => {
                const cor = PALETTE[i % PALETTE.length];
                const ativa = selecionadasTraj.includes(t.id_trajetoria);
                return (
                  <button
                    key={t.id_trajetoria}
                    onClick={() => toggleTrajetoria(t.id_trajetoria)}
                    style={{
                      padding: '6px 14px', fontSize: 12, borderRadius: 20, cursor: 'pointer', fontWeight: 600,
                      border: `2px solid ${cor}`,
                      backgroundColor: ativa ? cor : '#fff',
                      color: ativa ? '#fff' : cor,
                      transition: 'all 0.15s',
                    }}>
                    {t.nome} <span style={{ opacity: 0.8, fontSize: 11 }}>({t.entidade_nome})</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Botões Eventos / Trajetórias Reconstruídas */}
        {(modoVisualizacao === 'todas' || modoVisualizacao === 'eventos') && (
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#8e44ad', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>
              📍 Sequências de Eventos no Mapa (Trajetórias Reconstruídas):
            </div>
            {eventosPorEntidade.length === 0 ? (
              <span style={{ fontSize: 12, color: '#888' }}>Nenhum evento com coordenadas GPS cadastrado ainda.</span>
            ) : (
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {eventosPorEntidade.map((grupo, i) => {
                  const cor = PALETTE[(i + trajetorias.length) % PALETTE.length];
                  const ativa = selecionadasEntidadeEventos.includes(grupo.entidade_id);
                  return (
                    <button
                      key={grupo.entidade_id}
                      onClick={() => toggleEntidadeEventos(grupo.entidade_id)}
                      style={{
                        padding: '6px 14px', fontSize: 12, borderRadius: 20, cursor: 'pointer', fontWeight: 600,
                        border: `2px dashed ${cor}`,
                        backgroundColor: ativa ? cor : '#fff',
                        color: ativa ? '#fff' : cor,
                        transition: 'all 0.15s',
                      }}>
                      {grupo.entidade_nome} <span style={{ opacity: 0.8, fontSize: 11 }}>({grupo.eventos.length} eventos c/ GPS)</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Legenda rápida */}
        <div style={{ display: 'flex', gap: 16, marginTop: 14, paddingTop: 10, borderTop: '1px solid #f0f0f0', fontSize: 11, color: '#666', flexWrap: 'wrap' }}>
          <span><strong>Legenda:</strong></span>
          <span>━ Linha contínua: Trajetória contínua GPS</span>
          <span>╍ Linha tracejada: Trajetória reconstruída dos eventos</span>
          <span><span style={{ color: TIPO_EVENTO_COLOR.deslocamento }}>●</span> Deslocamento</span>
          <span><span style={{ color: TIPO_EVENTO_COLOR.parada }}>●</span> Parada</span>
          <span><span style={{ color: TIPO_EVENTO_COLOR.incidente }}>●</span> Incidente</span>
        </div>
      </div>

      {/* Mapa Leaflet */}
      <div style={{ borderRadius: 10, overflow: 'hidden', boxShadow: '0 2px 12px rgba(0,0,0,0.12)' }}>
        <MapContainer center={mapCenter} zoom={8} style={{ height: 560, width: '100%' }}>
          <AjustarVisualizacao bounds={mapBounds} />

          <TileLayer 
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          /> 

          {/* 1. CAMADA DE TRAJETÓRIAS GPS */}
          {(modoVisualizacao === 'todas' || modoVisualizacao === 'gps') &&
            selecionadasTraj.map(id => {
              const traj = dadosTraj[id];
              if (!traj?.pontos?.length) return null;
              const idx = trajetorias.findIndex(t => t.id_trajetoria === id);
              const cor = PALETTE[idx >= 0 ? idx % PALETTE.length : 0];
              const positions: [number, number][] = traj.pontos.map(p => [p.latitude, p.longitude]);

              return (
                <span key={`traj-${id}`}>
                  <Polyline positions={positions} pathOptions={{ color: cor, weight: 3.5, opacity: 0.85 }} />
                  {traj.pontos.map((p, pi) => (
                    <CircleMarker
                      key={`ponto-${p.id_ponto}`}
                      center={[p.latitude, p.longitude]}
                      radius={pi === 0 || pi === traj.pontos!.length - 1 ? 7 : 4}
                      pathOptions={{
                        color: cor,
                        fillColor: pi === 0 ? '#fff' : cor,
                        fillOpacity: 1,
                        weight: 2,
                      }}>
                      <Tooltip>
                        <div style={{ fontSize: 12 }}>
                          <strong>#{p.sequencia}</strong> — {traj.nome}<br />
                          <strong>Entidade:</strong> {traj.entidade_nome}<br />
                          🕒 {fmt(p.timestamp)}<br />
                          {p.velocidade != null && <>🚗 {p.velocidade} km/h<br /></>}
                          {p.altitude != null && <>⛰️ {p.altitude}m</>}
                        </div>
                      </Tooltip>
                    </CircleMarker>
                  ))}
                </span>
              );
            })}

          {/* 2. CAMADA DE EVENTOS / TRAJETÓRIA RECONSTRUÍDA */}
          {(modoVisualizacao === 'todas' || modoVisualizacao === 'eventos') &&
            selecionadasEntidadeEventos.map(entId => {
              const grupo = eventosPorEntidade.find(g => g.entidade_id === entId);
              if (!grupo || !grupo.eventos.length) return null;

              const idx = eventosPorEntidade.findIndex(g => g.entidade_id === entId);
              const corLinha = PALETTE[(idx + trajetorias.length) % PALETTE.length];
              const positions: [number, number][] = grupo.eventos.map(e => [e.latitude!, e.longitude!]);

              return (
                <span key={`eventos-ent-${entId}`}>
                  {/* Linha conectando os eventos cronológicos */}
                  {positions.length > 1 && (
                    <Polyline
                      positions={positions}
                      pathOptions={{
                        color: corLinha,
                        weight: 3,
                        opacity: 0.75,
                        dashArray: '8, 8'
                      }}
                    />
                  )}

                  {/* Marcadores de cada evento */}
                  {grupo.eventos.map((ev, ei) => {
                    const corEvento = TIPO_EVENTO_COLOR[ev.tipo_evento ?? ''] || corLinha;
                    return (
                      <CircleMarker
                        key={`ev-${ev.id_evento}`}
                        center={[ev.latitude!, ev.longitude!]}
                        radius={8}
                        pathOptions={{
                          color: '#fff',
                          fillColor: corEvento,
                          fillOpacity: 0.95,
                          weight: 2,
                        }}>
                        <Tooltip>
                          <div style={{ fontSize: 12, minWidth: 160 }}>
                            <div style={{ fontWeight: 700, color: corEvento, marginBottom: 2 }}>
                              {ev.tipo_evento?.toUpperCase()} (#{ei + 1})
                            </div>
                            <div style={{ fontWeight: 600 }}>{grupo.entidade_nome}</div>
                            <div>{ev.descricao || 'Sem descrição'}</div>
                            <hr style={{ margin: '4px 0', border: 'none', borderTop: '1px solid #eee' }} />
                            <div><strong>Início:</strong> {fmt(ev.inicio)}</div>
                            <div><strong>Fim:</strong> {fmt(ev.fim)}</div>
                            <div style={{ color: '#888', fontSize: 11, marginTop: 2 }}>
                              📍 {ev.latitude?.toFixed(4)}, {ev.longitude?.toFixed(4)}
                            </div>
                          </div>
                        </Tooltip>
                      </CircleMarker>
                    );
                  })}
                </span>
              );
            })}
        </MapContainer>
      </div>

      {/* Cards informativos dos itens selecionados */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12, marginTop: 16 }}>
        {/* Cards de Trajetórias GPS */}
        {(modoVisualizacao === 'todas' || modoVisualizacao === 'gps') &&
          selecionadasTraj.map(id => {
            const traj = dadosTraj[id];
            if (!traj) return null;
            const idx = trajetorias.findIndex(t => t.id_trajetoria === id);
            const cor = PALETTE[idx >= 0 ? idx % PALETTE.length : 0];
            return (
              <div key={`card-traj-${id}`} style={{ backgroundColor: '#fff', borderRadius: 8, padding: 14, boxShadow: '0 1px 4px rgba(0,0,0,0.07)', borderLeft: `4px solid ${cor}` }}>
                <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: '#27ae60', display: 'block', marginBottom: 2 }}>
                  Trajetória Contínua (GPS)
                </span>
                <div style={{ fontWeight: 700, marginBottom: 4 }}>{traj.nome}</div>
                <div style={{ fontSize: 12, color: '#555' }}>Entidade: <strong>{traj.entidade_nome}</strong></div>
                <div style={{ fontSize: 12, color: '#555' }}>Pontos: {traj.pontos?.length ?? 0}</div>
                <div style={{ fontSize: 12, color: '#555' }}>Início: {fmt(traj.inicio)}</div>
                <div style={{ fontSize: 12, color: '#555' }}>Fim: {fmt(traj.fim)}</div>
                {traj.descricao && <div style={{ fontSize: 12, color: '#777', marginTop: 4 }}>{traj.descricao}</div>}
              </div>
            );
          })}

        {/* Cards de Eventos Reconstruídos */}
        {(modoVisualizacao === 'todas' || modoVisualizacao === 'eventos') &&
          selecionadasEntidadeEventos.map(entId => {
            const grupo = eventosPorEntidade.find(g => g.entidade_id === entId);
            if (!grupo) return null;
            const idx = eventosPorEntidade.findIndex(g => g.entidade_id === entId);
            const cor = PALETTE[(idx + trajetorias.length) % PALETTE.length];
            return (
              <div key={`card-ev-${entId}`} style={{ backgroundColor: '#fff', borderRadius: 8, padding: 14, boxShadow: '0 1px 4px rgba(0,0,0,0.07)', borderLeft: `4px dashed ${cor}` }}>
                <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: '#8e44ad', display: 'block', marginBottom: 2 }}>
                  Trajetória Reconstruída de Eventos
                </span>
                <div style={{ fontWeight: 700, marginBottom: 4 }}>{grupo.entidade_nome}</div>
                <div style={{ fontSize: 12, color: '#555' }}>Eventos geolocalizados: <strong>{grupo.eventos.length}</strong></div>
                <div style={{ fontSize: 12, color: '#555' }}>Primeiro: {fmt(grupo.eventos[0]?.inicio)}</div>
                <div style={{ fontSize: 12, color: '#555' }}>Último: {fmt(grupo.eventos[grupo.eventos.length - 1]?.fim)}</div>
                <div style={{ fontSize: 11, color: '#777', marginTop: 6 }}>
                  Tipos presentes: {Array.from(new Set(grupo.eventos.map(e => e.tipo_evento))).join(', ')}
                </div>
              </div>
            );
          })}
      </div>
    </div>
  );
}
