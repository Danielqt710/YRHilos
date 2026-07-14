// Modelo: acceso a datos (Firestore) y reglas de negocio puras.
// No toca el DOM de la aplicación ni genera HTML — de eso se encarga view.js.
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getFirestore, collection, doc, setDoc, deleteDoc, onSnapshot
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyDGuNjH-1QqW8FsnHuTV22cTMe0ahs6iLA",
  authDomain: "yrhilos.firebaseapp.com",
  projectId: "yrhilos",
  storageBucket: "yrhilos.firebasestorage.app",
  messagingSenderId: "730989476030",
  appId: "1:730989476030:web:5b96c80f1a55d6badf46ef"
};

const firebaseApp = initializeApp(firebaseConfig);
const db = getFirestore(firebaseApp);
const hilosCol = collection(db, "hilos");

export const UNIDADES = ['madejas', 'ovillos', 'conos', 'gramos', 'metros'];

export const FAMILIAS = [
  {key:'rojo', label:'Rojo', swatch:'#D8564B'},
  {key:'naranja', label:'Naranja', swatch:'#E08A47'},
  {key:'amarillo', label:'Amarillo', swatch:'#E3C15A'},
  {key:'verde', label:'Verde', swatch:'#6EAD6E'},
  {key:'celeste', label:'Celeste', swatch:'#6FB4C6'},
  {key:'azul', label:'Azul', swatch:'#5D84C7'},
  {key:'violeta', label:'Violeta', swatch:'#9A7CC7'},
  {key:'rosa', label:'Rosa', swatch:'#D67CA6'},
  {key:'marron', label:'Marrón', swatch:'#95684A'},
  {key:'gris', label:'Gris', swatch:'#A29CA8'},
  {key:'blanco', label:'Blanco', swatch:'#F4F1EC'},
  {key:'negro', label:'Negro', swatch:'#332F3A'},
];

export function uid(){
  return 'h_' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

export function hexToHsl(hex){
  const m = /^#?([0-9a-f]{6})$/i.exec(hex || '');
  if(!m) return {h:0, s:0, l:0.5};
  const num = parseInt(m[1], 16);
  const r = ((num>>16)&255)/255, g = ((num>>8)&255)/255, b = (num&255)/255;
  const max = Math.max(r,g,b), min = Math.min(r,g,b);
  const l = (max+min)/2;
  let h = 0, s = 0;
  if(max !== min){
    const d = max - min;
    s = d / (1 - Math.abs(2*l - 1));
    switch(max){
      case r: h = 60 * (((g-b)/d) % 6); break;
      case g: h = 60 * ((b-r)/d + 2); break;
      default: h = 60 * ((r-g)/d + 4);
    }
    if(h < 0) h += 360;
  }
  return {h, s, l};
}

export function colorFamilia(hex){
  const {h, s, l} = hexToHsl(hex);
  if(l >= 0.92 && s <= 0.15) return 'blanco';
  if(l <= 0.12) return 'negro';
  if(s <= 0.12) return 'gris';
  if(h < 15 || h >= 345) return 'rojo';
  if(h < 45) return l < 0.45 ? 'marron' : (h < 30 ? 'naranja' : 'amarillo');
  if(h < 65) return 'amarillo';
  if(h < 165) return 'verde';
  if(h < 200) return 'celeste';
  if(h < 255) return 'azul';
  if(h < 290) return 'violeta';
  return 'rosa';
}

// Escucha en tiempo real: cualquier cambio en Firestore (desde cualquier
// dispositivo) actualiza la lista automáticamente, sin recargar la página.
export function escucharCambios(onChange, onError){
  return onSnapshot(hilosCol, snapshot => {
    onChange(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
  }, onError);
}

export async function guardarHilo(data){
  await setDoc(doc(hilosCol, data.id), data);
}

export async function eliminarHilo(id){
  await deleteDoc(doc(hilosCol, id));
}

export function computeStats(hilos){
  const total = hilos.length;
  const tejido = hilos.filter(h=>h.tipo==='tejido').length;
  const tufting = hilos.filter(h=>h.tipo==='tufting').length;
  return {total, tejido, tufting};
}

export function filteredBase(hilos, {filtro, busqueda}){
  return hilos.filter(h=>{
    if(filtro !== 'todos' && h.tipo !== filtro) return false;
    if(busqueda){
      const q = busqueda.toLowerCase();
      const hay = (h.nombre||'').toLowerCase().includes(q) || (h.marca||'').toLowerCase().includes(q) || (h.notas||'').toLowerCase().includes(q);
      if(!hay) return false;
    }
    return true;
  });
}

export function filteredList(hilos, {filtro, busqueda, filtroColor}){
  return filteredBase(hilos, {filtro, busqueda})
    .filter(h=> !filtroColor || colorFamilia(h.color) === filtroColor)
    .sort((a,b)=> (a.nombre||'').localeCompare(b.nombre||''));
}

export function conteoPorFamilia(hilos, {filtro, busqueda}){
  const base = filteredBase(hilos, {filtro, busqueda});
  const conteo = {};
  FAMILIAS.forEach(f=> conteo[f.key] = 0);
  base.forEach(h=>{ const fam = colorFamilia(h.color); if(fam in conteo) conteo[fam]++; });
  return conteo;
}

export function fillPercent(h){
  // puramente visual: relativo a un techo razonable por unidad, para dar sensacion de nivel
  const ceilings = {madejas:20, ovillos:20, conos:10, gramos:1000, metros:500};
  const ceil = ceilings[h.unidad] || 20;
  return Math.max(6, Math.min(100, Math.round((Number(h.cantidad)||0) / ceil * 100)));
}

function cargarTesseract(){
  if(window.Tesseract) return Promise.resolve();
  if(window._tesseractLoading) return window._tesseractLoading;
  window._tesseractLoading = new Promise((resolve, reject)=>{
    const s = document.createElement('script');
    s.src = 'https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js';
    s.onload = resolve;
    s.onerror = ()=> reject(new Error('No se pudo cargar el lector de texto'));
    document.head.appendChild(s);
  });
  return window._tesseractLoading;
}

function limpiarTexto(txt){
  return (txt || '')
    .replace(/[\r\n]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 60);
}

// Convierte la foto a escala de grises con contraste estirado: la textura
// del hilo suele confundir al OCR, y esto ayuda a que la etiqueta resalte.
function preprocesarParaOCR(file){
  return new Promise((resolve, reject)=>{
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = ()=>{
      const maxDim = 1200;
      let w = img.naturalWidth, h = img.naturalHeight;
      const scale = Math.min(1, maxDim / Math.max(w, h));
      w = Math.max(1, Math.round(w * scale));
      h = Math.max(1, Math.round(h * scale));
      const canvas = document.createElement('canvas');
      canvas.width = w; canvas.height = h;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, w, h);
      URL.revokeObjectURL(url);
      try{
        const imgData = ctx.getImageData(0, 0, w, h);
        const d = imgData.data;
        const gray = new Uint8ClampedArray(d.length / 4);
        let min = 255, max = 0;
        for(let i=0, p=0; i<d.length; i+=4, p++){
          const g = 0.299*d[i] + 0.587*d[i+1] + 0.114*d[i+2];
          gray[p] = g;
          if(g < min) min = g;
          if(g > max) max = g;
        }
        const range = Math.max(1, max - min);
        for(let i=0, p=0; i<d.length; i+=4, p++){
          const v = Math.round((gray[p] - min) / range * 255);
          d[i] = d[i+1] = d[i+2] = v;
        }
        ctx.putImageData(imgData, 0, 0);
      }catch(e){ reject(e); return; }
      resolve(canvas);
    };
    img.onerror = ()=> reject(new Error('No se pudo leer la imagen'));
    img.src = url;
  });
}

export function procesarFoto(file){
  return new Promise((resolve, reject)=>{
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = ()=>{
      const maxDim = 320;
      let w = img.naturalWidth, h = img.naturalHeight;
      const scale = Math.min(1, maxDim / Math.max(w, h));
      w = Math.max(1, Math.round(w * scale));
      h = Math.max(1, Math.round(h * scale));
      const canvas = document.createElement('canvas');
      canvas.width = w; canvas.height = h;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, w, h);
      URL.revokeObjectURL(url);

      // Para el color solo miramos el recorte central: ahí suele estar el
      // hilo y no el fondo/mesa/mano, que arruinaban el promedio general.
      const cw = Math.max(1, Math.round(w * 0.5));
      const ch = Math.max(1, Math.round(h * 0.5));
      const cx = Math.round((w - cw) / 2);
      const cy = Math.round((h - ch) / 2);

      let dataUrl, data;
      try{
        dataUrl = canvas.toDataURL('image/jpeg', 0.7);
        data = ctx.getImageData(cx, cy, cw, ch).data;
      }catch(e){ reject(e); return; }

      // Agrupamos píxeles en baldes de color y nos quedamos con el más
      // frecuente (color dominante), en vez de promediar todo el recorte,
      // que da tonos grisáceos/apagados si hay brillos o sombras.
      const bucketSize = 24;
      const buckets = new Map();
      for(let i=0; i<data.length; i+=4*3){
        if(data[i+3] < 200) continue;
        const r = data[i], g = data[i+1], b = data[i+2];
        const key = (r/bucketSize|0)+','+(g/bucketSize|0)+','+(b/bucketSize|0);
        let entry = buckets.get(key);
        if(!entry){ entry = {r:0,g:0,b:0,n:0}; buckets.set(key, entry); }
        entry.r += r; entry.g += g; entry.b += b; entry.n++;
      }
      let best = null;
      for(const entry of buckets.values()){
        if(!best || entry.n > best.n) best = entry;
      }
      const color = best
        ? '#' + [best.r/best.n, best.g/best.n, best.b/best.n].map(x=> Math.round(x).toString(16).padStart(2,'0')).join('')
        : '#E3A857';
      resolve({dataUrl, color});
    };
    img.onerror = ()=> reject(new Error('No se pudo leer la imagen'));
    img.src = url;
  });
}

// Lee el texto de una etiqueta física en la foto (marca, código de color).
// Se queda solo con palabras que Tesseract reconoció con buena confianza,
// para descartar el ruido que genera la textura del hilo.
export async function leerEtiquetaTexto(file){
  await cargarTesseract();
  const canvas = await preprocesarParaOCR(file);
  const { data } = await Tesseract.recognize(canvas, 'spa');
  const palabras = (data.words || [])
    .filter(w => w.confidence >= 60 && /^[\p{L}\p{N}][\p{L}\p{N}./-]*$/u.test(w.text))
    .map(w => w.text);
  return limpiarTexto(palabras.join(' '));
}
