import fs from 'fs';
import path from 'path';

function walkDir(dir, callback) {
    fs.readdirSync(dir).forEach(f => {
        let dirPath = path.join(dir, f);
        let isDirectory = fs.statSync(dirPath).isDirectory();
        isDirectory ? walkDir(dirPath, callback) : callback(path.join(dir, f));
    });
}

const frontendSrcPath = path.resolve('c:/Users/james peter/college bus A/frontend/src');

walkDir(frontendSrcPath, function (filePath) {
    if (filePath.endsWith('.jsx')) {
        let content = fs.readFileSync(filePath, 'utf8');
        let newContent = content
            .replace(/font-orbitron/g, 'font-outfit')
            .replace(/font-rajdhani/g, 'font-inter')
            .replace(/bg-cyber-grid/g, 'bg-light-grid')
            .replace(/neon-border/g, 'border border-blue-200 shadow-sm')
            .replace(/neon-glow/g, 'drop-shadow-sm')
            .replace(/\bpulse\b/g, 'animate-pulse')
            .replace(/text-neonCyan/g, 'text-blue-500')
            .replace(/bg-neonCyan/g, 'bg-blue-500')
            .replace(/border-neonCyan/g, 'border-blue-500')
            .replace(/text-neonGreen/g, 'text-emerald-500')
            .replace(/bg-neonGreen/g, 'bg-emerald-500')
            .replace(/text-neonOrange/g, 'text-orange-500')
            .replace(/bg-neonOrange/g, 'bg-orange-500');

        if (content !== newContent) {
            fs.writeFileSync(filePath, newContent, 'utf8');
            console.log('Updated: ' + filePath);
        }
    }
});
