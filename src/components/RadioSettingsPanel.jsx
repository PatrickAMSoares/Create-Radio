const SOURCE_OPTIONS = [
  { key: 'savedTracks', label: '🎵 Músicas salvas' },
  { key: 'topArtists', label: '🎤 Artistas favoritos' },
  { key: 'albums', label: '💿 Álbuns' },
  { key: 'playlists', label: '📚 Playlists' },
  { key: 'discovery', label: '🆕 Descobertas' },
  { key: 'popular', label: '🔥 Mais populares' },
]

function RadioGroup({ label, field, value, options, onSet }) {
  return (
    <div className="settings-group">
      <p className="settings-label">{label}</p>
      <div className="chip-grid">
        {options.map((opt) => (
          <button
            key={opt.value}
            type="button"
            className={`chip ${value === opt.value ? 'chip--active' : ''}`}
            onClick={() => onSet(field, opt.value)}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  )
}

export function RadioSettingsPanel({ settings, onChange }) {
  const toggleSource = (key) => {
    onChange({ ...settings, sources: { ...settings.sources, [key]: !settings.sources[key] } })
  }
  const setField = (field, value) => onChange({ ...settings, [field]: value })
  const anySourceActive = Object.values(settings.sources).some(Boolean)

  return (
    <section className="settings-panel">
      <h3>Configurar Rádio</h3>

      <div className="settings-group">
        <p className="settings-label">Fontes de música</p>
        <div className="chip-grid">
          {SOURCE_OPTIONS.map((opt) => (
            <button
              key={opt.key}
              type="button"
              className={`chip ${settings.sources[opt.key] ? 'chip--active' : ''}`}
              onClick={() => toggleSource(opt.key)}
            >
              {opt.label}
            </button>
          ))}
          <button
            type="button"
            className={`chip ${!anySourceActive ? 'chip--active' : ''}`}
            onClick={() =>
              onChange({ ...settings, sources: Object.fromEntries(SOURCE_OPTIONS.map((o) => [o.key, false])) })
            }
          >
            🎲 Totalmente aleatório
          </button>
        </div>
        {!anySourceActive && (
          <p className="hint">Sem fontes selecionadas: a rádio vai misturar tudo que encontrar na sua conta.</p>
        )}
      </div>

      <RadioGroup
        label="Familiaridade"
        field="familiaridade"
        value={settings.familiaridade}
        onSet={setField}
        options={[
          { value: 'conhecidas', label: 'Mais conhecidas' },
          { value: 'equilibrado', label: 'Equilibrado' },
          { value: 'descobertas', label: 'Descobertas' },
        ]}
      />

      <RadioGroup
        label="Variedade"
        field="variedade"
        value={settings.variedade}
        onSet={setField}
        options={[
          { value: 'baixa', label: 'Baixa' },
          { value: 'media', label: 'Média' },
          { value: 'alta', label: 'Alta' },
        ]}
      />

      <RadioGroup
        label="Repetição"
        field="repeticao"
        value={settings.repeticao}
        onSet={setField}
        options={[
          { value: 'evitar', label: 'Evitar músicas recentes' },
          { value: 'algumas', label: 'Permitir algumas repetições' },
          { value: 'livre', label: 'Sem restrição' },
        ]}
      />
    </section>
  )
}
