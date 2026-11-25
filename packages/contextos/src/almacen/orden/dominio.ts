import { EstadoEtiqueta } from "#/comun/diseño.ts";
import { ClausulaFiltro } from "@olula/lib/diseño.ts";
import { MetaModelo, plugin } from "@olula/lib/dominio.ts";
import {
    AgenciaEnvio,
    AlbaranGenerado,
    DatosEnvioAlbaran,
    DestinatarioEnvio,
    DiferenciaPedidoOrden,
    FuncionAgencia,
    ItemOrdenAlmacen,
    LineaOrdenAlmacen,
    MotivoRecorridoFormula,
    NuevoEnvioAgencia,
    NuevoManifiestoEnvios,
    LineaEnvio,
    OrdenAlmacen,
    PasoSeguimientoEnvio,
} from "./diseño.ts";

export const ERR_SKU_REQUERIDO = "El SKU es requerido";
export const ERR_CANTIDAD_PREVISTA_REQUERIDA = "La cantidad prevista es requerida";

export const ordenVacia = (): OrdenAlmacen => ({
    id: "",
    fecha: new Date().toISOString().slice(0, 10),
    tipo: "ENTRADA",
    almacenId: "",
    almacen: "",
    abierta: true,
    estado: "",
    descripcion: "",
    idUbicacionOrigen: null,
    ubicacionOrigen: null,
    idCajaOrigen: null,
    idUbicacionDestino: null,
    ubicacionDestino: null,
    idCajaDestino: null,
    lineas: [],
    lecturasCaja: [],
    albaranes: [],
    tieneCajas: false,
    pasosPick: null,
    pasosDrop: null,
});

export const lineaOrdenVacia = (): LineaOrdenAlmacen => ({
    id: "",
    sku: "",
    articulo: "",
    loteId: null,
    cantidadPrevista: 0,
    idUbicacionOrigen: null,
    ubicacionOrigen: null,
    idCajaOrigen: null,
    cajaOrigen: null,
    idUbicacionDestino: null,
    ubicacionDestino: null,
    idCajaDestino: null,
    cajaDestino: null,
    pedidoVentaId: null,
    pedidoVenta: null,
    cliente: null,
    cambioPedido: null,
    cantidadPedidoAnterior: null,
    lecturas: [],
    porLotes: false,
    idLineaPick: null,
    pasosPick: null,
    pasosDrop: null,
});

const onOrdenCambiada = (orden: OrdenAlmacen, campo: string, _: unknown, otros?: Record<string, unknown>) => {
    if (campo === "idCajaDestino" && otros) {

        const nuevoValor: OrdenAlmacen = {
            ...orden,
            idUbicacionDestino: otros.idUbicacion as string,
            codUbicacionDestino: otros.codUbicacion as string,
        }
        return nuevoValor
    }
    else if (campo === "idCajaOrigen" && otros) {

        const nuevoValor: OrdenAlmacen = {
            ...orden,
            idUbicacionOrigen: otros.idUbicacion as string,
            codUbicacionOrigen: otros.codUbicacion as string,
        }
        return nuevoValor
    }
    return orden
}

export const metaOrden: MetaModelo<OrdenAlmacen> = {
    campos: {
        tipo: { requerido: true },
        almacenId: { requerido: true },
        fecha: { requerido: true },
        abierta: { tipo: "checkbox", requerido: true },
        idCajaOrigen: {},
        idUbicacionOrigen: {},
        idCajaDestino: {},
        idUbicacionDestino: {},
    },
    onChange: onOrdenCambiada
};



export const metaNuevaLinea: MetaModelo<LineaOrdenAlmacen> = {
    campos: {
        sku: {
            validacion: (linea) => {
                if (linea.sku === null || linea.sku === undefined || linea.sku === "") {
                    return ERR_SKU_REQUERIDO;
                }
                return true;
            },
        },
        cantidadPrevista: {
            tipo: "numero",
            validacion: (linea) => {
                if (linea.cantidadPrevista === null || linea.cantidadPrevista === undefined) {
                    return ERR_CANTIDAD_PREVISTA_REQUERIDA;
                }
                return true;
            },
        },
    },
};

/** Id del usuario con sesión iniciada (de `whoami` en localStorage), o null. */
export const usuarioActualId = (): string | null => {
    try {
        const raw = localStorage.getItem("whoami");
        return raw ? (JSON.parse(raw) as { usuario_id?: string }).usuario_id ?? null : null;
    } catch {
        return null;
    }
};

/**
 * Una orden se puede adquirir si no está terminada y está libre o ya es del usuario.
 * Adquirir la propia sirve para liberar al usuario del resto de órdenes abiertas.
 */
export const ordenAdquirible = (
    orden: Pick<ItemOrdenAlmacen, "estado" | "idResponsable">,
    usuarioId: string | null,
): boolean =>
    usuarioId !== null &&
    (orden.estado === "PENDIENTE" || orden.estado === "EN_CURSO") &&
    (orden.idResponsable === null || orden.idResponsable === usuarioId);

/**
 * Una SALIDA con todas las lecturas hechas queda PREPARADA: solo pasa a
 * TERMINADA al generar su albarán.
 */
/** Material recogido de más en la línea (el pedido se redujo después de recogerlo). */
export const sobranteLinea = (linea: Pick<LineaOrdenAlmacen, "cantidadPrevista" | "cantidadReal" | "cantidadPick">): number =>
    Math.max(0, Math.max(linea.cantidadReal ?? 0, linea.cantidadPick ?? 0) - linea.cantidadPrevista);

export type PedidoDeOrden = { id: string; codigo: string; cliente: string | null };

/** El pedido de venta de la orden si todas sus líneas con pedido son del mismo; null si no hay o hay varios. */
export const pedidoUnicoDeOrden = (orden: Pick<OrdenAlmacen, "lineas">): PedidoDeOrden | null => {
    const conPedido = orden.lineas.filter((l) => l.pedidoVentaId);
    const ids = new Set(conPedido.map((l) => l.pedidoVentaId));
    if (ids.size !== 1) return null;
    const linea = conPedido[0];
    return {
        id: linea.pedidoVentaId as string,
        codigo: linea.pedidoVenta ?? (linea.pedidoVentaId as string),
        cliente: linea.cliente,
    };
};

/** Texto de la marca de una línea cambiada en el pedido después de generar la salida. */
export const textoCambioPedido = (
    linea: Pick<LineaOrdenAlmacen, "cambioPedido" | "cantidadPedidoAnterior">,
): string | null => {
    switch (linea.cambioPedido) {
        case "ANADIDA":
            return "Añadida en pedido";
        case "BORRADA":
            return "Borrada en pedido";
        case "CAMBIADA":
            return linea.cantidadPedidoAnterior != null
                ? `Cambiada en pedido (antes ${linea.cantidadPedidoAnterior})`
                : "Cambiada en pedido";
        default:
            return null;
    }
};

/** Frase del aviso al albaranar para una línea de pedido que no cuadra con la orden. */
export const textoDiferenciaPedido = (d: DiferenciaPedidoOrden): string => {
    const articulo = [d.sku, d.descripcion].filter(Boolean).join(" ");
    const pedido = d.pedido ? `${d.pedido}: ` : "";
    if (d.tipo === "FALTA") {
        const otras = d.enOtrasSalidas > 0 ? `, ${d.enOtrasSalidas} en otras salidas` : "";
        return `${pedido}${articulo}. Faltan ${d.diferencia} (el pedido tiene pendiente ${d.pendientePedido}, la orden saca ${d.enOrden}${otras}).`;
    }
    return `${pedido}${articulo}. Sobran ${d.diferencia} (el pedido tiene pendiente ${d.pendientePedido}, la orden saca ${d.enOrden}).`;
};

export const lineasConSobrante = (orden: Pick<OrdenAlmacen, "lineas">): LineaOrdenAlmacen[] =>
    orden.lineas.filter((l) => sobranteLinea(l) > 0);

/** Una salida preparada se albarana; si tiene sobrante, antes hay que devolverlo. */
export const ordenAlbaranable = (
    orden: Pick<OrdenAlmacen, "tipo" | "estado"> & Partial<Pick<OrdenAlmacen, "lineas">>,
): boolean =>
    orden.tipo === "SALIDA" && orden.estado === "PREPARADA" && lineasConSobrante({ lineas: orden.lineas ?? [] }).length === 0;

const ETIQUETAS_ESTADO_ORDEN: Record<string, EstadoEtiqueta> = {
    PENDIENTE: { texto: "Pendiente", tono: "borrador" },
    EN_CURSO: { texto: "En curso", tono: "pendiente" },
    PREPARADA: { texto: "Preparada", tono: "parcial" },
    TERMINADA: { texto: "Terminada", tono: "completado" },
};

export const etiquetaEstadoOrden = (orden: Pick<OrdenAlmacen, "estado">): EstadoEtiqueta =>
    ETIQUETAS_ESTADO_ORDEN[orden.estado] ?? { texto: orden.estado, tono: "borrador" };

/** Por defecto el maestro muestra solo las órdenes abiertas (incluidas las pendientes de albaranar). */
export const ESTADOS_ORDEN_DEFECTO: string[] = ["EN_CURSO", "PENDIENTE", "PREPARADA"];

export const opcionesEstadoOrden = [
    { valor: "PENDIENTE", descripcion: "Pendiente" },
    { valor: "EN_CURSO", descripcion: "En curso" },
    { valor: "PREPARADA", descripcion: "Preparada" },
    { valor: "TERMINADA", descripcion: "Terminada" },
];

const comoLista = (valor: unknown): string[] =>
    Array.isArray(valor)
        ? valor.map(String).filter(Boolean)
        : typeof valor === "string"
            ? valor.split(",").map((v) => v.trim()).filter(Boolean)
            : [];

export const filtroEstadoOrden = (valor: unknown): ClausulaFiltro | null => {
    const estados = comoLista(valor);
    if (!estados.length) return null;
    return ["estado", "in", estados as unknown as string] as ClausulaFiltro;
};

export const estadosOrdenDesdeFiltro = (filtro: ClausulaFiltro[]): string[] => {
    const clausula = filtro.find(([campo, operador]) => campo === "estado" && operador === "in");
    return clausula ? comoLista(clausula[2]) : [];
};

// Envío por agencia

/** Plugins de agencia de transporte del servidor (comandos/almacen/envio_agencia/agencias.py). */
export const PLUGINS_AGENCIA_ENVIO = ["transporte_dachser", "transporte_correose"];

export const hayAgenciasEnvio = (): boolean =>
    PLUGINS_AGENCIA_ENVIO.some((nombre) => plugin(nombre) === "activo");

export const albaranesSinEnvio = (orden: OrdenAlmacen): AlbaranGenerado[] =>
    orden.albaranes.filter((a) => !a.numeroTracking);

export const ordenPermiteEnvio = (orden: OrdenAlmacen, hayAgencias: boolean): boolean =>
    hayAgencias
    && orden.tipo === "SALIDA"
    && orden.estado === "TERMINADA"
    && albaranesSinEnvio(orden).length > 0;

export const metaNuevoEnvioAgencia: MetaModelo<NuevoEnvioAgencia> = {
    campos: {
        albaranId: { requerido: true },
        agenciaId: { requerido: true },
        servicio: { requerido: true },
        bultos: {
            tipo: "entero",
            requerido: true,
            validacion: (m) => (Number.isInteger(m.bultos) && m.bultos > 0)
                || "Debe haber al menos un bulto",
        },
        kilos: {
            tipo: "decimal",
            requerido: true,
            validacion: (m) => m.kilos > 0 || "Los kilos deben ser mayores que 0",
        },
        fechaRecogida: { tipo: "fecha", requerido: true },
        observaciones: { requerido: false },
        posicionEtiqueta: { requerido: false },
        crearRecogida: { tipo: "checkbox", requerido: false },
        agrupadoEnPales: { tipo: "checkbox", requerido: false },
        tipoPale: { requerido: false },
        numPales: {
            tipo: "entero",
            requerido: false,
            validacion: (m) => !m.agrupadoEnPales || (Number.isInteger(Number(m.numPales)) && Number(m.numPales) > 0)
                || "Debe haber al menos un palé",
        },
        // Lo que Eneboo exige del destinatario antes de llamar a la agencia (validateFormCEX).
        destNombre: { requerido: true },
        destNif: { requerido: false },
        destTipoVia: { requerido: false },
        destVia: { requerido: true },
        destNumero: { requerido: false },
        destOtros: { requerido: false },
        destCodPostal: { requerido: true },
        destCiudad: { requerido: true },
        destProvincia: { requerido: false },
        destCodPaisIso: { requerido: false },
        destContacto: { requerido: true },
        destTelefono: { requerido: true },
        destEmail: { requerido: false },
    },
    onChange: (envio, campo) =>
        // Los servicios y las posiciones dependen de la agencia: al cambiarla, se eligen de nuevo.
        campo === "agenciaId"
            ? { ...envio, servicio: "", posicionEtiqueta: POSICION_ETIQUETA_PRIMERA, crearRecogida: false }
            : envio,
};

/** Por defecto la etiqueta empieza en el primer hueco de la hoja. */
export const POSICION_ETIQUETA_PRIMERA = "1";

export const destinatarioVacio = (): DestinatarioEnvio => ({
    nombre: "", nif: "", tipoVia: "", via: "", numero: "", otros: "", codPostal: "",
    ciudad: "", provincia: "", codPaisIso: "", contacto: "", telefono: "", email: "",
});

type CamposDestinatario = Pick<NuevoEnvioAgencia,
    "destNombre" | "destNif" | "destTipoVia" | "destVia" | "destNumero" | "destOtros" | "destCodPostal"
    | "destCiudad" | "destProvincia" | "destCodPaisIso" | "destContacto" | "destTelefono" | "destEmail">;

const camposDestinatario = (d: DestinatarioEnvio): CamposDestinatario => ({
    destNombre: d.nombre,
    destNif: d.nif,
    destTipoVia: d.tipoVia,
    destVia: d.via,
    destNumero: d.numero,
    destOtros: d.otros,
    destCodPostal: d.codPostal,
    destCiudad: d.ciudad,
    destProvincia: d.provincia,
    destCodPaisIso: d.codPaisIso,
    destContacto: d.contacto,
    destTelefono: d.telefono,
    destEmail: d.email,
});

/** Pone en el formulario el destinatario (el del albarán al elegirlo). */
export const conDestinatario = (envio: NuevoEnvioAgencia, d: DestinatarioEnvio): NuevoEnvioAgencia => ({
    ...envio,
    ...camposDestinatario(d),
});

/** Al elegir el albarán: su destinatario y, si los tiene, sus bultos y kilos. */
export const conDatosAlbaran = (envio: NuevoEnvioAgencia, datos: DatosEnvioAlbaran): NuevoEnvioAgencia => ({
    ...conDestinatario(envio, datos.destinatario),
    bultos: datos.bultos ?? envio.bultos,
    kilos: datos.kilos ?? envio.kilos,
});

/** Nombre de cada función de agencia en su menú de la lista de órdenes. */
export const NOMBRES_FUNCION_AGENCIA: Record<FuncionAgencia, string> = {
    manifiesto: "Manifiesto diario",
};

/** Las agencias con menú en la lista de órdenes: las que tienen alguna función. */
export const agenciasConFunciones = (agencias: AgenciaEnvio[]): AgenciaEnvio[] =>
    agencias.filter((a) => a.funciones.length > 0);

export const metaManifiestoEnvios: MetaModelo<NuevoManifiestoEnvios> = {
    campos: {
        agenciaId: { requerido: true },
        fecha: { tipo: "fecha", requerido: true },
    },
};

/** El manifiesto de la agencia elegida en su menú, con la fecha de hoy. */
export const manifiestoEnviosInicial = (agencia: AgenciaEnvio): NuevoManifiestoEnvios => ({
    agenciaId: agencia.codigo,
    fecha: new Date(),
});

/** El servicio que se propone al elegir la agencia: el suyo por defecto o, si no tiene, el primero. */
export const servicioPorDefecto = (agencia: AgenciaEnvio | undefined | null): string =>
    agencia?.servicioPorDefecto ?? agencia?.servicios[0]?.codigo ?? "";

export const nuevoEnvioAgenciaInicial = (
    orden: OrdenAlmacen,
    agencias: AgenciaEnvio[],
): NuevoEnvioAgencia => {
    const pendientes = albaranesSinEnvio(orden);
    const agencia = agencias.length === 1 ? agencias[0] : null;
    return {
        albaranId: pendientes.length === 1 ? pendientes[0].id : "",
        agenciaId: agencia?.codigo ?? "",
        servicio: servicioPorDefecto(agencia),
        bultos: 1,
        kilos: 1,
        fechaRecogida: new Date(),
        observaciones: "",
        posicionEtiqueta: POSICION_ETIQUETA_PRIMERA,
        crearRecogida: false,
        // Como Eneboo: "Agrupados en palés" marcado, un palé del primer tipo.
        agrupadoEnPales: true,
        tipoPale: agencia?.tiposPale[0] ?? "",
        numPales: 1,
        ...camposDestinatario(destinatarioVacio()),
    };
};

/** "1 SIN RECEPCION" (o solo la descripción si la agencia no da código). */
export const textoPasoSeguimiento = (paso: PasoSeguimientoEnvio): string =>
    paso.codigo ? `${paso.codigo} ${paso.descripcion}` : paso.descripcion;

export const fechaPasoSeguimiento = (momento: Date | null): string =>
    momento
        ? momento.toLocaleString("es-ES", { day: "2-digit", month: "2-digit", year: "numeric",
            hour: "2-digit", minute: "2-digit" })
        : "";

/** El mensaje de un error de la API (el servidor manda el motivo en texto). */
export const mensajeErrorSeguimiento = (error: unknown): string => {
    const { descripcion, nombre } = (error ?? {}) as { descripcion?: string; nombre?: string };
    return descripcion || nombre || "No se ha podido consultar el seguimiento";
};

// Líneas de mercancía (tabla de líneas del envío Dachser de Eneboo).

/** Si el envío se agrupa en palés: solo si la agencia tiene tipos de palé. */
export const enviaEnPales = (agencia: AgenciaEnvio | undefined, envio: NuevoEnvioAgencia): boolean =>
    (agencia?.tiposPale.length ?? 0) > 0 && envio.agrupadoEnPales;

/**
 * Bultos y kilos de la cabecera a partir de las líneas, como Eneboo
 * (dameTotalBultosKilosEnvio): los bultos son las etiquetas de todas las líneas,
 * o 1 (bultos por palé) si va agrupado en palés; los kilos, la suma de las líneas.
 */
export const totalesLineas = (lineas: LineaEnvio[], enPales: boolean): { bultos: number; kilos: number } => ({
    bultos: enPales ? 1 : lineas.reduce((total, l) => total + l.etiquetas, 0),
    kilos: Math.round(lineas.reduce((total, l) => total + l.kilos, 0) * 100) / 100,
});

export const conTotalesLineas = (envio: NuevoEnvioAgencia, lineas: LineaEnvio[], enPales: boolean): NuevoEnvioAgencia =>
    lineas.length === 0 ? envio : { ...envio, ...totalesLineas(lineas, enPales) };

/** Lo que Eneboo enseña como descripción del envío (no se manda a la agencia). */
export const descripcionEnvio = (lineas: LineaEnvio[]): string =>
    lineas.some((l) => l.adr?.medioambiente)
        ? "Productos químicos, pinturas y adhesivos"
        : "Envío normal sin ADR";

/** Caracteres de `contenido` que llegan a la agencia: Dachser corta a 20
 * (LONGITUD_CONTENIDO en transporte_dachser/.../lineas.py). */
export const LONGITUD_CONTENIDO_LINEA_ENVIO = 20;

export type CampoLineaEnvio = "contenido" | "etiquetas" | "bultos" | "embalaje" | "largo" | "ancho"
    | "alto" | "kilos" | "posicionPale";

const CAMPOS_TEXTO_LINEA: CampoLineaEnvio[] = ["contenido", "embalaje"];

export const cambiarLineaEnvio = (
    lineas: LineaEnvio[], indice: number, campo: CampoLineaEnvio, valor: string,
): LineaEnvio[] =>
    lineas.map((linea, i) => i !== indice
        ? linea
        : { ...linea, [campo]: CAMPOS_TEXTO_LINEA.includes(campo) ? valor : Number(valor.replace(",", ".")) || 0 });

/** "ADR UN 3077 · 9", "LQ", ... (vacío si no es mercancía peligrosa). */
export const textoAdr = (linea: LineaEnvio): string => {
    const adr = linea.adr;
    if (!adr) return "";
    return [adr.tipo, adr.numeroUn ? `UN ${adr.numeroUn}` : "", adr.clase ? `cl. ${adr.clase}` : ""]
        .filter(Boolean).join(" ");
};

/** El primer problema de las líneas (como valida el servidor), o null. */
export const errorLineasEnvio = (lineas: LineaEnvio[], enPales: boolean, numPales: number): string | null => {
    for (const l of lineas) {
        const nombre = `Línea "${l.contenido}"`;
        if (!(l.etiquetas >= 1)) return `${nombre}: debe tener al menos una etiqueta`;
        if (!(l.bultos >= 1)) return `${nombre}: debe tener al menos un bulto`;
        if (!(l.kilos > 0)) return `${nombre}: los kilos deben ser mayores que 0`;
        if (!(Math.min(l.largo, l.ancho, l.alto) > 0)) return `${nombre}: faltan las medidas`;
        if (enPales && !(l.posicionPale >= 1 && l.posicionPale <= numPales)) {
            return `${nombre}: va en un palé que no existe (${l.posicionPale})`;
        }
    }
    return null;
};

// Dirección en la etiqueta (Dachser corta calle y complemento a 30 caracteres).
// Se reparte igual que en el servidor (transporte_dachser/.../direccion.py).

/** Tipo de vía, calle y número, y detrás los otros datos: "Calle Can Calafat 63, Local 60". */
export const direccionCompletaEnvio = (envio: NuevoEnvioAgencia): string => {
    const calle = [envio.destTipoVia, envio.destVia, envio.destNumero]
        .map((p) => (p ?? "").trim()).filter(Boolean).join(" ");
    const otros = (envio.destOtros ?? "").trim();
    return calle && otros ? `${calle}, ${otros}` : calle || otros;
};

/** Líneas de `ancho` caracteres como mucho, cortando entre palabras. */
export const repartirDireccion = (texto: string, ancho: number): string[] => {
    const lineas: string[] = [];
    let actual = "";
    for (let palabra of texto.split(/\s+/).filter(Boolean)) {
        while (palabra.length > ancho) {
            if (actual) {
                lineas.push(actual);
                actual = "";
            }
            lineas.push(palabra.slice(0, ancho));
            palabra = palabra.slice(ancho);
        }
        if (!actual) actual = palabra;
        else if (actual.length + 1 + palabra.length <= ancho) actual = `${actual} ${palabra}`;
        else {
            lineas.push(actual);
            actual = palabra;
        }
    }
    if (actual) lineas.push(actual);
    return lineas;
};

/** Cómo saldrá la dirección en la etiqueta de la agencia, y si cabe; null si la agencia no la corta. */
export const direccionEnEtiqueta = (
    agencia: AgenciaEnvio | undefined, envio: NuevoEnvioAgencia,
): { lineas: string[]; cabe: boolean } | null => {
    const formato = agencia?.direccionEtiqueta;
    if (!formato) return null;
    const lineas = repartirDireccion(direccionCompletaEnvio(envio), formato.caracteres);
    return { lineas, cabe: lineas.length <= formato.lineas };
};

const plural = (n: number, singular: string, plural: string) => `${n} ${n === 1 ? singular : plural}`;

/** Texto resumen del recorrido: módulos recorridos y pasillos cruzados. */
/** Por qué un recorrido no tiene paradas. */
export const motivoRecorridoVacio = (r: { ordenId: string; estado: string }): string =>
    r.estado === "TERMINADA"
        ? `La orden ${r.ordenId} está terminada: no queda nada por recoger ni dejar.`
        : `La orden ${r.ordenId} no tiene nada pendiente en ubicaciones${r.estado ? ` (${r.estado.toLowerCase()})` : ""}.`;

export const textoAccionParada = { RECOGER: "Recoger", DEJAR: "Dejar" } as const;

const textoMotivoRecorrido: Record<MotivoRecorridoFormula, string> = {
    SIN_PLANTA: "el almacén no tiene planta",
    PARADAS_SIN_POSICION: "hay paradas en pasillos sin colocar en la planta",
    SIN_CAMINO: "no hay camino a pie entre alguna de las paradas",
};

export const resumenRecorrido = (r: {
    modulosRecorridos: number;
    pasillosCruzados: number;
    calculo?: "DISTANCIA" | "FORMULA";
    motivo?: MotivoRecorridoFormula | null;
    metros?: number | null;
}): string => {
    if (r.calculo === "DISTANCIA" && r.metros != null) {
        return `${Math.round(r.metros).toLocaleString("es-ES")} m a pie, ordenado por la planta`;
    }
    const estimado = `${plural(r.modulosRecorridos, "módulo recorrido", "módulos recorridos")}, ` +
        plural(r.pasillosCruzados, "pasillo cruzado", "pasillos cruzados");
    return r.motivo && r.motivo !== "SIN_PLANTA" ? `${estimado} (estimado: ${textoMotivoRecorrido[r.motivo]})` : estimado;
};
