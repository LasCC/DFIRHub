import type { ConversionResult } from "./types";

const DEFAULT_DB_NAME = "dfirhub-sigma";
const DB_VERSION = 1;
const STORE_NAME = "rules";

export interface StoredRule {
  id: string;
  name: string;
  yaml: string;
  lastModified: Date;
  conversions: ConversionResult[];
}

function openDB(dbName: string): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(dbName, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export class RuleStorage {
  private readonly dbName: string;

  constructor(dbName = DEFAULT_DB_NAME) {
    this.dbName = dbName;
  }
  async saveRule(rule: StoredRule): Promise<void> {
    const db = await openDB(this.dbName);
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      tx.objectStore(STORE_NAME).put(rule);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  async loadRule(id: string): Promise<StoredRule | null> {
    const db = await openDB(this.dbName);
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const request = tx.objectStore(STORE_NAME).get(id);
      request.onsuccess = () => resolve(request.result ?? null);
      request.onerror = () => reject(request.error);
    });
  }

  async listRules(): Promise<StoredRule[]> {
    const db = await openDB(this.dbName);
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const request = tx.objectStore(STORE_NAME).getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async deleteRule(id: string): Promise<void> {
    const db = await openDB(this.dbName);
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      tx.objectStore(STORE_NAME).delete(id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }
}
