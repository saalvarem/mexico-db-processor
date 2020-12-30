import LineByLine from "n-readlines";
import { Entidad } from "../models/types";
import { camelCase } from "change-case";
import { config as loadEnvVariables } from "dotenv";
import { resolve as resolvePath } from "path";
import { srcDir } from "./utils";
loadEnvVariables();

const CATALOGS = {
  ENTIDADES: "entidades",
  MUNICIPIOS: "municipios",
  NACIONALIDAD: "nacionalidad",
  ORIGEN: "origen",
  RESULTADO: "resultado",
  CLASIFICACION_FINAL: "resultado",
  SECTOR: "sector",
  SEXO: "sexo",
  SINO: "siNo",
  TIPOPACIENTE: "tipoPaciente",
};

export type catalogs = {
  municipios: any;
  nacionalidad: any;
  origen: any;
  resultado: any;
  sector: any;
  sexo: any;
  siNo: any;
  tipoPaciente: any;
  entidades: any;
};

export const mapCaseDataCsvToJson = (
  caseData: any,
  translate: boolean = true
) => {
  const mappedData: any = {};

  const dic = require(resolvePath(
    srcDir(),
    process.env.CATALOGS_DIR || "../data/catalogs",
    "catalogs.json"
  ));

  for (const prop in caseData) {
    const key = parseInt(caseData[prop]).toString();
    const newKey = camelCase(prop);
    switch (prop) {
      case "ID_REGISTRO":
        mappedData.id = caseData[prop];
        break;
      case "FECHA_ACTUALIZACION":
      case "FECHA_SINTOMAS":
      case "FECHA_DEF":
      case "FECHA_INGRESO":
        const dateVal = isNaN(Date.parse(caseData[prop]))
          ? null
          : new Date(caseData[prop]);
        mappedData[newKey] = dateVal;
        break;
      case "ORIGEN":
        mappedData[newKey] = translate
          ? dic.origen[key].descripcion
          : parseInt(key);
        break;
      case "SECTOR":
        mappedData[newKey] = translate
          ? dic.sector[key].descripcion
          : parseInt(key);
        break;
      case "ENTIDAD_UM":
      case "ENTIDAD_NAC":
      case "ENTIDAD_RES":
        mappedData[newKey] = translate
          ? dic.entidades[key].entidadFederativa
          : parseInt(key);
        // mappedData[`${newKey}Abrv`] = translate? dic.entidades[key].abreviatura : parseInt(key);
        break;
      case "SEXO":
        mappedData[newKey] = translate
          ? dic.sexo[key].descripcion
          : parseInt(key);
        break;
      case "MUNICIPIO_RES":
        mappedData[newKey] = translate
          ? dic.municipios[key].municipio
          : parseInt(key);
        break;
      case "TIPO_PACIENTE":
        mappedData[newKey] = translate
          ? dic.tipoPaciente[key].descripcion
          : parseInt(key);
        break;
      case "INTUBADO":
      case "NEUMONIA":
      case "EMBARAZO":
      case "HABLA_LENGUA_INDIG":
      case "DIABETES":
      case "EPOC":
      case "ASMA":
      case "INMUSUPR":
      case "HIPERTENSION":
      case "OTRA_COM":
      case "CARDIOVASCULAR":
      case "OBESIDAD":
      case "RENAL_CRONICA":
      case "TABAQUISMO":
      case "OTRO_CASO":
      case "MIGRANTE":
      case "UCI":
        mappedData[newKey] = translate
          ? dic.siNo[key].descripcion
          : parseInt(key);
        break;
      case "EDAD":
        mappedData[newKey] = parseInt(key);
        break;
      case "NACIONALIDAD":
        mappedData[newKey] = translate
          ? dic.nacionalidad[key].descripcion
          : parseInt(key);
        break;
      case "RESULTADO":
        mappedData[newKey] = translate
          ? dic.resultado[key].descripcion
          : parseInt(key);
        break;
      case "CLASIFICACION_FINAL":
        mappedData[newKey] = translate
          ? dic.resultado[key].descripcion
          : parseInt(key);
        break;
      case "PAIS_NACIONALIDAD":
      case "PAIS_ORIGEN":
        const text = caseData[prop];
        if (text === "97" || text === "98" || text === "99") {
          mappedData[newKey] = dic.siNo[text].descripcion;
        } else {
          mappedData[newKey] = text;
        }
        break;
      default:
        mappedData[newKey] = parseInt(caseData[prop]);
    }
  }
  return mappedData;
};

export const mapCaseDataByLocation = (
  csvFile: string
): Promise<{
  [entidad: string]: Entidad;
}> => {
  return new Promise((resolve, reject) => {
    const quotes = /\"/g;
    const catalog = require(resolvePath(
      srcDir(),
      process.env.CATALOGS_DIR || "../data/catalogs",
      "catalogs.json"
    ));
    const entidades: { [entidad: string]: Entidad } = {};

    let syncRowCount = 0;
    const liner = new LineByLine(csvFile);
    let currentBuffer = liner.next();
    let currLine: string = currentBuffer.toString().replace("\r", "");
    let firstLine = true;
    const advanceLine = (liner: LineByLine) => {
      currentBuffer = liner.next();
      currLine = currentBuffer.toString().replace("\r", "");
    };
    let colNames: string[] = [];
    const idx: { [colName: string]: number } = {};

    while (currentBuffer !== false) {
      if (firstLine) {
        colNames = currLine.split(",");
        for (const i in colNames) {
          idx[colNames[i].replace(quotes, "")] = parseInt(i);
        }
        firstLine = false;
        advanceLine(liner);
      }

      syncRowCount++;
      if (syncRowCount % 500000 === 0) {
        console.log(
          `#${syncRowCount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",")}`
        );
      }

      try {
        const rVal: string[] = currLine
          .split(",")
          .map((val) => val.replace(quotes, ""));
        const entityId: string = parseInt(rVal[idx.ENTIDAD_UM]).toString();
        const enterDate: string = rVal[idx.FECHA_INGRESO];
        const currEnt: Entidad = entidades[entityId]
          ? entidades[entityId]
          : {
              entityId, // "2"
              name: catalog.entidades[entityId].entidadFederativa, // "Baja California";
              code: catalog.entidades[entityId].abreviatura, // "BC";
              positive: [{ date: enterDate, cases: 0 }],
              negative: [{ date: enterDate, cases: 0 }],
              dead: [{ date: enterDate, cases: 0 }],
            };
        if (["1", "2", "3"].includes(rVal[idx.CLASIFICACION_FINAL])) {
          const indexOfCase = currEnt.positive.findIndex(
            (c) => c.date === enterDate
          );
          if (indexOfCase >= 0) {
            currEnt.positive[indexOfCase].cases++;
          } else {
            currEnt.positive.push({ date: enterDate, cases: 1 });
          }
        } else if (rVal[idx.CLASIFICACION_FINAL] === "7") {
          const indexOfCase = currEnt.negative.findIndex(
            (c) => c.date === enterDate
          );
          if (indexOfCase >= 0) {
            currEnt.negative[indexOfCase].cases++;
          } else {
            currEnt.negative.push({ date: enterDate, cases: 1 });
          }
        }
        if (rVal[idx.FECHA_DEF] !== "9999-99-99") {
          const indexOfCase = currEnt.dead.findIndex(
            (c) => c.date === enterDate
          );
          if (indexOfCase >= 0) {
            currEnt.dead[indexOfCase].cases++;
          } else {
            currEnt.dead.push({ date: enterDate, cases: 1 });
          }
        }
        entidades[entityId] = currEnt;
      } catch (err) {
        console.log(`ERROR in sync row ${syncRowCount}`);
        console.error(err);
        reject(err);
      }

      advanceLine(liner);
    }

    console.log(
      `#${syncRowCount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",")}`
    );

    for (const id in entidades) {
      entidades[id].positive
        .sort((a, b) => (a.date < b.date ? -1 : 1))
        .map((c) => c.cases);
      entidades[id].negative
        .sort((a, b) => (a.date < b.date ? -1 : 1))
        .map((c) => c.cases);
      entidades[id].dead.sort((a, b) => (a.date < b.date ? -1 : 1));
    }

    resolve(entidades);
  });
};
