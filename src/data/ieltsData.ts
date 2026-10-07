import data from "./ieltsData.json";
import { IeltsDatabase } from "../types/ielts";

// Bundled fallback mirrors the canonical imported database. The server remains the
// source of truth in normal operation, but offline mode must not silently revert to
// an obsolete smaller test set.
export const ieltsDatabase = data as unknown as IeltsDatabase;
