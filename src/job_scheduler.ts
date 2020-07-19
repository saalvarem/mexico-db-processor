import { CronJob, CronCommand } from "cron";
import { DataDownloader } from "./data_downloader";
import { getDbFilename } from "./utils";
import { resolve as resolvePath } from "path";

export class JobScheduler {
  private static singleton: JobScheduler | null = null;
  private scheduledJobs: any;
  constructor() {
    if (JobScheduler.singleton) {
      return JobScheduler.singleton;
    } else {
      this.scheduledJobs = {};
      JobScheduler.singleton = this;
    }
  }

  private createJob(cronTime: string, description: string, funct: CronCommand) {
    const tz = "America/New_York";
    const newCronJob = new CronJob(cronTime, funct, null, false, tz);
    const jobArray = this.scheduledJobs[description] || [];
    jobArray.push(newCronJob);
    return newCronJob;
  }

  rawDataDownloader(
    cronTime: string,
    description: string = "Raw data downloader"
  ): CronJob {
    const downloadDbFile = () => {
      const fileUrl = process.env.MEXICO_DB_URL || "";
      const downloadDir = process.env.DOWNLOADED_DIR || ".";
      const zipFileName = process.env.DB_ZIP_FILENAME || "dbFile.zip";
      const fileDestination = resolvePath(__dirname, downloadDir, zipFileName);
      // console.log(`Downloading "${fileUrl}" to "${downloadDir}"`);
      DataDownloader.download(fileUrl, fileDestination);
    };
    const job = this.createJob(cronTime, description, downloadDbFile as any);
    console.log(`Job Scheduled: (${cronTime}) ${description}`);
    return job;
  }
}
