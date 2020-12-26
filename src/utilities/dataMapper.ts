import { resolve as resolvePath } from "path";
import { camelCase } from "change-case";

const CATALOGS = {
  ENTIDADES: "entidades",
  MUNICIPIOS: "municipios",
  NACIONALIDAD: "nacionalidad",
  ORIGEN: "origen",
  RESULTADO: "resultado",
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

export const mapCaseData = (caseData: any, translate: boolean = true) => {
  const mappedData: any = {};

  const dic = require(resolvePath(
    __dirname,
    process.env.CATALOGS_DIR || "./data/catalogs",
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
