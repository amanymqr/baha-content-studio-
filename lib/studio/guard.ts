// "Duplicate" copies the saved draft and then opens the copy. Unsaved edits on
// screen are not part of the saved draft and would be left behind without a word,
// so with unsaved edits the user is asked first: save them and then duplicate, or
// cancel and keep editing. Nothing is saved or copied without that choice.

export type DuplicateOutcome = "duplicated" | "cancelled" | "save_failed" | "duplicate_failed";

export async function duplicateWithGuard(o: {
  dirty: boolean;
  /** Asks to save first; resolves true to save and duplicate, false to cancel. */
  ask: () => Promise<boolean>;
  /** Saves the edits on screen; resolves true when they were stored. */
  save: () => Promise<boolean>;
  /** Copies the saved draft and opens the copy; resolves true on success. */
  duplicate: () => Promise<boolean>;
}): Promise<DuplicateOutcome> {
  if (o.dirty) {
    if (!(await o.ask())) return "cancelled";
    if (!(await o.save())) return "save_failed";
  }
  return (await o.duplicate()) ? "duplicated" : "duplicate_failed";
}
