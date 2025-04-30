import { 
  Item, InsertItem, 
  Marketplace, InsertMarketplace 
} from "@shared/schema";

// Interface for storage methods
export interface IStorage {
  // Item methods
  getItems(): Promise<Item[]>;
  getItem(id: number): Promise<Item | undefined>;
  createItem(item: InsertItem): Promise<Item>;
  updateItem(id: number, item: Partial<InsertItem>): Promise<Item | undefined>;
  deleteItem(id: number): Promise<boolean>;
  
  // Marketplace methods
  getMarketplaces(): Promise<Marketplace[]>;
  getMarketplace(id: number): Promise<Marketplace | undefined>;
  createMarketplace(marketplace: InsertMarketplace): Promise<Marketplace>;
  updateMarketplace(id: number, marketplace: Partial<InsertMarketplace>): Promise<Marketplace | undefined>;
  deleteMarketplace(id: number): Promise<boolean>;
  connectMarketplace(id: number): Promise<Marketplace | undefined>;
}

// Memory storage implementation
export class MemStorage implements IStorage {
  private items: Map<number, Item>;
  private marketplaces: Map<number, Marketplace>;
  private itemCurrentId: number;
  private marketplaceCurrentId: number;

  constructor() {
    this.items = new Map();
    this.marketplaces = new Map();
    this.itemCurrentId = 1;
    this.marketplaceCurrentId = 1;
    
    // Initialize with some default marketplaces
    this.initializeMarketplaces();
  }

  private initializeMarketplaces() {
    const defaultMarketplaces: InsertMarketplace[] = [
      { name: "eBay", isConnected: true, credentials: {} },
      { name: "Etsy", isConnected: true, credentials: {} },
      { name: "Amazon", isConnected: true, credentials: {} },
      { name: "Shopify", isConnected: false, credentials: {} },
    ];

    defaultMarketplaces.forEach(marketplace => {
      this.createMarketplace(marketplace);
    });
  }

  // Item methods
  async getItems(): Promise<Item[]> {
    return Array.from(this.items.values());
  }

  async getItem(id: number): Promise<Item | undefined> {
    return this.items.get(id);
  }

  async createItem(item: InsertItem): Promise<Item> {
    const id = this.itemCurrentId++;
    const now = new Date();
    const newItem: Item = { 
      ...item, 
      id, 
      createdAt: now, 
      updatedAt: now 
    };
    
    this.items.set(id, newItem);
    return newItem;
  }

  async updateItem(id: number, item: Partial<InsertItem>): Promise<Item | undefined> {
    const existingItem = this.items.get(id);
    
    if (!existingItem) {
      return undefined;
    }
    
    const updatedItem: Item = {
      ...existingItem,
      ...item,
      updatedAt: new Date()
    };
    
    this.items.set(id, updatedItem);
    return updatedItem;
  }

  async deleteItem(id: number): Promise<boolean> {
    return this.items.delete(id);
  }

  // Marketplace methods
  async getMarketplaces(): Promise<Marketplace[]> {
    return Array.from(this.marketplaces.values());
  }

  async getMarketplace(id: number): Promise<Marketplace | undefined> {
    return this.marketplaces.get(id);
  }

  async createMarketplace(marketplace: InsertMarketplace): Promise<Marketplace> {
    const id = this.marketplaceCurrentId++;
    const now = new Date();
    const newMarketplace: Marketplace = {
      ...marketplace,
      id,
      createdAt: now,
      updatedAt: now
    };
    
    this.marketplaces.set(id, newMarketplace);
    return newMarketplace;
  }

  async updateMarketplace(id: number, marketplace: Partial<InsertMarketplace>): Promise<Marketplace | undefined> {
    const existingMarketplace = this.marketplaces.get(id);
    
    if (!existingMarketplace) {
      return undefined;
    }
    
    const updatedMarketplace: Marketplace = {
      ...existingMarketplace,
      ...marketplace,
      updatedAt: new Date()
    };
    
    this.marketplaces.set(id, updatedMarketplace);
    return updatedMarketplace;
  }

  async deleteMarketplace(id: number): Promise<boolean> {
    return this.marketplaces.delete(id);
  }

  async connectMarketplace(id: number): Promise<Marketplace | undefined> {
    const marketplace = this.marketplaces.get(id);
    
    if (!marketplace) {
      return undefined;
    }
    
    const updatedMarketplace: Marketplace = {
      ...marketplace,
      isConnected: true,
      updatedAt: new Date()
    };
    
    this.marketplaces.set(id, updatedMarketplace);
    return updatedMarketplace;
  }
}

// Create and export storage instance
export const storage = new MemStorage();
