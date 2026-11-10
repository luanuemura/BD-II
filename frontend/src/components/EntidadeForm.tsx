import { useState } from 'react';
import { criarEntidade, atualizarEntidade } from '../api';
import type { Entidade } from '../types';

interface Props {
  entidade?: Entidade | null;
  onSaved: () => void;
  onCancel: () => void;
}

const TIPOS = ['pessoa', 'veículo', 'objeto', 'outro'];

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '8px 10px', fontSize: 14,
  border: '1px solid #ccc', borderRadius: 6, boxSizing: 'border-box' as const,
  marginTop: 4,
};
const labelStyle: React.CSSProperties = { fontSize: 13, fontWeight: 600, color: '#444', display: 'block', marginBottom: 12 };

export default function EntidadeForm({ entidade, onSaved, onCancel }: Props) {
  const [nome, setNome] = useState(entidade?.nome ?? '');
  const [tipo, setTipo] = useState(entidade?.tipo ?? '');
  const [descricao, setDescricao] = useState(entidade?.descricao ?? '');
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome.trim()) { setErro('Nome é obrigatório.'); return; }
    setLoading(true); setErro(null);
    try {
      if (entidade) {
        await atualizarEntidade(entidade.id_entidade, { nome, tipo: tipo || undefined, descricao: descricao || undefined });
      } else {
        await criarEntidade({ nome, tipo: tipo || undefined, descricao: descricao || undefined });
      }
      setSucesso(true);
      setTimeout(onSaved, 700);
    } catch {
      setErro('Erro ao salvar. Verifique os dados e tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {erro && <div style={{ color: '#c0392b', backgroundColor: '#fdecea', borderRadius: 6, padding: '8px 12px', marginBottom: 12, fontSize: 13 }}>{erro}</div>}
      {sucesso && <div style={{ color: '#1e8449', backgroundColor: '#eafaf1', borderRadius: 6, padding: '8px 12px', marginBottom: 12, fontSize: 13 }}>✅ Salvo com sucesso!</div>}

      <label style={labelStyle}>
        Nome *
        <input style={inputStyle} value={nome} onChange={e => setNome(e.target.value)} placeholder="Nome da entidade" required />
      </label>

      <label style={labelStyle}>
        Tipo
        <select style={inputStyle} value={tipo} onChange={e => setTipo(e.target.value)}>
          <option value="">— selecione —</option>
          {TIPOS.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
      </label>

      <label style={labelStyle}>
        Descrição
        <textarea
          style={{ ...inputStyle, minHeight: 80, resize: 'vertical' }}
          value={descricao}
          onChange={e => setDescricao(e.target.value)}
          placeholder="Descrição opcional"
        />
      </label>

      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
        <button type="button" onClick={onCancel}
          style={{ padding: '8px 18px', border: '1px solid #ccc', borderRadius: 6, cursor: 'pointer', backgroundColor: '#fff', color: '#555' }}>
          Cancelar
        </button>
        <button type="submit" disabled={loading}
          style={{ padding: '8px 18px', border: 'none', borderRadius: 6, cursor: 'pointer', backgroundColor: loading ? '#a0b8d8' : '#1a6fc4', color: '#fff', fontWeight: 600 }}>
          {loading ? 'Salvando...' : entidade ? 'Atualizar' : 'Criar'}
        </button>
      </div>
    </form>
  );
}
