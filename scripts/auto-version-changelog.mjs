#!/usr/bin/env node
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const DRY_RUN = process.argv.includes('--dry-run');
const rootDir = process.cwd();

const packageJsonPath = path.join(rootDir, 'package.json');
const packageLockPath = path.join(rootDir, 'package-lock.json');
const changelogPath = path.join(rootDir, 'CHANGELOG.md');
const publicDir = path.join(rootDir, 'public');
const versionJsonPath = path.join(publicDir, 'version.json');
const changelogJsonPath = path.join(publicDir, 'changelog.json');

const RELEASE_IGNORED_PATH_PREFIXES = [
  'deploy/demo/',
  'coverage-',
  '.tmpcov-',
  '.tmp-security/',
  'logs/',
  'test-results/',
  'dist/',
  '.next/',
];

const RELEASE_IGNORED_EXACT_PATHS = new Set([
  'tsconfig.tsbuildinfo',
]);

function run(cmd) {
  return execSync(cmd, { cwd: rootDir, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
}

function parseSemver(input) {
  const match = /^v?(\d+)\.(\d+)\.(\d+)$/.exec(String(input).trim());
  if (!match) return null;
  return {
    major: Number(match[1]),
    minor: Number(match[2]),
    patch: Number(match[3]),
  };
}

function semverToString(v) {
  return `${v.major}.${v.minor}.${v.patch}`;
}

function compareSemver(a, b) {
  if (a.major !== b.major) return a.major - b.major;
  if (a.minor !== b.minor) return a.minor - b.minor;
  return a.patch - b.patch;
}

function incrementSemver(version, bump) {
  if (bump === 'major') return { major: version.major + 1, minor: 0, patch: 0 };
  if (bump === 'minor') return { major: version.major, minor: version.minor + 1, patch: 0 };
  return { major: version.major, minor: version.minor, patch: version.patch + 1 };
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function writeJson(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n', 'utf8');
}

function capitalize(text) {
  if (!text) return text;
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function cleanDescription(subject) {
  const conventional = /^([a-zA-Z]+)(\([^)]+\))?(!)?:\s+(.+)$/;
  const match = subject.match(conventional);
  const description = match ? match[4] : subject;
  return capitalize(description.trim().replace(/[.]$/, ''));
}

function classifyCommit(subject, body) {
  const conventional = /^([a-zA-Z]+)(\([^)]+\))?(!)?:\s+(.+)$/;
  const match = subject.match(conventional);

  const bodyText = String(body || '');
  const lowerSubject = subject.toLowerCase();
  const lowerBody = bodyText.toLowerCase();

  const isBreaking = Boolean(match?.[3]) || /breaking change/i.test(bodyText);
  if (isBreaking) {
    return {
      category: 'majeurs',
      bump: 'major',
      description: cleanDescription(subject),
    };
  }

  let type = match?.[1]?.toLowerCase() || '';

  if (!type) {
    if (/\b(feat|feature|ajout|nouveau|new)\b/.test(lowerSubject)) type = 'feat';
    else if (/\b(fix|bug|correctif|corrig)\b/.test(lowerSubject)) type = 'fix';
    else if (/\b(perf|performance|optim|amelior|improv|refactor)\b/.test(lowerSubject)) type = 'perf';
    else if (/\b(sec|security|securite)\b/.test(lowerSubject)) type = 'security';
    else type = 'chore';
  }

  switch (type) {
    case 'feat':
      return { category: 'nouveautes', bump: 'minor', description: cleanDescription(subject) };
    case 'fix':
      return { category: 'corrections', bump: 'patch', description: cleanDescription(subject) };
    case 'perf':
    case 'refactor':
      return { category: 'ameliorations', bump: 'patch', description: cleanDescription(subject) };
    case 'security':
      return { category: 'securite', bump: 'patch', description: cleanDescription(subject) };
    case 'docs':
    case 'chore':
    case 'ci':
    case 'build':
    case 'test':
    case 'style':
    default: {
      const looksFix = /\b(fix|bug|corrig)\b/.test(lowerBody);
      return {
        category: looksFix ? 'corrections' : 'maintenance',
        bump: 'patch',
        description: cleanDescription(subject),
      };
    }
  }
}

function getLatestVersionTag() {
  const tagLines = run("git tag --list 'v*' --sort=-v:refname");
  const tags = tagLines ? tagLines.split('\n').filter(Boolean) : [];
  for (const tag of tags) {
    if (parseSemver(tag)) return tag;
  }
  return null;
}

function getLatestReleaseCommit() {
  const raw = run("git log --pretty=format:%H%x1f%s --max-count=80");
  if (!raw) return null;
  for (const line of raw.split('\n')) {
    const [hash, subject] = line.split('\x1f');
    const match = /^chore\(release\):\s*v(\d+\.\d+\.\d+)/i.exec(subject || '');
    const version = match ? parseSemver(match[1]) : null;
    if (hash && version) return { hash, version };
  }
  return null;
}

function maxVersion(...versions) {
  return versions.filter(Boolean).reduce((current, candidate) => {
    if (!current) return candidate;
    return compareSemver(candidate, current) > 0 ? candidate : current;
  }, null);
}

function getCommitFiles(hash) {
  if (!/^[0-9a-f]{7,40}$/i.test(hash)) return [];
  const raw = run(`git diff-tree --no-commit-id --name-only -r ${hash}`);
  return raw ? raw.split('\n').map((file) => file.trim()).filter(Boolean) : [];
}

function isReleaseIgnoredFile(file) {
  return RELEASE_IGNORED_EXACT_PATHS.has(file)
    || RELEASE_IGNORED_PATH_PREFIXES.some((prefix) => file.startsWith(prefix));
}

function isReleaseRelevantCommit(commit) {
  if (!commit.files.length) return true;
  return commit.files.some((file) => !isReleaseIgnoredFile(file));
}

function getCommitsSince(tag) {
  const range = tag ? `${tag}..HEAD` : 'HEAD';
  const raw = run(`git log ${range} --pretty=format:%H%x1f%s%x1f%b%x1e`);
  if (!raw) return [];

  return raw
    .split('\x1e')
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => {
      const [hash, subject, body] = entry.split('\x1f');
      return {
        hash,
        subject: (subject || '').trim(),
        body: (body || '').trim(),
        files: getCommitFiles(hash),
      };
    })
    .filter((c) => c.subject)
    .filter((c) => !/^chore\(release\):\s*v\d+\.\d+\.\d+/i.test(c.subject))
    .filter(isReleaseRelevantCommit);
}

function summaryForHumans(counts) {
  const parts = [];
  if (counts.nouveautes) parts.push(`${counts.nouveautes} nouveaute(s)`);
  if (counts.corrections) parts.push(`${counts.corrections} correction(s)`);
  if (counts.ameliorations) parts.push(`${counts.ameliorations} amelioration(s)`);
  if (counts.securite) parts.push(`${counts.securite} renforcement(s) de securite`);
  if (!parts.length) parts.push('des ajustements techniques');

  return `Cette version apporte ${parts.join(', ')}.`;
}

function buildMarkdownEntry(version, date, summary, sections) {
  const order = [
    ['majeurs', 'Changements majeurs'],
    ['nouveautes', 'Nouveautes'],
    ['corrections', 'Corrections'],
    ['ameliorations', 'Ameliorations'],
    ['securite', 'Securite'],
    ['maintenance', 'Maintenance'],
  ];

  const lines = [];
  lines.push(`## [${version}] - ${date}`);
  lines.push('');
  lines.push('### En bref');
  lines.push('');
  lines.push(`- ${summary}`);
  lines.push('');

  for (const [key, title] of order) {
    const items = sections[key] || [];
    if (!items.length) continue;
    lines.push(`### ${title}`);
    lines.push('');
    for (const item of items) {
      lines.push(`- ${item}`);
    }
    lines.push('');
  }

  return lines.join('\n').trimEnd() + '\n\n';
}

function uniqueList(values) {
  return [...new Set(values.filter(Boolean))];
}

function upsertChangelog(current, entryMarkdown, version) {
  if (current.includes(`## [${version}]`)) return current;

  const idx = current.indexOf('\n## [');
  if (idx === -1) {
    return `${current.trimEnd()}\n\n${entryMarkdown}`;
  }

  return `${current.slice(0, idx + 1)}${entryMarkdown}${current.slice(idx + 1)}`;
}

function main() {
  const pkg = readJson(packageJsonPath);
  const pkgVersion = parseSemver(pkg.version);
  if (!pkgVersion) {
    throw new Error(`Version package.json invalide: ${pkg.version}`);
  }

  const latestTag = getLatestVersionTag();
  const tagVersion = latestTag ? parseSemver(latestTag) : null;
  const latestRelease = getLatestReleaseCommit();

  const baseVersionObj = maxVersion(pkgVersion, tagVersion, latestRelease?.version) || pkgVersion;
  const baseVersion = semverToString(baseVersionObj);
  const boundaryRef = latestRelease && (!tagVersion || compareSemver(latestRelease.version, tagVersion) >= 0)
    ? latestRelease.hash
    : latestTag;

  const commits = getCommitsSince(boundaryRef);
  if (!commits.length) {
    console.log('Aucun commit a versionner depuis la derniere release.');
    return;
  }

  const sections = {
    majeurs: [],
    nouveautes: [],
    corrections: [],
    ameliorations: [],
    securite: [],
    maintenance: [],
  };

  let bump = 'patch';

  for (const commit of commits) {
    const classification = classifyCommit(commit.subject, commit.body);
    sections[classification.category].push(classification.description);

    if (classification.bump === 'major') {
      bump = 'major';
    } else if (classification.bump === 'minor' && bump !== 'major') {
      bump = 'minor';
    }
  }

  for (const key of Object.keys(sections)) {
    sections[key] = uniqueList(sections[key]);
  }

  const nextVersionObj = incrementSemver(baseVersionObj, bump);
  const nextVersion = semverToString(nextVersionObj);
  const releaseDate = new Date().toISOString().slice(0, 10);

  const counts = {
    majeurs: sections.majeurs.length,
    nouveautes: sections.nouveautes.length,
    corrections: sections.corrections.length,
    ameliorations: sections.ameliorations.length,
    securite: sections.securite.length,
    maintenance: sections.maintenance.length,
  };

  const summary = summaryForHumans(counts);
  const markdownEntry = buildMarkdownEntry(nextVersion, releaseDate, summary, sections);

  const currentChangelog = fs.existsSync(changelogPath)
    ? fs.readFileSync(changelogPath, 'utf8')
    : '# Changelog\n\n';
  const updatedChangelog = upsertChangelog(currentChangelog, markdownEntry, nextVersion);

  const versionJson = {
    version: nextVersion,
    previousVersion: baseVersion,
    releasedAt: releaseDate,
    summary,
    commitCount: commits.length,
    changelogUrl: '/changelog',
  };

  let existingChangelogJson = { history: [] };
  if (fs.existsSync(changelogJsonPath)) {
    try {
      existingChangelogJson = readJson(changelogJsonPath);
    } catch {
      existingChangelogJson = { history: [] };
    }
  }

  const currentHistory = Array.isArray(existingChangelogJson.history)
    ? existingChangelogJson.history
    : [];

  const entryJson = {
    version: nextVersion,
    releasedAt: releaseDate,
    summary,
    sections,
    commitCount: commits.length,
  };

  const history = [
    entryJson,
    ...currentHistory.filter((item) => item && item.version !== nextVersion),
  ].slice(0, 30);

  const changelogJson = {
    latest: entryJson,
    history,
    generatedAt: new Date().toISOString(),
    source: 'conventional-commits',
  };

  console.log(`Base version: ${baseVersion}`);
  console.log(`Bump type: ${bump}`);
  console.log(`New version: ${nextVersion}`);
  console.log(`Commits analysed: ${commits.length}`);

  if (DRY_RUN) {
    console.log('Dry-run active: aucun fichier modifie.');
    return;
  }

  pkg.version = nextVersion;
  fs.writeFileSync(packageJsonPath, JSON.stringify(pkg, null, 2) + '\n', 'utf8');

  if (fs.existsSync(packageLockPath)) {
    try {
      const lock = readJson(packageLockPath);
      lock.version = nextVersion;
      if (lock.packages && lock.packages['']) {
        lock.packages[''].version = nextVersion;
      }
      writeJson(packageLockPath, lock);
    } catch (error) {
      console.warn(`Impossible de mettre a jour package-lock.json: ${String(error)}`);
    }
  }

  fs.writeFileSync(changelogPath, updatedChangelog, 'utf8');

  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
  }

  writeJson(versionJsonPath, versionJson);
  writeJson(changelogJsonPath, changelogJson);

  console.log('Fichiers mis a jour:');
  console.log('- package.json');
  console.log('- package-lock.json (si present)');
  console.log('- CHANGELOG.md');
  console.log('- public/version.json');
  console.log('- public/changelog.json');
}

main();
