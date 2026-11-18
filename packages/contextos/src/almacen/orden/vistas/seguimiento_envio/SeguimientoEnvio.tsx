import { QBoton } from "@olula/componentes/atomos/qboton.tsx";
import { QModal } from "@olula/componentes/index.js";
import { useEffect, useState } from "react";
import { PasoSeguimientoEnvio, SeguimientoEnvio } from "../../diseño.ts";
import { fechaPasoSeguimiento, mensajeErrorSeguimiento, textoPasoSeguimiento } from "../../dominio.ts";
import { getSeguimientoEnvio } from "../../infraestructura.ts";
import "./SeguimientoEnvio.css";

/**
 * Modal con el recorrido del envío por agencia de un albarán: sus estados y,
 * si se pidió recogida, las situaciones de la recogida. Se pregunta a la
 * agencia al abrirlo (no se guarda en la BD).
 *
 *   - El detalle de la orden lo abre con el botón "Seguimiento" de cada albarán enviado.
 *   - Si la agencia falla o no da seguimiento, el motivo sale dentro del modal.
 */
export const SeguimientoEnvioAlbaran = ({
    albaranId,
    codigo,
    onCerrar,
}: {
    albaranId: string;
    codigo: string;
    onCerrar: () => void;
}) => {
    const [seguimiento, setSeguimiento] = useState<SeguimientoEnvio | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let vigente = true;
        getSeguimientoEnvio(albaranId)
            .then((leido) => { if (vigente) setSeguimiento(leido); })
            .catch((e) => { if (vigente) setError(mensajeErrorSeguimiento(e)); });
        return () => { vigente = false; };
    }, [albaranId]);

    return (
        <QModal abierto={true} nombre="seguimientoEnvio" titulo={`Seguimiento del albarán ${codigo}`} onCerrar={onCerrar}>
            <div className="seguimiento-envio">
                {error ? (
                    <p className="q-texto-error">{error}</p>
                ) : seguimiento === null ? (
                    <p>Consultando a la agencia…</p>
                ) : (
                    <>
                        <p>{seguimiento.agencia} · Envío {seguimiento.numeroTracking}</p>
                        <TablaPasos
                            titulo="Envío"
                            pasos={seguimiento.estados}
                            vacio="La agencia no da estados de este envío."
                        />
                        {seguimiento.recogida && (
                            <TablaPasos
                                titulo={`Recogida ${seguimiento.recogida.numero}`}
                                pasos={seguimiento.recogida.situaciones}
                                vacio="La agencia no da situaciones de esta recogida."
                            />
                        )}
                        {seguimiento.errores.map((e) => (
                            <p key={e} className="q-texto-error">{e}</p>
                        ))}
                    </>
                )}
            </div>
            <div className="botones maestro-botones">
                <QBoton onClick={onCerrar}>Cerrar</QBoton>
            </div>
        </QModal>
    );
};

const TablaPasos = ({ titulo, pasos, vacio }: { titulo: string; pasos: PasoSeguimientoEnvio[]; vacio: string }) => (
    <section>
        <h4>{titulo}</h4>
        {pasos.length === 0 ? (
            <p>{vacio}</p>
        ) : (
            <table className="seguimiento-envio__tabla">
                <thead>
                    <tr><th>Fecha</th><th>Estado</th><th>Incidencia</th></tr>
                </thead>
                <tbody>
                    {pasos.map((paso, i) => (
                        <tr key={i}>
                            <td>{fechaPasoSeguimiento(paso.momento)}</td>
                            <td>{textoPasoSeguimiento(paso)}</td>
                            <td>{paso.incidencia ?? ""}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        )}
    </section>
);
