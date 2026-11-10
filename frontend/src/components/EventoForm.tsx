import { useState } from 'react';
import { criarEvento } from '../api';
import type { Entidade } from '../types';

interface Props {
  entidades: Entidade[];
  onSaved: () => void;
  onCancel: () => void;
}

const TIPOS_EVENTO = ['deslocamento', 'parada', 'incidente', 'outro'];

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '8px 10px', fontSize: 14,
  border: '1px solid #ccc', borderRadius: 6, boxSizing: 'border-box' as const, marginTop: 4,
};
const labelStyle: React.CSSProperties = { fontSize: 13, fontWeight: 600, color: '#444', display: 'block', marginBottom: 10 };
const rowStyle: React.CSSProperties = { display: 'flex', gap: 12 };
const colStyle: React.CSSProperties = { flex: 1 };

export default function EventoForm({ entidades, onSaved, onCancel }: Props) {
  const [entidadeId, setEntidadeId] = useState<number | ''>(entidades[0]?.id_entidade ?? '');
  const [tipoEvento, setTipoEvento] = useState('deslocamento');
  const [descricao, setDescricao] = useState('');
  const [inicio, setInicio] = useState('');
  const [fim, setFim] = useState('');
  const [lat, setLat] = useState('');
  const [lng, setLng] = useState('');
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!entidadeId) { setErro('Selecione uma entidade.'); return; }
    if (!inicio || !fim) { setErro('Preencha as datas de início e fim.'); return; }
    if (new Date(fim) <= new Date(inicio)) { setErro('A data de fim deve ser posterior ao início.'); return; }
    setLoading(true); setErro(null);
    try {
      await criarEvento({
        entidade_id: Number(entidadeId),
        tipo_evento: tipoEvento || undefined,
        descricao: descricao || undefined,
        inicio: new Date(inicio).toISOString(),
        fim: new Date(fim).toISOString(),
        latitude: lat ? Number(lat) : undefined,
        longitude: lng ? Number(lng) : undefined,
      });
      setSucesso(true);
      setTimeout(onSaved, 700);
    } catch {
      setErro('Erro ao criar evento. Verifique os dados.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {erro && <div style={{ color: '#c0392b', backgroundColor: '#fdecea', borderRadius: 6, padding: '8px 12px', marginBottom: 12, fontSize: 13 }}>{erro}</div>}
      {sucesso && <div style={{ color: '#1e8449', backgroundColor: '#eafaf1', borderRadius: 6, padding: '8px 12px', marginBottom: 12, fontSize: 13 }}>✅ Evento criado com sucesso!</div>}

      <label style={labelStyle}>
        Entidade *
        <select style={inputStyle} value={entidadeId} onChange={e => setEntidadeId(Number(e.target.value))} required>
          <option value="">— selecione —</option>
          {entidades.map(en => <option key={en.id_entidade} value={en.id_entidade}>{en.nome}</option>)}
        </select>
      </label>

      <label style={labelStyle}>
        Tipo do Evento
        <select style={inputStyle} value={tipoEvento} onChange={e => setTipoEvento(e.target.value)}>
          {TIPOS_EVENTO.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
      </label>

      <label style={labelStyle}>
        Descrição
        <input style={inputStyle} value={descricao} onChange={e => setDescricao(e.target.value)} placeholder="Descrição do evento" />
      </label>

      <div style={rowStyle}>
        <label style={{ ...labelStyle, ...colStyle }}>
          Data/Hora Início *
          <input type="datetime-local" style={inputStyle} value={inicio} onChange={e => setInicio(e.target.value)} required />
        </label>
        <label style={{ ...labelStyle, ...colStyle }}>
          Data/Hora Fim *
          <input type="datetime-local" style={inputStyle} value={fim} onChange={e => setFim(e.target.value)} required />
        </label>
      </div>

      <div style={rowStyle}>
        <label style={{ ...labelStyle, ...colStyle }}>
          Latitude (opcional)
          <input type="number" step="any" style={inputStyle} value={lat} onChange={e => setLat(e.target.value)} placeholder="-23.5505" />
        </label>
        <label style={{ ...labelStyle, ...colStyle }}>
          Longitude (opcional)
          <input type="number" step="any" style={inputStyle} value={lng} onChange={e => setLng(e.target.value)} placeholder="-46.6333" />
        </label>
      </div>

      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
        <button type="button" onClick={onCancel}
          style={{ padding: '8px 18px', border: '1px solid #ccc', borderRadius: 6, cursor: 'pointer', backgroundColor: '#fff', color: '#555' }}>
          Cancelar
        </button>
        <button type="submit" disabled={loading}
          style={{ padding: '8px 18px', border: 'none', borderRadius: 6, cursor: 'pointer', backgroundColor: loading ? '#a0b8d8' : '#1a6fc4', color: '#fff', fontWeight: 600 }}>
          {loading ? 'Salvando...' : 'Criar Evento'}
        </button>
      </div>
    </form>
  );
}
