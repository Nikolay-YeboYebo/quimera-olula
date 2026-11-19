import { QBoton } from "@olula/componentes/atomos/qboton.tsx";
import { QInput, QModal } from "@olula/componentes/index.js";
import { EmitirEvento } from "@olula/lib/diseño.ts";
import { imprimir_blob } from "@olula/lib/impresion.ts";
import { useForm } from "@olula/lib/useForm.js";
import { useModelo } from "@olula/lib/useModelo.ts";
import { useCallback, useMemo } from "react";
import { AgenciaEnvio } from "../../diseño.ts";
import { manifiestoEnviosInicial, metaManifiestoEnvios } from "../../dominio.ts";
import { getManifiestoEnvios } from "../../infraestructura.ts";

/**
 * Modal para sacar el manifiesto diario de una agencia (el "manifiesto diario"
 * de Eneboo): el PDF de la agencia con los envíos que tienen esa fecha de
 * recogida (Dachser: solo los confirmados).
 *
 *   - El maestro de órdenes lo renderiza cuando estado === "MANIFIESTO", con la
 *     agencia elegida en su menú (MenuAgenciaEnvio).
 *   - Emite "manifiesto_cerrado" al imprimirlo o cancelar.
 */
export const ManifiestoEnvios = ({
    publicar,
    agencia,
}: {
    publicar: EmitirEvento;
    agencia: AgenciaEnvio;
}) => {
    const inicial = useMemo(() => manifiestoEnviosInicial(agencia), [agencia]);
    const { modelo, uiProps, valido } = useModelo(metaManifiestoEnvios, inicial);

    const cerrar_ = useCallback(() => publicar("manifiesto_cerrado"), [publicar]);

    const imprimir_ = useCallback(async () => {
        imprimir_blob(await getManifiestoEnvios(modelo.agenciaId, modelo.fecha));
        cerrar_();
    }, [modelo.agenciaId, modelo.fecha, cerrar_]);

    const [imprimir, cerrar, imprimiendo] = useForm(imprimir_, cerrar_);

    return (
        <QModal abierto={true} nombre="manifiestoEnvios" titulo={`Manifiesto diario · ${agencia.nombre}`}
            onCerrar={cerrar}>
            <p>Envíos de {agencia.nombre} con esta fecha de recogida.</p>
            <quimera-formulario>
                <QInput label="Fecha de recogida" {...uiProps("fecha")} />
            </quimera-formulario>
            <div className="botones maestro-botones">
                <QBoton onClick={imprimir} deshabilitado={!valido || imprimiendo}>
                    {imprimiendo ? "Obteniendo manifiesto…" : "Imprimir manifiesto"}
                </QBoton>
            </div>
        </QModal>
    );
};
