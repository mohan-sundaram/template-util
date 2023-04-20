import { mkdirSync, readFileSync, writeFileSync, copyFileSync } from 'fs'
import * as path from 'path'
import { globSync } from 'glob'
import { minimatch } from 'minimatch'
const mustache = require('mustache')

interface RenderOps {
    escapeHtml?: boolean;
}

interface RenderFolderOps extends RenderOps {
    includeFiles: string[];
    parseDirName?: boolean;
}

function processOps(ops: RenderFolderOps | undefined) {
    const defaultOps: RenderFolderOps = {
        includeFiles: ["*.*"],
        parseDirName: false,
        escapeHtml: false,
    }
    const out = { ...defaultOps, ...ops };
    if (!out.escapeHtml) {
        mustache.escape = (x: any) => x;
    }
    return out;
}

export function renderSync(src: string, data: object, ops?: any) {
    return mustache.render(src, data);
}

export function renderFileSync(src: string, dest: string, data: object, ops?: any) {

}

export function renderFolderSync(src: string, dest: string, data: any, ops?: RenderFolderOps) {

    src = path.normalize(src);
    dest = path.normalize(dest);
    ops = processOps(ops);
    const globSearch = `${src.replace(path.sep,path.posix.sep)}/**/*`
    const result = globSync(globSearch, { withFileTypes: true });
    const parsePath = (file: string) => mustache.render(file, data)
    const replaceBaseDir = (file: string) => file.replace(src, dest)

    result
        .filter(r => r.isDirectory())
        .forEach(dir => {
            let dirName = replaceBaseDir(dir.relative());
            if (ops?.parseDirName) {
                dirName = parsePath(dirName);
            }
            mkdirSync(dirName, { recursive: true });
        })

    result
        .filter(r => !r.isDirectory())
        .forEach(x => {

            const file = x.relative();
            let destPath = replaceBaseDir(file);
            if (ops?.parseDirName) {
                destPath = parsePath(destPath);
            }

            const isIncluded = ops?.includeFiles.some(pattern => minimatch(path.basename(file), pattern))

            if (isIncluded) {
                console.log(`parsing file ${file}`)
                const template = readFileSync(file);
                const parsed = mustache.render(template.toString(), data);
                writeFileSync(destPath, parsed);
            } else {
                console.log(`copying file ${file}`)
                copyFileSync(file, destPath);
            }

        });
}