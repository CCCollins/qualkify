export interface GroupStats {
    fi: number;
    sumXiFi: number;
    sumXi2Fi: number;
    mean: number;
    disp: number;
    std: number;
    formulas: {
      mean: string;
      disp: string;
      std: string;
    };
  }
  
  export interface Results {
    overallMean: number;
    overallDisp: number;
    overallStd: number;
    Dvnutr: number;
    Dmezh: number;
    etaSquared: number;
    N_total: number;
    groupStats: GroupStats[];
    formulas: {
      overallMean: string;
      overallDisp: string;
      overallStd: string;
      Dvnutr: string;
      Dmezh: string;
      etaSquared: string;
    };
  }
  