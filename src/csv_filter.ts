import firestore from "./db_connector";
import { resolve as resolvePath, sep } from "path";
import csv from "csv-parser";
import { EventManager as em, getProcessedDir } from "./utils";
import { writeFileSync, createReadStream, appendFile } from "fs";
import { mapCaseData } from "./data_mapper";

type results = {
  filteredFile: string;
  totalRecs: number;
  filteredRecs: number;
};

type filterStats = {
  updatedAt: Date;
  totalRecs: number;
  lastUpdatedId: string;
};

const reduceCsvFile = (csvFile: string, filterStats: filterStats) => {
  const filterDate = new Date(filterStats.updatedAt);
  const outputFile = resolvePath(
    getProcessedDir(),
    csvFile
      .split(sep)
      .pop()
      ?.replace(".csv", ".json") || ""
  );

  let lineCount = 0;
  let processedRows = 0;
  let switchBuffer = false;
  let primaryBuffer = "";
  let secondaryBuffer = "";
  let first = true;

  const resetFlags = () => {
    first = true;
    lineCount = 0;
    processedRows = 0;
    switchBuffer = false;
  };

  const appendToJsonFile = (end: boolean = false) => {
    if (switchBuffer) {
      const data = primaryBuffer;
      switchBuffer = !switchBuffer;
      appendFile(outputFile, data, (err) => {
        if (err) {
          em.events.emit(em.eventDic.ERROR, "csv_filter -", err);
        }
        primaryBuffer = "";
      });
    } else {
      const data = secondaryBuffer;
      switchBuffer = !switchBuffer;
      appendFile(outputFile, data, (err) => {
        if (err) {
          em.events.emit(em.eventDic.ERROR, "csv_filter -", err);
        }
        secondaryBuffer = "";
      });
    }
    if (end) {
      appendFile(outputFile, "\n]\n", (err) => {
        if (err) {
          em.events.emit(em.eventDic.ERROR, "csv_filter -", err);
        }
        em.events.emit(em.eventDic.NEW_RECORDS_AVAILABLE, outputFile);
        resetFlags();
      });
    }
  };

  writeFileSync(outputFile, "[", "utf8");
  createReadStream(csvFile)
    .pipe(csv())
    .on("data", (row) => {
      const mappedRow = mapCaseData(row, true);
      const rowDate = new Date(mappedRow.fechaActualizacion);

      if (rowDate < filterDate) {
        return processedRows++;
      }

      if (processedRows++ % 100000) {
        appendToJsonFile();
      }
      if (!switchBuffer) {
        primaryBuffer = `${first ? "\n" : ",\n"}` + JSON.stringify(mappedRow);
      } else {
        secondaryBuffer = `${first ? "\n" : ",\n"}` + JSON.stringify(mappedRow);
      }
      first = false;
    })
    .on("end", () => {
      appendToJsonFile(true);
    })
    .on("error", (err) => {
      throw err;
    });
};

export const filterCsvFile = async (csvFileLocation: string) => {
  return new Promise((resolve) => {
    firestore
      .collection(process.env.FIREBASE_DB_STATS_COLL || "")
      .get()
      .then((snapshot) => {
        const stats: filterStats[] = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          const statsObj = {
            id: doc.id,
            updatedAt: new Date(data.updatedAt),
            totalRecs: data.totalRecs,
            lastUpdatedId: data.lastUpdatedId,
          };
          stats.push(statsObj);
        });
        if (!stats[0]) {
          em.events.emit(
            em.eventDic.ERROR,
            "filterCsvFile",
            new Error("No firebase stats")
          );
        }
        reduceCsvFile(csvFileLocation, stats[0]);
        resolve();
      });
  });
};
