import { Schema } from "mongoose";

export const StatsTracker = new Schema({
  lastRecId: {
    type: String,
    required: "Id of last record added counted in DB",
  },
  prevLastRecId: {
    type: String,
    required: "Id of second to last record added counted in DB",
  },

  totalRecs: {
    type: Number,
    required: "TotalRecords counted in DB",
  },
  updatedAt: {
    type: Date,
    required: "Date of latests records updated in DB",
  },
});
