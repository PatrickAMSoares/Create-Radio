export function DeviceSelector({ devices, selectedDeviceId, ownDeviceId, onSelect, onRefresh }) {
  const externalDevices = devices.filter((d) => d.id && d.id !== ownDeviceId)

  return (
    <div className="device-selector">
      <label className="settings-label" htmlFor="device-select">
        Dispositivo de reprodução
      </label>
      <div className="device-selector-row">
        <select id="device-select" value={selectedDeviceId || ''} onChange={(e) => onSelect(e.target.value)}>
          {!selectedDeviceId && <option value="">Selecione um dispositivo…</option>}
          {ownDeviceId && <option value={ownDeviceId}>Este navegador</option>}
          {externalDevices.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
              {d.is_active ? ' (ativo agora)' : ''}
            </option>
          ))}
        </select>
        <button type="button" className="btn btn--ghost btn--small" onClick={onRefresh} aria-label="Atualizar lista de dispositivos">
          🔄
        </button>
      </div>
      <p className="hint">
        No celular, o Spotify não permite tocar áudio direto pelo navegador (limitação do próprio Web Playback SDK,
        só homologado para desktop). Abra o app oficial do Spotify no seu celular — só precisa estar aberto — e
        selecione seu aparelho aqui.
      </p>
    </div>
  )
}
