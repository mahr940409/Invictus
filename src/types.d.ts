declare module '*.png' {
  const value: string;
  export default value;
}

declare module '*.jpg' {
  const value: string;
  export default value;
}

declare module '*.jpeg' {
  const value: string;
  export default value;
}

declare module '*.svg' {
  const value: string;
  export default value;
}

declare module '*.gif' {
  const value: string;
  export default value;
}

export interface Result {
  barber: number;
  admin: number;
  total: number;
  tip: number;
  timestamp?: Date;
  barberName?: string;
  payment_method?: string;
}

export interface AppSale {
  name: string;
  quantity: number;
  buyPrice: number;
  sellPrice: number;
  total: number;
  payment_method: string;
  timestamp: Date;
}

export interface ProductLot {
  name: string;
  quantity: number;
  buyPrice: number;
  sellPrice: number;
  timestamp: Date;
} 