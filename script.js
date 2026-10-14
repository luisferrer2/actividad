// ============================================================
// Panel de Gestión de Usuarios
// Consume https://jsonplaceholder.typicode.com/users
// Los cambios se guardan en localStorage; la lista arranca vacía.
// ============================================================

const URL_API = "https://jsonplaceholder.typicode.com/users";
const CLAVE_GUARDADO = "panelUsuarios.usuarios";   // clave en localStorage

// ---------- Referencias al DOM ----------
const form = document.querySelector("#formUsuario");
const inputId = document.querySelector("#id");
const inputNombre = document.querySelector("#nombre");
const inputCorreo = document.querySelector("#correo");
const inputCiudad = document.querySelector("#ciudad");
const btnSubmit = document.querySelector("#btnSubmit");
const btnCancelar = document.querySelector("#btnCancelar");
const btnApi = document.querySelector("#btnApi");
const tituloForm = document.querySelector("#tituloForm");
const buscador = document.querySelector("#buscador");
const tbody = document.querySelector("#tbodyUsuarios");
const mensaje = document.querySelector("#mensaje");
const resumen = document.querySelector("#resumen");

// ---------- Estado ----------
let usuarios = [];          // array de objetos { id, nombre, correo, ciudad }
let idEditando = null;      // null = modo "agregar"; número = modo "modificar"

// ---------- Guardado en el navegador (localStorage) ----------
// Los cambios se guardan automáticamente y se recuperan al reabrir la página.
const guardarUsuarios = () => {
  try {
    localStorage.setItem(CLAVE_GUARDADO, JSON.stringify(usuarios));
  } catch (error) {
    console.error("No se pudo guardar:", error);
    mostrarMensaje("No se pudieron guardar los cambios en este navegador.", "error");
  }
};

const leerUsuariosGuardados = () => {
  try {
    const texto = localStorage.getItem(CLAVE_GUARDADO);
    return texto ? JSON.parse(texto) : [];
  } catch (error) {
    console.error("No se pudo leer lo guardado:", error);
    return [];
  }
};

// ---------- Mensajes de estado ----------
// tipo: "info" | "ok" | "error"
const mostrarMensaje = (texto, tipo = "info") => {
  mensaje.textContent = texto;
  mensaje.className = `mensaje ${tipo}`;
};

// ---------- Carga de datos (fetch + async/await + try/catch) ----------
// Ya no se ejecuta sola: se usa con el botón "Cargar usuarios de ejemplo".
const cargarUsuarios = async () => {
  mostrarMensaje("Cargando usuarios...", "info");
  try {
    const res = await fetch(URL_API);
    if (!res.ok) throw new Error(`Respuesta ${res.status}`);
    const datos = await res.json();

    // map(): nos quedamos solo con los campos que necesita la tabla
    const deApi = datos.map(({ id, name, email, address }) => ({
      id,
      nombre: name,
      correo: email,
      ciudad: address.city
    }));

    // filter(): solo se agregan los que aún no existen (por id)
    const nuevos = deApi.filter((u) => !usuarios.some((x) => x.id === u.id));
    usuarios = [...usuarios, ...nuevos];

    mostrarMensaje(
      nuevos.length > 0
        ? `Se agregaron ${nuevos.length} usuarios desde la API.`
        : "Los usuarios de la API ya estaban en tu lista.",
      "ok"
    );
    listaCambio();
  } catch (error) {
    console.error("Error al cargar usuarios:", error);
    mostrarMensaje("No pudimos cargar los usuarios. Revisa tu conexión e intenta de nuevo.", "error");
  }
};

// ---------- Resumen: cuenta usuarios por ciudad (usa un bucle for) ----------
const actualizarResumen = () => {
  const porCiudad = {};
  for (const { ciudad } of usuarios) {
    porCiudad[ciudad] = (porCiudad[ciudad] || 0) + 1;
  }
  const totalCiudades = Object.keys(porCiudad).length;
  resumen.textContent = `${usuarios.length} usuarios en ${totalCiudades} ciudades`;
};

// ---------- Dibujo de la tabla ----------
const renderTabla = () => {
  const termino = buscador.value.trim().toLowerCase();

  // filter(): búsqueda en vivo sin modificar el array original
  const visibles = usuarios.filter(({ nombre }) => nombre.toLowerCase().includes(termino));

  if (visibles.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" class="vacio">No hay usuarios para mostrar. Agrega el primero con el formulario.</td></tr>`;
    return;
  }

  // map(): cada usuario se convierte en una fila (template string + destructuring)
  tbody.innerHTML = visibles.map(({ id, nombre, correo, ciudad }) => `
    <tr>
      <td>${id}</td>
      <td>${escapar(nombre)}</td>
      <td>${escapar(correo)}</td>
      <td>${escapar(ciudad)}</td>
      <td class="celdas-acciones">
        <button type="button" class="btn btn-editar" data-accion="editar" data-id="${id}">Editar</button>
        <button type="button" class="btn btn-eliminar" data-accion="eliminar" data-id="${id}">Eliminar</button>
      </td>
    </tr>`).join("");
};

// Evita que el texto escrito por el usuario se interprete como HTML
const escapar = (texto) => String(texto)
  .replace(/&/g, "&amp;").replace(/</g, "&lt;")
  .replace(/>/g, "&gt;").replace(/"/g, "&quot;");

// Se llama cada vez que cambia la lista: imprime el array y redibuja
const listaCambio = () => {
  console.log(JSON.stringify(usuarios, null, 2));
  guardarUsuarios();
  actualizarResumen();
  renderTabla();
};

// ---------- Validación ----------
// Devuelve un código de resultado; el mensaje se elige luego con switch
const validarFormulario = ({ id, nombre, correo, ciudad }, esNuevo) => {
  const campos = [id, nombre, correo, ciudad];
  for (const valor of campos) {              // bucle: ningún campo vacío
    if (valor === "") return "VACIO";
  }
  if (isNaN(Number(id)) || !Number.isInteger(Number(id)) || Number(id) <= 0) return "ID_NO_NUMERO";
  if (!correo.includes("@")) return "CORREO_INVALIDO";
  if (esNuevo && usuarios.some((u) => u.id === Number(id))) return "ID_REPETIDO";
  return "OK";
};

const mensajeDeValidacion = (codigo, id) => {
  switch (codigo) {
    case "VACIO":           return "Completa todos los campos.";
    case "ID_NO_NUMERO":    return "El id debe ser un número entero mayor que 0.";
    case "CORREO_INVALIDO": return "El correo debe contener '@'.";
    case "ID_REPETIDO":     return `Ya existe un usuario con el id ${id}.`;
    default:                return "";
  }
};

// ---------- Modo del formulario ----------
const salirDeEdicion = () => {
  idEditando = null;
  form.reset();
  inputId.disabled = false;
  btnSubmit.textContent = "Agregar";
  tituloForm.textContent = "Nuevo usuario";
  btnCancelar.hidden = true;
};

// ---------- Eventos ----------
// Enviar formulario: agregar o guardar cambios
form.addEventListener("submit", (event) => {
  event.preventDefault();

  const datos = {
    id: inputId.value.trim(),
    nombre: inputNombre.value.trim(),
    correo: inputCorreo.value.trim(),
    ciudad: inputCiudad.value.trim()
  };

  // Al editar, el id está bloqueado: se toma de la variable de estado
  if (idEditando !== null) datos.id = String(idEditando);

  const codigo = validarFormulario(datos, idEditando === null);
  if (codigo !== "OK") {
    mostrarMensaje(mensajeDeValidacion(codigo, datos.id), "error");
    return;
  }

  const { nombre, correo, ciudad } = datos;
  const id = Number(datos.id);

  if (idEditando === null) {
    usuarios = [...usuarios, { id, nombre, correo, ciudad }];
    mostrarMensaje(`Usuario "${nombre}" agregado correctamente.`, "ok");
  } else {
    // Actualiza el objeto buscándolo por su id
    usuarios = usuarios.map((u) => (u.id === id ? { id, nombre, correo, ciudad } : u));
    mostrarMensaje(`Usuario "${nombre}" actualizado correctamente.`, "ok");
  }

  salirDeEdicion();
  listaCambio();
});

// Búsqueda en vivo
buscador.addEventListener("input", renderTabla);

// Cargar usuarios de ejemplo desde la API (opcional)
btnApi.addEventListener("click", cargarUsuarios);

// Cancelar edición
btnCancelar.addEventListener("click", () => {
  salirDeEdicion();
  mostrarMensaje("Edición cancelada.", "info");
});

// Delegación de eventos: un solo listener en el tbody para Editar / Eliminar
tbody.addEventListener("click", (event) => {
  const boton = event.target.closest("button[data-accion]");
  if (!boton) return;

  const { accion, id } = boton.dataset;
  const usuario = usuarios.find((u) => u.id === Number(id));
  if (!usuario) return;

  if (accion === "editar") {
    const { id: uid, nombre, correo, ciudad } = usuario;
    inputId.value = uid;
    inputNombre.value = nombre;
    inputCorreo.value = correo;
    inputCiudad.value = ciudad;
    inputId.disabled = true;               // id bloqueado
    idEditando = uid;
    btnSubmit.textContent = "Guardar cambios";
    tituloForm.textContent = `Editando usuario ${uid}`;
    btnCancelar.hidden = false;
    inputNombre.focus();
    mostrarMensaje(`Editando a "${nombre}".`, "info");
  }

  if (accion === "eliminar") {
    if (confirm(`¿Eliminar a "${usuario.nombre}"?`)) {
      usuarios = usuarios.filter((u) => u.id !== usuario.id);
      if (idEditando === usuario.id) salirDeEdicion();
      mostrarMensaje(`Usuario "${usuario.nombre}" eliminado.`, "ok");
      listaCambio();
    }
  }
});

// ---------- Inicio ----------
// Arranca con lo guardado (vacío la primera vez)
usuarios = leerUsuariosGuardados();
actualizarResumen();
renderTabla();
if (usuarios.length > 0) mostrarMensaje(`Se recuperaron ${usuarios.length} usuarios guardados.`, "info");
