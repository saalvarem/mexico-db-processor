import { expect } from "chai";
import FileDownloader from "../src/classes/fileDownloader";
import { existsSync, readdirSync } from "fs";
import { resolve as resolvePath } from "path";

describe("DataDownloader", () => {
  const TEMP_DIR = resolvePath(__dirname, "temp");
  const downloader = new FileDownloader(TEMP_DIR);

  describe("#constructor()", () => {
    it("should return a different isntance", () => {
      const instance2 = new FileDownloader(TEMP_DIR);
      expect(downloader).to.not.equal(instance2);
    });
  });

  describe("#downloadFile()", () => {
    it("should download a file to a specific location", async () => {
      const sourceUrl =
        "https://www.wikipedia.org/portal/wikipedia.org/assets/img/Wikipedia-logo-v2@1.5x.png";
      const outputFileName = `temp-${(Math.random() * 100).toFixed(0)}.png`;
      const expectedOutFile = resolvePath(TEMP_DIR, outputFileName);
      expect(existsSync(expectedOutFile)).to.be.false;
      const outputFile = await downloader.downloadFile(
        sourceUrl,
        outputFileName
      );
      expect(outputFile).to.equal(expectedOutFile);
      expect(existsSync(outputFile)).to.be.true;
    });
  });

  describe("#deleteTempFiles()", () => {
    it("should delete temporary files created", async () => {
      // allow time for the test file in other test to finish downloading
      await new Promise((resolve) => setTimeout(resolve, 1000));
      expect(readdirSync(TEMP_DIR)).to.have.lengthOf(1);
      downloader.deleteTempFiles();
      expect(readdirSync(TEMP_DIR)).to.be.empty;
    });
  });
});
