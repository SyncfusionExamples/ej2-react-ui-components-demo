const fs = require('node:fs');
const path = require('node:path');

const projectRoot = path.resolve(__dirname, '..');
const deployRoot = path.join(projectRoot, 'client', 'dist');
const publicRoot = path.join(deployRoot, 'public');
const serverRoot = path.join(deployRoot, 'server');
const serverPackage = require(path.join(projectRoot, 'server', 'package.json'));
const clientPackage = require(path.join(projectRoot, 'package.json'));

if (!fs.existsSync(path.join(publicRoot, 'index.html'))) {
  throw new Error('Client build output not found. Run the client build before packaging.');
}

fs.mkdirSync(serverRoot, { recursive: true });
for (const file of ['server.js', 'data.js', 'query.js', 'schedule.js']) {
  fs.copyFileSync(
    path.join(projectRoot, 'server', file),
    path.join(serverRoot, file),
  );
}

const runtimeDependencies = Object.fromEntries(
  Object.entries(serverPackage.dependencies).filter(([, version]) => !version.startsWith('file:')),
);
const deploymentPackage = {
  name: `${clientPackage.name}-azure`,
  version: clientPackage.version,
  private: true,
  engines: { node: '>=20' },
  scripts: { start: 'node server/server.js' },
  dependencies: runtimeDependencies,
};

fs.writeFileSync(
  path.join(deployRoot, 'package.json'),
  `${JSON.stringify(deploymentPackage, null, 2)}\n`,
);

const windowsIisConfig = path.join(publicRoot, 'web.config');
if (fs.existsSync(windowsIisConfig)) {
  fs.unlinkSync(windowsIisConfig);
}

console.log(`Azure Linux deployment package prepared at ${deployRoot}`);
