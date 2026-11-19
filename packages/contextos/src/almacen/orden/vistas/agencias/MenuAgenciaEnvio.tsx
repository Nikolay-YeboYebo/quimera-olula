import { QBoton } from "@olula/componentes/atomos/qboton.tsx";
import { useEffect, useRef, useState } from "react";
import { AgenciaEnvio, FuncionAgencia } from "../../diseño.ts";
import { NOMBRES_FUNCION_AGENCIA } from "../../dominio.ts";
import "./MenuAgenciaEnvio.css";

/**
 * Botón de una agencia de transporte en la lista de órdenes que despliega lo
 * que se puede hacer con ella fuera de una orden concreta (de momento, el
 * manifiesto diario). Cada agencia trae sus funciones del servidor.
 */
export const MenuAgenciaEnvio = ({
    agencia,
    onFuncion,
}: {
    agencia: AgenciaEnvio;
    onFuncion: (funcion: FuncionAgencia) => void;
}) => {
    const [abierto, setAbierto] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    // Se cierra al pulsar fuera o con Escape.
    useEffect(() => {
        if (!abierto) return;
        const alPulsar = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) setAbierto(false);
        };
        const alTeclear = (e: KeyboardEvent) => {
            if (e.key === "Escape") setAbierto(false);
        };
        document.addEventListener("mousedown", alPulsar);
        document.addEventListener("keydown", alTeclear);
        return () => {
            document.removeEventListener("mousedown", alPulsar);
            document.removeEventListener("keydown", alTeclear);
        };
    }, [abierto]);

    return (
        <div className="menu-agencia-envio" ref={ref}>
            <QBoton variante="borde" onClick={() => setAbierto(!abierto)}>
                {agencia.nombre} ▾
            </QBoton>
            {abierto && (
                <ul className="menu-agencia-envio__opciones" role="menu">
                    {agencia.funciones.map((funcion) => (
                        <li key={funcion} role="menuitem">
                            <button
                                type="button"
                                onClick={() => {
                                    setAbierto(false);
                                    onFuncion(funcion);
                                }}
                            >
                                {NOMBRES_FUNCION_AGENCIA[funcion]}
                            </button>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
};
