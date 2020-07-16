import { resolve } from "path";
import { readdirSync, writeFileSync, appendFile, createReadStream } from "fs";
import csv from "csv-parser";

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
import { camelCase } from "change-case";

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

export class DataExporter {
  private covidData: any[];
  private first: boolean;
  private jsonFile: string;
  private lineCount: number;
  private primaryBuffer: string;
  private processedRows: number;
  private secondaryBuffer: string;
  private switchBuffer: boolean;

  constructor(
    private dbFile: string = "test.csv",
    private catalogsFileDir: string = "catalogs"
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
        "../data/processed",
        `mexico_${timeStamp}.json`
      );
    };

    this.catalogsFileDir = resolve(__dirname, catalogsFileDir);
    this.covidData = [];
    this.dbFile = dbFile;
    this.first = true;
    this.jsonFile = getJsonFileName();
    this.lineCount = 0;
    this.primaryBuffer = "";
    this.processedRows = 0;
    this.secondaryBuffer = "";
    this.switchBuffer = false;
  }

  private resetFlags = () => {
    this.first = true;
    this.lineCount = 0;
    this.processedRows = 0;
    this.switchBuffer = false;
  };

  private appendToJsonFile = (end: boolean = false) => {
    if (this.switchBuffer) {
      const data = this.primaryBuffer;
      this.switchBuffer = !this.switchBuffer;
      appendFile(this.jsonFile, data, (err) => {
        if (err) throw err;
        this.primaryBuffer = "";
        console.log(`Wrote ${this.processedRows} to JSON file`);
      });
    } else {
      const data = this.secondaryBuffer;
      this.switchBuffer = !this.switchBuffer;
      appendFile(this.jsonFile, data, (err) => {
        if (err) throw err;
        this.secondaryBuffer = "";
        console.log(`Wrote ${this.processedRows} to JSON file`);
      });
    }
    if (end) {
      appendFile(this.jsonFile, "\n]\n", (err) => {
        if (err) throw err;
        console.log(`Wrote ${this.processedRows} to JSON file`);
        this.resetFlags();
      });
    }
  };

  processDbCsv = (filename?: string) => {
    writeFileSync(this.jsonFile, "", "utf8");
    const fileN = filename || this.dbFile;
    const dbFile = resolve(__dirname, fileN);
    createReadStream(dbFile)
      .pipe(csv())
      .on("data", (row) => {
        this.covidData.push(row);
        if (this.lineCount % 50000 === 0) {
          console.log(`working... ${this.lineCount++}/750000+`);
        }
        if (this.processedRows++ % 100000) {
          this.appendToJsonFile();
        }
        if (this.switchBuffer) {
          this.primaryBuffer =
            `${this.first ? "[\n" : ",\n"}` + JSON.stringify(row);
        } else {
          this.secondaryBuffer =
            `${this.first ? "[\n" : ",\n"}` + JSON.stringify(row);
        }
        this.first = false;
      })
      .on("end", () => {
        this.appendToJsonFile(true);
        console.log(this.covidData.length);
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
            throw `no catalog for "${catalogName}"`;
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
      for (let id in catalogs.municipios) {
        const stateCode = catalogs.municipios[id].entidadFederativa;
        const stateName = catalogs.entidades[stateCode].entidadFederativa;
        catalogs.municipios[id].entidadFederativa = stateName;
      }

      const jsonCatalogFile = resolve(
        __dirname,
        "processedFiles",
        "catalogs.json"
      );

      writeFileSync(jsonCatalogFile, JSON.stringify(catalogs), "utf8");
    });
  };
}

const dataExporter = new DataExporter();
//"200714COVID19MEXICO.csv"
dataExporter.processDbCsv("../data/dbcsv/test.csv");
//dataExporter.processDbCsv("200714COVID19MEXICO.csv");
