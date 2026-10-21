// Creates the password hash for one account. The password is typed without being
// shown and is never printed or saved; only the hash line is printed, to paste
// into .env.local (or the hosting provider's environment settings) by hand.
//
//   npm run set-password -- amona
//   npm run set-password -- baha
import { Writable } from "stream";
import { createInterface } from "readline";
import { MIN_PASSWORD_LENGTH, USER_IDS, hashEnvName, hashPassword } from "../lib/auth/password";

const id = process.argv[2];
if (!(USER_IDS as readonly string[]).includes(id ?? "")) {
  console.error(`Usage: npm run set-password -- <${USER_IDS.join("|")}>`);
  process.exit(2);
}

let muted = false;
const out = new Writable({
  write(chunk, _enc, cb) {
    if (!muted) process.stdout.write(chunk);
    cb();
  },
});
const rl = createInterface({ input: process.stdin, output: out, terminal: true });

function ask(prompt: string) {
  return new Promise<string>((resolve) => {
    process.stdout.write(prompt);
    muted = true;
    rl.question("", (answer) => {
      muted = false;
      process.stdout.write("\n");
      resolve(answer);
    });
  });
}

(async () => {
  const first = await ask(`New password for ${id} (at least ${MIN_PASSWORD_LENGTH} characters): `);
  if (first.length < MIN_PASSWORD_LENGTH) {
    console.error(`Too short. Use at least ${MIN_PASSWORD_LENGTH} characters.`);
    process.exit(1);
  }
  const again = await ask("Type it again: ");
  rl.close();
  if (again !== first) {
    console.error("The two entries don't match. Nothing was created.");
    process.exit(1);
  }
  const hash = await hashPassword(first);
  console.log(`\nAdd this line to .env.local (replace any older ${hashEnvName(id!)} line), then restart the app:\n`);
  console.log(`${hashEnvName(id!)}=${hash}`);
})();
