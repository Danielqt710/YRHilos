// Vista: funciones puras que reciben datos y devuelven HTML como texto.
// No leen ni escriben estado global, no hacen fetch, no manejan eventos —
// de eso se encarga app.js (controlador).
import { FAMILIAS, fillPercent } from './model.js';

export function esc(str){
  return String(str ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

export function skeinSVG(color, size){
  size = size || 52;
  const c = color || '#E3A857';
  return `
  <svg class="skein" width="${size}" height="${size}" viewBox="0 0 52 52" fill="none">
    <circle cx="26" cy="26" r="23" fill="${c}" opacity="0.18"/>
    <g stroke="${c}" stroke-width="2.4" stroke-linecap="round" fill="none">
      <path d="M10 20 C 20 10, 32 10, 42 20"/>
      <path d="M8 27 C 20 15, 32 39, 44 27"/>
      <path d="M10 34 C 20 44, 32 44, 42 34"/>
      <path d="M14 14 C 26 30, 26 22, 38 38"/>
    </g>
    <circle cx="26" cy="26" r="4" fill="${c}"/>
  </svg>`;
}

export function pantallaColoresHTML({ hilos, filtroColor, conteo }){
  return `
    <header class="top">
      <div class="title-block">
        <button class="btn btn-ghost" id="btnVolver">← Volver</button>
        <h1 class="display" style="margin-top:10px;">Filtrar por color</h1>
        <p>Tocá un color para ver solo esos hilos</p>
      </div>
    </header>

    <div class="color-grid">
      <button class="color-swatch-btn ${!filtroColor ? 'active' : ''}" data-color="">
        <span class="color-dot" style="background:repeating-conic-gradient(#E6D9EC 0% 25%, #F7F3EA 0% 50%) 0 0/16px 16px;"></span>
        <span class="fam-label">Todos</span>
        <span class="fam-count">${hilos.length}</span>
      </button>
      ${FAMILIAS.map(f => `
        <button class="color-swatch-btn ${filtroColor===f.key ? 'active' : ''} ${conteo[f.key]===0 ? 'is-empty' : ''}" data-color="${f.key}">
          <span class="color-dot" style="background:${f.swatch};"></span>
          <span class="fam-label">${f.label}</span>
          <span class="fam-count">${conteo[f.key]}</span>
        </button>
      `).join('')}
    </div>
  `;
}

export function pantallaListaHTML({ hilos, list, stats, filtro, busqueda, familiaActiva }){
  const { total, tejido, tufting } = stats;
  return `
    <header class="top">
      <div class="title-block">
        <h1 class="display">${skeinSVG('#E3A857',34)} YRHilos</h1>
        <p>Inventario de hilos para tejido y tufting</p>
      </div>
      <div class="stats">
        <div class="stat-pill"><b>${total}</b> en total</div>
        <div class="stat-pill"><b>${tejido}</b> tejido</div>
        <div class="stat-pill"><b>${tufting}</b> tufting</div>
      </div>
    </header>

    <div class="controls">
      <div class="search">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#8D84A0" stroke-width="2"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></svg>
        <input id="buscador" type="text" placeholder="Buscar por nombre, marca o nota…" value="${esc(busqueda)}">
      </div>
      <div class="tabs" role="tablist">
        <button class="tab ${filtro==='todos'?'active':''}" data-filtro="todos">Todos</button>
        <button class="tab ${filtro==='tejido'?'active':''}" data-filtro="tejido">Tejido</button>
        <button class="tab ${filtro==='tufting'?'active':''}" data-filtro="tufting">Tufting</button>
      </div>
      <button class="btn btn-ghost" id="btnColores">🎨 Colores</button>
      <button class="btn btn-primary" id="btnAgregarTop">+ Agregar hilo</button>
    </div>

    ${familiaActiva ? `
      <div class="filter-pill">
        <span class="color-dot" style="width:14px;height:14px;background:${familiaActiva.swatch};"></span>
        Color: ${familiaActiva.label}
        <button id="btnQuitarColor" aria-label="Quitar filtro de color">✕</button>
      </div>
    ` : ''}

    ${list.length === 0 ? `
      <div class="empty">
        ${skeinSVG('#E6D9EC',64)}
        <h3>${hilos.length===0 ? 'Todavía no hay hilos cargados' : 'No encontramos hilos con ese filtro'}</h3>
        <p>${hilos.length===0 ? 'Agregá el primero para empezar tu inventario.' : 'Probá con otra búsqueda o categoría.'}</p>
        ${hilos.length===0 ? '<button class="btn btn-primary" id="btnAgregarEmpty">+ Agregar hilo</button>' : ''}
      </div>
    ` : `
      <div class="grid">
        ${list.map(h => `
          <div class="card" tabindex="0" data-id="${h.id}">
            <div class="card-top">
              ${h.foto ? `<img class="card-photo" src="${esc(h.foto)}" alt="">` : skeinSVG(h.color, 48)}
              <div style="min-width:0;">
                <div class="card-name">${esc(h.nombre)}</div>
                <div class="card-marca">${esc(h.marca || 'Sin marca')}</div>
              </div>
            </div>
            <span class="tag ${h.tipo==='tejido' ? 'tag-tejido':'tag-tufting'}">${h.tipo==='tejido' ? 'Tejido':'Tufting'}</span>
            <div class="qty-row">
              <span class="qty-num">${h.cantidad ?? 0}</span>
              <span class="qty-unit">${esc(h.unidad || '')}</span>
            </div>
            <div class="fill-track"><div class="fill-bar" style="width:${fillPercent(h)}%; background:${h.color || '#E3A857'};"></div></div>
            ${h.notas ? `<div class="notas">${esc(h.notas)}</div>` : ''}
          </div>
        `).join('')}
      </div>
    `}

    <button class="fab" id="fab" title="Agregar hilo" aria-label="Agregar hilo">+</button>
  `;
}

export function modalHTML(h, unidades){
  return `
    <div class="modal">
      <h2 class="display">${h ? 'Editar hilo' : 'Agregar hilo'}</h2>
      <div class="field">
        <label for="f_nombre">Nombre / color</label>
        <input type="text" id="f_nombre" placeholder="Ej: Azul petróleo" value="${esc(h?.nombre)}">
      </div>
      <div class="row2">
        <div class="field">
          <label for="f_marca">Marca</label>
          <input type="text" id="f_marca" placeholder="Ej: Cadena 3" value="${esc(h?.marca)}">
        </div>
        <div class="field">
          <label for="f_tipo">Tipo</label>
          <select id="f_tipo">
            <option value="tejido" ${h?.tipo==='tejido'?'selected':''}>Tejido</option>
            <option value="tufting" ${h?.tipo==='tufting'?'selected':''}>Tufting</option>
          </select>
        </div>
      </div>
      <div class="row2">
        <div class="field">
          <label for="f_cantidad">Cantidad</label>
          <input type="number" id="f_cantidad" min="0" step="0.5" value="${h?.cantidad ?? ''}">
        </div>
        <div class="field">
          <label for="f_unidad">Unidad</label>
          <select id="f_unidad">
            ${unidades.map(u=>`<option value="${u}" ${h?.unidad===u?'selected':''}>${u}</option>`).join('')}
          </select>
        </div>
      </div>
      <div class="field">
        <label>Foto (opcional)</label>
        <div class="foto-row">
          <div class="foto-preview" id="fotoPreview"></div>
          <div class="foto-actions">
            <button type="button" class="btn btn-ghost" id="btnFoto">📷 Tomar foto</button>
            <button type="button" class="btn btn-ghost" id="btnQuitarFoto" style="display:none;">Quitar foto</button>
          </div>
        </div>
        <input type="file" id="f_foto_input" accept="image/*" capture="environment" style="display:none">
        <span class="foto-hint">Acercate para que el hilo ocupe el centro de la foto: así el color se detecta mejor.</span>
      </div>
      <div class="field">
        <label for="f_color">Color de referencia</label>
        <div class="color-row">
          <input type="color" id="f_color" value="${h?.color || '#E3A857'}">
          <span style="font-size:13px; color:var(--ink-soft);">Para identificar el hilo de un vistazo</span>
        </div>
      </div>
      <div class="field">
        <label for="f_notas">Notas (opcional)</label>
        <textarea id="f_notas" placeholder="Ej: guardado en el cajón 2">${esc(h?.notas)}</textarea>
      </div>
      <div class="modal-actions">
        ${h ? '<button class="btn btn-danger" id="btnEliminar">Eliminar</button>' : ''}
        <button class="btn btn-ghost" id="btnCancelar">Cancelar</button>
        <button class="btn btn-primary" id="btnGuardar">Guardar</button>
      </div>
    </div>
  `;
}

export function confirmarEliminarHTML(){
  return `
    <div class="modal" style="max-width:360px;">
      <h2 class="display" style="font-size:19px;">¿Eliminar este hilo?</h2>
      <p style="color:var(--ink-soft); font-size:14px; margin-top:-8px;">Esta acción no se puede deshacer.</p>
      <div class="modal-actions">
        <button class="btn btn-ghost" id="btnNo">Cancelar</button>
        <button class="btn btn-danger" id="btnSi">Sí, eliminar</button>
      </div>
    </div>
  `;
}
