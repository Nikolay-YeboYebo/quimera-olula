import { QBoton } from "@olula/componentes/atomos/qboton.tsx";
import { QInput, QModal, QSelect } from "@olula/componentes/index.js";
import { ContextoError } from "@olula/lib/contexto.ts";
import { EmitirEvento } from "@olula/lib/diseño.ts";
import { imprimir_blob } from "@olula/lib/impresion.ts";
import { useForm } from "@olula/lib/useForm.js";
import { useModelo } from "@olula/lib/useModelo.ts";
import { useCallback, useContext, useEffect, useMemo, useState } from "react";
import { AgenciaEnvio } from "../../diseño.ts";
import { agenciasConManifiesto, manifiestoEnviosInicial, metaManifiestoEnvios } from "../../dominio.ts";
import { getAgenciasEnvio, getManifiestoEnvios } from "../../infraestructura.ts";

/**
 * Modal para sacar el manifiesto de envíos de una agencia (el "manifiesto
 * diario" de Eneboo): el PDF de la agencia con los envíos que tienen esa fecha
 * de recogida.
 *
 *   - El maestro de órdenes lo renderiza cuando estado === "MANIFIESTO".
 *   - Emite "manifiesto_cerrado" al imprimirlo o cancelar.
 */
export const ManifiestoEnvios = ({ publicar }: { publicar: EmitirEvento }) => {
    const { intentar } = useContext(ContextoError);
    const [agencias, setAgencias] = useState<AgenciaEnvio[] | null>(null);

    useEffect(() => {
        let vigente = true;
        intentar(async () => {
            const leidas = await getAgenciasEnvio();
            if (vigente) setAgencias(agenciasConManifiesto(leidas));
        });
        return () => { vigente = false; };
    }, [intentar]);

    const cerrar_ = useCallback(() => publicar("manifiesto_cerrado"), [publicar]);

    if (agencias === null) {
        return (
            <QModal abierto={true} nombre="manifiestoEnvios" titulo="Manifiesto de envíos" onCerrar={cerrar_}>
                <p>Cargando agencias…</p>
            </QModal>
        );
    }

    return <FormularioManifiesto agencias={agencias} cerrar_={cerrar_} />;
};

const FormularioManifiesto = ({
    agencias,
    cerrar_,
}: {
    agencias: AgenciaEnvio[];
    cerrar_: () => void;
}) => {
    const inicial = useMemo(() => manifiestoEnviosInicial(agencias), [agencias]);
    const { modelo, uiProps, valido } = useModelo(metaManifiestoEnvios, inicial);

    const opcionesAgencia = agencias.map((a) => ({ valor: a.codigo, descripcion: a.nombre }));

    const imprimir_ = useCallback(async () => {
        imprimir_blob(await getManifiestoEnvios(modelo.agenciaId, modelo.fecha));
        cerrar_();
    }, [modelo.agenciaId, modelo.fecha, cerrar_]);

    const [imprimir, cerrar, imprimiendo] = useForm(imprimir_, cerrar_);

    return (
        <QModal abierto={true} nombre="manifiestoEnvios" titulo="Manifiesto de envíos" onCerrar={cerrar}>
            {agencias.length === 0 ? (
                <p>Ninguna agencia de transporte activa da manifiesto de envíos.</p>
            ) : (
                <>
                    <p>Envíos de la agencia con esta fecha de recogida.</p>
                    <quimera-formulario>
                        <QSelect label="Agencia" {...uiProps("agenciaId")} opciones={opcionesAgencia} />
                        <QInput label="Fecha de recogida" {...uiProps("fecha")} />
                    </quimera-formulario>
                    <div className="botones maestro-botones">
                        <QBoton onClick={imprimir} deshabilitado={!valido || imprimiendo}>
                            {imprimiendo ? "Obteniendo manifiesto…" : "Imprimir manifiesto"}
                        </QBoton>
                    </div>
                </>
            )}
        </QModal>
    );
};
