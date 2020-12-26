import { CronJob, CronCommand } from "cron";

export class JobScheduler {
  private static singleton: JobScheduler | null = null;
  private jobs: any;
  constructor() {
    if (JobScheduler.singleton) {
      return JobScheduler.singleton;
    } else {
      this.jobs = {};
      JobScheduler.singleton = this;
    }
  }

  scheduleJob(cronTime: string, description: string, funct: CronCommand) {
    const tz = "America/Los_Angeles";
    const newCronJob = new CronJob(cronTime, funct, null, false, tz);
    const jobArray = this.jobs[description] || [];
    jobArray.push(newCronJob);
    this.jobs[description] = jobArray;
    return newCronJob;
  }
}
