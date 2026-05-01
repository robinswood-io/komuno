import { describe, expect, it } from 'vitest';
import {
  buildGitHubLabels,
  statusFromGitHub,
  toApiStatus,
  toStorageStatus,
} from '../../../server/utils/development-request-status';

describe('development-request-status (iteration 9)', () => {
  describe('toStorageStatus', () => {
    it('maps pending/open to open', () => {
      expect(toStorageStatus('pending')).toBe('open');
      expect(toStorageStatus('open')).toBe('open');
    });

    it('maps done/closed to closed', () => {
      expect(toStorageStatus('done')).toBe('closed');
      expect(toStorageStatus('closed')).toBe('closed');
    });

    it('maps in_progress directly and falls back to cancelled', () => {
      expect(toStorageStatus('in_progress')).toBe('in_progress');
      expect(toStorageStatus('cancelled')).toBe('cancelled');
    });
  });

  describe('toApiStatus', () => {
    it('maps open/pending to pending', () => {
      expect(toApiStatus('open')).toBe('pending');
      expect(toApiStatus('pending')).toBe('pending');
    });

    it('maps closed/done to done', () => {
      expect(toApiStatus('closed')).toBe('done');
      expect(toApiStatus('done')).toBe('done');
    });

    it('maps in_progress directly and unknown to cancelled', () => {
      expect(toApiStatus('in_progress')).toBe('in_progress');
      expect(toApiStatus('unexpected_status')).toBe('cancelled');
    });
  });

  describe('statusFromGitHub', () => {
    it('prioritizes explicit status-* labels (case-insensitive)', () => {
      expect(statusFromGitHub('open', ['STATUS-IN_PROGRESS'])).toBe('in_progress');
      expect(statusFromGitHub('open', ['status-done'])).toBe('done');
      expect(statusFromGitHub('open', ['status-cancelled'])).toBe('cancelled');
      expect(statusFromGitHub('open', ['status-pending'])).toBe('pending');
    });

    it('ignores unknown status-* label and uses non-prefixed fallback labels', () => {
      expect(statusFromGitHub('open', ['status-unknown', 'in_progress'])).toBe('in_progress');
      expect(statusFromGitHub('open', ['status-unknown', 'done'])).toBe('done');
      expect(statusFromGitHub('open', ['status-unknown', 'cancelled'])).toBe('cancelled');
      expect(statusFromGitHub('open', ['status-unknown', 'pending'])).toBe('pending');
    });

    it('falls back to issue state when labels do not provide a known status', () => {
      expect(statusFromGitHub('closed', ['triage'])).toBe('done');
      expect(statusFromGitHub('open', ['triage'])).toBe('pending');
      expect(statusFromGitHub('open')).toBe('pending');
    });
  });

  describe('buildGitHubLabels', () => {
    it('builds labels for bug requests', () => {
      expect(
        buildGitHubLabels({
          status: 'pending',
          type: 'bug',
          priority: 'high',
        }),
      ).toEqual(['bug', 'priority-high', 'status-pending']);
    });

    it('builds labels for feature requests and each status mapping', () => {
      expect(
        buildGitHubLabels({
          status: 'in_progress',
          type: 'feature',
          priority: 'medium',
        }),
      ).toEqual(['enhancement', 'priority-medium', 'status-in_progress']);

      expect(
        buildGitHubLabels({
          status: 'done',
          type: 'feature',
          priority: 'low',
        }),
      ).toEqual(['enhancement', 'priority-low', 'status-done']);

      expect(
        buildGitHubLabels({
          status: 'cancelled',
          type: 'feature',
          priority: 'critical',
        }),
      ).toEqual(['enhancement', 'priority-critical', 'status-cancelled']);
    });
  });
});

