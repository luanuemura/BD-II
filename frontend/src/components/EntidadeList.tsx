import { useState, useEffect } from 'react';
import { getEntidades, excluirEntidade } from '../api';
import type { Entidade } from '../types';
import HistoricoTimeline from './HistoricoTimeline';

interface Props {
  refresh: number;
  onEdit: (e: Entidade) => void;
  onDelete: () => void;
  onVerTrajetorias: (id: number) => void;
}

const thStyle: React.CSSProperties = {
  textAlign: 'left', padding: '10px 12px', backgroundColor: '#eaf0fb',
  fontWeight: 600, fontSize: 13, borderBottom: '2px solid #cdd6e8',
};
const tdStyle: React.CSSProperties = {
  padding: '10px 12px', borderBottom: '1px solid #eee', fontSize: 13, verticalAlign: 'middle',
};

export default function EntidadeList({ refresh, onEdit, onDelete, onVerTrajetorias }: Props) {
  const [entidades, setEntidades] = useState<Entidade[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [historicoId, setHistoricoId] = useState<number | null>(null);
  const [historicoNome, setHistoricoNome] = useState('');

  useEffect(() => {
    setLoading(true);
    setErro(null);
    getEntidades()
      .then(setEntidades)
      .catch(() => setErro('Erro ao carregar entidades. Verifique se o backend está rodando.'))
      .finally(() => setLoading(false));
  }, [refresh]);

  const handleExcluir = async (e: Entidade) => {
    if (!confirm(`Excluir "${e.nome}"? Isso também apagará os eventos e trajetórias vinculadas.`)) return;
    try {
      await excluirEntidade(e.id_entidade);
      onDelete();
    } catch {
      alert('Erro ao excluir entidade.');
    }
  };

  if (loading) return <div style={{ padding: 24, color: '#666' }}>⏳ Carregando entidades...</div>;
  if (erro) return <div style={{ padding: 16, color: '#c0392b', backgroundColor: '#fdecea', borderRadius: 6 }}>{erro}</div>;
  if (!entidades.length) return <div style={{ padding: 24, color: '#888' }}>Nenhuma entidade cadastrada.</div>;

  return (
    <>
      <div style={{ overflowX: 'auto', backgroundColor: '#fff', borderRadius: 8, boxShadow: '0 1px 6px rgba(0,0,0,0.08)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={thStyle}>ID</th>
              <th style={thStyle}>Nome</th>
              <th style={thStyle}>Tipo</th>
              <th style={thStyle}>Descrição</th>
              <th style={thStyle}>Criado em</th>
              <th style={thStyle}>Ações</th>
            </tr>
          </thead>
          <tbody>
            {entidades.map(e => (
              <tr key={e.id_entidade} style={{ transition: 'background 0.1s' }}
                onMouseEnter={ev => (ev.currentTarget.style.backgroundColor = '#f9fbff')}
                onMouseLeave={ev => (ev.currentTarget.style.backgroundColor = '')}>
                <td style={tdStyle}><code>{e.id_entidade}</code></td>
                <td style={{ ...tdStyle, fontWeight: 600 }}>{e.nome}</td>
                <td style={tdStyle}>
                  {e.tipo && (
                    <span style={{
                      padding: '2px 8px', borderRadius: 12, fontSize: 11, fontWeight: 600,
                      backgroundColor: e.tipo === 'pessoa' ? '#e8f4fd' : e.tipo === 'veículo' ? '#fef9e7' : '#eafaf1',
                      color: e.tipo === 'pessoa' ? '#1a6fc4' : e.tipo === 'veículo' ? '#d4a017' : '#1e8449',
                    }}>
                      {e.tipo}
                    </span>
                  )}
                </td>
                <td style={{ ...tdStyle, maxWidth: 260, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {e.descricao || <span style={{ color: '#aaa' }}>—</span>}
                </td>
                <td style={{ ...tdStyle, whiteSpace: 'nowrap', color: '#666' }}>
                  {e.criado_em ? new Date(e.criado_em).toLocaleString('pt-BR') : '—'}
                </td>
                <td style={{ ...tdStyle, whiteSpace: 'nowrap' }}>
                  <button onClick={() => { setHistoricoId(e.id_entidade); setHistoricoNome(e.nome); }}
                    style={{ marginRight: 6, padding: '4px 10px', fontSize: 12, cursor: 'pointer', borderRadius: 4, border: '1px solid #1a6fc4', backgroundColor: '#fff', color: '#1a6fc4' }}>
                    📋 Histórico
                  </button>
                  <button onClick={() => onVerTrajetorias(e.id_entidade)}
                    style={{ marginRight: 6, padding: '4px 10px', fontSize: 12, cursor: 'pointer', borderRadius: 4, border: '1px solid #27ae60', backgroundColor: '#fff', color: '#27ae60' }}>
                    🗺️ Mapa
                  </button>
                  <button onClick={() => onEdit(e)}
                    style={{ marginRight: 6, padding: '4px 10px', fontSize: 12, cursor: 'pointer', borderRadius: 4, border: '1px solid #e67e22', backgroundColor: '#fff', color: '#e67e22' }}>
                    ✏️ Editar
                  </button>
                  <button onClick={() => handleExcluir(e)}
                    style={{ padding: '4px 10px', fontSize: 12, cursor: 'pointer', borderRadius: 4, border: '1px solid #e74c3c', backgroundColor: '#fff', color: '#e74c3c' }}>
                    🗑️ Excluir
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Timeline modal */}
      {historicoId !== null && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100 }}
          onClick={() => setHistoricoId(null)}>
          <div style={{ backgroundColor: '#fff', borderRadius: 10, padding: 28, width: '90%', maxWidth: 700, maxHeight: '80vh', overflowY: 'auto', boxShadow: '0 8px 40px rgba(0,0,0,0.2)' }}
            onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ margin: 0 }}>📋 Histórico — {historicoNome}</h3>
              <button onClick={() => setHistoricoId(null)} style={{ border: 'none', background: 'none', fontSize: 20, cursor: 'pointer', color: '#888' }}>✕</button>
            </div>
            <HistoricoTimeline entidadeId={historicoId} />
          </div>
        </div>
      )}
    </>
  );
}
