import { resolve as resolvePath } from "path";
import lineByLine from "n-readlines";

export class DataBatcher {
  async processBatch(currBatch: any) {
    return new Promise((resolve, reject) => {
      if (currBatch.length === 0) {
        resolve();
      }
      const last = currBatch.length - 1;
      console.log(
        `batch: ${last + 1} records    first: ${currBatch[0].id}   last = ${
          currBatch[last].id
        }`
      );

      console.log("waiting ...");
      setTimeout(() => {
        resolve();
      }, 500);
    });
  }

  async batchFile(
    dbFile: string = "",
    maxBatches: number = 1,
    batchSize: number = 1
  ) {
    if (maxBatches < 1) {
      maxBatches = 0;
    }
    const liner = new lineByLine(dbFile);
    let currentBuffer = liner.next();
    let buffStr = currentBuffer.toString();
    let currLine: string = "";
    if (buffStr.charAt(buffStr.length - 1) === ",") {
      currLine = buffStr.substring(0, buffStr.length - 1);
    }

    let batchCount: number = 0;
    let currBatch: any[] = [];
    let totalRecords: number = 0;

    const advanceLine = () => {
      currentBuffer = liner.next();
      buffStr = currentBuffer.toString();
      if (buffStr.charAt(buffStr.length - 1) === ",") {
        currLine = buffStr.substring(0, buffStr.length - 1);
      }
    };

    while (batchCount < maxBatches && currentBuffer !== false) {
      if (currLine === "[" || currLine === "]" || currLine === "") {
        advanceLine();
        continue;
      }

      try {
        const caseInfo = JSON.parse(currLine);

        currBatch.push(caseInfo);
      } catch (err) {
        console.log("\nERROR");
        console.log(currLine);
        advanceLine();
        continue;
      }

      if (currBatch.length >= batchSize) {
        await this.processBatch(currBatch).then(() => {
          batchCount++;
          totalRecords += currBatch.length;
          currBatch = [];
        });
      }

      advanceLine();
    }

    await this.processBatch(currBatch)
      .then(() => {
        currBatch = [];
      })
      .then(() =>
        console.log(
          `\nDone! Processed ${totalRecords} records in ${batchCount} batches of ${batchSize}\n`
        )
      );
  }
}

const dbFile = resolvePath(
  __dirname,
  "data/processed",
  "mexico_2020-07-07_21.json"
);

const dataBatcher = new DataBatcher();
//dataBatcher.batchFile(dbFile, 20, 1);
//dataBatcher.batchFile(dbFile, 20, 100000);
