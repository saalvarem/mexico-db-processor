import { resolve } from "path";
import { readdirSync, writeFileSync, appendFile, createReadStream } from "fs";
import csv from "csv-parser";
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

type catalogs = {
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

const titleCase = (txt: string) => {
  let text = txt;
  let firstLtr = 0;
  for (let i = 0; i < text.length; i++) {
    if (i === 0 && /[a-záéíóúüñA-ZÁÉÍÓÚÜÑ]/.test(text.charAt(i))) firstLtr = 2;
    if (firstLtr === 0 && /[a-záéíóúüñA-ZÁÉÍÓÚÜÑ]/.test(text.charAt(i)))
      firstLtr = 2;
    if (firstLtr === 1 && /[^a-záéíóúüñA-ZÁÉÍÓÚÜÑ]/.test(text.charAt(i))) {
      if (text.charAt(i) === "'") {
        if (
          i + 2 === text.length &&
          /[a-záéíóúüñA-ZÁÉÍÓÚÜÑ]/.test(text.charAt(i + 1))
        )
          firstLtr = 3;
        else if (
          i + 2 < text.length &&
          /[^a-záéíóúüñA-ZÁÉÍÓÚÜÑ]/.test(text.charAt(i + 2))
        )
          firstLtr = 3;
      }
      if (firstLtr === 3) firstLtr = 1;
      else firstLtr = 0;
    }
    if (firstLtr === 2) {
      firstLtr = 1;
      text =
        text.substr(0, i) + text.charAt(i).toUpperCase() + text.substr(i + 1);
    } else {
      text =
        text.substr(0, i) + text.charAt(i).toLowerCase() + text.substr(i + 1);
    }
  }
  return text;
};

export class DataExtractor {
  private covidData: any[];
  private first: boolean;
  private jsonFile: string;
  private lineCount: number;
  private primaryBuffer: string;
  private processedRows: number;
  private secondaryBuffer: string;
  private switchBuffer: boolean;
  private catalogs: catalogs;

  constructor(
    private dbFileDir: string = "../data/dbcsv",
    private processedFileDir: string = "../data/processed/",
    private catalogsFileDir: string = "../data/raw/catalogs",
    private descriptorsFileDir: string = "../data/raw/descriptors"
  ) {
    const getJsonFileName = () => {
      const now = new Date();
      const month = `${now.getMonth() + 1}`.padStart(2, "0");
      const day = `${now.getMonth() + 1}`.padStart(2, "0");
      const hour = `${now.getHours()}`.padStart(2, "0");
      const mins = `${now.getMinutes()}`.padStart(2, "0");
      const timeStamp = `${now.getFullYear()}-${month}-${day}_${hour}`;
      return resolve(
        __dirname,
        this.processedFileDir,
        `mexico_${timeStamp}.json`
      );
    };

    this.dbFileDir = resolve(__dirname, dbFileDir);
    this.processedFileDir = resolve(__dirname, processedFileDir);
    this.catalogsFileDir = resolve(__dirname, catalogsFileDir);
    this.descriptorsFileDir = resolve(__dirname, descriptorsFileDir);
    this.covidData = [];
    this.first = true;
    this.jsonFile = getJsonFileName();
    this.lineCount = 0;
    this.primaryBuffer = "";
    this.processedRows = 0;
    this.secondaryBuffer = "";
    this.switchBuffer = false;
    this.catalogs = require(resolve(this.processedFileDir, "catalogs.json"));
  }

  private resetFlags = () => {
    this.first = true;
    this.lineCount = 0;
    this.processedRows = 0;
    this.switchBuffer = false;
  };

  private appendToJsonFile = (end: boolean = false) => {
    console.log(`Writting ${this.processedRows} to JSON file`);
    if (this.switchBuffer) {
      const data = this.primaryBuffer;
      this.switchBuffer = !this.switchBuffer;
      appendFile(this.jsonFile, data, (err) => {
        if (err) throw err;
        this.primaryBuffer = "";
      });
    } else {
      const data = this.secondaryBuffer;
      this.switchBuffer = !this.switchBuffer;
      appendFile(this.jsonFile, data, (err) => {
        if (err) throw err;
        this.secondaryBuffer = "";
      });
    }
    if (end) {
      appendFile(this.jsonFile, "\n]\n", (err) => {
        if (err) throw err;

        this.resetFlags();
      });
    }
  };

  processDbCsv = (csvFileName: string, append: boolean = true) => {
    writeFileSync(this.jsonFile, "", "utf8");
    const fileN = resolve(this.dbFileDir, csvFileName);
    const dbFile = resolve(__dirname, fileN);
    createReadStream(dbFile)
      .pipe(csv())
      .on("data", (row) => {
        const mappedRow = this.mapCaseData(row);
        if (this.lineCount % 100000 === 0) {
          console.log(`working... ${this.lineCount++}/750000+`);
        }
        if (this.processedRows++ % 100000) {
          this.appendToJsonFile();
        }
        if (this.switchBuffer) {
          this.primaryBuffer =
            `${this.first ? "[\n" : ",\n"}` + JSON.stringify(mappedRow);
        } else {
          this.secondaryBuffer =
            `${this.first ? "[\n" : ",\n"}` + JSON.stringify(mappedRow);
        }
        this.first = false;
      })
      .on("end", () => {
        this.appendToJsonFile(true);
        console.log(this.covidData);
      })
      .on("error", (err) => {
        throw err;
      });
  };

  processCatalogsXlsx = async () => {
    const catalogs: any = {};
    const dirFiles = readdirSync(this.catalogsFileDir);
    await new Promise((res, rej) => {
      const formatCatalogRow = (catalogName: string, row: any) => {
        const formattedRow: any = {};
        switch (catalogName) {
          case CATALOGS.NACIONALIDAD:
          case CATALOGS.ORIGEN:
          case CATALOGS.RESULTADO:
          case CATALOGS.SECTOR:
          case CATALOGS.SEXO:
          case CATALOGS.SINO:
          case CATALOGS.TIPOPACIENTE:
            formattedRow.id = parseInt(row.CLAVE).toString();
            formattedRow.data = {
              descripcion:
                titleCase(row.DESCRIPCIÓN).trim() ||
                titleCase(row.DESCRIPCION).trim(),
            };
            return formattedRow;
          case CATALOGS.ENTIDADES:
            formattedRow.id = parseInt(row.CLAVE_ENTIDAD).toString();
            formattedRow.data = {
              entidadFederativa: titleCase(row.ENTIDAD_FEDERATIVA).trim(),
              abreviatura: row.ABREVIATURA.trim(),
            };
            return formattedRow;
          case CATALOGS.MUNICIPIOS:
            formattedRow.id = parseInt(row.CLAVE_MUNICIPIO).toString();
            formattedRow.data = {
              entidadFederativa: parseInt(row.CLAVE_ENTIDAD).toString(),
              municipio: titleCase(row.MUNICIPIO).trim(),
            };
            return formattedRow;
          default:
            throw new Error(`no catalog for "${catalogName}"`);
        }
      };

      dirFiles.forEach((filename, fileIndex) => {
        const catalogFile = resolve(__dirname, this.catalogsFileDir, filename);
        const catalog: any = {};
        const catalogNameWithExt = filename.split(" ")[
          filename.split(" ").length - 1
        ];
        const catalogName = camelCase(catalogNameWithExt.split(".")[0]);
        createReadStream(catalogFile)
          .pipe(csv())
          .on("data", (row) => {
            const formattedRow = formatCatalogRow(catalogName, row);
            catalog[formattedRow.id] = formattedRow.data;
          })
          .on("end", () => {
            catalogs[catalogName] = catalog;
            if (fileIndex >= dirFiles.length - 1) {
              res(catalogs);
            }
          })
          .on("error", (err) => {
            rej(err);
          });
      });
    }).then((catalogs: any) => {
      if (catalogs[""]) {
        delete catalogs[""];
      }
      for (const id in catalogs.municipios) {
        const stateCode = catalogs.municipios[id].entidadFederativa;
        const stateName = catalogs.entidades[stateCode].entidadFederativa;
        catalogs.municipios[id].entidadFederativa = stateName;
      }
      const jsonCatalogFile = resolve(this.processedFileDir, "catalogs.json");
      writeFileSync(jsonCatalogFile, JSON.stringify(catalogs), "utf8");
    });
  };

  private mapCaseData = (caseData: any) => {
    const mappedData: any = {};
    const dic = this.catalogs;

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
          mappedData[newKey] = dic.origen[key].descripcion;
          break;
        case "SECTOR":
          mappedData[newKey] = dic.sector[key].descripcion;
          break;
        case "ENTIDAD_UM":
        case "ENTIDAD_NAC":
        case "ENTIDAD_RES":
          mappedData[newKey] = dic.entidades[key].entidadFederativa;
          // mappedData[`${newKey}Abrv`] = dic.entidades[key].abreviatura;
          break;
        case "SEXO":
          mappedData[newKey] = dic.sexo[key].descripcion;
          break;
        case "MUNICIPIO_RES":
          mappedData[newKey] = dic.municipios[key].municipio;
          break;
        case "TIPO_PACIENTE":
          mappedData[newKey] = dic.tipoPaciente[key].descripcion;
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
          mappedData[newKey] = dic.siNo[key].descripcion;
          break;
        case "EDAD":
          mappedData[newKey] = parseInt(key);
          break;
        case "NACIONALIDAD":
          mappedData[newKey] = dic.nacionalidad[key].descripcion;
          break;
        case "RESULTADO":
          mappedData[newKey] = dic.resultado[key].descripcion;
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
          mappedData[newKey] = parseInt(caseData[prop]).toString();
      }
    }
    return mappedData;
  };
}
