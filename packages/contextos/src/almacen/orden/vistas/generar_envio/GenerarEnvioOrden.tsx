import { QBoton } from "@olula/componentes/atomos/qboton.tsx";
import { QInput, QModal, QSelect } from "@olula/componentes/index.js";
import { ContextoError } from "@olula/lib/contexto.ts";
import { EmitirEvento } from "@olula/lib/diseño.ts";
import { imprimir_blob } from "@olula/lib/impresion.ts";
import { useForm } from "@olula/lib/useForm.js";
import { useModelo } from "@olula/lib/useModelo.ts";
import { useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { AgenciaEnvio, OrdenAlmacen } from "../../diseño.ts";
import {
    albaranesSinEnvio,
    conDatosAlbaran,
    metaNuevoEnvioAgencia,
    nuevoEnvioAgenciaInicial,
} from "../../dominio.ts";
import {
    getAgenciasEnvio,
    getDatosEnvio,
    getEtiquetaEnvio,
    postEnvioAgencia,
} from "../../infraestructura.ts";
import "./GenerarEnvioOrden.css";

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

    // Al elegir el albarán se cargan su destinatario (dirección de envío del cliente) y sus
    // bultos y kilos para poder cambiarlos antes de enviar, como en el formulario de Eneboo.
    // Los bultos y kilos con que se envíe quedan guardados en el albarán.
    // Refs para que el efecto dependa solo del albarán elegido.
    const actual = useRef({ envio, set });
    actual.current = { envio, set };
    useEffect(() => {
        if (!envio.albaranId) return;
        let vigente = true;
        intentar(async () => {
            const datos = await getDatosEnvio(envio.albaranId);
            if (vigente) actual.current.set(conDatosAlbaran(actual.current.envio, datos));
        });
        return () => { vigente = false; };
    }, [envio.albaranId, intentar]);

    const agencia = agencias.find((a) => a.codigo === envio.agenciaId);
    const opcionesAlbaran = albaranesSinEnvio(orden).map((a) => ({ valor: a.id, descripcion: a.codigo }));
    const opcionesAgencia = agencias.map((a) => ({ valor: a.codigo, descripcion: a.nombre }));
    const opcionesServicio = (agencia?.servicios ?? [])
        .map((s) => ({ valor: s.codigo, descripcion: `${s.codigo} - ${s.descripcion}` }));
    const opcionesPosicion = (agencia?.posicionesEtiqueta ?? [])
        .map((p) => ({ valor: String(p.codigo), descripcion: p.descripcion }));
    // Cada agencia añade aquí sus campos propios; el resto del formulario es común.
    const hayCamposDeAgencia = opcionesPosicion.length > 0;

    const generar_ = useCallback(async () => {
        const generado = await postEnvioAgencia(orden.id, envio);
        imprimir_blob(await getEtiquetaEnvio(generado.albaranId));
        publicar("envio_generado", generado);
    }, [orden.id, envio, publicar]);

    const [generar, cancelar] = useForm(generar_, cancelar_);

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
                                    <QInput label="Fecha de recogida" {...uiProps("fechaRecogida")} />
                                    <QInput label="Bultos" {...uiProps("bultos")} />
                                    <QInput label="Kilos" {...uiProps("kilos")} />
                                    <QInput label="Observaciones" {...uiProps("observaciones")} />
                                </quimera-formulario>
                            </section>
                            {hayCamposDeAgencia && (
                                <section>
                                    {/* Campos propios de la agencia elegida (p. ej. CEX: posición de etiqueta). */}
                                    <h4>{agencia?.nombre}</h4>
                                    <quimera-formulario>
                                        {opcionesPosicion.length > 0 && (
                                            <QSelect
                                                label="Posición 1ª etiqueta en la hoja"
                                                {...uiProps("posicionEtiqueta")}
                                                opciones={opcionesPosicion}
                                            />
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
                        </section>
                    </div>
                    <div className="botones maestro-botones">
                        <QBoton onClick={generar} deshabilitado={!valido}>
                            Generar envío
                        </QBoton>
                    </div>
                </>
            )}
        </QModal>
    );
};
