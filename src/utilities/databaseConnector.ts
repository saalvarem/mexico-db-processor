import mongoose from "mongoose";
import { StatsTracker } from "../models/dbStats";
import { config as loadEnvVariables } from "dotenv";
import { mexicoDbStats } from "../models/types";
loadEnvVariables();

// mongoose connection
mongoose.Promise = global.Promise;
mongoose.connect(process.env.MONGO_CONN_STRING || "", {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverSelectionTimeoutMS: 5000,
});

const MexicoDbStats = mongoose.model("MexicoDbStat", StatsTracker);

export const postNewDbStats = async (payload: mexicoDbStats) =>
  new Promise((resolve, reject) => {
    const stats = new MexicoDbStats(payload);
    stats.save((err, updatedStats) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(updatedStats);
    });
  });

export const getDbStats = async (): Promise<mexicoDbStats & {
  docId: string;
}> =>
  new Promise((resolve, reject) => {
    MexicoDbStats.find({}, (err, docs) => {
      if (err) {
        reject(err);
        return;
      }
      try {
        const statsDoc = docs[0].toJSON() as any;
        resolve({
          docId: statsDoc._id.toString(),
          lastRecId: statsDoc.lastRecId,
          prevLastRecId: statsDoc.prevLastRecId,
          totalRecs: statsDoc.totalRecs,
          updatedAt: statsDoc.updatedAt,
        });
      } catch (err) {
        reject(err);
      }
    });
  });

export const updateDbStats = async (
  recId: string,
  payload: mexicoDbStats
): Promise<any> =>
  new Promise((resolve, reject) => {
    MexicoDbStats.findOneAndUpdate(
      { _id: recId },
      payload,
      {
        new: true /* return new object after update or old */,
        useFindAndModify: false,
      },
      (err, updatedStats) => {
        if (err) {
          reject(err);
          return;
        }
        resolve(updatedStats);
      }
    );
  });
