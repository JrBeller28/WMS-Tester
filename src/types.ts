export interface Product {
  id: string;
  name: string;
  sku: string;
  category: string;
  quantity: number;
  minStockLevel: number;
  unit: string;
  lastUpdated: any;
  updatedBy: string;
}

export interface StockMovement {
  id: string;
  productId: string;
  type: 'IN' | 'OUT';
  quantity: number;
  timestamp: any;
  userId: string;
  notes?: string;
}

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  role: 'admin' | 'staff';
}
