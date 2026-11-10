import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Polyline, Marker, Tooltip, CircleMarker } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { getTrajetorias, getTrajetoria } from '../api';
import type { Trajetoria } from '../types';

// Corrige ícone padrão do Leaflet no Vite/Webpack
import iconUrl from 'leaflet/dist/images/marker-icon.png';
import iconShadowUrl from 'leaflet/dist/images/marker-shadow.png';
delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl;
L.Icon.Default.mergeOptions({ iconUrl, shadowUrl: iconShadowUrl });

const COLORS = ['#1a6fc4', '#e74c3c', '#27ae60', '#8e44ad', '#e67e22', '#16a085'];

interface Props {
  filtroEntidadeId?: number;
  onClearFiltro: () => void;
}

function fmt(dt: string | null) {
  if (!dt) return '—';
  return new Date(dt).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
}

export default function TrajetoriaMap({ filtroEntidadeId, onClearFiltro }: Props) {
  const [trajetorias, setTrajetorias] = useState<Trajetoria[]>([]);
  const [selecionadas, setSelecionadas] = useState<number[]>([]);
  const [dados, setDados] = useState<Record<number, Trajetoria>>({});
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    getTrajetorias()
      .then(ts => {
        setTrajetorias(ts);
        const ids = filtroEntidadeId
          ? ts.filter(t => t.entidade_id === filtroEntidadeId).map(t => t.id_trajetoria)
          : ts.slice(0, 2).map(t => t.id_trajetoria);
        setSelecionadas(ids);
      })
      .catch(() => setErro('Erro ao carregar trajetórias.'))
      .finally(() => setLoading(false));
  }, [filtroEntidadeId]);

  useEffect(() => {
    selecionadas.forEach(id => {
      if (!dados[id]) {
        getTrajetoria(id).then(t => setDados(prev => ({ ...prev, [id]: t })));
      }
    });
  }, [selecionadas]);

  const toggleSelecionada = (id: number) => {
    setSelecionadas(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const todasPontos = selecionadas.flatMap(id => dados[id]?.pontos ?? []);
  const center: [number, number] = todasPontos.length > 0
    ? [
      todasPontos.reduce((s, p) => s + p.latitude, 0) / todasPontos.length,
      todasPontos.reduce((s, p) => s + p.longitude, 0) / todasPontos.length,
    ]
    : [-22.9, -43.2];

  if (loading) return <div style={{ padding: 24, color: '#666' }}>⏳ Carregando trajetórias...</div>;
  if (erro) return <div style={{ padding: 16, color: '#c0392b', backgroundColor: '#fdecea', borderRadius: 6 }}>{erro}</div>;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2 style={{ margin: 0 }}>🗺️ Trajetórias no Mapa</h2>
        {filtroEntidadeId && (
          <button onClick={onClearFiltro}
            style={{ padding: '6px 14px', fontSize: 12, border: '1px solid #ccc', borderRadius: 6, cursor: 'pointer', backgroundColor: '#fff', color: '#555' }}>
            ✕ Limpar filtro de entidade
          </button>
        )}
      </div>

      {/* Legenda / seletor */}
      <div style={{ backgroundColor: '#fff', borderRadius: 8, padding: 16, boxShadow: '0 1px 4px rgba(0,0,0,0.07)', marginBottom: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10, color: '#444' }}>Selecionar trajetórias:</div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {trajetorias.map((t, i) => {
            const cor = COLORS[i % COLORS.length];
            const ativa = selecionadas.includes(t.id_trajetoria);
            return (
              <button
                key={t.id_trajetoria}
                onClick={() => toggleSelecionada(t.id_trajetoria)}
                style={{
                  padding: '6px 14px', fontSize: 12, borderRadius: 20, cursor: 'pointer', fontWeight: 600,
                  border: `2px solid ${cor}`,
                  backgroundColor: ativa ? cor : '#fff',
                  color: ativa ? '#fff' : cor,
                  transition: 'all 0.15s',
                }}>
                {t.nome} <span style={{ opacity: 0.75 }}>({t.entidade_nome})</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Mapa */}
      <div style={{ borderRadius: 10, overflow: 'hidden', boxShadow: '0 2px 12px rgba(0,0,0,0.12)' }}>
        <MapContainer center={center} zoom={8} style={{ height: 540, width: '100%' }}>
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {selecionadas.map((id, idx) => {
            const traj = dados[id];
            if (!traj?.pontos?.length) return null;
            const cor = COLORS[trajetorias.findIndex(t => t.id_trajetoria === id) % COLORS.length];
            const positions: [number, number][] = traj.pontos.map(p => [p.latitude, p.longitude]);

            return (
              <span key={id}>
                <Polyline positions={positions} pathOptions={{ color: cor, weight: 3, opacity: 0.85 }} />
                {traj.pontos.map((p, pi) => (
                  <CircleMarker key={p.id_ponto}
                    center={[p.latitude, p.longitude]}
                    radius={pi === 0 || pi === traj.pontos!.length - 1 ? 7 : 4}
                    pathOptions={{
                      color: cor, fillColor: pi === 0 ? '#fff' : pi === traj.pontos!.length - 1 ? cor : cor,
                      fillOpacity: 1, weight: 2,
                    }}>
                    <Tooltip>
                      <div style={{ fontSize: 12 }}>
                        <strong>#{p.sequencia}</strong> — {traj.nome}<br />
                        {fmt(p.timestamp)}<br />
                        {p.velocidade != null && <>🚗 {p.velocidade} km/h<br /></>}
                        {p.altitude != null && <>⛰️ {p.altitude}m</>}
                      </div>
                    </Tooltip>
                  </CircleMarker>
                ))}
              </span>
            );
          })}
        </MapContainer>
      </div>

      {/* Info das trajetórias selecionadas */}
      {selecionadas.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12, marginTop: 16 }}>
          {selecionadas.map((id, idx) => {
            const traj = dados[id];
            const cor = COLORS[trajetorias.findIndex(t => t.id_trajetoria === id) % COLORS.length];
            if (!traj) return null;
            return (
              <div key={id} style={{ backgroundColor: '#fff', borderRadius: 8, padding: 14, boxShadow: '0 1px 4px rgba(0,0,0,0.07)', borderLeft: `4px solid ${cor}` }}>
                <div style={{ fontWeight: 700, marginBottom: 4 }}>{traj.nome}</div>
                <div style={{ fontSize: 12, color: '#555' }}>Entidade: {traj.entidade_nome}</div>
                <div style={{ fontSize: 12, color: '#555' }}>Pontos: {traj.pontos?.length ?? 0}</div>
                <div style={{ fontSize: 12, color: '#555' }}>Início: {fmt(traj.inicio)}</div>
                <div style={{ fontSize: 12, color: '#555' }}>Fim: {fmt(traj.fim)}</div>
                {traj.descricao && <div style={{ fontSize: 12, color: '#777', marginTop: 4 }}>{traj.descricao}</div>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
