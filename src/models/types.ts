export type filterStats = {
  updatedAt: Date;
  totalRecs: number;
  lastUpdatedId: string;
};

export type mexicoDbStats = {
  lastRecId: string;
  prevLastRecId: string;
  totalRecs: number;
  updatedAt: Date;
};

export type Entidad = {
  entityId: string; // "2";
  name: string; // "Baja California";
  code: string; // "BC";
  positive: { date: string; cases: number }[] | any[];
  negative: { date: string; cases: number }[] | any[];
  recovered?: { date: string; cases: number }[] | any[];
  dead: { date: string; cases: number }[] | any[];
};
