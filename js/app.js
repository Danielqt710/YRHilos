// Controlador: mantiene el estado de la UI, escucha eventos del DOM,
// llama al modelo (datos/lógica) y le pide a la vista el HTML a mostrar.
import {
  UNIDADES, FAMILIAS, uid,
  escucharCambios, guardarHilo, eliminarHilo,
  computeStats, filteredList, conteoPorFamilia,
  procesarFoto, leerEtiquetaTexto,
} from './model.js';
import {
  esc, skeinSVG, pantallaColoresHTML, pantallaListaHTML, pantallaUsarHTML,
  modalHTML, confirmarEliminarHTML, confirmarUsarHTML, recorteEtiquetaHTML,
  elegirModoAgregarHTML, elegirExistenteHTML, sumarCantidadHTML,
} from './view.js';

let hilos = [];
let filtro = 'todos';
let busqueda = '';
let vista = 'lista'; // 'lista' | 'colores' | 'usar'
let filtroColor = null;

const app = document.getElementById('app');

function showToast(msg){
  const el = document.createElement('div');
  el.className = 'toast';
  el.textContent = msg;
  document.body.appendChild(el);
  setTimeout(()=> el.remove(), 2200);
}

function render(){
  if(vista === 'colores'){ renderPantallaColores(); return; }
  if(vista === 'usar'){ renderPantallaUsar(); return; }
  renderPantallaLista();
}

function renderPantallaColores(){
  const conteo = conteoPorFamilia(hilos, { filtro, busqueda });
  app.innerHTML = pantallaColoresHTML({ hilos, filtroColor, conteo });

  document.getElementById('btnVolver').addEventListener('click', ()=>{ vista = 'lista'; render(); });
  document.querySelectorAll('.color-swatch-btn').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      filtroColor = btn.dataset.color || null;
      vista = 'lista';
      render();
    });
  });
}

function renderPantallaLista(){
  const stats = computeStats(hilos);
  const list = filteredList(hilos, { filtro, busqueda, filtroColor });
  const familiaActiva = filtroColor ? FAMILIAS.find(f=>f.key===filtroColor) : null;

  app.innerHTML = pantallaListaHTML({ hilos, list, stats, filtro, busqueda, familiaActiva });

  document.getElementById('buscador').addEventListener('input', e=>{
    busqueda = e.target.value;
    render();
    document.getElementById('buscador').focus();
    const val = document.getElementById('buscador');
    val.selectionStart = val.selectionEnd = val.value.length;
  });

  document.querySelectorAll('.tab').forEach(btn=>{
    btn.addEventListener('click', ()=>{ filtro = btn.dataset.filtro; render(); });
  });

  document.querySelectorAll('.card').forEach(card=>{
    const open = ()=> openModal(card.dataset.id);
    card.addEventListener('click', open);
    card.addEventListener('keydown', e=>{ if(e.key==='Enter') open(); });
  });

  const fab = document.getElementById('fab'); if(fab) fab.addEventListener('click', abrirEleccionAgregar);
  const bt = document.getElementById('btnAgregarTop'); if(bt) bt.addEventListener('click', abrirEleccionAgregar);
  const be = document.getElementById('btnAgregarEmpty'); if(be) be.addEventListener('click', abrirEleccionAgregar);
  document.getElementById('btnColores').addEventListener('click', ()=>{ vista = 'colores'; render(); });
  document.getElementById('btnUsar').addEventListener('click', ()=>{ vista = 'usar'; render(); });
  const btnQuitarColor = document.getElementById('btnQuitarColor');
  if(btnQuitarColor) btnQuitarColor.addEventListener('click', ()=>{ filtroColor = null; render(); });
}

function renderPantallaUsar(){
  const list = filteredList(hilos, { filtro, busqueda, filtroColor });
  const familiaActiva = filtroColor ? FAMILIAS.find(f=>f.key===filtroColor) : null;

  app.innerHTML = pantallaUsarHTML({ hilos, list, filtro, busqueda, familiaActiva });

  document.getElementById('btnVolver').addEventListener('click', ()=>{ vista = 'lista'; render(); });

  document.getElementById('buscador').addEventListener('input', e=>{
    busqueda = e.target.value;
    render();
    document.getElementById('buscador').focus();
    const val = document.getElementById('buscador');
    val.selectionStart = val.selectionEnd = val.value.length;
  });

  document.querySelectorAll('.tab').forEach(btn=>{
    btn.addEventListener('click', ()=>{ filtro = btn.dataset.filtro; render(); });
  });

  const btnQuitarColor = document.getElementById('btnQuitarColor');
  if(btnQuitarColor) btnQuitarColor.addEventListener('click', ()=>{ filtroColor = null; render(); });

  document.querySelectorAll('[data-usar-id]').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      const h = hilos.find(x=>x.id===btn.dataset.usarId);
      if(h) confirmarUsar(h);
    });
  });
}

function confirmarUsar(h){
  const overlay = document.createElement('div');
  overlay.className = 'overlay';
  overlay.innerHTML = confirmarUsarHTML(h.nombre);
  document.body.appendChild(overlay);
  overlay.addEventListener('click', e=>{ if(e.target===overlay) overlay.remove(); });
  document.getElementById('btnNo').addEventListener('click', ()=> overlay.remove());
  document.getElementById('btnSi').addEventListener('click', async ()=>{
    try{
      await eliminarHilo(h.id);
      overlay.remove();
      showToast('Hilo usado: se quitó del inventario');
      // render() se dispara solo cuando Firestore confirma el cambio (onSnapshot)
    }catch(err){
      console.error(err);
      showToast('Error al eliminar el hilo.');
    }
  });
}

function abrirEleccionAgregar(){
  const overlay = document.createElement('div');
  overlay.className = 'overlay';
  overlay.innerHTML = elegirModoAgregarHTML();
  document.body.appendChild(overlay);
  overlay.addEventListener('click', e=>{ if(e.target===overlay) overlay.remove(); });

  document.getElementById('btnModoNuevo').addEventListener('click', ()=>{
    overlay.remove();
    openModal(null);
  });
  document.getElementById('btnModoExistente').addEventListener('click', ()=>{
    overlay.remove();
    abrirElegirExistente();
  });
}

function abrirElegirExistente(){
  let busquedaExistente = '';
  const overlay = document.createElement('div');
  overlay.className = 'overlay';
  document.body.appendChild(overlay);
  overlay.addEventListener('click', e=>{ if(e.target===overlay) overlay.remove(); });

  function pintar(){
    overlay.innerHTML = elegirExistenteHTML(hilos, busquedaExistente);

    const buscador = document.getElementById('buscadorExistente');
    buscador.addEventListener('input', e=>{
      busquedaExistente = e.target.value;
      pintar();
      const inp = document.getElementById('buscadorExistente');
      inp.focus();
      inp.selectionStart = inp.selectionEnd = inp.value.length;
    });

    document.getElementById('btnCancelarExistente').addEventListener('click', ()=> overlay.remove());

    document.querySelectorAll('.existente-item').forEach(btn=>{
      btn.addEventListener('click', ()=>{
        const h = hilos.find(x=>x.id===btn.dataset.id);
        overlay.remove();
        if(h) abrirSumarCantidad(h);
      });
    });
  }
  pintar();
}

function abrirSumarCantidad(h){
  const overlay = document.createElement('div');
  overlay.className = 'overlay';
  overlay.innerHTML = sumarCantidadHTML(h);
  document.body.appendChild(overlay);
  overlay.addEventListener('click', e=>{ if(e.target===overlay) overlay.remove(); });

  document.getElementById('btnCancelarSumar').addEventListener('click', ()=> overlay.remove());
  document.getElementById('btnConfirmarSumar').addEventListener('click', async ()=>{
    const extra = Number(document.getElementById('f_sumar').value) || 0;
    if(extra <= 0){ showToast('Poné una cantidad mayor a 0.'); return; }
    const data = { ...h, cantidad: (Number(h.cantidad)||0) + extra };
    try{
      await guardarHilo(data);
      overlay.remove();
      showToast(`Sumaste ${extra} ${h.unidad || ''} a "${h.nombre}"`);
      // render() se dispara solo cuando Firestore confirma el cambio (onSnapshot)
    }catch(err){
      console.error(err);
      showToast('Error al guardar. Revisá tu conexión o la configuración de Firebase.');
    }
  });
}

// Muestra la foto y deja al usuario mover/agrandar un recuadro sobre la
// etiqueta. Devuelve el recorte en píxeles de la imagen original, o null
// si el usuario prefiere omitir la lectura.
function abrirRecorte(file){
  return new Promise(resolve=>{
    const url = URL.createObjectURL(file);
    const overlay = document.createElement('div');
    overlay.className = 'overlay';
    overlay.innerHTML = recorteEtiquetaHTML(url);
    document.body.appendChild(overlay);

    const img = document.getElementById('recorteImg');
    const stage = document.getElementById('recorteStage');
    const box = document.getElementById('recorteBox');
    const handle = document.getElementById('recorteHandle');

    let natW = 0, natH = 0;
    // Coordenadas relativas [0,1] respecto al tamaño mostrado de la imagen.
    let rect = { x: 0.15, y: 0.35, w: 0.7, h: 0.3 };

    function pintarBox(){
      const sw = stage.clientWidth, sh = stage.clientHeight;
      box.style.left = (rect.x * sw) + 'px';
      box.style.top = (rect.y * sh) + 'px';
      box.style.width = (rect.w * sw) + 'px';
      box.style.height = (rect.h * sh) + 'px';
    }

    function alListo(){
      natW = img.naturalWidth;
      natH = img.naturalHeight;
      pintarBox();
    }
    if(img.complete && img.naturalWidth) alListo();
    else img.addEventListener('load', alListo);

    const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

    let modo = null; // 'mover' | 'redimensionar'
    let inicio = null;

    function empezar(m){
      return e=>{
        e.stopPropagation();
        modo = m;
        inicio = { px: e.clientX, py: e.clientY, rect: { ...rect } };
        e.target.setPointerCapture(e.pointerId);
      };
    }
    box.addEventListener('pointerdown', empezar('mover'));
    handle.addEventListener('pointerdown', empezar('redimensionar'));

    stage.addEventListener('pointermove', e=>{
      if(!modo) return;
      const sw = stage.clientWidth, sh = stage.clientHeight;
      const dx = (e.clientX - inicio.px) / sw;
      const dy = (e.clientY - inicio.py) / sh;
      if(modo === 'mover'){
        rect.x = clamp(inicio.rect.x + dx, 0, 1 - rect.w);
        rect.y = clamp(inicio.rect.y + dy, 0, 1 - rect.h);
      }else{
        rect.w = clamp(inicio.rect.w + dx, 0.08, 1 - rect.x);
        rect.h = clamp(inicio.rect.h + dy, 0.08, 1 - rect.y);
      }
      pintarBox();
    });

    const soltar = ()=>{ modo = null; };
    box.addEventListener('pointerup', soltar);
    handle.addEventListener('pointerup', soltar);
    box.addEventListener('pointercancel', soltar);
    handle.addEventListener('pointercancel', soltar);

    function cerrar(resultado){
      URL.revokeObjectURL(url);
      overlay.remove();
      resolve(resultado);
    }

    document.getElementById('btnOmitirRecorte').addEventListener('click', ()=> cerrar(null));
    document.getElementById('btnUsarRecorte').addEventListener('click', ()=>{
      if(!natW || !natH){ cerrar(null); return; }
      cerrar({
        x: Math.round(rect.x * natW),
        y: Math.round(rect.y * natH),
        w: Math.round(rect.w * natW),
        h: Math.round(rect.h * natH),
      });
    });
  });
}

function openModal(id){
  const h = id ? hilos.find(x=>x.id===id) : null;
  const overlay = document.createElement('div');
  overlay.className = 'overlay';
  overlay.innerHTML = modalHTML(h, UNIDADES);
  document.body.appendChild(overlay);

  overlay.addEventListener('click', e=>{ if(e.target === overlay) close(); });
  function close(){ overlay.remove(); }

  document.getElementById('btnCancelar').addEventListener('click', close);

  let fotoData = h?.foto || null;
  const fotoPreview = document.getElementById('fotoPreview');
  const btnQuitarFoto = document.getElementById('btnQuitarFoto');
  const fInput = document.getElementById('f_foto_input');
  const fColor = document.getElementById('f_color');

  function pintarFotoPreview(){
    if(fotoData){
      fotoPreview.innerHTML = `<img src="${esc(fotoData)}" alt="Foto del hilo">`;
      btnQuitarFoto.style.display = '';
    }else{
      fotoPreview.innerHTML = skeinSVG(fColor.value, 40);
      btnQuitarFoto.style.display = 'none';
    }
  }
  pintarFotoPreview();

  fColor.addEventListener('input', ()=>{ if(!fotoData) pintarFotoPreview(); });

  const btnFoto = document.getElementById('btnFoto');
  const fNombre = document.getElementById('f_nombre');
  btnFoto.addEventListener('click', ()=> fInput.click());

  fInput.addEventListener('change', async e=>{
    const file = e.target.files[0];
    e.target.value = '';
    if(!file) return;
    try{
      const {dataUrl, color} = await procesarFoto(file);
      fotoData = dataUrl;
      fColor.value = color;
      pintarFotoPreview();
    }catch(err){
      console.error(err);
      showToast('No se pudo procesar la foto.');
      return;
    }

    const rect = await abrirRecorte(file);
    if(!rect){
      if(!fNombre.value.trim()) fNombre.value = 'Sin nombre';
      showToast('Lectura de etiqueta omitida.');
      return;
    }

    const textoBtn = btnFoto.textContent;
    btnFoto.disabled = true;
    btnFoto.textContent = 'Leyendo etiqueta…';
    try{
      const texto = await leerEtiquetaTexto(file, rect);
      if(texto){
        if(!fNombre.value.trim()) fNombre.value = texto;
        showToast(`Etiqueta detectada: "${texto}"`);
      }else{
        if(!fNombre.value.trim()) fNombre.value = 'Sin nombre';
        showToast('No se detectó texto en la etiqueta. Se puso "Sin nombre".');
      }
    }catch(err){
      console.error(err);
      if(!fNombre.value.trim()) fNombre.value = 'Sin nombre';
      showToast('No se pudo leer la etiqueta. Se puso "Sin nombre".');
    }finally{
      btnFoto.disabled = false;
      btnFoto.textContent = textoBtn;
    }
  });

  btnQuitarFoto.addEventListener('click', ()=>{
    fotoData = null;
    pintarFotoPreview();
  });

  document.getElementById('btnGuardar').addEventListener('click', async ()=>{
    const nombre = document.getElementById('f_nombre').value.trim();
    if(!nombre){ showToast('Poné un nombre para el hilo.'); return; }
    const data = {
      id: h ? h.id : uid(),
      nombre,
      marca: document.getElementById('f_marca').value.trim(),
      tipo: document.getElementById('f_tipo').value,
      cantidad: Number(document.getElementById('f_cantidad').value) || 0,
      unidad: document.getElementById('f_unidad').value,
      color: fColor.value,
      notas: document.getElementById('f_notas').value.trim(),
      foto: fotoData,
    };
    try{
      await guardarHilo(data);
      close();
      showToast(h ? 'Hilo actualizado' : 'Hilo agregado');
      // render() se dispara solo cuando Firestore confirma el cambio (onSnapshot)
    }catch(err){
      console.error(err);
      showToast('Error al guardar. Revisá tu conexión o la configuración de Firebase.');
    }
  });

  const btnEliminar = document.getElementById('btnEliminar');
  if(btnEliminar){
    btnEliminar.addEventListener('click', ()=>{ confirmarEliminar(h.id, close); });
  }
}

function confirmarEliminar(id, closeParent){
  const overlay = document.createElement('div');
  overlay.className = 'overlay';
  overlay.innerHTML = confirmarEliminarHTML();
  document.body.appendChild(overlay);
  overlay.addEventListener('click', e=>{ if(e.target===overlay) overlay.remove(); });
  document.getElementById('btnNo').addEventListener('click', ()=> overlay.remove());
  document.getElementById('btnSi').addEventListener('click', async ()=>{
    try{
      await eliminarHilo(id);
      overlay.remove();
      closeParent();
      showToast('Hilo eliminado');
      // render() se dispara solo cuando Firestore confirma el cambio (onSnapshot)
    }catch(err){
      console.error(err);
      showToast('Error al eliminar el hilo.');
    }
  });
}

escucharCambios(
  data => { hilos = data; render(); },
  err => {
    console.error(err);
    showToast('No se pudo conectar con la base de datos. Revisá la configuración de Firebase.');
  }
);
