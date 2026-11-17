import { modeloEsValido } from "@olula/lib/dominio.ts";
import { NuevoEnvioAgencia, OrdenAlmacen, TipoOrden } from "../diseño.ts";
import {
    albaranesSinEnvio,
    conDatosAlbaran,
    conDestinatario,
    metaNuevoEnvioAgencia,
    nuevoEnvioAgenciaInicial,
    ordenPermiteEnvio,
    ordenVacia,
    servicioPorDefecto,
} from "../dominio.ts";
import {
    agenciaEnvioDesdeApi,
    datosEnvioDesdeApi,
    destinatarioEnvioDesdeApi,
    envioAgenciaAApi,
    ordenDesdeApi,
} from "../infraestructura.ts";

const destinatario = {
    nombre: "BELDA MARSET, LUCIA", nif: "", tipoVia: "Plaza", via: "Santa María", numero: "2",
    otros: "", codPostal: "02640", ciudad: "Almansa", provincia: "Albacete", codPaisIso: "ES",
    contacto: "BELDA MARSET, LUCIA", telefono: "600000000", email: "",
};

const orden = (tipo: TipoOrden, estado: string, albaranes: OrdenAlmacen["albaranes"]): OrdenAlmacen => ({
    ...ordenVacia(),
    id: "S00001",
    tipo,
    estado,
    albaranes,
});

const sinEnvio = { id: "1", codigo: "A1" };
const conEnvio = { id: "2", codigo: "A2", agenciaEnvio: "CEX", numeroTracking: "613000" };

describe("ordenPermiteEnvio", () => {
    test.each([
        ["SALIDA terminada con albarán sin envío", "SALIDA", "TERMINADA", [sinEnvio], true, true],
        ["sin agencias activas", "SALIDA", "TERMINADA", [sinEnvio], false, false],
        ["SALIDA preparada (sin albaranar)", "SALIDA", "PREPARADA", [sinEnvio], true, false],
        ["ENTRADA terminada", "ENTRADA", "TERMINADA", [sinEnvio], true, false],
        ["todos los albaranes ya enviados", "SALIDA", "TERMINADA", [conEnvio], true, false],
        ["sin albaranes", "SALIDA", "TERMINADA", [], true, false],
    ] as const)("%s", (_, tipo, estado, albaranes, hayAgencias, esperado) => {
        expect(ordenPermiteEnvio(orden(tipo, estado, [...albaranes]), hayAgencias)).toBe(esperado);
    });
});

describe("nuevoEnvioAgenciaInicial", () => {
    test("preselecciona el único albarán sin envío y la agencia si solo hay una", () => {
        const inicial = nuevoEnvioAgenciaInicial(
            orden("SALIDA", "TERMINADA", [sinEnvio, conEnvio]),
            [{
                codigo: "DACHSER", nombre: "Dachser",
                servicios: [{ codigo: "Y", descripcion: "targoflex" }], servicioPorDefecto: null,
                posicionesEtiqueta: [], permiteCrearRecogida: false,
            }],
        );

        expect(inicial.albaranId).toBe("1");
        expect(inicial.agenciaId).toBe("DACHSER");
        expect(inicial.servicio).toBe("Y");
        expect(inicial.bultos).toBe(1);
        expect(inicial.posicionEtiqueta).toBe("1");
        expect(inicial.crearRecogida).toBe(false);
        expect(inicial.destTelefono).toBe("");
    });

    test("con varias agencias no elige ninguna", () => {
        const inicial = nuevoEnvioAgenciaInicial(orden("SALIDA", "TERMINADA", [sinEnvio]), [
            {
                codigo: "DACHSER", nombre: "Dachser", servicios: [], servicioPorDefecto: null,
                posicionesEtiqueta: [], permiteCrearRecogida: false,
            },
            {
                codigo: "CEX", nombre: "Correos Express", servicios: [], servicioPorDefecto: null,
                posicionesEtiqueta: [], permiteCrearRecogida: true,
            },
        ]);

        expect(inicial.agenciaId).toBe("");
        expect(inicial.servicio).toBe("");
    });

    test("con una sola agencia propone su servicio por defecto", () => {
        const inicial = nuevoEnvioAgenciaInicial(orden("SALIDA", "TERMINADA", [sinEnvio]), [{
            codigo: "CEX", nombre: "Correos Express",
            servicios: [{ codigo: "63", descripcion: "Paq24" }, { codigo: "92", descripcion: "Paq Empresa 14" }],
            servicioPorDefecto: "92", posicionesEtiqueta: [], permiteCrearRecogida: true,
        }]);

        expect(inicial.servicio).toBe("92");
    });

    test("servicioPorDefecto: el de la agencia, si no el primero, si no ninguno", () => {
        const servicios = [{ codigo: "63", descripcion: "Paq24" }, { codigo: "92", descripcion: "Paq Empresa 14" }];
        const agencia = {
            codigo: "CEX", nombre: "Correos Express", servicios, servicioPorDefecto: "92",
            posicionesEtiqueta: [], permiteCrearRecogida: true,
        };
        expect(servicioPorDefecto(agencia)).toBe("92");
        expect(servicioPorDefecto({ ...agencia, servicioPorDefecto: null })).toBe("63");
        expect(servicioPorDefecto({ ...agencia, servicios: [], servicioPorDefecto: null })).toBe("");
        expect(servicioPorDefecto(undefined)).toBe("");
    });

    test("albaranesSinEnvio descarta los que ya tienen envío", () => {
        expect(albaranesSinEnvio(orden("SALIDA", "TERMINADA", [sinEnvio, conEnvio]))).toEqual([sinEnvio]);
    });
});

const envioValido = (): NuevoEnvioAgencia => conDestinatario({
    ...nuevoEnvioAgenciaInicial(orden("SALIDA", "TERMINADA", [sinEnvio]), []),
    albaranId: "1",
    agenciaId: "CEX",
    servicio: "PAQ24",
    bultos: 2,
    kilos: 12.5,
    fechaRecogida: new Date(2026, 10, 12),
}, destinatario);

describe("metaNuevoEnvioAgencia", () => {
    const valido = envioValido();

    test("un envío completo es válido", () => {
        expect(modeloEsValido(metaNuevoEnvioAgencia)(valido)).toBe(true);
    });

    test.each([
        ["sin albarán", { albaranId: "" }],
        ["sin agencia", { agenciaId: "" }],
        ["sin servicio", { servicio: "" }],
        ["cero bultos", { bultos: 0 }],
        ["bultos con decimales", { bultos: 1.5 }],
        ["cero kilos", { kilos: 0 }],
        // Lo que Eneboo exige del destinatario.
        ["destinatario sin teléfono", { destTelefono: "" }],
        ["destinatario sin dirección", { destVia: "" }],
        ["destinatario sin ciudad", { destCiudad: "" }],
        ["destinatario sin código postal", { destCodPostal: "" }],
        ["destinatario sin contacto", { destContacto: "" }],
    ])("%s no es válido", (_, cambios) => {
        expect(modeloEsValido(metaNuevoEnvioAgencia)({ ...valido, ...cambios })).toBe(false);
    });
});

describe("infraestructura del envío por agencia", () => {
    test("envioAgenciaAApi pasa a snake_case y la fecha a ISO, con destinatario y posición", () => {
        expect(envioAgenciaAApi({
            ...envioValido(), posicionEtiqueta: "3", crearRecogida: true, destCodPaisIso: "es",
        })).toEqual({
            albaran_id: "1",
            agencia_id: "CEX",
            servicio: "PAQ24",
            bultos: 2,
            kilos: 12.5,
            fecha_recogida: "2026-11-12",
            observaciones: null,
            posicion_etiqueta: 3,
            crear_recogida: true,
            destinatario: {
                nombre: "BELDA MARSET, LUCIA", nif: null, tipo_via: "Plaza", via: "Santa María",
                numero: "2", otros: null, cod_postal: "02640", ciudad: "Almansa", provincia: "Albacete",
                cod_pais_iso: "ES", contacto: "BELDA MARSET, LUCIA", telefono: "600000000", email: null,
            },
        });
    });

    test("agenciaEnvioDesdeApi lee las posiciones de etiqueta y si permite crear recogida", () => {
        const agencia = agenciaEnvioDesdeApi({
            codigo: "CEX", nombre: "Correos Express", servicios: [], servicio_por_defecto: "92",
            posiciones_etiqueta: [{ codigo: 1, descripcion: "Primera" }, { codigo: 2, descripcion: "Última" }],
            permite_crear_recogida: true,
        });
        expect(agencia.posicionesEtiqueta).toEqual([
            { codigo: 1, descripcion: "Primera" }, { codigo: 2, descripcion: "Última" },
        ]);
        expect(agencia.permiteCrearRecogida).toBe(true);
        expect(agencia.servicioPorDefecto).toBe("92");
        expect(agenciaEnvioDesdeApi({ codigo: "X", nombre: "X", servicios: [] }).permiteCrearRecogida).toBe(false);
    });

    test("destinatarioEnvioDesdeApi deja los nulos en blanco", () => {
        expect(destinatarioEnvioDesdeApi({
            nombre: "BELDA MARSET, LUCIA", nif: null, tipo_via: "Plaza", via: "Santa María", numero: "2",
            otros: null, cod_postal: "02640", ciudad: "Almansa", provincia: "Albacete", cod_pais_iso: "ES",
            contacto: "BELDA MARSET, LUCIA", telefono: "600000000", email: null,
        })).toEqual(destinatario);
    });

    test("ordenDesdeApi lee la agencia y el nº de envío de los albaranes", () => {
        const api = {
            id: "S00001", fecha: "2026-11-10", tipo: "SALIDA", almacen_id: "ALG", almacen: "General",
            abierta: false, estado: "TERMINADA", descripcion: "",
            ubicacion_origen_id: null, ubicacion_origen: null, caja_origen_id: null,
            ubicacion_destino_id: null, ubicacion_destino: null, caja_destino_id: null,
            pasos_pick: null, pasos_drop: null, lineas: [], lecturas_caja: [],
            albaranes: [
                { id: 1, codigo: "A1" },
                { id: 2, codigo: "A2", agencia_envio: "CEX", numero_tracking: "613000" },
            ],
        };

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        expect(ordenDesdeApi(api as any).albaranes).toEqual([
            { id: "1", codigo: "A1" },
            { id: "2", codigo: "A2", agenciaEnvio: "CEX", numeroTracking: "613000" },
        ]);
    });

    test("datosEnvioDesdeApi lee destinatario, bultos y kilos", () => {
        const datos = datosEnvioDesdeApi({
            destinatario: {
                nombre: "BELDA MARSET, LUCIA", nif: null, tipo_via: "Plaza", via: "Santa María", numero: "2",
                otros: null, cod_postal: "02640", ciudad: "Almansa", provincia: "Albacete", cod_pais_iso: "ES",
                contacto: "BELDA MARSET, LUCIA", telefono: "600000000", email: null,
            },
            bultos: 2,
            kilos: 3,
        });
        expect(datos).toEqual({ destinatario, bultos: 2, kilos: 3 });
    });
});

describe("conDatosAlbaran", () => {
    test("pone los bultos y kilos del albarán", () => {
        const envio = conDatosAlbaran(envioValido(), { destinatario, bultos: 4, kilos: 7.5 });
        expect([envio.bultos, envio.kilos, envio.destCiudad]).toEqual([4, 7.5, "Almansa"]);
    });

    test("si el albarán no tiene bultos ni kilos deja los del formulario", () => {
        const envio = conDatosAlbaran(envioValido(), { destinatario, bultos: null, kilos: null });
        expect([envio.bultos, envio.kilos]).toEqual([2, 12.5]);
    });
});
