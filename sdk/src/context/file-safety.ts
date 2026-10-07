import * as fs from 'fs';
import * as path from 'path';

/** Resolve a project-relative file only when its lexical and real paths stay inside the project root. */
export function resolveContainedProjectFile(projectRoot: string, relativePath: string): string | null {
  if (typeof relativePath !== 'string' || relativePath.length === 0) return null;
  if (path.isAbsolute(relativePath) || /^[a-zA-Z]:/.test(relativePath) || /^(?:\\\\|\/\/)/.test(relativePath)) return null;

  try {
    const root = fs.realpathSync(path.resolve(projectRoot));
    const candidate = path.resolve(root, relativePath);
    if (!isWithin(root, candidate)) return null;
    const realCandidate = fs.realpathSync(candidate);
    return isWithin(root, realCandidate) ? realCandidate : null;
  } catch {
    return null;
  }
}

function isWithin(root: string, candidate: string): boolean {
  const relative = path.relative(root, candidate);
  return relative === '' || (relative !== '..' && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative));
}
