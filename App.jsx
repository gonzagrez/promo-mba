import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  Cake, Calendar, Users, Trophy, Plus, X, MapPin, Clock, Heart, Baby,
  Check, Pencil, Trash2, Repeat, CircleDollarSign, ShoppingBag, UserCircle2,
  CalendarPlus, Sparkles, PartyPopper, Image as ImageIcon, MessageCircle,
  Wallet, Gavel, Target, Home, MoreHorizontal, Vote, Crown, ThumbsUp,
  ThumbsDown, Camera, Send, ArrowRight,
  LogOut, Shield, Download, Upload, Eye, EyeOff,
  Megaphone, Share2, Copy,
} from "lucide-react";
import { supabase } from "./supabaseClient";
import { LOGO_ESE } from "./logoESE";

/* ============================ Utilidades ============================ */

const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
const MESES_LARGO = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
const DIAS = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
const CATEGORIAS = {
  junta: { emoji: "🎉", label: "Junta / Fiesta", grad: "from-ese-500 to-ese-700" },
  comida: { emoji: "🍽️", label: "Comida / Cena", grad: "from-orange-400 to-rose-500" },
  deporte: { emoji: "⛳", label: "Deporte", grad: "from-emerald-400 to-teal-600" },
  viaje: { emoji: "✈️", label: "Viaje", grad: "from-cyan-400 to-blue-600" },
  networking: { emoji: "💼", label: "Networking", grad: "from-slate-500 to-slate-700" },
  otro: { emoji: "📌", label: "Otro", grad: "from-ese-500 to-indigo-600" },
};
const catDe = c => CATEGORIAS[c] || CATEGORIAS.otro;
const uid = () => Math.random().toString(36).slice(2, 10);
const pad = n => String(n).padStart(2, "0");
const clp = n => "$" + Math.round(n).toLocaleString("es-CL");
function limpiarRut(r) { return (r || "").replace(/[.\-\s]/g, "").toUpperCase(); }
function validarRut(r) {
  const s = limpiarRut(r); if (s.length < 2) return false;
  const cuerpo = s.slice(0, -1), dv = s.slice(-1);
  if (!/^\d+$/.test(cuerpo)) return false;
  let suma = 0, mul = 2;
  for (let i = cuerpo.length - 1; i >= 0; i--) { suma += parseInt(cuerpo[i]) * mul; mul = mul === 7 ? 2 : mul + 1; }
  const res = 11 - (suma % 11);
  const dvCalc = res === 11 ? "0" : res === 10 ? "K" : String(res);
  return dv === dvCalc;
}
function formatearRut(r) {
  const s = limpiarRut(r); if (s.length < 2) return r;
  return s.slice(0, -1).replace(/\B(?=(\d{3})+(?!\d))/g, ".") + "-" + s.slice(-1);
}

function parseFecha(str) {
  if (!str) return null;
  const [y, m, d] = str.split("-").map(Number);
  if (!m || !d) return null;
  return { y: y || null, m, d };
}
function proximoCumple(str) {
  const f = parseFecha(str); if (!f) return null;
  const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
  let next = new Date(hoy.getFullYear(), f.m - 1, f.d);
  if (next < hoy) next = new Date(hoy.getFullYear() + 1, f.m - 1, f.d);
  return { fecha: next, dias: Math.round((next - hoy) / 86400000), edad: f.y ? next.getFullYear() - f.y : null, m: f.m, d: f.d };
}
function fechaHora(fecha, hora) {
  const f = parseFecha(fecha); if (!f) return null;
  const d = new Date(f.y || new Date().getFullYear(), f.m - 1, f.d);
  if (hora) { const [hh, mm] = hora.split(":"); d.setHours(+hh, +mm, 0, 0); }
  return d;
}
function proximaOcurrencia(ev) {
  const base = fechaHora(ev.fecha, ev.hora); if (!base) return null;
  const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
  if (!ev.recurrente) return base;
  const cursor = new Date(base); cursor.setHours(0, 0, 0, 0);
  while (cursor < hoy) {
    if (ev.frecuencia === "semanal") { base.setDate(base.getDate() + 7); cursor.setDate(cursor.getDate() + 7); }
    else if (ev.frecuencia === "mensual") { base.setMonth(base.getMonth() + 1); cursor.setMonth(cursor.getMonth() + 1); }
    else { base.setFullYear(base.getFullYear() + 1); cursor.setFullYear(cursor.getFullYear() + 1); }
  }
  return base;
}
function esPasado(ev) {
  if (ev.recurrente || ev.esPropuesta) return false;
  const d = fechaHora(ev.fecha, ev.hora); if (!d) return false;
  return d < new Date();
}
const diasHasta = date => Math.round((new Date(date).setHours(0, 0, 0, 0) - new Date().setHours(0, 0, 0, 0)) / 86400000);
function etiquetaDias(dias) {
  if (dias === 0) return "¡Hoy!";
  if (dias === 1) return "Mañana";
  if (dias < 0) return `Hace ${-dias} días`;
  return `En ${dias} días`;
}
function cuentaRegresiva(fecha, ahora) {
  const ms = fecha - ahora;
  if (ms <= 0) return "¡Es ahora! 🎊";
  const d = Math.floor(ms / 86400000), h = Math.floor((ms % 86400000) / 3600000), m = Math.floor((ms % 3600000) / 60000);
  if (d >= 1) return `Faltan ${d} ${d === 1 ? "día" : "días"} y ${h} h`;
  if (h >= 1) return `Faltan ${h} h ${m} min`;
  return `Faltan ${m} min`;
}
function fmtTiempo(ts) {
  const diff = (Date.now() - ts) / 1000;
  if (diff < 60) return "recién";
  if (diff < 3600) return `hace ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `hace ${Math.floor(diff / 3600)} h`;
  const d = new Date(ts);
  return `${d.getDate()} ${MESES[d.getMonth()]}`;
}

/* Exportar a calendario */
function fmtCal(date, conHora) {
  const base = `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}`;
  return conHora ? `${base}T${pad(date.getHours())}${pad(date.getMinutes())}00` : base;
}
function rangoFechas(ev) {
  const occ = proximaOcurrencia(ev); if (!occ) return null;
  if (ev.hora) { const fin = new Date(occ); fin.setHours(fin.getHours() + 2); return { inicio: fmtCal(occ, true), fin: fmtCal(fin, true), conHora: true }; }
  const fin = new Date(occ); fin.setDate(fin.getDate() + 1); return { inicio: fmtCal(occ, false), fin: fmtCal(fin, false), conHora: false };
}
function descargarICS(ev) {
  const r = rangoFechas(ev); if (!r) return;
  const rrule = ev.recurrente ? `\nRRULE:FREQ=${{ semanal: "WEEKLY", mensual: "MONTHLY", anual: "YEARLY" }[ev.frecuencia]}` : "";
  const ics = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//RedPromo//ES", "BEGIN:VEVENT", `UID:${ev.id}@redpromo`, `DTSTAMP:${fmtCal(new Date(), true)}`,
    r.conHora ? `DTSTART:${r.inicio}` : `DTSTART;VALUE=DATE:${r.inicio}`, r.conHora ? `DTEND:${r.fin}` : `DTEND;VALUE=DATE:${r.fin}`,
    `SUMMARY:${ev.titulo}`, ev.lugar ? `LOCATION:${ev.lugar}` : "", ev.desc ? `DESCRIPTION:${ev.desc}` : "", rrule.trim(), "END:VEVENT", "END:VCALENDAR"].filter(Boolean).join("\n");
  try {
    const url = URL.createObjectURL(new Blob([ics], { type: "text/calendar;charset=utf-8" }));
    const a = document.createElement("a"); a.href = url; a.download = `${ev.titulo}.ics`; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  } catch (e) { console.error(e); }
}
function googleCalUrl(ev) {
  const r = rangoFechas(ev); if (!r) return "#";
  const p = new URLSearchParams({ action: "TEMPLATE", text: ev.titulo, dates: `${r.inicio}/${r.fin}`, location: ev.lugar || "", details: ev.desc || "" });
  if (ev.recurrente) p.append("recur", `RRULE:FREQ=${{ semanal: "WEEKLY", mensual: "MONTHLY", anual: "YEARLY" }[ev.frecuencia]}`);
  return `https://calendar.google.com/calendar/render?${p.toString()}`;
}

/* Comprimir imagen antes de guardar */
function comprimirImagen(file, maxLado = 900, calidad = 0.55) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = e => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        if (width > height && width > maxLado) { height = height * maxLado / width; width = maxLado; }
        else if (height > maxLado) { width = width * maxLado / height; height = maxLado; }
        const c = document.createElement("canvas"); c.width = width; c.height = height;
        c.getContext("2d").drawImage(img, 0, 0, width, height);
        resolve(c.toDataURL("image/jpeg", calidad));
      };
      img.onerror = reject; img.src = e.target.result;
    };
    reader.onerror = reject; reader.readAsDataURL(file);
  });
}

/* Puntaje ranking */
function puntaje(member, events) {
  const pasados = events.filter(esPasado);
  let creados = 0, asistidos = 0, ausente = 0, pendiente = 0, anfitrion = 0;
  events.forEach(ev => { if (ev.creadoPor === member.id) creados++; if (ev.anfitrion === member.id) anfitrion++; });
  pasados.forEach(ev => {
    if ((ev.asistentes || []).includes(member.id)) asistidos++;
    else if ((ev.noVan || []).includes(member.id)) ausente++;
    else pendiente++;
  });
  const totalPasados = pasados.length;
  const pct = totalPasados ? Math.round(asistidos / totalPasados * 100) : 0;
  return { creados, asistidos, ausente, pendiente, anfitrion, totalPasados, pct, total: creados * 20 + asistidos * 10 + anfitrion * 30 };
}

/* Deudas: quién le debe a quién */
function calcularCuentas(gastos, members) {
  const bal = {}; members.forEach(m => bal[m.id] = 0);
  gastos.forEach(g => {
    const parts = (g.participantes && g.participantes.length) ? g.participantes : members.map(m => m.id);
    const cuota = g.monto / parts.length;
    if (bal[g.pagadoPor] !== undefined) bal[g.pagadoPor] += g.monto;
    parts.forEach(p => { if (bal[p] !== undefined) bal[p] -= cuota; });
  });
  const deudores = [], acreedores = [];
  Object.entries(bal).forEach(([id, v]) => { if (v < -1) deudores.push({ id, v: -v }); else if (v > 1) acreedores.push({ id, v }); });
  deudores.sort((a, b) => b.v - a.v); acreedores.sort((a, b) => b.v - a.v);
  const deudas = []; let i = 0, j = 0;
  while (i < deudores.length && j < acreedores.length) {
    const monto = Math.min(deudores[i].v, acreedores[j].v);
    deudas.push({ de: deudores[i].id, a: acreedores[j].id, monto });
    deudores[i].v -= monto; acreedores[j].v -= monto;
    if (deudores[i].v < 1) i++; if (acreedores[j].v < 1) j++;
  }
  return { bal, deudas, total: gastos.reduce((s, g) => s + g.monto, 0) };
}

/* Votación 2/3 en 1 semana */
function estadoVotacion(v) {
  const si = (v.votosSi || []).length, no = (v.votosNo || []).length, emitidos = si + no;
  const cerrada = new Date() > new Date(v.cierra);
  const aprobada = emitidos > 0 && si / emitidos >= 2 / 3;
  return { si, no, emitidos, cerrada, aprobada, pctSi: emitidos ? Math.round(si / emitidos * 100) : 0 };
}

/* Autenticación y respaldo */
async function hashPass(username, password) {
  const txt = "redpromo::" + (username || "").toLowerCase() + "::" + password;
  try {
    const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(txt));
    return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("");
  } catch {
    let h = 0; for (let i = 0; i < txt.length; i++) h = (h * 31 + txt.charCodeAt(i)) | 0;
    return "f" + (h >>> 0).toString(16);
  }
}
function descargarJSON(obj, nombre) {
  try {
    const url = URL.createObjectURL(new Blob([JSON.stringify(obj, null, 2)], { type: "application/json" }));
    const a = document.createElement("a"); a.href = url; a.download = nombre; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  } catch (e) { console.error(e); }
}

/* ============================ Base ============================ */
const PALETA = ["bg-ese-100 text-ese-700", "bg-oro-100 text-oro-700", "bg-amber-100 text-amber-700", "bg-emerald-100 text-emerald-700", "bg-cyan-100 text-cyan-700", "bg-rose-100 text-rose-700", "bg-indigo-100 text-indigo-700", "bg-orange-100 text-orange-700"];
function tonoDe(nombre) { let h = 0; for (let i = 0; i < (nombre || "").length; i++) h = (h * 31 + nombre.charCodeAt(i)) % 997; return PALETA[h % PALETA.length]; }
function Avatar({ nombre, size = 40 }) {
  const ini = (nombre || "?").split(" ").filter(Boolean).slice(0, 2).map(p => p[0]?.toUpperCase()).join("");
  return <div className={`shrink-0 rounded-full flex items-center justify-center font-bold ${tonoDe(nombre)}`} style={{ width: size, height: size, fontSize: size * 0.4 }}>{ini}</div>;
}
function Modal({ children, onClose, titulo }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/50 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white w-full sm:max-w-lg sm:rounded-3xl rounded-t-3xl max-h-[92vh] overflow-y-auto shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="sticky top-0 bg-white/95 backdrop-blur border-b border-slate-100 px-5 py-4 flex items-center justify-between">
          <h3 className="font-bold text-lg text-slate-800">{titulo}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 p-1"><X size={20} /></button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}
function Campo({ label, children }) {
  return <label className="block mb-3"><span className="block text-xs font-semibold text-slate-500 mb-1 uppercase tracking-wide">{label}</span>{children}</label>;
}
const inputCls = "w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-ese-400 focus:border-ese-400";
const btnPrim = "w-full bg-gradient-to-r from-ese-700 to-ese-500 text-white rounded-xl py-2.5 text-sm font-bold shadow-md";
function Vacio({ emoji, texto }) {
  return <div className="bg-white rounded-3xl border-2 border-dashed border-slate-200 p-10 text-center"><p className="text-4xl mb-3">{emoji}</p><p className="text-sm text-slate-400 max-w-xs mx-auto">{texto}</p></div>;
}

/* ============================ Formularios ============================ */
function MemberForm({ inicial, onSave, onClose }) {
  const [nombre, setNombre] = useState(inicial?.nombre || "");
  const [email, setEmail] = useState(inicial?.email || "");
  const [telefono, setTelefono] = useState(inicial?.telefono || "");
  const [cumple, setCumple] = useState(inicial?.cumple || "");
  const [cn, setCn] = useState(inicial?.conyuge?.nombre || "");
  const [cc, setCc] = useState(inicial?.conyuge?.cumple || "");
  const [hijos, setHijos] = useState(inicial?.hijos || []);
  const addH = () => setHijos([...hijos, { id: uid(), nombre: "", cumple: "" }]);
  const setH = (id, k, v) => setHijos(hijos.map(h => h.id === id ? { ...h, [k]: v } : h));
  function guardar() {
    if (!nombre.trim()) return;
    onSave({ id: inicial?.id || uid(), nombre: nombre.trim(), email: email.trim(), telefono: telefono.trim(), cumple, conyuge: cn.trim() ? { nombre: cn.trim(), cumple: cc } : null, hijos: hijos.filter(h => h.nombre.trim()) });
    onClose();
  }
  return (
    <>
      <Campo label="Nombre completo"><input className={inputCls} value={nombre} onChange={e => setNombre(e.target.value)} placeholder="Ej: Gonzalo Grez" /></Campo>
      <div className="flex gap-2">
        <div className="flex-1"><Campo label="Email"><input className={inputCls} value={email} onChange={e => setEmail(e.target.value)} placeholder="correo@ejemplo.com" /></Campo></div>
        <div className="w-36"><Campo label="Teléfono"><input className={inputCls} value={telefono} onChange={e => setTelefono(e.target.value)} placeholder="+56 9…" /></Campo></div>
      </div>
      <Campo label="🎂 Cumpleaños"><input type="date" className={inputCls} value={cumple} onChange={e => setCumple(e.target.value)} /></Campo>
      <div className="mt-3 mb-2 flex items-center gap-2 text-slate-700"><Heart size={15} className="text-rose-500" /><span className="text-sm font-semibold">Pareja</span></div>
      <Campo label="Nombre de la pareja"><input className={inputCls} value={cn} onChange={e => setCn(e.target.value)} placeholder="Opcional" /></Campo>
      {cn.trim() && <Campo label="🎂 Cumpleaños de la pareja"><input type="date" className={inputCls} value={cc} onChange={e => setCc(e.target.value)} /></Campo>}
      <div className="mt-3 mb-2 flex items-center justify-between"><div className="flex items-center gap-2 text-slate-700"><Baby size={15} className="text-amber-500" /><span className="text-sm font-semibold">Hijos</span></div><button onClick={addH} className="text-xs text-ese-700 font-semibold flex items-center gap-1"><Plus size={13} /> Agregar</button></div>
      {hijos.map(h => (
        <div key={h.id} className="flex gap-2 mb-2 items-center">
          <input className={inputCls} value={h.nombre} onChange={e => setH(h.id, "nombre", e.target.value)} placeholder="Nombre" />
          <input type="date" className={inputCls + " max-w-[9rem]"} value={h.cumple} onChange={e => setH(h.id, "cumple", e.target.value)} />
          <button onClick={() => setHijos(hijos.filter(x => x.id !== h.id))} className="text-slate-300 hover:text-rose-500"><Trash2 size={16} /></button>
        </div>
      ))}
      <button onClick={guardar} className={btnPrim + " mt-4"}>{inicial ? "Guardar cambios" : "Agregar miembro"}</button>
    </>
  );
}

function EventForm({ inicial, members = [], onSave, onClose }) {
  const [titulo, setTitulo] = useState(inicial?.titulo || "");
  const [categoria, setCategoria] = useState(inicial?.categoria || "junta");
  const [votar, setVotar] = useState(inicial?.esPropuesta || false);
  const [fecha, setFecha] = useState(inicial?.fecha || "");
  const [hora, setHora] = useState(inicial?.hora || "");
  const [opciones, setOpciones] = useState(inicial?.opcionesFecha || [{ id: uid(), fecha: "", hora: "" }, { id: uid(), fecha: "", hora: "" }]);
  const [lugar, setLugar] = useState(inicial?.lugar || "");
  const [anfitrion, setAnfitrion] = useState(inicial?.anfitrion || "");
  const [desc, setDesc] = useState(inicial?.desc || "");
  const [recurrente, setRecurrente] = useState(inicial?.recurrente || false);
  const [frecuencia, setFrecuencia] = useState(inicial?.frecuencia || "anual");
  const [cuota, setCuota] = useState(inicial?.cuota || "");
  const [aportes, setAportes] = useState(inicial?.aportes || []);
  const setOpc = (id, k, v) => setOpciones(opciones.map(o => o.id === id ? { ...o, [k]: v } : o));
  function guardar() {
    if (!titulo.trim()) return;
    if (votar) {
      const ops = opciones.filter(o => o.fecha).map(o => ({ ...o, votos: o.votos || [] }));
      if (ops.length < 2) return;
      onSave({ id: inicial?.id || uid(), titulo: titulo.trim(), categoria, esPropuesta: true, opcionesFecha: ops, lugar: lugar.trim(), desc: desc.trim(), cuota: cuota ? Number(cuota) : 0, aportes: aportes.filter(a => a.item.trim()), asistentes: [], noVan: [], pagos: [], gastos: inicial?.gastos || [], creadoPor: inicial?.creadoPor, anfitrion: anfitrion || null });
    } else {
      if (!fecha) return;
      onSave({ id: inicial?.id || uid(), titulo: titulo.trim(), categoria, fecha, hora, lugar: lugar.trim(), desc: desc.trim(), recurrente, frecuencia, cuota: cuota ? Number(cuota) : 0, aportes: aportes.filter(a => a.item.trim()), asistentes: inicial?.asistentes || [], noVan: inicial?.noVan || [], pagos: inicial?.pagos || [], gastos: inicial?.gastos || [], creadoPor: inicial?.creadoPor, anfitrion: anfitrion || null });
    }
    onClose();
  }
  return (
    <>
      <Campo label="Nombre del evento"><input className={inputCls} value={titulo} onChange={e => setTitulo(e.target.value)} placeholder="Ej: Asado de la promo" /></Campo>
      <Campo label="Categoría">
        <div className="grid grid-cols-3 gap-2">
          {Object.entries(CATEGORIAS).map(([k, c]) => (
            <button key={k} onClick={() => setCategoria(k)} className={`rounded-xl py-2 text-xs font-semibold border-2 flex flex-col items-center gap-0.5 ${categoria === k ? "border-ese-500 bg-ese-50 text-ese-700" : "border-slate-100 text-slate-500"}`}><span className="text-lg">{c.emoji}</span>{c.label}</button>
          ))}
        </div>
      </Campo>
      {!inicial && (
        <button onClick={() => setVotar(!votar)} className={`mb-3 flex items-center gap-2 text-sm px-3 py-1.5 rounded-xl border-2 ${votar ? "border-ese-500 bg-ese-50 text-ese-700" : "border-slate-200 text-slate-500"}`}><Vote size={14} /> Proponer fechas para votar</button>
      )}
      {votar ? (
        <Campo label="🗳️ Opciones de fecha (la más votada gana)">
          {opciones.map((o, i) => (
            <div key={o.id} className="flex gap-2 mb-2 items-center">
              <span className="text-xs text-slate-400 w-4">{i + 1}</span>
              <input type="date" className={inputCls} value={o.fecha} onChange={e => setOpc(o.id, "fecha", e.target.value)} />
              <input type="time" className={inputCls + " max-w-[7rem]"} value={o.hora} onChange={e => setOpc(o.id, "hora", e.target.value)} />
            </div>
          ))}
          <button onClick={() => setOpciones([...opciones, { id: uid(), fecha: "", hora: "" }])} className="text-xs text-ese-700 font-semibold flex items-center gap-1"><Plus size={13} /> Otra opción</button>
        </Campo>
      ) : (
        <div className="flex gap-2">
          <div className="flex-1"><Campo label="Fecha"><input type="date" className={inputCls} value={fecha} onChange={e => setFecha(e.target.value)} /></Campo></div>
          <div className="w-32"><Campo label="Hora"><input type="time" className={inputCls} value={hora} onChange={e => setHora(e.target.value)} /></Campo></div>
        </div>
      )}
      <Campo label="Lugar"><input className={inputCls} value={lugar} onChange={e => setLugar(e.target.value)} placeholder="Ej: Casa de Gonzalo" /></Campo>
      <Campo label="🏠 ¿Quién presta el local? (suma +30 pts)">
        <select className={inputCls} value={anfitrion} onChange={e => setAnfitrion(e.target.value)}>
          <option value="">Nadie / por definir</option>
          {members.map(m => <option key={m.id} value={m.id}>{m.nombre}</option>)}
        </select>
      </Campo>
      <Campo label="Descripción"><textarea className={inputCls} rows={2} value={desc} onChange={e => setDesc(e.target.value)} /></Campo>
      {!votar && (
        <div className="flex items-center gap-3 mb-3">
          <button onClick={() => setRecurrente(!recurrente)} className={`flex items-center gap-2 text-sm px-3 py-1.5 rounded-xl border-2 ${recurrente ? "border-ese-500 bg-ese-50 text-ese-700" : "border-slate-200 text-slate-500"}`}><Repeat size={14} /> Recurrente</button>
          {recurrente && <select className={inputCls + " max-w-[10rem]"} value={frecuencia} onChange={e => setFrecuencia(e.target.value)}><option value="semanal">Cada semana</option><option value="mensual">Cada mes</option><option value="anual">Cada año</option></select>}
        </div>
      )}
      <Campo label="💸 Cuota por persona (CLP)"><input type="number" className={inputCls} value={cuota} onChange={e => setCuota(e.target.value)} placeholder="0 si no aplica" /></Campo>
      <div className="mt-1 mb-2 flex items-center justify-between"><div className="flex items-center gap-2 text-slate-700"><ShoppingBag size={15} className="text-emerald-600" /><span className="text-sm font-semibold">¿Qué llevar?</span></div><button onClick={() => setAportes([...aportes, { id: uid(), item: "", asignadoA: null }])} className="text-xs text-ese-700 font-semibold flex items-center gap-1"><Plus size={13} /> Agregar</button></div>
      {aportes.map(a => (
        <div key={a.id} className="flex gap-2 mb-2 items-center">
          <input className={inputCls} value={a.item} onChange={e => setAportes(aportes.map(x => x.id === a.id ? { ...x, item: e.target.value } : x))} placeholder="Ej: Carne, bebidas…" />
          <button onClick={() => setAportes(aportes.filter(x => x.id !== a.id))} className="text-slate-300 hover:text-rose-500"><Trash2 size={16} /></button>
        </div>
      ))}
      <button onClick={guardar} className={btnPrim + " mt-4"}>{inicial ? "Guardar cambios" : votar ? "Abrir votación 🗳️" : "Crear evento 🎉"}</button>
    </>
  );
}

/* ============================ Cuentas del evento (división de gastos) ============================ */
function CuentasModal({ ev, members, meId, onClose, onSave }) {
  const [gastos, setGastos] = useState(ev.gastos || []);
  const [desc, setDesc] = useState("");
  const [monto, setMonto] = useState("");
  const [pagadoPor, setPagadoPor] = useState(meId || (members[0]?.id || ""));
  const nombreDe = id => members.find(m => m.id === id)?.nombre || "—";
  const asistentes = ev.asistentes && ev.asistentes.length ? ev.asistentes : members.map(m => m.id);

  function addGasto() {
    if (!desc.trim() || !monto || !pagadoPor) return;
    const g = { id: uid(), desc: desc.trim(), monto: Number(monto), pagadoPor, participantes: asistentes };
    const next = [...gastos, g]; setGastos(next); onSave({ ...ev, gastos: next });
    setDesc(""); setMonto("");
  }
  function delGasto(id) { const next = gastos.filter(g => g.id !== id); setGastos(next); onSave({ ...ev, gastos: next }); }
  const { deudas, total } = useMemo(() => calcularCuentas(gastos, members.filter(m => asistentes.includes(m.id))), [gastos, members, asistentes]);

  return (
    <Modal titulo={`💰 Cuentas · ${ev.titulo}`} onClose={onClose}>
      <p className="text-xs text-slate-400 mb-3">Los gastos se dividen entre quienes van al evento ({asistentes.length} personas).</p>
      <div className="bg-slate-50 rounded-2xl p-3 mb-4">
        <p className="text-xs font-semibold text-slate-500 mb-2">Agregar gasto</p>
        <input className={inputCls + " mb-2"} value={desc} onChange={e => setDesc(e.target.value)} placeholder="Ej: Carne y bebidas" />
        <div className="flex gap-2">
          <input type="number" className={inputCls} value={monto} onChange={e => setMonto(e.target.value)} placeholder="Monto CLP" />
          <select className={inputCls} value={pagadoPor} onChange={e => setPagadoPor(e.target.value)}>{members.map(m => <option key={m.id} value={m.id}>{m.nombre.split(" ")[0]}</option>)}</select>
        </div>
        <button onClick={addGasto} className={btnPrim + " mt-2"}>Agregar gasto</button>
      </div>
      {gastos.length > 0 && (
        <>
          <div className="flex items-center justify-between mb-2"><p className="text-xs font-semibold text-slate-500">Gastos ({clp(total)} total)</p></div>
          <div className="space-y-1 mb-4">
            {gastos.map(g => (
              <div key={g.id} className="flex items-center justify-between text-sm bg-white border border-slate-100 rounded-xl px-3 py-2">
                <div><p className="text-slate-700">{g.desc}</p><p className="text-[11px] text-slate-400">Pagó {nombreDe(g.pagadoPor).split(" ")[0]}</p></div>
                <div className="flex items-center gap-2"><span className="font-semibold text-slate-700">{clp(g.monto)}</span><button onClick={() => delGasto(g.id)} className="text-slate-300 hover:text-rose-500"><Trash2 size={14} /></button></div>
              </div>
            ))}
          </div>
          <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl p-3 text-white">
            <p className="text-sm font-bold mb-2 flex items-center gap-1.5"><Wallet size={15} /> Quién le debe a quién</p>
            {deudas.length === 0 ? <p className="text-xs text-white/85">Todo saldado ✨</p> : (
              <div className="space-y-1.5">
                {deudas.map((d, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm bg-white/15 rounded-xl px-3 py-1.5">
                    <span className="font-semibold">{nombreDe(d.de).split(" ")[0]}</span>
                    <ArrowRight size={14} className="text-white/70" />
                    <span className="font-semibold">{nombreDe(d.a).split(" ")[0]}</span>
                    <span className="ml-auto font-bold">{clp(d.monto)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </Modal>
  );
}

/* ============================ Calendario btns ============================ */
function BotonesCalendario({ ev, compacto }) {
  const cls = compacto ? "text-xs px-3 py-1.5 bg-white/20 text-white" : "text-xs px-3 py-1.5 bg-slate-100 text-slate-700 hover:bg-slate-200";
  return (
    <div className="flex gap-2">
      <button onClick={() => descargarICS(ev)} className={`flex items-center gap-1.5 rounded-full font-semibold ${cls}`}><CalendarPlus size={13} /> .ics</button>
      <a href={googleCalUrl(ev)} target="_blank" rel="noopener noreferrer" className={`flex items-center gap-1.5 rounded-full font-semibold ${cls}`}><Calendar size={13} /> Google</a>
    </div>
  );
}

/* ============================ Inicio ============================ */
function BarraAsist({ confirmados, total }) {
  const pct = total ? Math.round(confirmados / total * 100) : 0;
  return (
    <div>
      <div className="flex justify-between text-xs text-white/80 mb-1"><span>{confirmados} de {total} confirmaron</span><span>{pct}%</span></div>
      <div className="h-2 bg-white/25 rounded-full overflow-hidden"><div className="h-full bg-white rounded-full" style={{ width: `${pct}%` }} /></div>
    </div>
  );
}
function HeroEvento({ ev, ahora, meId, members, setEstado, setAnfitrion }) {
  const cat = catDe(ev.categoria), occ = ev.occ;
  const voy = (ev.asistentes || []).includes(meId), noVoy = (ev.noVan || []).includes(meId);
  const nombreDe = id => members.find(m => m.id === id)?.nombre?.split(" ")[0] || "";
  return (
    <div className={`rounded-3xl p-5 text-white bg-gradient-to-br ${cat.grad} shadow-lg relative overflow-hidden`}>
      <div className="absolute -right-4 -top-4 text-8xl opacity-20 select-none">{cat.emoji}</div>
      <p className="text-xs font-bold uppercase tracking-wider text-white/80 flex items-center gap-1"><Sparkles size={12} /> Próxima juntación</p>
      <h2 className="text-2xl font-extrabold mt-1">{cat.emoji} {ev.titulo}</h2>
      <p className="text-sm text-white/90 mt-1 capitalize">{DIAS[occ.getDay()]} {occ.getDate()} de {MESES_LARGO[occ.getMonth()]}{ev.hora ? ` · ${ev.hora}` : ""}</p>
      {ev.lugar && <p className="text-sm text-white/80 flex items-center gap-1"><MapPin size={13} /> {ev.lugar}</p>}
      <div className="mt-3 inline-block bg-white/20 rounded-full px-4 py-1.5 text-sm font-bold">⏳ {cuentaRegresiva(occ, ahora)}</div>
      <div className="mt-3"><BarraAsist confirmados={(ev.asistentes || []).length} total={members.length} /></div>
      <p className="text-xs text-white/80 mt-2">{ev.anfitrion ? `🏠 Anfitrión: ${nombreDe(ev.anfitrion)}` : "⚠️ Sin anfitrión asignado"}{!ev.anfitrion && meId && <button onClick={() => setAnfitrion(ev.id, meId)} className="ml-2 underline font-semibold">Ser anfitrión</button>}</p>
      <div className="flex flex-wrap items-center gap-2 mt-4">
        <button onClick={() => meId && setEstado(ev.id, "voy")} disabled={!meId} className={`text-sm font-bold px-4 py-2 rounded-full flex items-center gap-1.5 ${voy ? "bg-white text-slate-800" : "bg-white/25 text-white hover:bg-white/35"} ${!meId && "opacity-60"}`}><Check size={15} /> Voy</button>
        <button onClick={() => meId && setEstado(ev.id, "no")} disabled={!meId} className={`text-sm font-bold px-4 py-2 rounded-full ${noVoy ? "bg-slate-800 text-white" : "bg-white/15 text-white hover:bg-white/25"} ${!meId && "opacity-60"}`}>No voy</button>
        <BotonesCalendario ev={ev} compacto />
      </div>
    </div>
  );
}
function Inicio({ members, events, meId, ahora, setTab, setEstado, setAnfitrion }) {
  const futuros = useMemo(() => events.filter(e => !e.esPropuesta).map(ev => ({ ...ev, occ: proximaOcurrencia(ev) })).filter(ev => ev.occ && ev.occ >= new Date(new Date().setHours(0, 0, 0, 0))).sort((a, b) => a.occ - b.occ), [events]);
  const siguiente = futuros[0], resto = futuros.slice(1, 4);
  const miAsist = meId ? puntaje(members.find(m => m.id === meId) || {}, events) : null;
  const cumples = useMemo(() => {
    const arr = [];
    members.forEach(mem => {
      if (mem.cumple) { const p = proximoCumple(mem.cumple); if (p) arr.push({ nombre: mem.nombre, rel: "socio/a", emoji: "🎂", ...p }); }
      if (mem.conyuge?.cumple) { const p = proximoCumple(mem.conyuge.cumple); if (p) arr.push({ nombre: mem.conyuge.nombre, rel: `pareja de ${mem.nombre.split(" ")[0]}`, emoji: "💗", ...p }); }
      (mem.hijos || []).forEach(h => { if (h.cumple) { const p = proximoCumple(h.cumple); if (p) arr.push({ nombre: h.nombre, rel: `hijo/a de ${mem.nombre.split(" ")[0]}`, emoji: "🧒", ...p }); } });
    });
    return arr.sort((a, b) => a.dias - b.dias).slice(0, 3);
  }, [members]);

  return (
    <div className="space-y-6">
      {siguiente ? <HeroEvento ev={siguiente} ahora={ahora} meId={meId} members={members} setEstado={setEstado} setAnfitrion={setAnfitrion} /> :
        <div className="rounded-3xl p-8 text-center bg-gradient-to-br from-ese-600 to-ese-400 text-white"><p className="text-4xl mb-2">🎈</p><p className="font-bold text-lg">Aún no hay juntas agendadas</p><button onClick={() => setTab("eventos")} className="mt-3 bg-white text-ese-700 font-bold text-sm px-4 py-2 rounded-full">Crear evento</button></div>}

      {miAsist && miAsist.totalPasados > 0 && (
        <div className="bg-white rounded-2xl border border-slate-100 p-4">
          <p className="text-sm font-bold text-slate-700 mb-1">📊 Mi asistencia</p>
          <div className="flex justify-between text-xs text-slate-400 mb-1"><span>{miAsist.asistidos} de {miAsist.totalPasados} juntas</span><span className="font-bold text-ese-600">{miAsist.pct}%</span></div>
          <div className="h-2 bg-slate-100 rounded-full overflow-hidden"><div className="h-full bg-gradient-to-r from-ese-600 to-ese-400" style={{ width: `${miAsist.pct}%` }} /></div>
        </div>
      )}

      {resto.length > 0 && (
        <section>
          <h3 className="font-bold text-slate-700 mb-2">📅 También se viene</h3>
          <div className="space-y-2">{resto.map(ev => { const cat = catDe(ev.categoria); return (
            <button key={ev.id} onClick={() => setTab("eventos")} className="w-full bg-white rounded-2xl border border-slate-100 p-3 flex items-center gap-3 text-left hover:border-ese-200">
              <div className="text-2xl">{cat.emoji}</div><div className="min-w-0 flex-1"><p className="text-sm font-semibold text-slate-800 truncate">{ev.titulo}</p><p className="text-xs text-slate-400 capitalize">{DIAS[ev.occ.getDay()]} {ev.occ.getDate()} {MESES[ev.occ.getMonth()]}</p></div>
              <span className="text-xs font-bold text-ese-600">{etiquetaDias(diasHasta(ev.occ))}</span>
            </button>); })}</div>
        </section>
      )}

      <section>
        <div className="flex items-center justify-between mb-2"><h3 className="font-bold text-slate-700">🎂 Próximos cumpleaños</h3><button onClick={() => setTab("cumples")} className="text-xs text-ese-600 font-semibold">Ver todos →</button></div>
        {cumples.length === 0 ? <p className="text-sm text-slate-400 bg-white rounded-2xl border border-slate-100 p-4">Agrega miembros para ver cumpleaños.</p> :
          <div className="space-y-2">{cumples.map((c, i) => (
            <div key={i} className="bg-white rounded-2xl border border-slate-100 p-3 flex items-center gap-3"><div className="text-2xl">{c.emoji}</div><div className="min-w-0 flex-1"><p className="text-sm font-semibold text-slate-800 truncate">{c.nombre}</p><p className="text-xs text-slate-400">{c.rel}</p></div><span className={`text-xs font-bold ${c.dias <= 7 ? "text-oro-600" : "text-slate-400"}`}>{etiquetaDias(c.dias)}</span></div>
          ))}</div>}
      </section>
    </div>
  );
}

/* ============================ Muro / Feed ============================ */
function Muro({ posts, members, meId, onPost, onLike, onComentar, onBorrar }) {
  const [texto, setTexto] = useState("");
  const [foto, setFoto] = useState(null);
  const [subiendo, setSubiendo] = useState(false);
  const [categoria, setCategoria] = useState("general");
  const [filtro, setFiltro] = useState("todos");
  const fileRef = useRef();
  const yo = members.find(m => m.id === meId);

  async function elegirFoto(e) {
    const f = e.target.files[0]; if (!f) return;
    setSubiendo(true);
    try { setFoto(await comprimirImagen(f)); } catch { alert("No se pudo procesar la imagen."); }
    setSubiendo(false);
  }
  function publicar() {
    if (!texto.trim() && !foto) return;
    onPost({ id: uid(), autor: meId, texto: texto.trim(), foto, categoria, fecha: Date.now(), likes: [], comentarios: [] });
    setTexto(""); setFoto(null); setCategoria("general");
  }
  const lista = posts.slice().filter(p => filtro === "todos" ? true : p.categoria === "comunicado").sort((a, b) => b.fecha - a.fecha);

  return (
    <div className="space-y-4">
      {meId ? (
        <div className="bg-white rounded-2xl border border-slate-100 p-3">
          <div className="flex gap-2">
            <Avatar nombre={yo?.nombre} size={38} />
            <textarea className={inputCls} rows={2} value={texto} onChange={e => setTexto(e.target.value)} placeholder={categoria === "comunicado" ? "Escribe el comunicado ESE…" : "Comparte algo con la promo…"} />
          </div>
          {foto && <div className="relative mt-2"><img src={foto} alt="" className="rounded-xl max-h-52 w-full object-cover" /><button onClick={() => setFoto(null)} className="absolute top-2 right-2 bg-slate-900/60 text-white rounded-full p-1"><X size={14} /></button></div>}
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <button onClick={() => setCategoria(categoria === "comunicado" ? "general" : "comunicado")} className={`text-xs font-bold px-3 py-1.5 rounded-full flex items-center gap-1 ${categoria === "comunicado" ? "bg-[#0a2540] text-white" : "bg-slate-100 text-slate-500"}`}><Megaphone size={13} /> Comunicado ESE</button>
            <button onClick={() => fileRef.current?.click()} className="text-sm text-ese-600 font-semibold flex items-center gap-1.5"><Camera size={16} /> {subiendo ? "…" : "Foto"}</button>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={elegirFoto} />
            <button onClick={publicar} className="ml-auto bg-gradient-to-r from-ese-700 to-ese-500 text-white rounded-full px-4 py-1.5 text-sm font-bold flex items-center gap-1.5"><Send size={14} /> Publicar</button>
          </div>
        </div>
      ) : <div className="bg-amber-100 border border-amber-200 rounded-2xl px-4 py-2.5 text-xs text-amber-800">Inicia sesión para publicar en el muro.</div>}

      <div className="flex gap-2">
        <button onClick={() => setFiltro("todos")} className={`text-xs font-bold px-3 py-1.5 rounded-full ${filtro === "todos" ? "bg-ese-600 text-white" : "bg-white border border-slate-200 text-slate-500"}`}>Todo el muro</button>
        <button onClick={() => setFiltro("comunicado")} className={`text-xs font-bold px-3 py-1.5 rounded-full flex items-center gap-1 ${filtro === "comunicado" ? "bg-[#0a2540] text-white" : "bg-white border border-slate-200 text-slate-500"}`}><Megaphone size={12} /> Comunicados ESE</button>
      </div>

      {lista.length === 0 ? <Vacio emoji="📸" texto="El muro está vacío. Publica la primera foto, mensaje o comunicado." /> :
        lista.map(p => <Post key={p.id} post={p} members={members} meId={meId} onLike={onLike} onComentar={onComentar} onBorrar={onBorrar} />)}
    </div>
  );
}
function Post({ post, members, meId, onLike, onComentar, onBorrar }) {
  const [txt, setTxt] = useState("");
  const [abrir, setAbrir] = useState(false);
  const autor = members.find(m => m.id === post.autor);
  const liked = (post.likes || []).includes(meId);
  const esCom = post.categoria === "comunicado";
  return (
    <div className={`bg-white rounded-2xl overflow-hidden ${esCom ? "border-2 border-[#0a2540]" : "border border-slate-100"}`}>
      {esCom && <div className="bg-[#0a2540] text-white text-xs font-bold px-3 py-1.5 flex items-center gap-1.5"><Megaphone size={13} /> Comunicado ESE</div>}
      <div className="p-3 flex items-center gap-2">
        <Avatar nombre={autor?.nombre} size={38} />
        <div className="flex-1 min-w-0"><p className="text-sm font-bold text-slate-800 truncate">{autor?.nombre || "Alguien"}</p><p className="text-[11px] text-slate-400">{fmtTiempo(post.fecha)}</p></div>
        {post.autor === meId && <button onClick={() => onBorrar(post.id)} className="text-slate-300 hover:text-rose-500"><Trash2 size={15} /></button>}
      </div>
      {post.texto && <p className="px-3 pb-3 text-sm text-slate-700 whitespace-pre-wrap">{post.texto}</p>}
      {post.foto && <img src={post.foto} alt="" className="w-full max-h-96 object-cover" />}
      <div className="p-3 flex items-center gap-4">
        <button onClick={() => meId && onLike(post.id)} className={`flex items-center gap-1.5 text-sm font-semibold ${liked ? "text-oro-600" : "text-slate-400"}`}><ThumbsUp size={16} /> {(post.likes || []).length || ""}</button>
        <button onClick={() => setAbrir(!abrir)} className="flex items-center gap-1.5 text-sm font-semibold text-slate-400"><MessageCircle size={16} /> {(post.comentarios || []).length || ""}</button>
      </div>
      {(abrir || (post.comentarios || []).length > 0) && (
        <div className="px-3 pb-3 space-y-2">
          {(post.comentarios || []).map(c => { const a = members.find(m => m.id === c.autor); return (
            <div key={c.id} className="flex gap-2"><Avatar nombre={a?.nombre} size={26} /><div className="bg-slate-50 rounded-2xl px-3 py-1.5 flex-1"><p className="text-xs font-bold text-slate-700">{a?.nombre?.split(" ")[0] || "?"}</p><p className="text-sm text-slate-600">{c.texto}</p></div></div>
          ); })}
          {meId && (
            <div className="flex gap-2 items-center">
              <input className={inputCls} value={txt} onChange={e => setTxt(e.target.value)} placeholder="Comenta…" onKeyDown={e => { if (e.key === "Enter" && txt.trim()) { onComentar(post.id, txt.trim()); setTxt(""); } }} />
              <button onClick={() => { if (txt.trim()) { onComentar(post.id, txt.trim()); setTxt(""); } }} className="text-ese-600"><Send size={18} /></button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ============================ Eventos ============================ */
function Eventos({ events, members, meId, onEdit, onDelete, setEstado, setAnfitrion, tomarAporte, togglePago, fijarFecha, votarFecha, abrirCuentas }) {
  const nombreDe = id => members.find(m => m.id === id)?.nombre || "—";
  const propuestas = events.filter(e => e.esPropuesta);
  const proximos = events.filter(e => !e.esPropuesta && !esPasado(e)).map(e => ({ ...e, occ: proximaOcurrencia(e) })).sort((a, b) => (a.occ || 0) - (b.occ || 0));
  const historial = events.filter(esPasado).map(e => ({ ...e, occ: fechaHora(e.fecha, e.hora) })).sort((a, b) => b.occ - a.occ);
  if (events.length === 0) return <Vacio emoji="📅" texto="Aún no hay eventos. Usa el botón + para crear el primero." />;

  return (
    <div className="space-y-5">
      {propuestas.length > 0 && (
        <section>
          <h3 className="font-bold text-slate-700 mb-2 flex items-center gap-1.5"><Vote size={16} className="text-ese-600" /> Por decidir</h3>
          <div className="space-y-3">{propuestas.map(ev => {
            const cat = catDe(ev.categoria);
            const ganadora = [...ev.opcionesFecha].sort((a, b) => (b.votos || []).length - (a.votos || []).length)[0];
            return (
              <div key={ev.id} className="bg-white rounded-3xl border-2 border-ese-100 overflow-hidden">
                <div className={`h-1.5 bg-gradient-to-r ${cat.grad}`} />
                <div className="p-4">
                  <div className="flex items-start gap-2"><div className="text-2xl">{cat.emoji}</div><div className="flex-1"><p className="font-bold text-slate-800">{ev.titulo}</p><p className="text-xs text-slate-400">Votación abierta · elige tu fecha</p></div>
                    <button onClick={() => onDelete(ev.id)} className="text-slate-300 hover:text-rose-500"><Trash2 size={14} /></button></div>
                  <div className="mt-3 space-y-2">{ev.opcionesFecha.map(o => {
                    const d = fechaHora(o.fecha, o.hora), voto = (o.votos || []).includes(meId), n = (o.votos || []).length;
                    return (
                      <button key={o.id} onClick={() => meId && votarFecha(ev.id, o.id)} disabled={!meId} className={`w-full flex items-center gap-2 rounded-xl border-2 px-3 py-2 text-sm ${voto ? "border-ese-500 bg-ese-50" : "border-slate-100"}`}>
                        <span className={`w-4 h-4 rounded-full border-2 ${voto ? "bg-ese-500 border-ese-500" : "border-slate-300"}`} />
                        <span className="capitalize text-slate-700">{d ? `${DIAS[d.getDay()]} ${d.getDate()} ${MESES[d.getMonth()]}` : "?"}{o.hora ? ` · ${o.hora}` : ""}</span>
                        <span className="ml-auto text-xs font-bold text-ese-600">{n} voto{n !== 1 ? "s" : ""}</span>
                      </button>
                    );
                  })}</div>
                  {meId && ganadora && <button onClick={() => fijarFecha(ev.id, ganadora.id)} className="mt-3 w-full bg-emerald-500 text-white rounded-xl py-2 text-sm font-bold">Fijar la más votada y confirmar evento ✅</button>}
                </div>
              </div>
            );
          })}</div>
        </section>
      )}

      <section>
        {proximos.length > 0 && <h3 className="font-bold text-slate-700 mb-2">📅 Próximos</h3>}
        <div className="space-y-3">{proximos.map(ev => <TarjetaEvento key={ev.id} ev={ev} members={members} meId={meId} nombreDe={nombreDe} onEdit={onEdit} onDelete={onDelete} setEstado={setEstado} setAnfitrion={setAnfitrion} tomarAporte={tomarAporte} togglePago={togglePago} abrirCuentas={abrirCuentas} />)}</div>
      </section>

      {historial.length > 0 && (
        <section>
          <h3 className="font-bold text-slate-700 mb-2">🕓 Historial</h3>
          <div className="space-y-2">{historial.map(ev => {
            const cat = catDe(ev.categoria), fui = (ev.asistentes || []).includes(meId);
            return (
              <div key={ev.id} className="bg-white rounded-2xl border border-slate-100 p-3 flex items-center gap-3 opacity-90">
                <div className="text-2xl grayscale">{cat.emoji}</div>
                <div className="flex-1 min-w-0"><p className="text-sm font-semibold text-slate-700 truncate">{ev.titulo}</p><p className="text-xs text-slate-400 capitalize">{ev.occ.getDate()} {MESES[ev.occ.getMonth()]} · 👥 {(ev.asistentes || []).length}</p></div>
                {meId && <span className={`text-xs font-bold px-2 py-1 rounded-full ${fui ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-500"}`}>{fui ? "Asististe" : "No fuiste"}</span>}
                <button onClick={() => onDelete(ev.id)} className="text-slate-300 hover:text-rose-500"><Trash2 size={14} /></button>
              </div>
            );
          })}</div>
        </section>
      )}
    </div>
  );
}
function TarjetaEvento({ ev, members, meId, nombreDe, onEdit, onDelete, setEstado, setAnfitrion, tomarAporte, togglePago, abrirCuentas }) {
  const cat = catDe(ev.categoria);
  const voy = (ev.asistentes || []).includes(meId), noVoy = (ev.noVan || []).includes(meId), pague = (ev.pagos || []).includes(meId);
  return (
    <div className="bg-white rounded-3xl border border-slate-100 overflow-hidden">
      <div className={`h-1.5 bg-gradient-to-r ${cat.grad}`} />
      <div className="p-4">
        <div className="flex items-start gap-3">
          <div className="text-3xl">{cat.emoji}</div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-slate-800 flex items-center gap-1.5">{ev.titulo}{ev.recurrente && <span className="text-[10px] text-slate-400 flex items-center gap-0.5"><Repeat size={10} />{ev.frecuencia}</span>}</p>
            <p className="text-xs text-slate-400 capitalize flex flex-wrap gap-x-2">
              <span>{ev.occ ? `${DIAS[ev.occ.getDay()]} ${ev.occ.getDate()} ${MESES[ev.occ.getMonth()]}` : "—"}</span>
              {ev.hora && <span className="flex items-center gap-0.5"><Clock size={10} />{ev.hora}</span>}
              {ev.lugar && <span className="flex items-center gap-0.5"><MapPin size={10} />{ev.lugar}</span>}
            </p>
            {ev.desc && <p className="text-xs text-slate-500 mt-1">{ev.desc}</p>}
            <p className="text-[11px] mt-0.5 text-slate-400">{ev.anfitrion ? `🏠 Anfitrión: ${nombreDe(ev.anfitrion).split(" ")[0]}` : "⚠️ Sin anfitrión"}{!ev.anfitrion && meId && <button onClick={() => setAnfitrion(ev.id, meId)} className="ml-1 text-ese-600 font-semibold">Ser anfitrión</button>}</p>
          </div>
          <div className="flex gap-1 shrink-0"><button onClick={() => onEdit(ev)} className="text-slate-300 hover:text-ese-600 p-1"><Pencil size={14} /></button><button onClick={() => onDelete(ev.id)} className="text-slate-300 hover:text-rose-500 p-1"><Trash2 size={14} /></button></div>
        </div>
        <div className="mt-2"><BarraAsistGris confirmados={(ev.asistentes || []).length} total={members.length} /></div>
        <div className="mt-3 flex items-center gap-2 flex-wrap">
          <button onClick={() => meId && setEstado(ev.id, "voy")} disabled={!meId} className={`text-xs font-bold px-3 py-1.5 rounded-full flex items-center gap-1 ${voy ? "bg-emerald-500 text-white" : "bg-slate-100 text-slate-600"} ${!meId && "opacity-50"}`}><Check size={13} /> Voy</button>
          <button onClick={() => meId && setEstado(ev.id, "no")} disabled={!meId} className={`text-xs font-bold px-3 py-1.5 rounded-full ${noVoy ? "bg-slate-700 text-white" : "bg-slate-100 text-slate-600"} ${!meId && "opacity-50"}`}>No voy</button>
          {ev.cuota > 0 && <button onClick={() => meId && togglePago(ev.id)} disabled={!meId} className={`text-xs font-bold px-3 py-1.5 rounded-full flex items-center gap-1 ${pague ? "bg-amber-500 text-white" : "bg-amber-50 text-amber-700"} ${!meId && "opacity-50"}`}><CircleDollarSign size={13} /> {clp(ev.cuota)}{pague && " ✓"}</button>}
          <button onClick={() => abrirCuentas(ev)} className="text-xs font-bold px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-700 flex items-center gap-1"><Wallet size={13} /> Cuentas{(ev.gastos || []).length > 0 && ` (${ev.gastos.length})`}</button>
        </div>
        {(ev.asistentes || []).length > 0 && <div className="mt-2 flex flex-wrap gap-1">{ev.asistentes.map(id => <span key={id} className="text-[11px] bg-slate-50 text-slate-500 px-2 py-0.5 rounded-full">{nombreDe(id).split(" ")[0]}</span>)}</div>}
        {(ev.aportes || []).length > 0 && (
          <div className="mt-3 border-t border-slate-100 pt-3">
            <p className="text-[11px] uppercase tracking-wide text-slate-400 font-bold mb-2">🛍️ Qué llevar</p>
            <div className="space-y-1">{ev.aportes.map(a => (
              <div key={a.id} className="flex items-center justify-between text-sm"><span className="text-slate-700">{a.item}</span>
                {a.asignadoA ? <button onClick={() => meId && tomarAporte(ev.id, a.id, true)} className="text-xs text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full flex items-center gap-1"><Check size={11} /> {nombreDe(a.asignadoA).split(" ")[0]}</button>
                  : <button onClick={() => meId && tomarAporte(ev.id, a.id, false)} disabled={!meId} className={`text-xs text-slate-500 border border-dashed border-slate-300 px-2 py-0.5 rounded-full hover:border-ese-400 hover:text-ese-700 ${!meId && "opacity-50"}`}>Me anoto</button>}
              </div>
            ))}</div>
          </div>
        )}
        <div className="mt-3"><BotonesCalendario ev={ev} /></div>
      </div>
    </div>
  );
}
function BarraAsistGris({ confirmados, total }) {
  const pct = total ? Math.round(confirmados / total * 100) : 0;
  return <div><div className="flex justify-between text-[11px] text-slate-400 mb-1"><span>👥 {confirmados} de {total} confirmaron</span><span>{pct}%</span></div><div className="h-1.5 bg-slate-100 rounded-full overflow-hidden"><div className="h-full bg-gradient-to-r from-ese-600 to-ese-400 rounded-full" style={{ width: `${pct}%` }} /></div></div>;
}

/* ============================ Hitos ============================ */
function Hitos({ hitos, meId, onAdd, onDelete }) {
  const [form, setForm] = useState(false);
  const [nombre, setNombre] = useState(""); const [emoji, setEmoji] = useState("🎯"); const [fecha, setFecha] = useState(""); const [desc, setDesc] = useState("");
  const sugeridos = ["🇨🇱", "🎄", "🎊", "💍", "🏖️", "🎓", "🍾", "🥳"];
  function add() { if (!nombre.trim() || !fecha) return; onAdd({ id: uid(), nombre: nombre.trim(), emoji, fecha, desc: desc.trim() }); setNombre(""); setDesc(""); setFecha(""); setForm(false); }
  const orden = [...hitos].map(h => ({ ...h, occ: fechaHora(h.fecha) })).filter(h => h.occ).sort((a, b) => a.occ - b.occ);
  return (
    <div className="space-y-4">
      <button onClick={() => setForm(!form)} className="w-full bg-white rounded-2xl border-2 border-dashed border-ese-200 text-ese-600 font-semibold py-3 flex items-center justify-center gap-2"><Plus size={18} /> Proponer fecha / hito</button>
      {form && (
        <div className="bg-white rounded-2xl border border-slate-100 p-4">
          <Campo label="Nombre"><input className={inputCls} value={nombre} onChange={e => setNombre(e.target.value)} placeholder="Ej: Fiestas Patrias, Matrimonio de…" /></Campo>
          <Campo label="Emoji"><div className="flex gap-1 flex-wrap">{sugeridos.map(s => <button key={s} onClick={() => setEmoji(s)} className={`text-xl w-9 h-9 rounded-lg ${emoji === s ? "bg-ese-100" : "bg-slate-50"}`}>{s}</button>)}<input className={inputCls + " w-16"} value={emoji} onChange={e => setEmoji(e.target.value)} /></div></Campo>
          <Campo label="Fecha"><input type="date" className={inputCls} value={fecha} onChange={e => setFecha(e.target.value)} /></Campo>
          <Campo label="Descripción"><input className={inputCls} value={desc} onChange={e => setDesc(e.target.value)} placeholder="Opcional" /></Campo>
          <button onClick={add} className={btnPrim}>Agregar hito</button>
        </div>
      )}
      {orden.length === 0 ? <Vacio emoji="🎯" texto="Aún no hay hitos. Agrega las fechas grandes: Fiestas Patrias, matrimonios, viajes…" /> :
        <div className="grid sm:grid-cols-2 gap-3">{orden.map(h => { const dias = diasHasta(h.occ); return (
          <div key={h.id} className="bg-gradient-to-br from-ese-700 to-ese-500 rounded-3xl p-4 text-white relative overflow-hidden">
            <div className="absolute -right-3 -top-3 text-7xl opacity-20">{h.emoji}</div>
            <div className="flex justify-between items-start"><div><p className="text-3xl">{h.emoji}</p><p className="font-extrabold text-lg mt-1">{h.nombre}</p></div>
              <div className="text-right"><p className="text-3xl font-extrabold leading-none">{dias >= 0 ? dias : "—"}</p><p className="text-[10px] uppercase text-white/70">{dias >= 0 ? "días" : "pasó"}</p></div></div>
            <p className="text-sm text-white/85 capitalize mt-2">{h.occ.getDate()} de {MESES_LARGO[h.occ.getMonth()]} {h.occ.getFullYear()}</p>
            {h.desc && <p className="text-xs text-white/75 mt-1">{h.desc}</p>}
            <button onClick={() => onDelete(h.id)} className="absolute bottom-3 right-3 text-white/60 hover:text-white"><Trash2 size={14} /></button>
          </div>
        ); })}</div>}
    </div>
  );
}

/* ============================ Cumpleaños con filtros ============================ */
function Cumples({ members, onAgregar }) {
  const [filtro, setFiltro] = useState("todos");
  const cumples = useMemo(() => {
    const arr = [];
    members.forEach(mem => {
      if (mem.cumple) { const p = proximoCumple(mem.cumple); if (p) arr.push({ tipo: "socios", nombre: mem.nombre, rel: "Socio/a", emoji: "🎂", ...p }); }
      if (mem.conyuge?.cumple) { const p = proximoCumple(mem.conyuge.cumple); if (p) arr.push({ tipo: "parejas", nombre: mem.conyuge.nombre, rel: `Pareja de ${mem.nombre.split(" ")[0]}`, emoji: "💗", ...p }); }
      (mem.hijos || []).forEach(h => { if (h.cumple) { const p = proximoCumple(h.cumple); if (p) arr.push({ tipo: "hijos", nombre: h.nombre, rel: `Hijo/a de ${mem.nombre.split(" ")[0]}`, emoji: "🧒", ...p }); } });
    });
    return arr.sort((a, b) => a.dias - b.dias);
  }, [members]);
  const tabs = [["todos", "Todos", cumples.length], ["socios", "Socios", cumples.filter(c => c.tipo === "socios").length], ["parejas", "Parejas", cumples.filter(c => c.tipo === "parejas").length], ["hijos", "Hijos", cumples.filter(c => c.tipo === "hijos").length]];
  const lista = filtro === "todos" ? cumples : cumples.filter(c => c.tipo === filtro);
  const botonAgregar = <button onClick={onAgregar} className="w-full mb-3 bg-white rounded-2xl border-2 border-dashed border-ese-200 text-ese-700 font-semibold py-3 flex items-center justify-center gap-2"><Plus size={18} /> Agregar mi cumpleaños y el de mi familia</button>;
  if (cumples.length === 0) return <div>{botonAgregar}<Vacio emoji="🎂" texto="Aún no hay cumpleaños. Agrega el tuyo y el de tu pareja e hijos con el botón de arriba." /></div>;
  return (
    <div>
      {botonAgregar}
      <div className="flex gap-2 mb-3 overflow-x-auto pb-1">{tabs.map(([k, l, n]) => (
        <button key={k} onClick={() => setFiltro(k)} className={`text-xs font-bold px-3 py-1.5 rounded-full whitespace-nowrap ${filtro === k ? "bg-ese-600 text-white" : "bg-white border border-slate-200 text-slate-500"}`}>{l} {n}</button>
      ))}</div>
      <div className="space-y-2">{lista.map((c, i) => (
        <div key={i} className="bg-white rounded-2xl border border-slate-100 p-3 flex items-center gap-3">
          <div className="w-11 text-center shrink-0 bg-oro-50 rounded-xl py-1"><p className="text-[10px] text-oro-600 uppercase font-bold">{MESES[c.m - 1]}</p><p className="font-extrabold text-lg text-oro-700 leading-none">{c.d}</p></div>
          <div className="text-xl">{c.emoji}</div>
          <div className="min-w-0 flex-1"><p className="text-sm font-semibold text-slate-800 truncate">{c.nombre}</p><p className="text-xs text-slate-400">{c.rel}{c.edad ? ` · cumple ${c.edad}` : ""}</p></div>
          <p className={`text-xs font-bold ${c.dias <= 7 ? "text-oro-600" : "text-slate-400"}`}>{etiquetaDias(c.dias)}</p>
        </div>
      ))}</div>
    </div>
  );
}

/* ============================ Miembros ============================ */
function Miembros({ members, meId, esAdmin, onEdit, onDelete }) {
  if (members.length === 0) return <Vacio emoji="👥" texto={esAdmin ? "Aún no hay miembros. Usa el botón + para agregar el primero." : "Aún no hay miembros registrados."} />;
  return (
    <div className="grid sm:grid-cols-2 gap-2">{members.map(m => (
      <div key={m.id} className="bg-white rounded-2xl border border-slate-100 p-4">
        <div className="flex items-start gap-3">
          <Avatar nombre={m.nombre} size={46} />
          <div className="min-w-0 flex-1"><p className="text-sm font-bold text-slate-800 flex items-center gap-1.5 truncate">{m.nombre}{m.id === meId && <span className="text-[10px] bg-ese-100 text-ese-700 px-1.5 py-0.5 rounded-full">Tú</span>}</p>{m.email && <p className="text-xs text-slate-400 truncate">{m.email}</p>}{m.telefono && <p className="text-xs text-slate-400">{m.telefono}</p>}</div>
          {esAdmin && <div className="flex gap-1"><button onClick={() => onEdit(m)} className="text-slate-300 hover:text-ese-600 p-1"><Pencil size={15} /></button><button onClick={() => onDelete(m.id)} className="text-slate-300 hover:text-rose-500 p-1"><Trash2 size={15} /></button></div>}
        </div>
        <div className="mt-3 space-y-1 text-xs text-slate-500">{m.cumple && <p>🎂 {parseFecha(m.cumple).d} {MESES[parseFecha(m.cumple).m - 1]}</p>}{m.conyuge && <p>💗 {m.conyuge.nombre}</p>}{(m.hijos || []).length > 0 && <p>🧒 {m.hijos.map(h => h.nombre).join(", ")}</p>}</div>
      </div>
    ))}</div>
  );
}

/* ============================ Ranking ============================ */
function Ranking({ members, events }) {
  const filas = useMemo(() => members.map(m => ({ ...m, ...puntaje(m, events) })).sort((a, b) => b.total - a.total), [members, events]);
  if (filas.length === 0) return <Vacio emoji="🏆" texto="El ranking aparece cuando hay miembros y eventos." />;
  const medalla = ["🥇", "🥈", "🥉"];
  return (
    <div>
      <div className="bg-gradient-to-br from-ese-700 to-ese-500 rounded-3xl p-4 mb-4 text-white"><p className="font-bold flex items-center gap-1.5"><Trophy size={16} /> Ranking de participación</p><p className="text-xs text-white/85 mt-1">Sube quien mueve la promo: <b>+30 pts</b> por prestar el local, <b>+20 pts</b> por crear un evento y <b>+10 pts</b> por asistir. Se muestra también tu % de asistencia. 🎯</p></div>
      <div className="space-y-2">{filas.map((m, i) => (
        <div key={m.id} className={`bg-white rounded-2xl border p-3 ${i === 0 ? "border-amber-300 shadow-sm" : "border-slate-100"}`}>
          <div className="flex items-center gap-3">
            <div className="w-8 text-center text-lg">{i < 3 ? medalla[i] : <span className="text-sm font-bold text-slate-400">{i + 1}</span>}</div>
            <Avatar nombre={m.nombre} size={40} />
            <div className="min-w-0 flex-1"><p className="text-sm font-bold text-slate-800 truncate">{m.nombre}</p><p className="text-[11px] text-slate-400">🏠 {m.anfitrion} · 🎪 {m.creados} · ✅ {m.asistidos} · ❌ {m.ausente} · ⏳ {m.pendiente}</p></div>
            <div className="text-right"><p className="font-extrabold text-lg bg-gradient-to-r from-ese-600 to-ese-400 bg-clip-text text-transparent leading-none">{m.total}</p><p className="text-[10px] text-slate-400 uppercase">pts</p></div>
          </div>
          {m.totalPasados > 0 && <div className="mt-2 pl-11"><div className="flex justify-between text-[11px] text-slate-400 mb-0.5"><span>Asistencia</span><span className="font-bold text-amber-500">{m.pct}%</span></div><div className="h-1.5 bg-slate-100 rounded-full overflow-hidden"><div className="h-full bg-amber-400 rounded-full" style={{ width: `${m.pct}%` }} /></div></div>}
        </div>
      ))}</div>
    </div>
  );
}

/* ============================ Reglamento + Votaciones ============================ */
function Reglamento({ reglas, votaciones, members, meId, onAddRegla, onDelRegla, onAddVotacion, onVotar }) {
  const [nuevaRegla, setNuevaRegla] = useState("");
  const [vt, setVt] = useState(""); const [vd, setVd] = useState(""); const [formV, setFormV] = useState(false);
  const [vcierra, setVcierra] = useState(() => { const d = new Date(Date.now() + 7 * 86400000); const p = n => String(n).padStart(2, "0"); return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`; });
  const nombreDe = id => members.find(m => m.id === id)?.nombre?.split(" ")[0] || "?";
  const linkVotacion = id => `${window.location.origin}${window.location.pathname}#votacion=${id}`;
  const compartirWhatsApp = (v) => { const url = `https://wa.me/?text=${encodeURIComponent("🗳️ Vota en la promo: “" + v.titulo + "”\n" + linkVotacion(v.id))}`; window.open(url, "_blank"); };
  return (
    <div className="space-y-6">
      <section>
        <h3 className="font-bold text-slate-700 mb-2 flex items-center gap-1.5"><Gavel size={16} /> Reglamento</h3>
        <div className="bg-white rounded-2xl border border-slate-100 divide-y divide-slate-50">
          {reglas.length === 0 && <p className="p-4 text-sm text-slate-400">Aún no hay reglas. Agrega la primera abajo.</p>}
          {reglas.map((r, i) => (
            <div key={r.id} className="flex items-start gap-3 p-3">
              <span className="text-xs font-bold text-ese-400 mt-0.5">{i + 1}</span>
              <p className="text-sm text-slate-700 flex-1">{r.texto}</p>
              <button onClick={() => onDelRegla(r.id)} className="text-slate-300 hover:text-rose-500"><Trash2 size={14} /></button>
            </div>
          ))}
        </div>
        {meId && <div className="flex gap-2 mt-2"><input className={inputCls} value={nuevaRegla} onChange={e => setNuevaRegla(e.target.value)} placeholder="Nueva regla…" onKeyDown={e => { if (e.key === "Enter" && nuevaRegla.trim()) { onAddRegla(nuevaRegla.trim()); setNuevaRegla(""); } }} /><button onClick={() => { if (nuevaRegla.trim()) { onAddRegla(nuevaRegla.trim()); setNuevaRegla(""); } }} className="bg-ese-600 text-white rounded-xl px-4 text-sm font-bold">Añadir</button></div>}
      </section>

      <section>
        <div className="flex items-center justify-between mb-2"><h3 className="font-bold text-slate-700 flex items-center gap-1.5"><Vote size={16} /> Votaciones</h3><button onClick={() => setFormV(!formV)} className="text-xs text-ese-600 font-semibold flex items-center gap-1"><Plus size={13} /> Nueva</button></div>
        <p className="text-[11px] text-slate-400 mb-2">Las reglas se aprueban con 2/3 de los votos emitidos antes del cierre.</p>
        {formV && meId && (
          <div className="bg-white rounded-2xl border border-slate-100 p-4 mb-3">
            <Campo label="¿Qué se vota?"><input className={inputCls} value={vt} onChange={e => setVt(e.target.value)} placeholder="Ej: Subir la cuota a $15.000" /></Campo>
            <Campo label="Detalle"><textarea className={inputCls} rows={2} value={vd} onChange={e => setVd(e.target.value)} /></Campo>
            <Campo label="🗓️ Cierra el"><input type="datetime-local" className={inputCls} value={vcierra} onChange={e => setVcierra(e.target.value)} /></Campo>
            <button onClick={() => { if (vt.trim() && vcierra) { onAddVotacion(vt.trim(), vd.trim(), new Date(vcierra).toISOString()); setVt(""); setVd(""); setFormV(false); } }} className={btnPrim}>Abrir votación 🗳️</button>
          </div>
        )}
        <div className="space-y-3">{votaciones.length === 0 ? <p className="text-sm text-slate-400 bg-white rounded-2xl border border-slate-100 p-4">No hay votaciones abiertas.</p> :
          votaciones.slice().sort((a, b) => b.creada - a.creada).map(v => {
            const s = estadoVotacion(v), miSi = (v.votosSi || []).includes(meId), miNo = (v.votosNo || []).includes(meId);
            const diasRest = diasHasta(v.cierra);
            return (
              <div key={v.id} className="bg-white rounded-2xl border border-slate-100 p-4">
                <div className="flex items-start justify-between"><p className="font-bold text-slate-800">{v.titulo}</p>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${s.cerrada ? (s.aprobada ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-600") : "bg-ese-100 text-ese-700"}`}>{s.cerrada ? (s.aprobada ? "Aprobada ✅" : "Rechazada") : `Abierta · ${diasRest >= 0 ? diasRest + "d" : "cerrando"}`}</span></div>
                {v.desc && <p className="text-xs text-slate-500 mt-1">{v.desc}</p>}
                <p className="text-[11px] text-slate-400 mt-1">Propuesta por {nombreDe(v.creadoPor)}</p>
                <div className="mt-2"><div className="flex justify-between text-[11px] text-slate-400 mb-0.5"><span>{s.si} sí · {s.no} no</span><span className="font-bold">{s.pctSi}% a favor (se necesita 67%)</span></div><div className="h-2 bg-slate-100 rounded-full overflow-hidden"><div className={`h-full rounded-full ${s.pctSi >= 67 ? "bg-emerald-500" : "bg-ese-500"}`} style={{ width: `${s.pctSi}%` }} /></div></div>
                {!s.cerrada && meId && (
                  <div className="flex gap-2 mt-3">
                    <button onClick={() => onVotar(v.id, "si")} className={`flex-1 text-sm font-bold py-2 rounded-xl flex items-center justify-center gap-1.5 ${miSi ? "bg-emerald-500 text-white" : "bg-emerald-50 text-emerald-700"}`}><ThumbsUp size={14} /> A favor</button>
                    <button onClick={() => onVotar(v.id, "no")} className={`flex-1 text-sm font-bold py-2 rounded-xl flex items-center justify-center gap-1.5 ${miNo ? "bg-rose-500 text-white" : "bg-rose-50 text-rose-600"}`}><ThumbsDown size={14} /> En contra</button>
                  </div>
                )}
                <button onClick={() => compartirWhatsApp(v)} className="mt-3 w-full text-xs font-semibold text-emerald-700 bg-emerald-50 rounded-xl py-2 flex items-center justify-center gap-1.5"><Share2 size={13} /> Compartir por WhatsApp</button>
              </div>
            );
          })}</div>
      </section>
    </div>
  );
}

/* ============================ Login / Registro ============================ */
function Auth({ nombrePromo, logo, onRegister, onLogin, onRecuperar }) {
  const [modo, setModo] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [nombre, setNombre] = useState("");
  const [cumple, setCumple] = useState("");
  const [ver, setVer] = useState(false);
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");
  const [cargando, setCargando] = useState(false);

  async function submit() {
    setError(""); setOk(""); setCargando(true);
    try {
      if (modo === "recuperar") {
        if (!email.trim()) { setError("Escribe tu correo."); return; }
        const err = await onRecuperar(email.trim());
        if (err) setError(err); else setOk("Te enviamos un correo para restablecer tu clave. Revisa tu bandeja (y spam).");
        return;
      }
      if (!email.trim() || !password) { setError("Completa correo y contraseña."); return; }
      if (modo === "registro") {
        if (!nombre.trim()) { setError("Escribe tu nombre."); return; }
        if (!cumple) { setError("Agrega tu fecha de cumpleaños."); return; }
        const err = await onRegister({ email: email.trim(), password, nombre: nombre.trim(), cumple });
        if (err) { if (/confirmar tu cuenta/.test(err)) { setOk(err); } else setError(err); }
      } else {
        const err = await onLogin({ email: email.trim(), password });
        if (err) setError(err);
      }
    } finally { setCargando(false); }
  }

  const titulo = modo === "registro" ? "Crea tu cuenta" : modo === "recuperar" ? "Recuperar acceso" : "Inicia sesión";
  return (
    <div className="min-h-screen bg-gradient-to-br from-ese-700 to-ese-500 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm p-6">
        <div className="text-center mb-5">
          <div className="flex justify-center mb-2"><EmblemaESE logo={logo} size={60} /></div>
          <h1 className="font-extrabold text-xl text-slate-800">{nombrePromo}</h1>
          <p className="text-sm text-slate-400">{titulo}</p>
        </div>

        {modo === "registro" && <Campo label="Tu nombre"><input className={inputCls} value={nombre} onChange={e => setNombre(e.target.value)} placeholder="Ej: Gonzalo Grez" /></Campo>}
        {modo === "registro" && <Campo label="🎂 Tu cumpleaños"><input type="date" className={inputCls} value={cumple} onChange={e => setCumple(e.target.value)} /></Campo>}
        <Campo label="Correo"><input className={inputCls} value={email} onChange={e => setEmail(e.target.value)} placeholder="correo@ejemplo.com" autoCapitalize="none" /></Campo>
        {modo !== "recuperar" && (
          <Campo label="Contraseña">
            <div className="relative">
              <input type={ver ? "text" : "password"} className={inputCls + " pr-10"} value={password} onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key === "Enter" && submit()} placeholder="•••••• (mínimo 6)" />
              <button onClick={() => setVer(!ver)} className="absolute right-2 top-2 text-slate-400">{ver ? <EyeOff size={18} /> : <Eye size={18} />}</button>
            </div>
          </Campo>
        )}

        {error && <p className="text-xs text-rose-500 mb-2">{error}</p>}
        {ok && <p className="text-xs text-emerald-600 mb-2">{ok}</p>}
        <button onClick={submit} disabled={cargando} className={btnPrim}>{cargando ? "…" : modo === "registro" ? "Crear cuenta" : modo === "recuperar" ? "Enviar correo" : "Entrar"}</button>

        {modo === "login" && <button onClick={() => { setModo("recuperar"); setError(""); setOk(""); }} className="w-full text-center text-xs text-ese-600 font-semibold mt-3">¿Olvidaste tu clave?</button>}

        <p className="text-center text-xs text-slate-400 mt-3">
          {modo === "registro" ? "¿Ya tienes cuenta? " : modo === "recuperar" ? "" : "¿Primera vez? "}
          <button onClick={() => { setModo(modo === "login" ? "registro" : "login"); setError(""); setOk(""); }} className="text-ese-600 font-semibold">{modo === "registro" ? "Inicia sesión" : modo === "recuperar" ? "Volver a inicio de sesión" : "Crea tu cuenta"}</button>
        </p>
      </div>
    </div>
  );
}

/* ============================ Pantalla nueva clave (recuperación) ============================ */
function NuevaClaveScreen({ nombrePromo, logo, onGuardar }) {
  const [p1, setP1] = useState(""); const [p2, setP2] = useState(""); const [msg, setMsg] = useState("");
  async function guardar() {
    setMsg("");
    if (p1.length < 6) { setMsg("La clave debe tener al menos 6 caracteres."); return; }
    if (p1 !== p2) { setMsg("Las claves no coinciden."); return; }
    const err = await onGuardar(p1); if (err) setMsg(err);
  }
  return (
    <div className="min-h-screen bg-gradient-to-br from-ese-700 to-ese-500 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm p-6">
        <div className="text-center mb-5"><div className="flex justify-center mb-2"><EmblemaESE logo={logo} size={60} /></div><h1 className="font-extrabold text-xl text-slate-800">{nombrePromo}</h1><p className="text-sm text-slate-400">Define tu nueva clave</p></div>
        <Campo label="Nueva contraseña"><input type="password" className={inputCls} value={p1} onChange={e => setP1(e.target.value)} placeholder="••••••" /></Campo>
        <Campo label="Repite la contraseña"><input type="password" className={inputCls} value={p2} onChange={e => setP2(e.target.value)} placeholder="••••••" /></Campo>
        {msg && <p className="text-xs text-rose-500 mb-2">{msg}</p>}
        <button onClick={guardar} className={btnPrim}>Guardar clave</button>
      </div>
    </div>
  );
}

/* ============================ Emblema ESE ============================ */
function EmblemaESE({ logo, size = 56 }) {
  if (logo) return <img src={logo} alt="Logo" className="rounded-2xl object-contain bg-white" style={{ width: size, height: size }} />;
  return (
    <div className="rounded-2xl bg-[#0a2540] text-white flex flex-col items-center justify-center shrink-0" style={{ width: size, height: size }}>
      <span className="font-extrabold leading-none" style={{ fontSize: size * 0.32, letterSpacing: 1 }}>ESE</span>
      <span className="text-amber-300 font-semibold tracking-wide" style={{ fontSize: size * 0.12 }}>BUSINESS</span>
    </div>
  );
}

/* ============================ Administración ============================ */
function AdminUsuarioRow({ u, member, esYo, soloAdmin, onEliminar, onReset, onToggleAdmin }) {
  const email = member?.email;
  return (
    <div className="bg-white border border-slate-100 rounded-xl p-3">
      <div className="flex items-center gap-2">
        <Avatar nombre={member?.nombre} size={34} />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-slate-800 truncate">{member?.nombre || "—"} {u.esAdmin && <span className="text-[10px] bg-ese-100 text-ese-700 px-1.5 py-0.5 rounded-full">admin</span>}{esYo && <span className="text-[10px] text-slate-400"> (tú)</span>}</p>
          <p className="text-[11px] text-slate-400 truncate">{email || "sin correo"}</p>
        </div>
      </div>
      <div className="flex flex-wrap gap-1.5 mt-2">
        <button onClick={() => onReset()} className="text-[11px] font-semibold px-2 py-1 rounded-full bg-slate-100 text-slate-600">Ayuda con clave</button>
        <button onClick={() => onToggleAdmin(u.id)} disabled={esYo && soloAdmin} className={`text-[11px] font-semibold px-2 py-1 rounded-full ${u.esAdmin ? "bg-ese-50 text-ese-600" : "bg-slate-100 text-slate-600"} ${esYo && soloAdmin ? "opacity-40" : ""}`}>{u.esAdmin ? "Quitar admin" : "Hacer admin"}</button>
        <button onClick={() => onEliminar(u.id)} disabled={esYo} className={`text-[11px] font-semibold px-2 py-1 rounded-full bg-rose-50 text-rose-600 ${esYo ? "opacity-40" : ""}`}>Quitar</button>
      </div>
    </div>
  );
}

function AdminPanel({ datos, usuarios, members, meUserId, onClose, onImportar, onEliminarUsuario, onResetClave, onToggleAdmin }) {
  const [tabA, setTabA] = useState("usuarios");
  const [texto, setTexto] = useState(""); const [archivo, setArchivo] = useState(""); const fileRef = useRef();
  const numAdmins = usuarios.filter(u => u.esAdmin).length;
  const memberDe = id => members.find(m => m.id === id);
  const stats = [["Miembros", datos.members.length], ["Eventos", datos.events.length], ["Muro", datos.posts.length], ["Hitos", datos.hitos.length], ["Reglas", datos.reglas.length], ["Cuentas", datos.usuarios.length]];
  function exportar() { descargarJSON({ app: "RedPromo", version: 5, exportado: new Date().toISOString(), ...datos }, `respaldo-promo-${new Date().toISOString().slice(0, 10)}.json`); }
  async function leerArchivo(e) { const f = e.target.files[0]; if (!f) return; setArchivo(f.name); setTexto(await f.text()); }
  function importar() { try { const obj = JSON.parse(texto); if (!obj.members) { alert("Respaldo inválido."); return; } if (!confirm("Esto reemplazará TODOS los datos actuales. ¿Continuar?")) return; onImportar(obj); } catch { alert("No se pudo leer el JSON."); } }
  return (
    <Modal titulo="🛡️ Administración" onClose={onClose}>
      <div className="flex gap-2 mb-4">
        <button onClick={() => setTabA("usuarios")} className={`flex-1 text-sm font-bold py-2 rounded-xl ${tabA === "usuarios" ? "bg-ese-600 text-white" : "bg-slate-100 text-slate-500"}`}>Usuarios</button>
        <button onClick={() => setTabA("respaldo")} className={`flex-1 text-sm font-bold py-2 rounded-xl ${tabA === "respaldo" ? "bg-ese-600 text-white" : "bg-slate-100 text-slate-500"}`}>Respaldo</button>
      </div>
      {tabA === "usuarios" ? (
        <div className="space-y-2">
          {usuarios.length === 0 && <p className="text-sm text-slate-400">No hay usuarios registrados.</p>}
          {usuarios.map(u => <AdminUsuarioRow key={u.id} u={u} member={memberDe(u.memberId)} esYo={u.id === meUserId} soloAdmin={numAdmins <= 1} onEliminar={onEliminarUsuario} onReset={onResetClave} onToggleAdmin={onToggleAdmin} />)}
          <p className="text-[11px] text-slate-400 mt-2">Eliminar un usuario borra su cuenta de acceso, no su perfil de miembro. El perfil se elimina desde la pestaña Miembros.</p>
        </div>
      ) : (
        <>
          <p className="text-xs text-slate-400 mb-3">Descarga una copia completa de todo lo ingresado y guárdala en lugar seguro. Incluye credenciales encriptadas.</p>
          <div className="grid grid-cols-3 gap-2 mb-4">{stats.map(([k, n]) => <div key={k} className="bg-slate-50 rounded-xl p-2 text-center"><p className="font-extrabold text-lg text-ese-600">{n}</p><p className="text-[10px] text-slate-400">{k}</p></div>)}</div>
          <button onClick={exportar} className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-xl py-2.5 text-sm font-bold flex items-center justify-center gap-2 mb-4"><Download size={16} /> Descargar respaldo (.json)</button>
          <div className="border-t border-slate-100 pt-3">
            <p className="text-sm font-semibold text-slate-600 mb-2 flex items-center gap-1.5"><Upload size={15} /> Restaurar desde respaldo</p>
            <input ref={fileRef} type="file" accept="application/json,.json" className="hidden" onChange={leerArchivo} />
            <button onClick={() => fileRef.current?.click()} className="text-xs text-ese-600 font-semibold mb-2 block">{archivo || "Elegir archivo…"}</button>
            {texto && <button onClick={importar} className="w-full bg-rose-500 text-white rounded-xl py-2 text-sm font-bold">Reemplazar datos con este respaldo</button>}
          </div>
        </>
      )}
    </Modal>
  );
}

/* ============================ Mi Perfil ============================ */
function MiPerfil({ member, usuario, esAdmin, onEditarDatos, onCambiarUsuario, onCambiarClave }) {
  const [nuevoUser, setNuevoUser] = useState(usuario.username);
  const [msgUser, setMsgUser] = useState("");
  const [actual, setActual] = useState(""); const [nueva, setNueva] = useState(""); const [conf, setConf] = useState("");
  const [msgClave, setMsgClave] = useState("");
  async function guardarUsuario() { setMsgUser(""); const err = await onCambiarUsuario(nuevoUser.trim()); setMsgUser(err || "Usuario actualizado ✅"); }
  async function guardarClave() {
    setMsgClave("");
    if (!actual || !nueva) { setMsgClave("Completa los campos."); return; }
    if (nueva !== conf) { setMsgClave("La nueva clave no coincide."); return; }
    const err = await onCambiarClave(actual, nueva);
    if (err) setMsgClave(err); else { setMsgClave("Clave actualizada ✅"); setActual(""); setNueva(""); setConf(""); }
  }
  return (
    <div className="space-y-4">
      <div className="bg-gradient-to-br from-ese-700 to-ese-500 rounded-3xl p-5 text-white flex items-center gap-3">
        <Avatar nombre={member?.nombre} size={54} />
        <div><p className="font-extrabold text-lg">{member?.nombre}</p><p className="text-sm text-white/80">@{usuario.username}{esAdmin ? " · admin" : ""}</p></div>
      </div>
      <div className="bg-white rounded-2xl border border-slate-100 p-4">
        <div className="flex items-center justify-between mb-2"><p className="font-bold text-slate-700">Datos personales</p><button onClick={onEditarDatos} className="text-xs bg-ese-600 text-white font-semibold flex items-center gap-1 px-3 py-1.5 rounded-full"><Pencil size={13} /> Editar / agregar</button></div>
        <div className="space-y-1 text-sm text-slate-600">
          {member?.email ? <p>✉️ {member.email}</p> : <p className="text-amber-500">✉️ Sin correo</p>}
          {member?.telefono && <p>📱 {member.telefono}</p>}
          {member?.cumple ? <p>🎂 Tu cumpleaños: {parseFecha(member.cumple).d} {MESES[parseFecha(member.cumple).m - 1]}</p> : <p className="text-amber-500">🎂 Agrega tu cumpleaños</p>}
          {member?.conyuge && <p>💗 {member.conyuge.nombre}{member.conyuge.cumple ? ` · 🎂 ${parseFecha(member.conyuge.cumple).d} ${MESES[parseFecha(member.conyuge.cumple).m - 1]}` : ""}</p>}
          {(member?.hijos || []).map((h, i) => <p key={i}>🧒 {h.nombre}{h.cumple ? ` · 🎂 ${parseFecha(h.cumple).d} ${MESES[parseFecha(h.cumple).m - 1]}` : ""}</p>)}
        </div>
        <p className="text-[11px] text-slate-400 mt-2">Aquí agregas tu cumpleaños y el de tu pareja e hijos. Se muestran en la pestaña 🎂 Cumpleaños.</p>
      </div>
      <div className="bg-white rounded-2xl border border-slate-100 p-4">
        <p className="font-bold text-slate-700 mb-2">Correo de acceso</p>
        <div className="flex gap-2"><input className={inputCls} value={nuevoUser} onChange={e => setNuevoUser(e.target.value)} autoCapitalize="none" placeholder="correo@ejemplo.com" /><button onClick={guardarUsuario} className="bg-ese-600 text-white rounded-xl px-4 text-sm font-bold shrink-0">Guardar</button></div>
        {msgUser && <p className="text-xs mt-1 text-slate-500">{msgUser}</p>}
      </div>
      <div className="bg-white rounded-2xl border border-slate-100 p-4">
        <p className="font-bold text-slate-700 mb-2">Cambiar contraseña</p>
        <input type="password" className={inputCls + " mb-2"} value={actual} onChange={e => setActual(e.target.value)} placeholder="Clave actual" />
        <input type="password" className={inputCls + " mb-2"} value={nueva} onChange={e => setNueva(e.target.value)} placeholder="Nueva clave" />
        <input type="password" className={inputCls + " mb-2"} value={conf} onChange={e => setConf(e.target.value)} placeholder="Repite la nueva clave" />
        <button onClick={guardarClave} className={btnPrim}>Actualizar contraseña</button>
        {msgClave && <p className="text-xs mt-1 text-slate-500">{msgClave}</p>}
      </div>
    </div>
  );
}

/* ============================ Invitar / Compartir ============================ */
function InvitarModal({ nombrePromo, logo, enlace, esAdmin, onClose, onGuardarEnlace, onSubirLogo }) {
  const [link, setLink] = useState(enlace || "");
  const [copiado, setCopiado] = useState(false);
  const fileRef = useRef();
  const mensaje = `¡Te invito a la red de la ${nombrePromo}! 🎓\nAcá coordinamos juntas, cumpleaños, cuentas y comunicados ESE.\n${link || "(pega aquí el enlace de la app)"}`;
  const waUrl = `https://wa.me/?text=${encodeURIComponent(mensaje)}`;
  async function subir(e) { const f = e.target.files[0]; if (!f) return; try { onSubirLogo(await comprimirImagen(f, 400, 0.85)); } catch { alert("No se pudo procesar la imagen."); } }
  function copiar() { try { navigator.clipboard.writeText(mensaje); setCopiado(true); setTimeout(() => setCopiado(false), 1500); } catch {} }
  return (
    <Modal titulo="Invitar a la promo" onClose={onClose}>
      <div className="rounded-3xl bg-gradient-to-br from-[#0a2540] to-[#123a63] p-5 text-white text-center mb-4">
        <div className="flex justify-center mb-3"><EmblemaESE logo={logo} size={72} /></div>
        <p className="font-extrabold text-xl">{nombrePromo}</p>
        <p className="text-sm text-white/70 mt-1">Red privada de la promoción</p>
      </div>
      {esAdmin && (
        <>
          <Campo label="Enlace de la app (cópialo del botón Compartir de Claude)">
            <div className="flex gap-2">
              <input className={inputCls} value={link} onChange={e => setLink(e.target.value)} placeholder="https://claude.site/…" />
              <button onClick={() => onGuardarEnlace(link.trim())} className="bg-ese-600 text-white rounded-xl px-3 text-sm font-bold shrink-0">Guardar</button>
            </div>
          </Campo>
          <button onClick={() => fileRef.current?.click()} className="text-xs text-ese-600 font-semibold mb-3 flex items-center gap-1"><ImageIcon size={13} /> Subir logo oficial del ESE</button>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={subir} />
        </>
      )}
      <a href={waUrl} target="_blank" rel="noopener noreferrer" className="w-full bg-[#25D366] text-white rounded-xl py-3 text-sm font-bold flex items-center justify-center gap-2 mb-2"><Share2 size={16} /> Compartir por WhatsApp</a>
      <button onClick={copiar} className="w-full bg-slate-100 text-slate-700 rounded-xl py-2.5 text-sm font-bold flex items-center justify-center gap-2"><Copy size={15} /> {copiado ? "¡Copiado!" : "Copiar mensaje"}</button>
      <p className="text-[10px] text-slate-300 mt-3 text-center">El emblema es un marcador genérico. Como admin puedes subir el logo oficial del ESE con el botón de arriba.</p>
    </Modal>
  );
}

/* ============================ App ============================ */
export default function App() {
  const [members, setMembers] = useState([]);
  const [events, setEvents] = useState([]);
  const [hitos, setHitos] = useState([]);
  const [posts, setPosts] = useState([]);
  const [reglas, setReglas] = useState([]);
  const [votaciones, setVotaciones] = useState([]);
  const [usuarios, setUsuarios] = useState([]);
  const [sesionUserId, setSesionUserId] = useState(null);
  const [respaldoOpen, setRespaldoOpen] = useState(false);
  const [invitarOpen, setInvitarOpen] = useState(false);
  const [enlace, setEnlace] = useState("");
  const [logo, setLogo] = useState(LOGO_ESE);
  const [nombrePromo, setNombrePromo] = useState("Promoción MBA 2024 ESE");
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("inicio");
  const [modal, setModal] = useState(null);
  const [cuentasEv, setCuentasEv] = useState(null);
  const [masOpen, setMasOpen] = useState(false);
  const [ahora, setAhora] = useState(new Date());

  const [recoveryMode, setRecoveryMode] = useState(false);
  const creandoPerfil = useRef(false);

  const usuarioActual = usuarios.find(u => u.id === sesionUserId) || null;
  const meId = usuarioActual?.memberId || null;
  const esAdmin = !!usuarioActual?.esAdmin;

  const evFromRow = r => ({ id: r.id, titulo: r.titulo, categoria: r.categoria, fecha: r.fecha || "", hora: r.hora || "", lugar: r.lugar || "", desc: r.descripcion || "", recurrente: !!r.recurrente, frecuencia: r.frecuencia || "anual", cuota: r.cuota || 0, aportes: r.aportes || [], asistentes: r.asistentes || [], noVan: r.no_van || [], pagos: r.pagos || [], gastos: r.gastos || [], anfitrion: r.anfitrion || null, creadoPor: r.creado_por || null, esPropuesta: !!r.es_propuesta, opcionesFecha: r.opciones_fecha || undefined });
  const evToRow = e => ({ titulo: e.titulo, categoria: e.categoria || "junta", fecha: e.fecha || null, hora: e.hora || null, lugar: e.lugar || null, descripcion: e.desc || null, recurrente: !!e.recurrente, frecuencia: e.frecuencia || "anual", cuota: e.cuota || 0, aportes: e.aportes || [], asistentes: e.asistentes || [], no_van: e.noVan || [], pagos: e.pagos || [], gastos: e.gastos || [], anfitrion: e.anfitrion || null, creado_por: e.creadoPor || null, es_propuesta: !!e.esPropuesta, opciones_fecha: e.opcionesFecha || null });

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => { setSesionUserId(data.session?.user?.id || null); cargarTodo().finally(() => setLoading(false)); });
    const { data: sub } = supabase.auth.onAuthStateChange((event, sess) => {
      setSesionUserId(sess?.user?.id || null);
      if (event === "PASSWORD_RECOVERY") setRecoveryMode(true);
      cargarTodo();
    });
    return () => sub.subscription.unsubscribe();
  }, []);
  useEffect(() => { if (typeof window !== "undefined" && window.location.hash.includes("votacion=")) setTab("reglas"); }, []);
  useEffect(() => { const t = setInterval(() => setAhora(new Date()), 60000); return () => clearInterval(t); }, []);
  useEffect(() => {
    const t = setInterval(() => cargarTodo(), 30000);
    const f = () => cargarTodo();
    window.addEventListener("focus", f);
    return () => { clearInterval(t); window.removeEventListener("focus", f); };
  }, []);
  useEffect(() => { if (!loading && sesionUserId && !usuarios.some(u => u.id === sesionUserId)) asegurarPerfil(); }, [loading, sesionUserId, usuarios]);

  async function cargarTodo() {
    const [miem, ev, po, hi, re, vo, perf, conf] = await Promise.all([
      supabase.from("miembros").select("*"),
      supabase.from("eventos").select("*"),
      supabase.from("posts").select("*"),
      supabase.from("hitos").select("*"),
      supabase.from("reglas").select("*"),
      supabase.from("votaciones").select("*"),
      supabase.from("perfiles").select("*"),
      supabase.from("config").select("*").eq("id", 1).maybeSingle(),
    ]);
    const membersArr = (miem.data || []).map(m => ({ id: m.id, nombre: m.nombre, email: m.email || "", telefono: m.telefono || "", rut: m.rut || "", cumple: m.cumple || "", conyuge: m.conyuge || null, hijos: m.hijos || [] }));
    setMembers(membersArr);
    if (ev.data) setEvents(ev.data.map(evFromRow));
    if (po.data) setPosts(po.data.map(p => ({ id: p.id, autor: p.autor, texto: p.texto || "", foto: p.foto || null, categoria: p.categoria || "general", fecha: p.creado ? new Date(p.creado).getTime() : Date.now(), likes: p.likes || [], comentarios: p.comentarios || [] })));
    if (hi.data) setHitos(hi.data.map(r => ({ id: r.id, nombre: r.nombre, emoji: r.emoji || "🎯", fecha: r.fecha || "", desc: r.descripcion || "" })));
    if (re.data) setReglas(re.data.map(r => ({ id: r.id, texto: r.texto })));
    if (vo.data) setVotaciones(vo.data.map(r => ({ id: r.id, titulo: r.titulo, desc: r.descripcion || "", creadoPor: r.creado_por || null, creada: r.creado ? new Date(r.creado).getTime() : Date.now(), cierra: r.cierra, votosSi: r.votos_si || [], votosNo: r.votos_no || [] })));
    if (perf.data) setUsuarios(perf.data.map(p => { const mem = membersArr.find(m => m.id === p.miembro_id); return { id: p.id, username: mem?.email || "", esAdmin: !!p.es_admin, memberId: p.miembro_id }; }));
    if (conf && conf.data) { setNombrePromo(conf.data.nombre_promo || "Promoción MBA 2024 ESE"); setEnlace(conf.data.enlace || ""); setLogo(conf.data.logo || LOGO_ESE); }
  }

  async function asegurarPerfil() {
    if (creandoPerfil.current) return;
    creandoPerfil.current = true;
    try {
      const { data: ex } = await supabase.from("perfiles").select("id").eq("id", sesionUserId).maybeSingle();
      if (ex) { await cargarTodo(); return; }
      const { data: u } = await supabase.auth.getUser();
      const email = u.user?.email || "";
      const nombre = u.user?.user_metadata?.nombre || email.split("@")[0] || "Nuevo";
      const cumple = u.user?.user_metadata?.cumple || null;
      const { data: mrow, error: em } = await supabase.from("miembros").insert({ nombre, email, cumple }).select().single();
      if (em || !mrow) { await cargarTodo(); return; }
      const { count } = await supabase.from("perfiles").select("*", { count: "exact", head: true });
      const { error: ep } = await supabase.from("perfiles").insert({ id: sesionUserId, miembro_id: mrow.id, es_admin: (count || 0) === 0 });
      if (ep) { await supabase.from("miembros").delete().eq("id", mrow.id); }
      await cargarTodo();
    } finally { creandoPerfil.current = false; }
  }

  async function logout() { await supabase.auth.signOut(); setSesionUserId(null); }
  function traducirAuth(msg) { if (/registered|already/i.test(msg)) return "Ese correo ya tiene cuenta. Inicia sesión."; if (/password/i.test(msg)) return "La contraseña debe tener al menos 6 caracteres."; if (/email/i.test(msg)) return "Revisa que el correo esté bien escrito."; return "No se pudo completar. Intenta de nuevo."; }
  async function registrar({ email, password, nombre, cumple }) {
    const { data, error } = await supabase.auth.signUp({ email, password, options: { data: { nombre, cumple: cumple || null } } });
    if (error) return traducirAuth(error.message);
    if (!data.session) return "Te enviamos un correo para confirmar tu cuenta. Confírmalo y luego inicia sesión.";
    await asegurarPerfil();
    return null;
  }
  async function login({ email, password }) {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return "Correo o contraseña incorrectos.";
    await cargarTodo();
    return null;
  }
  async function enviarRecuperacion(email) {
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin });
    return error ? "No se pudo enviar el correo. Revisa que esté bien escrito." : null;
  }
  async function guardarNuevaClave(nueva) {
    const { error } = await supabase.auth.updateUser({ password: nueva });
    if (error) return "No se pudo actualizar la clave.";
    setRecoveryMode(false);
    return null;
  }
  async function cambiarUsuario(nuevoCorreo) {
    if (!nuevoCorreo) return "El correo no puede quedar vacío.";
    const { error } = await supabase.auth.updateUser({ email: nuevoCorreo });
    return error ? "No se pudo actualizar el correo." : "Te enviamos un correo para confirmar el cambio.";
  }
  async function cambiarClave(actual, nueva) {
    const { error } = await supabase.auth.updateUser({ password: nueva });
    return error ? "No se pudo actualizar la clave." : null;
  }
  async function eliminarUsuario(userId) {
    const u = usuarios.find(x => x.id === userId); if (!u) return;
    if (u.esAdmin && usuarios.filter(x => x.esAdmin).length <= 1) { alert("No puedes quitar al único administrador."); return; }
    if (!confirm("¿Quitar a este usuario de la app? (Perderá el acceso; su cuenta de correo se elimina del todo desde el panel de Supabase.)")) return;
    await supabase.from("perfiles").delete().eq("id", userId);
    await cargarTodo();
    if (userId === sesionUserId) logout();
  }
  async function resetearClave() { alert("Por seguridad, el propio usuario debe usar '¿Olvidaste tu clave?' en la pantalla de inicio: recibirá un correo para crear una nueva."); }
  async function toggleAdminUser(userId) {
    const u = usuarios.find(x => x.id === userId); if (!u) return;
    if (u.esAdmin && usuarios.filter(x => x.esAdmin).length <= 1) { alert("Debe quedar al menos un administrador."); return; }
    await supabase.from("perfiles").update({ es_admin: !u.esAdmin }).eq("id", userId);
    await cargarTodo();
  }
  async function guardarNombre(n) { setNombrePromo(n); await supabase.from("config").update({ nombre_promo: n }).eq("id", 1); }
  async function guardarEnlace(l) { setEnlace(l); await supabase.from("config").update({ enlace: l }).eq("id", 1); }
  async function subirLogo(dataUrl) { setLogo(dataUrl); const { error } = await supabase.from("config").update({ logo: dataUrl }).eq("id", 1); if (error) alert("El logo pesa demasiado, prueba una imagen más pequeña."); }
  async function importarRespaldo() { alert("En la versión web los datos viven seguros en Supabase. La descarga .json es tu respaldo; para restaurar por completo, escríbeme y lo hacemos desde el panel de Supabase."); }

  // Miembros
  async function guardarMiembro(m) {
    const exists = members.some(x => x.id === m.id);
    const row = { nombre: m.nombre, email: m.email || null, telefono: m.telefono || null, rut: m.rut || null, cumple: m.cumple || null, conyuge: m.conyuge || null, hijos: m.hijos || [] };
    if (exists) await supabase.from("miembros").update(row).eq("id", m.id);
    else await supabase.from("miembros").insert(row);
    await cargarTodo();
  }
  async function borrarMiembro(id) {
    if (!confirm("¿Eliminar este miembro?")) return;
    await supabase.from("perfiles").delete().eq("miembro_id", id);
    await supabase.from("miembros").delete().eq("id", id);
    for (const ev of events) {
      const toca = (ev.asistentes || []).includes(id) || (ev.noVan || []).includes(id) || (ev.pagos || []).includes(id) || ev.anfitrion === id || (ev.aportes || []).some(a => a.asignadoA === id);
      if (toca) { const upd = { ...ev, asistentes: (ev.asistentes || []).filter(a => a !== id), noVan: (ev.noVan || []).filter(a => a !== id), pagos: (ev.pagos || []).filter(p => p !== id), anfitrion: ev.anfitrion === id ? null : ev.anfitrion, aportes: (ev.aportes || []).map(a => a.asignadoA === id ? { ...a, asignadoA: null } : a) }; await supabase.from("eventos").update(evToRow(upd)).eq("id", ev.id); }
    }
    await cargarTodo();
    if (meId === id) logout();
  }
  // Eventos
  async function guardarEvento(ev) {
    const exists = events.some(x => x.id === ev.id);
    if (exists) await supabase.from("eventos").update(evToRow(ev)).eq("id", ev.id);
    else await supabase.from("eventos").insert(evToRow({ ...ev, creadoPor: ev.creadoPor || meId }));
    await cargarTodo();
  }
  async function borrarEvento(id) { if (!confirm("¿Eliminar este evento?")) return; await supabase.from("eventos").delete().eq("id", id); await cargarTodo(); }
  async function actualizarEvento(evId, fn) { const ev = events.find(e => e.id === evId); if (!ev) return; await supabase.from("eventos").update(evToRow(fn(ev))).eq("id", evId); await cargarTodo(); }
  function setEstado(evId, estado) { actualizarEvento(evId, ev => { let asist = (ev.asistentes || []).filter(x => x !== meId), no = (ev.noVan || []).filter(x => x !== meId); if (estado === "voy") { if (!(ev.asistentes || []).includes(meId)) asist.push(meId); } else if (estado === "no") { if (!(ev.noVan || []).includes(meId)) no.push(meId); } return { ...ev, asistentes: asist, noVan: no }; }); }
  function setAnfitrion(evId, id) { actualizarEvento(evId, ev => ({ ...ev, anfitrion: ev.anfitrion === id ? null : id })); }
  function togglePago(evId) { actualizarEvento(evId, ev => { const p = ev.pagos || []; return { ...ev, pagos: p.includes(meId) ? p.filter(x => x !== meId) : [...p, meId] }; }); }
  function tomarAporte(evId, aId, yaTomado) { actualizarEvento(evId, ev => ({ ...ev, aportes: ev.aportes.map(a => { if (a.id !== aId) return a; if (yaTomado && a.asignadoA === meId) return { ...a, asignadoA: null }; if (yaTomado && a.asignadoA !== meId) return a; return { ...a, asignadoA: meId }; }) })); }
  function votarFecha(evId, opId) { actualizarEvento(evId, ev => ({ ...ev, opcionesFecha: ev.opcionesFecha.map(o => ({ ...o, votos: o.id === opId ? ((o.votos || []).includes(meId) ? o.votos.filter(x => x !== meId) : [...(o.votos || []), meId]) : (o.votos || []).filter(x => x !== meId) })) })); }
  function fijarFecha(evId, opId) { actualizarEvento(evId, ev => { const o = ev.opcionesFecha.find(x => x.id === opId); return { ...ev, esPropuesta: false, fecha: o.fecha, hora: o.hora, opcionesFecha: null, recurrente: false, frecuencia: "anual" }; }); }
  async function guardarCuentas(ev) { await supabase.from("eventos").update(evToRow(ev)).eq("id", ev.id); setCuentasEv(ev); await cargarTodo(); }
  // Muro
  async function addPost(p) { await supabase.from("posts").insert({ autor: meId, texto: p.texto || null, foto: p.foto || null, categoria: p.categoria || "general", likes: [], comentarios: [] }); await cargarTodo(); }
  async function likePost(id) { const p = posts.find(x => x.id === id); if (!p) return; const likes = (p.likes || []).includes(meId) ? p.likes.filter(x => x !== meId) : [...(p.likes || []), meId]; await supabase.from("posts").update({ likes }).eq("id", id); await cargarTodo(); }
  async function comentar(id, texto) { const p = posts.find(x => x.id === id); if (!p) return; const comentarios = [...(p.comentarios || []), { id: uid(), autor: meId, texto, fecha: Date.now() }]; await supabase.from("posts").update({ comentarios }).eq("id", id); await cargarTodo(); }
  async function borrarPost(id) { if (!confirm("¿Borrar publicación?")) return; await supabase.from("posts").delete().eq("id", id); await cargarTodo(); }
  // Hitos
  async function addHito(h) { await supabase.from("hitos").insert({ nombre: h.nombre, emoji: h.emoji, fecha: h.fecha || null, descripcion: h.desc || null }); await cargarTodo(); }
  async function delHito(id) { await supabase.from("hitos").delete().eq("id", id); await cargarTodo(); }
  // Reglas / votaciones
  async function addRegla(t) { await supabase.from("reglas").insert({ texto: t }); await cargarTodo(); }
  async function delRegla(id) { await supabase.from("reglas").delete().eq("id", id); await cargarTodo(); }
  async function addVotacion(titulo, desc, cierra) { await supabase.from("votaciones").insert({ titulo, descripcion: desc || null, creado_por: meId, cierra: cierra || new Date(Date.now() + 7 * 86400000).toISOString(), votos_si: [], votos_no: [] }); await cargarTodo(); }
  async function votar(id, op) { const v = votaciones.find(x => x.id === id); if (!v) return; let si = (v.votosSi || []).filter(x => x !== meId), no = (v.votosNo || []).filter(x => x !== meId); if (op === "si") si.push(meId); else no.push(meId); await supabase.from("votaciones").update({ votos_si: si, votos_no: no }).eq("id", id); await cargarTodo(); }

  const tabsPrinc = [{ id: "inicio", label: "Inicio", emoji: "🏠" }, { id: "muro", label: "Muro", emoji: "📸" }, { id: "eventos", label: "Eventos", emoji: "📅" }, { id: "cumples", label: "Cumples", emoji: "🎂" }];
  const tabsMas = [{ id: "hitos", label: "Hitos", emoji: "🎯" }, { id: "miembros", label: "Miembros", emoji: "👥" }, { id: "ranking", label: "Ranking", emoji: "🏆" }, { id: "reglas", label: "Reglamento", emoji: "📜" }, { id: "perfil", label: "Mi Perfil", emoji: "🙂" }];
  const todasTabs = [...tabsPrinc, ...tabsMas];
  function irA(id) { setTab(id); setMasOpen(false); }

  if (loading) return <div className="min-h-screen bg-ese-50 flex items-center justify-center text-ese-400 text-sm">Cargando… ✨</div>;
  if (recoveryMode) return <NuevaClaveScreen nombrePromo={nombrePromo} logo={logo} onGuardar={guardarNuevaClave} />;
  if (!sesionUserId) return <Auth nombrePromo={nombrePromo} logo={logo} onRegister={registrar} onLogin={login} onRecuperar={enviarRecuperacion} />;
  if (!usuarioActual) return <div className="min-h-screen bg-ese-50 flex items-center justify-center text-ese-400 text-sm">Preparando tu perfil… ✨</div>;

  return (
    <div className="min-h-screen bg-ese-50 font-sans text-slate-800 pb-24 sm:pb-6">
      <header className="bg-gradient-to-r from-ese-700 to-ese-500 sticky top-0 z-40 shadow-md">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-3">
          <div className="shrink-0"><EmblemaESE logo={logo} size={38} /></div>
          <div className="min-w-0 flex-1">
            {esAdmin
              ? <input value={nombrePromo} onChange={e => setNombrePromo(e.target.value)} onBlur={() => guardarNombre(nombrePromo)} className="font-extrabold text-lg text-white bg-transparent outline-none w-full truncate" />
              : <p className="font-extrabold text-lg text-white truncate">{nombrePromo}</p>}
            <p className="text-[11px] text-white/70 -mt-0.5">{usuarioActual ? `Hola, ${members.find(m => m.id === meId)?.nombre?.split(" ")[0] || ""} 👋` : "La red de la promo"}</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setInvitarOpen(true)} title="Invitar / Compartir" className="bg-white/20 hover:bg-white/30 text-white rounded-xl p-2"><Share2 size={16} /></button>
            {esAdmin && <button onClick={() => setRespaldoOpen(true)} title="Administración" className="bg-white/20 hover:bg-white/30 text-white rounded-xl p-2"><Shield size={16} /></button>}
            <button onClick={logout} title="Cerrar sesión" className="bg-white/20 hover:bg-white/30 text-white rounded-xl p-2"><LogOut size={16} /></button>
          </div>
        </div>
        <div className="hidden sm:block"><div className="max-w-3xl mx-auto px-4 flex gap-1 pb-1 flex-wrap">{todasTabs.map(t => (
          <button key={t.id} onClick={() => irA(t.id)} className={`flex items-center gap-1.5 px-3 py-2 text-sm rounded-t-xl ${tab === t.id ? "bg-ese-50 text-ese-700 font-bold" : "text-white/80 hover:text-white"}`}><span>{t.emoji}</span> {t.label}</button>
        ))}</div></div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-5">
        {tab === "inicio" && <Inicio members={members} events={events} meId={meId} ahora={ahora} setTab={irA} setEstado={setEstado} setAnfitrion={setAnfitrion} />}
        {tab === "muro" && <Muro posts={posts} members={members} meId={meId} onPost={addPost} onLike={likePost} onComentar={comentar} onBorrar={borrarPost} />}
        {tab === "eventos" && <Eventos events={events} members={members} meId={meId} onEdit={ev => setModal({ tipo: "evento", data: ev })} onDelete={borrarEvento} setEstado={setEstado} setAnfitrion={setAnfitrion} tomarAporte={tomarAporte} togglePago={togglePago} fijarFecha={fijarFecha} votarFecha={votarFecha} abrirCuentas={setCuentasEv} />}
        {tab === "cumples" && <Cumples members={members} onAgregar={() => setModal({ tipo: "miembro", data: members.find(m => m.id === meId) })} />}
        {tab === "hitos" && <Hitos hitos={hitos} meId={meId} onAdd={addHito} onDelete={delHito} />}
        {tab === "miembros" && <Miembros members={members} meId={meId} esAdmin={esAdmin} onEdit={m => setModal({ tipo: "miembro", data: m })} onDelete={borrarMiembro} />}
        {tab === "ranking" && <Ranking members={members} events={events} />}
        {tab === "reglas" && <Reglamento reglas={reglas} votaciones={votaciones} members={members} meId={meId} onAddRegla={addRegla} onDelRegla={delRegla} onAddVotacion={addVotacion} onVotar={votar} />}
        {tab === "perfil" && <MiPerfil member={members.find(m => m.id === meId)} usuario={usuarioActual} esAdmin={esAdmin} onEditarDatos={() => setModal({ tipo: "miembro", data: members.find(m => m.id === meId) })} onCambiarUsuario={cambiarUsuario} onCambiarClave={cambiarClave} />}
      </main>

      {((tab === "eventos" || tab === "inicio") || (tab === "miembros" && esAdmin)) && (
        <button onClick={() => setModal({ tipo: tab === "miembros" ? "miembro" : "evento", data: null })} className="fixed bottom-20 sm:bottom-6 right-4 sm:right-[calc(50%-24rem)] z-40 w-14 h-14 rounded-2xl bg-gradient-to-br from-ese-700 to-ese-500 text-white shadow-lg flex items-center justify-center hover:scale-105 transition-transform"><Plus size={26} /></button>
      )}

      <nav className="sm:hidden fixed bottom-0 inset-x-0 bg-white border-t border-slate-100 z-40"><div className="flex">
        {tabsPrinc.map(t => <button key={t.id} onClick={() => irA(t.id)} className={`flex-1 flex flex-col items-center gap-0.5 py-2 ${tab === t.id ? "text-ese-700" : "text-slate-400"}`}><span className="text-lg leading-none">{t.emoji}</span><span className="text-[10px] font-medium">{t.label}</span></button>)}
        <button onClick={() => setMasOpen(true)} className={`flex-1 flex flex-col items-center gap-0.5 py-2 ${tabsMas.some(t => t.id === tab) ? "text-ese-700" : "text-slate-400"}`}><MoreHorizontal size={20} /><span className="text-[10px] font-medium">Más</span></button>
      </div></nav>

      {masOpen && (
        <div className="sm:hidden fixed inset-0 z-50 bg-slate-900/40 flex items-end" onClick={() => setMasOpen(false)}>
          <div className="bg-white w-full rounded-t-3xl p-4" onClick={e => e.stopPropagation()}>
            <div className="w-10 h-1 bg-slate-200 rounded-full mx-auto mb-4" />
            <div className="grid grid-cols-4 gap-3">{tabsMas.map(t => <button key={t.id} onClick={() => irA(t.id)} className="flex flex-col items-center gap-1.5 py-3 rounded-2xl bg-ese-50"><span className="text-2xl">{t.emoji}</span><span className="text-xs font-semibold text-slate-600">{t.label}</span></button>)}</div>
          </div>
        </div>
      )}

      {modal?.tipo === "miembro" && <Modal titulo={modal.data ? "Editar miembro" : "Nuevo miembro 👤"} onClose={() => setModal(null)}><MemberForm inicial={modal.data} onSave={guardarMiembro} onClose={() => setModal(null)} /></Modal>}
      {modal?.tipo === "evento" && <Modal titulo={modal.data ? "Editar evento" : "Nuevo evento 🎉"} onClose={() => setModal(null)}><EventForm inicial={modal.data} members={members} onSave={guardarEvento} onClose={() => setModal(null)} /></Modal>}
      {cuentasEv && <CuentasModal ev={events.find(e => e.id === cuentasEv.id) || cuentasEv} members={members} meId={meId} onClose={() => setCuentasEv(null)} onSave={guardarCuentas} />}
      {respaldoOpen && esAdmin && <AdminPanel datos={{ members, events, hitos, posts, reglas, votaciones, usuarios, nombrePromo, enlace, logo }} usuarios={usuarios} members={members} meUserId={sesionUserId} onClose={() => setRespaldoOpen(false)} onImportar={importarRespaldo} onEliminarUsuario={eliminarUsuario} onResetClave={resetearClave} onToggleAdmin={toggleAdminUser} />}
      {invitarOpen && <InvitarModal nombrePromo={nombrePromo} logo={logo} enlace={enlace} esAdmin={esAdmin} onClose={() => setInvitarOpen(false)} onGuardarEnlace={guardarEnlace} onSubirLogo={subirLogo} />}
    </div>
  );
}
