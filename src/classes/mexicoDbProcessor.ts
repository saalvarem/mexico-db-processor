import csv from "csv-parser";
import fs from "fs";
import moment from "moment-timezone";
import unzipper from "unzipper";
import {
  mapCaseDataByLocation,
  mapCaseDataCsvToJson,
} from "../utilities/dataMapper";
import { config as loadEnvVariables } from "dotenv";
import { ensureDirExistsSync, srcDir } from "../utilities/utils";
import { getDbStats } from "../utilities/databaseConnector";
import { resolve as resolvePath, sep } from "path";
loadEnvVariables();

export default class MexicoDbProcessor {
  private static singleton: MexicoDbProcessor;
  private temporaryFiles: string[] = [];
  private downloadsDir: string =
    process.env.DONWLOADS_DIR || "../data/downloads";
  private processedDir: string =
    process.env.PROCESSED_DIR || "../data/processed";

  constructor() {
    if (MexicoDbProcessor.singleton) {
      return MexicoDbProcessor.singleton;
    } else {
      MexicoDbProcessor.singleton = this;
    }
  }

  private getPossibleDbFilename(suffix?: string): string[] {
    const yesterday = moment(new Date()).add(-1, "d");
    const today = moment(new Date());
    const tomorrow = moment(new Date()).add(1, "d");
    const csvFileName = `COVID19MEXICO${suffix ? "_" + suffix : ""}.csv`;
    const possibleDbFileNames = [
      `${yesterday.format(`YYMMDD`)}${csvFileName}`,
      `${today.format(`YYMMDD`)}${csvFileName}`,
      `${tomorrow.format(`YYMMDD`)}${csvFileName}`,
    ];
    return possibleDbFileNames;
  }

  async getCsvFileFromZip(zipFileLocation: string): Promise<string> {
    return new Promise(async (resolve, reject) => {
      if (fs.existsSync(zipFileLocation)) {
        const directory = await unzipper.Open.file(zipFileLocation);
        const expectedFiles = this.getPossibleDbFilename();
        let foundFile: string = "";
        for (let f = 0; f < expectedFiles.length; f++) {
          if (foundFile) {
            break;
          }
          const outputFile = resolvePath(
            srcDir(),
            this.downloadsDir,
            expectedFiles[f]
          );
          foundFile = await new Promise((innerResolve) => {
            for (const file of directory.files) {
              const filename = file.path;
              if (filename.toLowerCase() === expectedFiles[f].toLowerCase()) {
                file
                  .stream()
                  .pipe(fs.createWriteStream(outputFile))
                  .on("error", () => innerResolve(""))
                  .on("finish", () => innerResolve(outputFile));
              } else {
                innerResolve("");
              }
            }
          });
        }

        if (foundFile) {
          this.temporaryFiles.push(foundFile);
          resolve(foundFile);
        } else {
          reject(
            new Error(`"${expectedFiles.join('" or "')}" not in ZIP file.`)
          );
        }
      } else {
        reject(new Error(`Cannot unzip file (ZIP file not found).`));
      }
    });
  }

  async convertDbToJson(csvFile: string): Promise<string> {
    return new Promise(async (resolve, reject) => {
      const dbStats = await getDbStats();
      const filterDate: Date = dbStats.updatedAt;
      const outputFile = resolvePath(
        srcDir(),
        this.processedDir,
        csvFile
          .split(sep)
          .pop()
          ?.replace(".csv", ".json") || ""
      );

      let processedRows = 0;
      let switchBuffer = false;
      let primaryBuffer = "";
      let secondaryBuffer = "";
      let first = true;

      const appendToJsonFile = (end: boolean = false) => {
        if (!switchBuffer) {
          const data = primaryBuffer;
          switchBuffer = !switchBuffer;
          fs.appendFile(outputFile, data, (err) => {
            if (err) {
              reject(err);
              return;
            }
            primaryBuffer = "";
          });
        } else {
          const data = secondaryBuffer;
          switchBuffer = !switchBuffer;
          fs.appendFile(outputFile, data, (err) => {
            if (err) {
              reject(err);
              return;
            }
            secondaryBuffer = "";
          });
        }
        if (end) {
          fs.appendFile(outputFile, "\n]\n", (err) => {
            if (err) {
              reject(err);
              return;
            }
            resolve(outputFile);
          });
        }
      };

      fs.writeFileSync(outputFile, "[", "utf8");
      fs.createReadStream(csvFile)
        .pipe(csv())
        .on("data", (row) => {
          const mappedRow = mapCaseDataCsvToJson(row, true);
          const rowDate = new Date(mappedRow.fechaActualizacion);

          if (processedRows % 500000 === 0) {
            console.log(
              `#${processedRows
                .toString()
                .replace(/\B(?=(\d{3})+(?!\d))/g, ",")}`
            );
          }

          if (rowDate < filterDate) {
            return processedRows++;
          }

          if (!switchBuffer) {
            primaryBuffer +=
              `${first ? "\n" : ",\n"}` + JSON.stringify(mappedRow);
          } else {
            secondaryBuffer +=
              `${first ? "\n" : ",\n"}` + JSON.stringify(mappedRow);
          }
          first = false;

          if (processedRows > 0 && processedRows % 500000 === 0) {
            console.log(
              `#${processedRows
                .toString()
                .replace(/\B(?=(\d{3})+(?!\d))/g, ",")} to JSON`
            );
            appendToJsonFile();
          }
          processedRows++;
        })
        .on("end", () => {
          console.log(
            `#${processedRows
              .toString()
              .replace(/\B(?=(\d{3})+(?!\d))/g, ",")} to JSON`
          );
          appendToJsonFile(true);
        })
        .on("error", (err) => {
          reject(err);
        });
    });
  }

  async groupTotalsByLocation(csvFile: string): Promise<string> {
    return new Promise(async (resolve, reject) => {
      const entidades = await mapCaseDataByLocation(csvFile);
      const totalsByLocFile = resolvePath(
        srcDir(),
        this.processedDir,
        "mx-totals-by-location.json"
      );
      this.temporaryFiles.push(totalsByLocFile);
      const data = Object.assign(
        {
          updatedAt: moment()
            .tz("America/New_York")
            .format("YYYY-MM-DD"),
        },
        entidades
      );
      try {
        ensureDirExistsSync(this.processedDir);
        fs.writeFileSync(totalsByLocFile, JSON.stringify(data));
      } catch (err) {
        reject(err);
        return;
      }

      resolve(totalsByLocFile);
    });
  }

  deleteTempFiles(): void {
    for (const tempFile of this.temporaryFiles) {
      if (fs.existsSync(tempFile)) {
        console.log(`Deleting temp file: ${tempFile}`);
        fs.unlinkSync(tempFile);
      }
    }
  }
}
