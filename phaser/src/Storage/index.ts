import { createStorageProvider } from "./StorageFactory";

export const storage = createStorageProvider();

export type { StorageProvider } from "./IStorageProvider";
