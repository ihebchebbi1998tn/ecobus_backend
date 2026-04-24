// Optional GitHub auto-sync worker.
// On first boot: clones the configured repo into GIT_SYNC_DIR if missing.
// Then every GIT_SYNC_INTERVAL_MS: fetch + reset --hard origin/{branch}.
// If new commits are pulled, it triggers an optional reload hook (e.g. re-run migrations).
//
// Configure via env:
//   GIT_SYNC_ENABLED=true
//   GIT_SYNC_REPO=https://<token>@github.com/owner/repo.git   (or ssh url)
//   GIT_SYNC_BRANCH=main
//   GIT_SYNC_DIR=/app/repo
//   GIT_SYNC_INTERVAL_MS=60000

import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import fs from 'node:fs';
import path from 'node:path';
import { logger } from '../utils/logger.js';

const exec = promisify(execFile);

const cfg = {
  enabled: process.env.GIT_SYNC_ENABLED === 'true',
  repo: process.env.GIT_SYNC_REPO || '',
  branch: process.env.GIT_SYNC_BRANCH || 'main',
  dir: process.env.GIT_SYNC_DIR || path.resolve(process.cwd(), 'repo'),
  intervalMs: Number(process.env.GIT_SYNC_INTERVAL_MS || 60_000),
};

const git = (args, cwd) =>
  exec('git', args, { cwd, env: { ...process.env, GIT_TERMINAL_PROMPT: '0' } });

const headSha = async (cwd) => {
  try {
    const { stdout } = await git(['rev-parse', 'HEAD'], cwd);
    return stdout.trim();
  } catch {
    return null;
  }
};

const cloneIfMissing = async () => {
  if (fs.existsSync(path.join(cfg.dir, '.git'))) return false;
  fs.mkdirSync(cfg.dir, { recursive: true });
  logger.info(`git-sync: cloning ${cfg.branch} into ${cfg.dir}`);
  await exec('git', ['clone', '--depth', '1', '--branch', cfg.branch, cfg.repo, cfg.dir]);
  return true;
};

const pull = async () => {
  const before = await headSha(cfg.dir);
  await git(['fetch', '--depth', '1', 'origin', cfg.branch], cfg.dir);
  await git(['reset', '--hard', `origin/${cfg.branch}`], cfg.dir);
  const after = await headSha(cfg.dir);
  return { before, after, changed: before !== after };
};

let timer = null;

export const startGitSync = (onChange) => {
  if (!cfg.enabled) {
    logger.info('git-sync: disabled (GIT_SYNC_ENABLED!=true)');
    return { stop: () => {} };
  }
  if (!cfg.repo) {
    logger.warn('git-sync: GIT_SYNC_REPO not set, disabled');
    return { stop: () => {} };
  }

  const tick = async () => {
    try {
      const cloned = await cloneIfMissing();
      const result = cloned
        ? { before: null, after: await headSha(cfg.dir), changed: true }
        : await pull();

      if (result.changed) {
        logger.info('git-sync: updated', {
          branch: cfg.branch,
          from: result.before?.slice(0, 7),
          to: result.after?.slice(0, 7),
        });
        if (typeof onChange === 'function') {
          try { await onChange(result); }
          catch (err) { logger.error('git-sync: onChange failed', { err: err.message }); }
        }
      }
    } catch (err) {
      logger.error('git-sync: tick failed', { err: err.message });
    }
  };

  // Run once at boot, then on an interval.
  tick();
  timer = setInterval(tick, cfg.intervalMs);
  logger.info(`git-sync: enabled, polling ${cfg.repo.replace(/\/\/.*@/, '//***@')} `
              + `branch=${cfg.branch} every ${cfg.intervalMs}ms`);

  return {
    stop: () => { if (timer) clearInterval(timer); },
  };
};

export const gitSyncConfig = cfg;
