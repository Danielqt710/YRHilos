// Controlador: mantiene el estado de la UI, escucha eventos del DOM,
// llama al modelo (datos/lógica) y le pide a la vista el HTML a mostrar.
import {
  UNIDADES, FAMILIAS, uid,
  escucharCambios, guardarHilo, eliminarHilo,
  computeStats, filteredList, conteoPorFamilia,
  procesarFoto, leerEtiquetaTexto,
} from './model.js';
import {
  esc, skeinSVG, pantallaColoresHTML, pantallaListaHTML,
  modalHTML, confirmarEliminarHTML,
} from './view.js';

let hilos = [];
let filtro = 'todos';
let busqueda = '';
let vista = 'lista'; // 'lista' | 'colores'
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

  const fab = document.getElementById('fab'); if(fab) fab.addEventListener('click', ()=>openModal(null));
  const bt = document.getElementById('btnAgregarTop'); if(bt) bt.addEventListener('click', ()=>openModal(null));
  const be = document.getElementById('btnAgregarEmpty'); if(be) be.addEventListener('click', ()=>openModal(null));
  document.getElementById('btnColores').addEventListener('click', ()=>{ vista = 'colores'; render(); });
  const btnQuitarColor = document.getElementById('btnQuitarColor');
  if(btnQuitarColor) btnQuitarColor.addEventListener('click', ()=>{ filtroColor = null; render(); });
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

    const textoBtn = btnFoto.textContent;
    btnFoto.disabled = true;
    btnFoto.textContent = 'Leyendo etiqueta…';
    try{
      const texto = await leerEtiquetaTexto(file);
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
