import { Entidad, Filtro, Modelo, Orden, Paginacion, RespuestaLista } from "@olula/lib/diseño.ts";

export type TipoOrden = "ENTRADA" | "SALIDA" | "TRASPASO";

/** Cambio en el pedido de venta posterior a generar la salida. */
export type CambioPedido = "ANADIDA" | "CAMBIADA" | "BORRADA";

export interface OrdenAlmacen extends Entidad {
    id: string;
    fecha: string;
    tipo: TipoOrden;
    almacenId: string;
    almacen: string;
    abierta: boolean;
    estado: string;
    descripcion: string;
    idUbicacionOrigen: string | null;
    ubicacionOrigen: string | null;
    idCajaOrigen: string | null;
    idUbicacionDestino: string | null;
    ubicacionDestino: string | null;
    idCajaDestino: string | null;
    pasosPick: string | null;
    pasosDrop: string | null;
    lineas: LineaOrdenAlmacen[];
    lecturasCaja: LecturaCajaOrden[];
    /** Albaranes de venta generados al albaranar la orden (solo SALIDA). */
    albaranes: AlbaranGenerado[];
    /** Si tiene cajas creadas (las del report de etiquetas de cajas). */
    tieneCajas: boolean;
}

export interface LineaOrdenAlmacen extends Entidad {
    id: string;
    sku: string;
    articulo: string;
    loteId: string | null;
    porLotes: boolean;
    cantidadPrevista: number;
    cantidadReal?: number;
    idUbicacionOrigen: string | null;
    ubicacionOrigen: string | null;
    idCajaOrigen: string | null;
    cajaOrigen: string | null;
    idUbicacionDestino: string | null;
    ubicacionDestino: string | null;
    idCajaDestino: string | null;
    cajaDestino: string | null;
    idLineaPick: string | null;
    pasosPick: string | null;
    pasosDrop: string | null;
    cantidadPick?: number;
    /** Pedido de venta del que procede la línea (salidas). */
    pedidoVentaId: string | null;
    pedidoVenta: string | null;
    cliente: string | null;
    cambioPedido: CambioPedido | null;
    /** Prevista antes del primer cambio del pedido (CAMBIADA / BORRADA). */
    cantidadPedidoAnterior: number | null;
    lecturas: LecturaLineaOrden[];
}

export interface LecturaCajaOrden extends Entidad {
    id: string;
    idCaja: string;
    lpn: string;
    idUbicacionDestino: string | null;
    ubicacionDestino: string | null;
    idCajaDestino: string | null;
    cajaDestino: string | null;
    cajaCompleta: boolean;
    fechaHora: Date;
}

export interface LecturaLineaOrden {
    id: string;
    sku: string;
    loteId: string | null;
    cantidad: number;
    idUbicacionOrigen: string | null;
    ubicacionOrigen: string | null;
    idCajaOrigen: string | null;
    cajaOrigen: string | null;
    idUbicacionDestino: string | null;
    ubicacionDestino: string | null;
    idCajaDestino: string | null;
    cajaDestino: string | null;
    fechaHora: Date;
    idLecturaCaja: string | null;
}

export interface NuevaOrdenAlmacen extends Modelo {
    // fecha?: Date;
    tipoOrden: string;
    almacenId: string;
    abierta: boolean;
    pasosPick?: string | null;
    pasosDrop?: string | null;
}

export interface NuevaLineaOrdenAlmacen extends Modelo {
    sku: string;
    loteId: string | null;
    cantidadPrevista: number;
    cantidadReal?: number;
    idUbicacionOrigen: string | null;
    idCajaOrigen: string | null;
    idUbicacionDestino: string | null;
    idCajaDestino: string | null;
    pasosPick?: string | null;
    pasosDrop?: string | null;
}

export interface NuevaLecturaOrden extends Modelo {
    cantidad: number;
    sku: string;
    articulo: string;
    idLote: string | null;
    idLinea: string | null;
    cajaCompleta: boolean;
    idCajaDestino: string | null;
    idUbicacionDestino: string | null;
    idCajaOrigen: string | null;
    idUbicacionOrigen: string | null;
    fase?: 'PICK' | 'DROP' | null;
}

export interface NuevaLecturaCajaOrden extends Modelo {
    cajaId: string;
    cajaCompleta: boolean;
    idUbicacionDestino: string | null;
    idCajaDestino: string | null;
}


export interface NuevaLecturaUbicacionOrden extends Modelo {
    idUbicacion: string;
    idUbicacionDestino: string | null;
    idCajaDestino: string | null;
}


export interface ItemOrdenAlmacen extends Entidad {
    id: string;
    fecha: string;
    tipo: string;
    abierta: boolean;
    estado: string;
    descripcion: string;
    idUbicacionOrigen: string | null;
    idCajaOrigen: string | null;
    idUbicacionDestino: string | null;
    idCajaDestino: string | null;
    idResponsable: string | null;
}

export type NuevaEntradaDesdePedido = {
    pedidoCompraId: string;
    ubicacionId: string;
};

export type CambiosOrdenAlmacen = Partial<OrdenAlmacen>;
export type CambiosLineaOrdenAlmacen = Partial<LineaOrdenAlmacen>;

export type GetOrden = (id: string) => Promise<OrdenAlmacen>;
export type GetOrdenes = (filtro: Filtro, orden: Orden, paginacion?: Paginacion) => RespuestaLista<ItemOrdenAlmacen>;
export type PostOrden = (nuevaOrden: NuevaOrdenAlmacen) => Promise<string>;
export type PatchOrden = (id: string, cambios: CambiosOrdenAlmacen) => Promise<void>;
export type DeleteOrden = (id: string) => Promise<void>;
export type PostLineasOrden = (id: string, lineas: NuevaLineaOrdenAlmacen[]) => Promise<void>;
export type PatchLineaOrden = (id: string, lineaId: string, cambios: CambiosLineaOrdenAlmacen) => Promise<void>;
export type DeleteLineasOrden = (id: string, lineaIds: string[]) => Promise<void>;
export type PostEntradaDesdePedido = (nueva: NuevaEntradaDesdePedido) => Promise<string>;
export type TerminarOrden = (id: string) => Promise<void>;
export type AlbaranGenerado = {
    id: string;
    codigo: string;
    /** Agencia y nº de envío, solo si el albarán ya tiene envío por agencia. */
    agenciaEnvio?: string;
    numeroTracking?: string;
    /** Estado que da la agencia (p. ej. "12: ENTREGADO"), o "Etiqueta generada". */
    estadoEnvio?: string;
    /** Si se pidió a la agencia que pase a recogerlo. */
    recogida?: { numero: string; estado: string | null };
    /** Si hay que confirmar a la agencia la orden recién generada (Dachser: "Enviar orden"). */
    permiteConfirmarEnvio?: boolean;
    /** Si se puede pedir a la agencia que anule el envío. */
    permiteAnularEnvio?: boolean;
    /** Página pública de seguimiento de la agencia (agenciastrans.urlsegui). */
    urlSeguimiento?: string;
};
/** Genera los albaranes de una SALIDA PREPARADA y la termina; devuelve los albaranes generados. */
export type AlbaranarOrden = (id: string) => Promise<AlbaranGenerado[]>;

/** Línea de pedido que no cuadra con lo recogido en la salida (aviso al albaranar).
 * FALTA: el pedido pide más de lo que sale; SOBRA: la orden saca más de lo pendiente. */
export interface DiferenciaPedidoOrden {
    tipo: "FALTA" | "SOBRA";
    pedidoId: string;
    pedido: string;
    lineaPedidoId: string;
    sku: string;
    descripcion: string;
    pendientePedido: number;
    enOrden: number;
    enOtrasSalidas: number;
    diferencia: number;
}
export type GetDiferenciasPedidoOrden = (id: string) => Promise<DiferenciaPedidoOrden[]>;
export type AdquirirOrden = (id: string) => Promise<void>;
export type PostColocacion = (id: string) => Promise<string>;
export type GetReportEtiquetasOrden = (id: string) => Promise<Blob>;

/** Agencia de transporte activa en la app (plugins transporte_*). */
export interface ServicioAgenciaEnvio {
    codigo: string;
    descripcion: string;
}

/** Hueco de la hoja de etiquetas donde empieza a imprimir (1 = el primero). */
export interface PosicionEtiquetaEnvio {
    codigo: number;
    descripcion: string;
}

export interface AgenciaEnvio {
    codigo: string;
    nombre: string;
    servicios: ServicioAgenciaEnvio[];
    /** El que se propone al elegir la agencia (agenciastrans.codproductoagtdefecto). */
    servicioPorDefecto: string | null;
    /** Vacía si la agencia (o su tipo de etiqueta) no deja elegir dónde empezar. */
    posicionesEtiqueta: PosicionEtiquetaEnvio[];
    /** Si al generar el envío se le puede pedir que pase a recogerlo. */
    permiteCrearRecogida: boolean;
    /** Si da el manifiesto (PDF) de los envíos de un día. */
    permiteManifiesto: boolean;
    /** Si el envío lleva líneas de mercancía que se pueden cambiar (Dachser). */
    permiteLineas: boolean;
    /** Tipos de palé en que se puede agrupar el envío; vacía si no se agrupa. */
    tiposPale: string[];
    /** Lo que cabe de la dirección en la etiqueta (Dachser: 2 líneas de 30); null si no la corta. */
    direccionEtiqueta: { lineas: number; caracteres: number } | null;
}

/** Datos ADR (mercancía peligrosa) del artículo de una línea. */
export interface MercanciaPeligrosaEnvio {
    /** LQ, ADR, EQ o EV. */
    tipo: string | null;
    numeroUn: string | null;
    clase: string | null;
    sustancia: string | null;
    /** Tipo de embalaje ADR. */
    embalaje: string | null;
    /** Peligrosa para el medio ambiente: solo entonces van los datos ADR a la agencia (como Eneboo). */
    medioambiente: boolean;
    categoriaTransporte: string | null;
    puntoInflamacion: string | null;
    grupoEmbalaje: string | null;
    capacidad: number | null;
}

/** Línea de mercancía del envío (tabla de líneas del envío Dachser de Eneboo). */
export interface LineaEnvio {
    contenido: string;
    /** Etiquetas (bultos físicos) que genera la línea. */
    etiquetas: number;
    /** Bultos de mercancía peligrosa. */
    bultos: number;
    embalaje: string;
    /** Medidas en cm. */
    largo: number;
    ancho: number;
    alto: number;
    kilos: number;
    /** Palé en que va, si el envío va agrupado en palés. */
    posicionPale: number;
    adr: MercanciaPeligrosaEnvio | null;
}

export type GetLineasEnvio = (albaranId: string, agenciaId: string) => Promise<LineaEnvio[]>;

/** Petición del manifiesto de envíos de una agencia para una fecha de recogida. */
export interface NuevoManifiestoEnvios extends Modelo {
    agenciaId: string;
    fecha: Date;
}

/** PDF del manifiesto de la agencia con los envíos que tienen esa fecha de recogida. */
export type GetManifiestoEnvios = (agenciaId: string, fecha: Date) => Promise<Blob>;

/** Destinatario con el que se pide el envío: el del albarán, editable en el formulario. */
export interface DestinatarioEnvio {
    nombre: string;
    nif: string;
    tipoVia: string;
    via: string;
    numero: string;
    otros: string;
    codPostal: string;
    ciudad: string;
    provincia: string;
    codPaisIso: string;
    contacto: string;
    telefono: string;
    email: string;
}

export interface NuevoEnvioAgencia extends Modelo {
    albaranId: string;
    agenciaId: string;
    servicio: string;
    bultos: number;
    kilos: number;
    fechaRecogida: Date;
    observaciones: string;
    /** Código de PosicionEtiquetaEnvio; solo cuenta si la agencia ofrece posiciones. */
    posicionEtiqueta: string;
    /** Pedir a la agencia que pase a recoger el envío en la fecha de recogida. */
    crearRecogida: boolean;
    /** "Agrupados en palés" (solo si la agencia tiene tipos de palé): bultos = bultos por palé. */
    agrupadoEnPales: boolean;
    tipoPale: string;
    numPales: number;
    // Destinatario (como el formulario de Eneboo: se cambia solo para este envío).
    destNombre: string;
    destNif: string;
    destTipoVia: string;
    destVia: string;
    destNumero: string;
    destOtros: string;
    destCodPostal: string;
    destCiudad: string;
    destProvincia: string;
    destCodPaisIso: string;
    destContacto: string;
    destTelefono: string;
    destEmail: string;
}

export type EnvioAgenciaGenerado = { albaranId: string; agenciaId: string; numeroTracking: string };

export type GetAgenciasEnvio = () => Promise<AgenciaEnvio[]>;
/** Lo que el albarán propone para el envío; el formulario lo deja cambiar. */
export interface DatosEnvioAlbaran {
    /** Su dirección de envío (o la del albarán) y teléfono. */
    destinatario: DestinatarioEnvio;
    /** Bultos y kilos del albarán (totalbultos / totalpeso); null si no los tiene. */
    bultos: number | null;
    kilos: number | null;
}

export type GetDatosEnvio = (albaranId: string) => Promise<DatosEnvioAlbaran>;

/** Un estado por el que ha pasado el envío (o una situación de su recogida). */
export interface PasoSeguimientoEnvio {
    momento: Date | null;
    codigo: string | null;
    descripcion: string;
    incidencia: string | null;
}

/** Recorrido del envío preguntado a la agencia al momento (no se guarda). */
export interface SeguimientoEnvio {
    agencia: string;
    numeroTracking: string;
    /** Del más antiguo al más reciente. */
    estados: PasoSeguimientoEnvio[];
    /** Solo si al generar el envío se pidió recogida. */
    recogida: { numero: string; situaciones: PasoSeguimientoEnvio[] } | null;
    /** Lo que la agencia no ha podido dar (p. ej. el envío sí y la recogida no). */
    errores: string[];
    /** Página pública de seguimiento de la agencia, si la tiene. */
    urlSeguimiento: string | null;
}

export type GetSeguimientoEnvio = (albaranId: string) => Promise<SeguimientoEnvio>;
/** Pide a la agencia el envío de un albarán de una SALIDA terminada. */
export type PostEnvioAgencia = (
    ordenId: string,
    envio: NuevoEnvioAgencia,
    opciones?: { lineas?: LineaEnvio[]; conPales?: boolean },
) => Promise<EnvioAgenciaGenerado>;
/** Confirma a la agencia la orden de envío recién generada de un albarán. */
export type PostConfirmarEnvio = (albaranId: string) => Promise<void>;
/** Anula en la agencia el envío de un albarán y lo deja sin envío. */
export type PostAnularEnvio = (albaranId: string) => Promise<void>;
/** PDF con las etiquetas del envío de un albarán. */
export type GetEtiquetaEnvio = (albaranId: string) => Promise<Blob>;
