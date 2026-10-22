// Sets the password for one account. Only the scrypt hash is ever stored; the
// password itself is never printed, logged or written to a file.
//
//   npm run set-password -- amona            type a password (shown as *), print the hash line
//   npm run set-password -- amona --write    type a password, save the hash in .env.local
//   npm run set-password -- amona --generate --write
//        create a strong random password, save its hash in .env.local and show the
//        password once in a small window on this computer (Windows), to copy into a
//        password manager. It never appears in the terminal or in any file.
//
// Typing needs a real terminal (PowerShell, Command Prompt or Windows Terminal).
// In Git Bash, prefix the command with `winpty`. Other terminals are refused rather
// than showing the password while it is typed.
import { spawn } from "child_process";
import { randomBytes } from "crypto";
import { promises as fs } from "fs";
import path from "path";
import { MIN_PASSWORD_LENGTH, USER_IDS, hashEnvName, hashPassword, isValidHash } from "../lib/auth/password";

export const GENERATED_LENGTH = 20;

/** A random password from letters and digits (no look-alikes), GENERATED_LENGTH long. */
export function generatePassword(length = GENERATED_LENGTH) {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
  const out: string[] = [];
  while (out.length < length) {
    for (const b of randomBytes(length * 2)) {
      // Rejection sampling keeps every character equally likely.
      if (b < 256 - (256 % alphabet.length) && out.length < length) out.push(alphabet[b % alphabet.length]);
    }
  }
  return out.join("");
}

/** Returns the .env text with NAME=value set: replaces an existing line or appends one; every other line is kept as is. */
export function setEnvLine(text: string, name: string, value: string) {
  const eol = text.includes("\r\n") ? "\r\n" : "\n";
  const lines = text.length ? text.split(/\r?\n/) : [];
  if (lines.length && lines[lines.length - 1] === "") lines.pop();
  const re = new RegExp(`^\\s*${name}\\s*=`);
  let found = false;
  const next = lines.filter((l) => {
    if (!re.test(l)) return true;
    if (found) return false; // drop duplicate definitions of the same name
    found = true;
    return true;
  }).map((l) => (re.test(l) ? `${name}=${value}` : l));
  if (!found) next.push(`${name}=${value}`);
  return next.join(eol) + eol;
}

/** Writes NAME=hash into .env.local without touching the other settings. */
export async function writeEnvHash(envFile: string, name: string, hash: string) {
  if (!isValidHash(hash)) throw new Error("refusing to write an invalid hash");
  let text = "";
  try {
    text = await fs.readFile(envFile, "utf8");
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code !== "ENOENT") throw e;
  }
  const tmp = `${envFile}.${process.pid}.tmp`;
  await fs.writeFile(tmp, setEnvLine(text, name, hash), { mode: 0o600 });
  await fs.rename(tmp, envFile);
}

/** Reads a line without echoing it; each character shows as *. Only in a real terminal. */
function readHidden(prompt: string) {
  return new Promise<string>((resolve, reject) => {
    const input = process.stdin;
    if (!input.isTTY || typeof input.setRawMode !== "function") {
      reject(new Error("This terminal can't hide typing, so the password was not asked for. Use PowerShell, Command Prompt or Windows Terminal (in Git Bash, run it with winpty), or use --generate --write."));
      return;
    }
    process.stdout.write(prompt);
    let value = "";
    const done = (err?: Error) => {
      input.setRawMode(false);
      input.pause();
      input.removeListener("data", onData);
      process.stdout.write("\n");
      if (err) reject(err);
      else resolve(value);
    };
    const onData = (chunk: Buffer | string) => {
      for (const ch of chunk.toString("utf8")) {
        if (ch === "\r" || ch === "\n") return done();
        if (ch === "\u0003") return done(new Error("Cancelled."));
        if (ch === "\u0008" || ch === "\u007f") {
          if (value.length) {
            value = value.slice(0, -1);
            process.stdout.write("\b \b");
          }
        } else if (ch >= " ") {
          value += ch;
          process.stdout.write("*");
        }
      }
    };
    input.setRawMode(true);
    input.resume();
    input.on("data", onData);
  });
}

/** Shows the generated password once in a local window (Windows). The password goes in through stdin, never on a command line. */
function showOnce(id: string, password: string) {
  if (process.platform !== "win32") return false;
  const script = [
    "Add-Type -AssemblyName PresentationFramework",
    "$p = [Console]::In.ReadToEnd().Trim()",
    `[void][System.Windows.MessageBox]::Show("Password for ${id}:\`n\`n$p\`n\`nCopy it into a password manager now (Ctrl+C copies this message). It is not saved anywhere else.", "Baha Studio - ${id}")`,
  ].join("; ");
  const child = spawn("powershell.exe", ["-NoProfile", "-STA", "-Command", script], { detached: true, stdio: ["pipe", "ignore", "ignore"], windowsHide: true });
  child.stdin.end(password);
  child.unref();
  return true;
}

async function main() {
  const args = process.argv.slice(2);
  const id = args.find((a) => !a.startsWith("--"));
  const write = args.includes("--write");
  const generate = args.includes("--generate");
  if (!(USER_IDS as readonly string[]).includes(id ?? "")) {
    console.error(`Usage: npm run set-password -- <${USER_IDS.join("|")}> [--write] [--generate --write]`);
    process.exit(2);
  }
  if (generate && !write) {
    console.error("--generate needs --write, so the password is never printed.");
    process.exit(2);
  }
  if (generate && process.platform !== "win32") {
    console.error("--generate shows the password in a local window, which is only available on Windows. Type a password instead.");
    process.exit(2);
  }

  let password: string;
  if (generate) {
    password = generatePassword();
  } else {
    password = await readHidden(`New password for ${id} (at least ${MIN_PASSWORD_LENGTH} characters): `);
    if (password.length < MIN_PASSWORD_LENGTH) throw new Error(`Too short. Use at least ${MIN_PASSWORD_LENGTH} characters.`);
    const again = await readHidden("Type it again: ");
    if (again !== password) throw new Error("The two entries don't match. Nothing was changed.");
  }

  const name = hashEnvName(id!);
  const hash = await hashPassword(password);
  if (write) {
    await writeEnvHash(path.join(process.cwd(), ".env.local"), name, hash);
    console.log(`${name} saved in .env.local (value not shown). Restart the app to use it.`);
    if (generate) {
      showOnce(id!, password);
      console.log(`A window on this computer shows the new password for ${id} once. Save it in a password manager, then close the window.`);
    }
  } else {
    console.log(`\nAdd this line to .env.local (replace any older ${name} line), then restart the app:\n`);
    console.log(`${name}=${hash}`);
  }
}

if (/set-password\.ts$/.test(process.argv[1] ?? "")) {
  main().catch((e) => {
    console.error((e as Error).message);
    process.exit(1);
  });
}
