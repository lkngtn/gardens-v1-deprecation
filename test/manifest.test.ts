import { describe, expect, it } from 'vitest';
import { keccak256 } from 'viem';
import { ADDRESSES } from '../src/addresses.js';
import {
  ALL_REVOKED_GRANTS,
  AUTHORITY_REVOKED_GRANTS,
  DECISION_ADMIN_ROLES,
  MANAGER_ROLES,
  PRESERVED_GRANTS,
  SAFE_DIRECT_ROLES,
  SHUTDOWN_REVOKED_GRANTS,
  buildAuthorityTransfer,
  buildCombined,
  buildShutdown,
  decodeCallScript,
  encodeCallScript
} from '../src/manifest.js';
import type { Address, Hex } from '../src/types.js';

const authority = '0x70997970C51812dc3A010C7d01b50e0d17dc79C8' as Address;

describe('deprecation manifest', () => {
  it('locks the approved 35/56 action split and permission counts', () => {
    const vote1 = buildShutdown(authority, 1n);
    const vote2 = buildAuthorityTransfer(authority);
    expect(MANAGER_ROLES).toHaveLength(33);
    expect(DECISION_ADMIN_ROLES).toHaveLength(20);
    expect(SAFE_DIRECT_ROLES).toHaveLength(22);
    expect(PRESERVED_GRANTS).toHaveLength(7);
    expect(SHUTDOWN_REVOKED_GRANTS).toHaveLength(9);
    expect(AUTHORITY_REVOKED_GRANTS).toHaveLength(23);
    expect(ALL_REVOKED_GRANTS).toHaveLength(32);
    expect(vote1.actions).toHaveLength(35);
    expect(vote2.actions).toHaveLength(56);
    expect(buildCombined(authority, 1n).actions).toHaveLength(91);
    expect(vote2.actions.at(-1)?.label).toBe('Set replacement manager for ACL.CREATE_PERMISSIONS_ROLE');
    expect(keccak256(vote1.executionScript)).toMatch(/^0x[0-9a-f]{64}$/);
    expect(keccak256(vote2.executionScript)).toMatch(/^0x[0-9a-f]{64}$/);
  });

  it('round-trips both scripts and never targets Celeste Court', () => {
    for (const phase of [buildShutdown(authority, 1n), buildAuthorityTransfer(authority)]) {
      expect(decodeCallScript(phase.executionScript)).toEqual(phase.actions.map(({ to, data }) => ({ to: to.toLowerCase(), data })));
      expect(phase.actions.some(({ to }) => to.toLowerCase() === ADDRESSES.CELESTE_COURT.toLowerCase())).toBe(false);
    }
  });

  it('rejects malformed inputs', () => {
    expect(() => buildShutdown(authority, 0n)).toThrow('greater than zero');
    expect(() => buildAuthorityTransfer('0x1234' as Address)).toThrow('valid address');
    expect(() => decodeCallScript('0x00000002' as Hex)).toThrow('Unsupported');
    expect(() => encodeCallScript([{ to: authority, data: '0x1' as Hex }])).toThrow('Invalid CallScript calldata');
  });
});
