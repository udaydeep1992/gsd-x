import * as fs from 'fs';
import * as path from 'path';
import { randomBytes } from 'crypto';

/** Replace a file through a same-directory temporary file and atomic rename. */
export function writeFileAtomic(filePath: string, contents: string, encoding: BufferEncoding = 'utf8'): void {
  const directory = path.dirname(filePath);
  fs.mkdirSync(directory, { recursive: true });
  const temporaryPath = path.join(directory, `.${path.basename(filePath)}.${process.pid}.${randomBytes(6).toString('hex')}.tmp`);
  try {
    fs.writeFileSync(temporaryPath, contents, { encoding, flag: 'wx' });
    try {
      fs.renameSync(temporaryPath, filePath);
    } catch (error) {
      // Windows may reject replacement when destination handles are open. For
      // that platform-specific case, preserve availability with a complete
      // same-directory copy before removing the temporary snapshot.
      if (process.platform !== 'win32') throw error;
      fs.copyFileSync(temporaryPath, filePath);
      fs.rmSync(temporaryPath, { force: true });
    }
  } catch (error) {
    try { fs.rmSync(temporaryPath, { force: true }); } catch { /* Preserve the original error. */ }
    throw error;
  }
}
