import Dexie, { type Table } from 'dexie';
import type { SavedRoute } from '../types';

export class AppDB extends Dexie {
  routes!: Table<SavedRoute, string>;

  constructor() {
    super('RandomParcoursDB');
    this.version(1).stores({
      routes: 'id, createdAt, sport, subtype',
    });
  }
}

export const db = new AppDB();
