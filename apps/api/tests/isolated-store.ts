import postgres from "postgres";
import { connectStore } from "../src/db/store.js";

export const isolatedStore = async (url: string, name: string) => {
  const admin = postgres(url, { max: 1, onnotice: () => undefined });
  await admin`CREATE SCHEMA ${admin(name)}`;
  const database = new URL(url);
  database.searchParams.set("options", `-c search_path=${name}`);
  const store = connectStore(database.toString());
  await store.migrate();
  return {
    store,
    async close() {
      await store.close();
      await admin`DROP SCHEMA ${admin(name)} CASCADE`;
      await admin.end();
    },
  };
};
