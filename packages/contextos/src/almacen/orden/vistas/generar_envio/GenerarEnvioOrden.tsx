import { QBoton } from "@olula/componentes/atomos/qboton.tsx";
import { QCheckbox, QInput, QModal, QSelect } from "@olula/componentes/index.js";
import { ContextoError } from "@olula/lib/contexto.ts";
import { EmitirEvento } from "@olula/lib/diseño.ts";
import { imprimir_blob } from "@olula/lib/impresion.ts";
import { useForm } from "@olula/lib/useForm.js";
import { useModelo } from "@olula/lib/useModelo.ts";
import { useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { AgenciaEnvio, LineaEnvio, OrdenAlmacen } from "../../diseño.ts";
import {
    albaranesSinEnvio,
    conDatosAlbaran,
    conTotalesLineas,
    descripcionEnvio,
    direccionEnEtiqueta,
    enviaEnPales,
    errorLineasEnvio,
    metaNuevoEnvioAgencia,
    nuevoEnvioAgenciaInicial,
    servicioPorDefecto,
} from "../../dominio.ts";
import {
    getAgenciasEnvio,
    getDatosEnvio,
    getEtiquetaEnvio,
    getLineasEnvio,
    postEnvioAgencia,
} from "../../infraestructura.ts";
import "./GenerarEnvioOrden.css";
import { LineasEnvio } from "./LineasEnvio.tsx";

/**
 * Modal para pedir a una agencia de transporte el envío de un albarán de una
 * orden de SALIDA terminada.
 *
 *   - El detalle lo renderiza cuando estado === "GENERANDO_ENVIO".
 *   - Emite "envio_generado" (tras imprimir la etiqueta) o "envio_cancelado".
 */
export const GenerarEnvioOrden = ({
    publicar,
    orden,
}: {
    publicar: EmitirEvento;
    orden: OrdenAlmacen;
}) => {
    const { intentar } = useContext(ContextoError);
    const [agencias, setAgencias] = useState<AgenciaEnvio[] | null>(null);

    useEffect(() => {
        let vigente = true;
        intentar(async () => {
            const leidas = await getAgenciasEnvio();
            if (vigente) setAgencias(leidas);
        });
        return () => { vigente = false; };
    }, [intentar]);

    const cancelar_ = useCallback(() => publicar("envio_cancelado"), [publicar]);

    if (agencias === null) {
        return (
            <QModal abierto={true} nombre="generarEnvio" titulo="Generar envío" onCerrar={cancelar_}>
                <p>Cargando agencias…</p>
            </QModal>
        );
    }

    return <FormularioEnvio orden={orden} agencias={agencias} publicar={publicar} cancelar_={cancelar_} />;
};

const FormularioEnvio = ({
    orden,
    agencias,
    publicar,
    cancelar_,
}: {
    orden: OrdenAlmacen;
    agencias: AgenciaEnvio[];
    publicar: EmitirEvento;
    cancelar_: () => void;
}) => {
    const inicial = useMemo(() => nuevoEnvioAgenciaInicial(orden, agencias), [orden, agencias]);
    const { modelo: envio, uiProps, valido, set } = useModelo(metaNuevoEnvioAgencia, inicial);
    const { intentar } = useContext(ContextoError);

    // Líneas de mercancía que propone la agencia (solo las que las usan: Dachser).
    const [lineas, setLineas] = useState<LineaEnvio[]>([]);

    // Al elegir el albarán se cargan su destinatario (dirección de envío del cliente) y sus
    // bultos y kilos para poder cambiarlos antes de enviar, como en el formulario de Eneboo.
    // Los bultos y kilos con que se envíe quedan guardados en el albarán.
    // Refs para que el efecto dependa solo del albarán elegido.
    const actual = useRef({ envio, set, lineas });
    actual.current = { envio, set, lineas };
    useEffect(() => {
        if (!envio.albaranId) return;
        let vigente = true;
        intentar(async () => {
            const datos = await getDatosEnvio(envio.albaranId);
            if (!vigente) return;
            const { envio: actualEnvio, set: actualSet, lineas: actualLineas } = actual.current;
            const conDatos = conDatosAlbaran(actualEnvio, datos);
            // Con líneas, los bultos y kilos son los de las líneas (como Eneboo).
            actualSet(actualLineas.length > 0
                ? { ...conDatos, bultos: actualEnvio.bultos, kilos: actualEnvio.kilos }
                : conDatos);
        });
        return () => { vigente = false; };
    }, [envio.albaranId, intentar]);

    // Al elegir la agencia (el cambio deja el servicio en blanco) se proponen su servicio por
    // defecto y su primer tipo de palé.
    useEffect(() => {
        const { envio: actualEnvio, set: actualSet } = actual.current;
        if (!actualEnvio.agenciaId) return;
        const elegida = agencias.find((a) => a.codigo === actualEnvio.agenciaId);
        const servicio = actualEnvio.servicio || servicioPorDefecto(elegida);
        const tipoPale = elegida?.tiposPale.includes(actualEnvio.tipoPale)
            ? actualEnvio.tipoPale
            : (elegida?.tiposPale[0] ?? "");
        if (servicio !== actualEnvio.servicio || tipoPale !== actualEnvio.tipoPale) {
            actualSet({ ...actualEnvio, servicio, tipoPale });
        }
    }, [envio.agenciaId, agencias]);

    // Con albarán y agencia que usa líneas, se cargan las que propone y con ellas los bultos
    // y kilos de la cabecera (como Eneboo al abrir el formulario de Dachser).
    useEffect(() => {
        const elegida = agencias.find((a) => a.codigo === envio.agenciaId);
        if (!envio.albaranId || !elegida?.permiteLineas) {
            setLineas([]);
            return;
        }
        let vigente = true;
        intentar(async () => {
            const propuestas = await getLineasEnvio(envio.albaranId, elegida.codigo);
            if (!vigente) return;
            setLineas(propuestas);
            const { envio: actualEnvio, set: actualSet } = actual.current;
            actualSet(conTotalesLineas(actualEnvio, propuestas, enviaEnPales(elegida, actualEnvio)));
        });
        return () => { vigente = false; };
    }, [envio.albaranId, envio.agenciaId, agencias, intentar]);

    // Al marcar o desmarcar "Agrupados en palés" cambian los bultos (1 por palé o las etiquetas).
    useEffect(() => {
        const { envio: actualEnvio, set: actualSet, lineas: actualLineas } = actual.current;
        if (actualLineas.length === 0) return;
        const elegida = agencias.find((a) => a.codigo === actualEnvio.agenciaId);
        const conTotales = conTotalesLineas(actualEnvio, actualLineas, enviaEnPales(elegida, actualEnvio));
        if (conTotales.bultos !== actualEnvio.bultos) actualSet(conTotales);
    }, [envio.agrupadoEnPales, agencias]);

    const agencia = agencias.find((a) => a.codigo === envio.agenciaId);
    const opcionesAlbaran = albaranesSinEnvio(orden).map((a) => ({ valor: a.id, descripcion: a.codigo }));
    const opcionesAgencia = agencias.map((a) => ({ valor: a.codigo, descripcion: a.nombre }));
    const opcionesServicio = (agencia?.servicios ?? [])
        .map((s) => ({ valor: s.codigo, descripcion: `${s.codigo} - ${s.descripcion}` }));
    const opcionesPosicion = (agencia?.posicionesEtiqueta ?? [])
        .map((p) => ({ valor: String(p.codigo), descripcion: p.descripcion }));
    // Cada agencia añade aquí sus campos propios; el resto del formulario es común.
    const permiteCrearRecogida = agencia?.permiteCrearRecogida ?? false;
    const opcionesPale = (agencia?.tiposPale ?? []).map((t) => ({ valor: t, descripcion: t }));
    const enPales = enviaEnPales(agencia, envio);
    const hayCamposDeAgencia = opcionesPosicion.length > 0 || opcionesPale.length > 0;
    const errorLineas = errorLineasEnvio(lineas, enPales, Number(envio.numPales));
    // Dachser corta la dirección en la etiqueta: se enseña cómo quedará y se avisa si no cabe.
    const enEtiqueta = direccionEnEtiqueta(agencia, envio);

    // Al cambiar una línea se recalculan los bultos y kilos de la cabecera.
    const cambiarLineas = useCallback((nuevas: LineaEnvio[]) => {
        setLineas(nuevas);
        set(conTotalesLineas(envio, nuevas, enPales));
    }, [envio, set, enPales]);

    const generar_ = useCallback(async () => {
        const generado = await postEnvioAgencia(orden.id, envio, {
            lineas,
            conPales: opcionesPale.length > 0,
        });
        imprimir_blob(await getEtiquetaEnvio(generado.albaranId));
        publicar("envio_generado", generado);
    }, [orden.id, envio, lineas, opcionesPale.length, publicar]);

    // `generando` mientras se pide el envío a la agencia: evita pedirlo dos veces.
    const [generar, cancelar, generando] = useForm(generar_, cancelar_);

    return (
        <QModal abierto={true} nombre="generarEnvio" titulo="Generar envío por agencia" onCerrar={cancelar}>
            {agencias.length === 0 ? (
                <p>No hay ninguna agencia de transporte activa.</p>
            ) : (
                <>
                    <div className="generar-envio-agencia">
                        <div className="generar-envio-agencia__envio">
                            <section>
                                <h4>Envío</h4>
                                <quimera-formulario>
                                    {/* Campos comunes a todas las agencias: siempre igual. */}
                                    <QSelect label="Albarán" {...uiProps("albaranId")} opciones={opcionesAlbaran} />
                                    <QSelect label="Agencia" {...uiProps("agenciaId")} opciones={opcionesAgencia} />
                                    <QSelect label="Servicio" {...uiProps("servicio")} opciones={opcionesServicio} />
                                    <QInput
                                        label={enPales ? "Bultos por palé" : "Bultos"}
                                        {...uiProps("bultos")}
                                    />
                                    <QInput label="Kilos" {...uiProps("kilos")} />
                                    <QInput label="Fecha de recogida" {...uiProps("fechaRecogida")} />
                                    {/* Solo si la agencia permite pedir la recogida al grabar (CEX). */}
                                    {permiteCrearRecogida && (
                                        <QCheckbox label="Crear recogida" {...uiProps("crearRecogida")} />
                                    )}
                                    <QInput label="Observaciones" {...uiProps("observaciones")} />
                                </quimera-formulario>
                            </section>
                            {hayCamposDeAgencia && (
                                <section>
                                    {/* Campos propios de la agencia elegida (CEX: posición de etiqueta;
                                        Dachser: agrupado en palés). */}
                                    <h4>{agencia?.nombre}</h4>
                                    <quimera-formulario>
                                        {opcionesPosicion.length > 0 && (
                                            <QSelect
                                                label="Posición 1ª etiqueta en la hoja"
                                                {...uiProps("posicionEtiqueta")}
                                                opciones={opcionesPosicion}
                                            />
                                        )}
                                        {opcionesPale.length > 0 && (
                                            <>
                                                <QCheckbox label="Agrupados en palés" {...uiProps("agrupadoEnPales")} />
                                                {envio.agrupadoEnPales && (
                                                    <>
                                                        <QSelect label="Tipo de palé" {...uiProps("tipoPale")} opciones={opcionesPale} />
                                                        <QInput label="Nº de palés" {...uiProps("numPales")} />
                                                    </>
                                                )}
                                            </>
                                        )}
                                    </quimera-formulario>
                                </section>
                            )}
                        </div>
                        <section>
                            <h4>Destinatario</h4>
                            <quimera-formulario>
                                {/* Fila 1 */}
                                <QInput label="Nombre" {...uiProps("destNombre")} />
                                <QInput label="NIF" {...uiProps("destNif")} />
                                {/* Fila 2 */}
                                <QInput label="Tipo de vía" {...uiProps("destTipoVia")} />
                                <QInput label="Dirección" {...uiProps("destVia")} />
                                <QInput label="Número" {...uiProps("destNumero")} />
                                {/* Fila 3 */}
                                <QInput label="Otros" {...uiProps("destOtros")} />
                                <QInput label="Cód. postal" {...uiProps("destCodPostal")} />
                                <QInput label="Ciudad" {...uiProps("destCiudad")} />
                                {/* Fila 4 */}
                                <QInput label="Provincia" {...uiProps("destProvincia")} />
                                <QInput label="País" {...uiProps("destCodPaisIso")} />
                                <QInput label="Teléfono" {...uiProps("destTelefono")} />
                                {/* Fila 5 */}
                                <QInput label="Contacto" {...uiProps("destContacto")} />
                                <QInput label="Email" {...uiProps("destEmail")} />
                            </quimera-formulario>
                            {enEtiqueta && (
                                <div className="generar-envio-agencia__etiqueta">
                                    <span>En la etiqueta de {agencia?.nombre}:</span>
                                    {enEtiqueta.lineas.slice(0, agencia?.direccionEtiqueta?.lineas).map((linea, i) => (
                                        <code key={i}>{linea}</code>
                                    ))}
                                    {!enEtiqueta.cabe && (
                                        <p className="q-texto-error">
                                            La dirección no cabe en la etiqueta y se cortará
                                            (no saldrá «{enEtiqueta.lineas.slice(agencia?.direccionEtiqueta?.lineas).join(" ")}»).
                                            Acórtala si puedes: entera llega igualmente a {agencia?.nombre} en las observaciones.
                                        </p>
                                    )}
                                </div>
                            )}
                        </section>
                    </div>
                    {lineas.length > 0 && (
                        <section className="generar-envio-agencia__lineas">
                            <h4>Líneas · <span>{descripcionEnvio(lineas)}</span></h4>
                            <LineasEnvio lineas={lineas} enPales={enPales} onCambiar={cambiarLineas} />
                            {errorLineas && <p className="q-texto-error">{errorLineas}</p>}
                        </section>
                    )}
                    <div className="botones maestro-botones">
                        <QBoton onClick={generar} deshabilitado={!valido || !!errorLineas || generando}>
                            {generando ? "Generando envío…" : "Generar envío"}
                        </QBoton>
                    </div>
                </>
            )}
        </QModal>
    );
};
