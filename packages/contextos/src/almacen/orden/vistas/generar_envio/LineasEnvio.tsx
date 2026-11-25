import { QInput } from "@olula/componentes/index.js";
import { LineaEnvio } from "../../diseño.ts";
import { CampoLineaEnvio, LONGITUD_CONTENIDO_LINEA_ENVIO, cambiarLineaEnvio, textoAdr } from "../../dominio.ts";

/**
 * Tabla de líneas de mercancía del envío, como la del envío Dachser de Eneboo
 * (tblLineasDachser): la agencia propone una línea por grupo ADR y una por
 * artículo, y aquí se pueden cambiar antes de enviar. Los datos ADR vienen del
 * artículo y solo se enseñan.
 */
export const LineasEnvio = ({
    lineas,
    enPales,
    onCambiar,
}: {
    lineas: LineaEnvio[];
    /** Si el envío va agrupado en palés: se elige el palé de cada línea. */
    enPales: boolean;
    onCambiar: (lineas: LineaEnvio[]) => void;
}) => {
    const celda = (indice: number, campo: CampoLineaEnvio, tipo?: "numero", maxLength?: number) => (
        <td className={`lineas-envio__${campo}`}>
            <QInput
                label=""
                nombre={`${campo}-${indice}`}
                condensado
                tipo={tipo}
                maxLength={maxLength}
                valor={String(lineas[indice][campo])}
                onChange={(valor: string) => onCambiar(cambiarLineaEnvio(lineas, indice, campo, valor))}
            />
        </td>
    );

    return (
        <table className="lineas-envio">
            <thead>
                <tr>
                    <th>Contenido</th>
                    <th title="Mercancía peligrosa">ADR</th>
                    {enPales && <th>Palé</th>}
                    <th>Etiquetas</th>
                    <th>Bultos</th>
                    <th>Embalaje</th>
                    <th title="Largo en cm">Largo</th>
                    <th title="Ancho en cm">Ancho</th>
                    <th title="Alto en cm">Alto</th>
                    <th>Kilos</th>
                    <th title="Tipo de embalaje ADR">Emb. ADR</th>
                    <th title="Peligrosa para el medio ambiente">M. amb.</th>
                </tr>
            </thead>
            <tbody>
                {lineas.map((linea, i) => (
                    <tr key={i}>
                        {celda(i, "contenido", undefined, LONGITUD_CONTENIDO_LINEA_ENVIO)}
                        <td className="lineas-envio__adr" title={linea.adr?.sustancia ?? ""}>{textoAdr(linea)}</td>
                        {enPales && celda(i, "posicionPale", "numero")}
                        {celda(i, "etiquetas", "numero")}
                        {celda(i, "bultos", "numero")}
                        {celda(i, "embalaje")}
                        {celda(i, "largo", "numero")}
                        {celda(i, "ancho", "numero")}
                        {celda(i, "alto", "numero")}
                        {celda(i, "kilos", "numero")}
                        <td>{linea.adr?.embalaje ?? ""}</td>
                        <td>{linea.adr ? (linea.adr.medioambiente ? "Sí" : "No") : ""}</td>
                    </tr>
                ))}
            </tbody>
        </table>
    );
};
