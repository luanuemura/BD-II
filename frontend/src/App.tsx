import { useState, useEffect } from 'react';
import EntidadeList from './components/EntidadeList';
import EntidadeForm from './components/EntidadeForm';
import EventoList from './components/EventoList';
import EventoForm from './components/EventoForm';
import TrajetoriaMap from './components/TrajetoriaMap';
import AnaliseTemporalPanel from './components/AnaliseTemporalPanel';
import { getEntidades } from './api';
import type { Entidade } from './types';

type Tab = 'entidades' | 'eventos' | 'trajetorias' | 'analise';

const TAB_LABELS: Record<Tab, string> = {
  entidades: '🧑 Entidades',
  eventos: '📅 Eventos',
  trajetorias: '🗺️ Trajetórias',
  analise: '📊 Análise Temporal',
};

const styles = {
  app: {
    fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
    minHeight: '100vh',
    backgroundColor: '#f5f7fa',
    color: '#222',
  } as React.CSSProperties,
  header: {
    backgroundColor: '#1a3a5c',
    color: '#fff',
    padding: '16px 32px',
    display: 'flex',
    alignItems: 'center',
    gap: 16,
  } as React.CSSProperties,
  title: { margin: 0, fontSize: 22, fontWeight: 700 } as React.CSSProperties,
  subtitle: { margin: 0, fontSize: 13, opacity: 0.75 } as React.CSSProperties,
  tabs: {
    display: 'flex',
    backgroundColor: '#fff',
    borderBottom: '2px solid #dde3ea',
    padding: '0 32px',
  } as React.CSSProperties,
  tab: (active: boolean): React.CSSProperties => ({
    padding: '12px 24px',
    border: 'none',
    borderBottom: active ? '3px solid #1a6fc4' : '3px solid transparent',
    backgroundColor: 'transparent',
    cursor: 'pointer',
    fontWeight: active ? 700 : 400,
    color: active ? '#1a6fc4' : '#555',
    fontSize: 14,
    transition: 'all 0.15s',
  }),
  content: {
    padding: '24px 32px',
    maxWidth: 1200,
    margin: '0 auto',
  } as React.CSSProperties,
  modalOverlay: {
    position: 'fixed' as const,
    inset: 0,
    backgroundColor: 'rgba(0,0,0,0.45)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  modalBox: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 32,
    minWidth: 420,
    maxWidth: 560,
    width: '90%',
    boxShadow: '0 8px 40px rgba(0,0,0,0.18)',
    position: 'relative' as const,
  },
};

export default function App() {
  const [tab, setTab] = useState<Tab>('entidades');
  const [entidades, setEntidades] = useState<Entidade[]>([]);
  const [showEntidadeForm, setShowEntidadeForm] = useState(false);
  const [showEventoForm, setShowEventoForm] = useState(false);
  const [editingEntidade, setEditingEntidade] = useState<Entidade | null>(null);
  const [filtroEntidadeId, setFiltroEntidadeId] = useState<number | undefined>(undefined);
  const [refreshEntidades, setRefreshEntidades] = useState(0);
  const [refreshEventos, setRefreshEventos] = useState(0);

  useEffect(() => {
    const ctrl = new AbortController();
    getEntidades().then(setEntidades).catch(() => {});
    return () => ctrl.abort();
  }, [refreshEntidades]);

  const handleEntidadeSaved = () => {
    setShowEntidadeForm(false);
    setEditingEntidade(null);
    setRefreshEntidades(x => x + 1);
  };

  const handleEventoSaved = () => {
    setShowEventoForm(false);
    setRefreshEventos(x => x + 1);
  };

  const handleVerTrajetorias = (id: number) => {
    setFiltroEntidadeId(id);
    setTab('trajetorias');
  };

  return (
    <div style={styles.app}>
      <header style={styles.header}>
        <div>
          <h1 style={styles.title}>⏱ Temporal</h1>
          <p style={styles.subtitle}>Rastreamento de Trajetórias e Eventos</p>
        </div>
      </header>

      <nav style={styles.tabs}>
        {(Object.keys(TAB_LABELS) as Tab[]).map(t => (
          <button key={t} style={styles.tab(tab === t)} onClick={() => setTab(t)}>
            {TAB_LABELS[t]}
          </button>
        ))}
      </nav>

      <main style={styles.content}>
        {tab === 'entidades' && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h2 style={{ margin: 0 }}>Entidades</h2>
              <button
                style={{ padding: '8px 18px', backgroundColor: '#1a6fc4', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 600 }}
                onClick={() => { setEditingEntidade(null); setShowEntidadeForm(true); }}
              >
                + Nova Entidade
              </button>
            </div>
            <EntidadeList
              refresh={refreshEntidades}
              onEdit={e => { setEditingEntidade(e); setShowEntidadeForm(true); }}
              onDelete={() => setRefreshEntidades(x => x + 1)}
              onVerTrajetorias={handleVerTrajetorias}
            />
          </>
        )}

        {tab === 'eventos' && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h2 style={{ margin: 0 }}>Eventos</h2>
              <button
                style={{ padding: '8px 18px', backgroundColor: '#1a6fc4', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 600 }}
                onClick={() => setShowEventoForm(true)}
              >
                + Novo Evento
              </button>
            </div>
            <EventoList refresh={refreshEventos} entidades={entidades} onDelete={() => setRefreshEventos(x => x + 1)} />
          </>
        )}

        {tab === 'trajetorias' && (
          <TrajetoriaMap filtroEntidadeId={filtroEntidadeId} onClearFiltro={() => setFiltroEntidadeId(undefined)} />
        )}

        {tab === 'analise' && (
          <AnaliseTemporalPanel entidades={entidades} />
        )}
      </main>

      {/* Modal Entidade Form */}
      {showEntidadeForm && (
        <div style={styles.modalOverlay} onClick={() => setShowEntidadeForm(false)}>
          <div style={styles.modalBox} onClick={e => e.stopPropagation()}>
            <h3 style={{ marginTop: 0 }}>{editingEntidade ? 'Editar Entidade' : 'Nova Entidade'}</h3>
            <EntidadeForm
              entidade={editingEntidade}
              onSaved={handleEntidadeSaved}
              onCancel={() => { setShowEntidadeForm(false); setEditingEntidade(null); }}
            />
          </div>
        </div>
      )}

      {/* Modal Evento Form */}
      {showEventoForm && (
        <div style={styles.modalOverlay} onClick={() => setShowEventoForm(false)}>
          <div style={styles.modalBox} onClick={e => e.stopPropagation()}>
            <h3 style={{ marginTop: 0 }}>Novo Evento</h3>
            <EventoForm
              entidades={entidades}
              onSaved={handleEventoSaved}
              onCancel={() => setShowEventoForm(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
