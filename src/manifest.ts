import { encodeFunctionData, isAddress } from 'viem';
import { ACL_ABI, AGENT_ABI, CONVICTION_ABI } from './abis.js';
import { ADDRESSES } from './addresses.js';
import type { Address, Hex } from './types.js';

export const ROLES = {
  CREATE_PERMISSIONS: '0x0b719b33c83b8e5d300c521cb8b54ae9bd933996a14bef8c2f4e0285d2d2400a',
  PAUSE_CONTRACT: '0x0e3a87ad3cd0c04dcd1e538226de2b467c72316c162f937f5b6f791361662462',
  MINT: '0x154c00819833dac601ee5ddded6fda79d9d8b506b911b3dbd54cdb95fe6c3686',
  AGREEMENT_ROLE_A: '0x2309a8cbbd5c3f18649f3b7ac47a0e7b99756c2ac146dda1ffc80d3f80827be0',
  AGREEMENT_ROLE_B: '0x2309a8cbbd5c3f18649f3b7ac47a0e7b99756c2ac146dda1ffc80d3f80827be6',
  QUIET_ENDING: '0x4f885d966bcd49734218a6e280d58c840b86e8cc13610b21ebd46f0b1da362c2',
  SUPERFLUID_ROLE_A: '0x56c3496db27efc6d83ab1a24218f016191aab8835d442bc0fa8502f327132cbe',
  DELEGATED_VOTING_PERIOD: '0x59ba415d96e104e6483d76b79d9cd09941d04e229adcd62d7dc672c93975a19d',
  EXECUTION_DELAY: '0x5e3a3edc315e366a0cc5c94ca94a8f9bbc2f1feebb2ef7704bfefcff0cdc4ee7',
  CANCEL_PROPOSALS: '0x82c52f79cad6ac09c16c165c562b50c5e655a09a19bb99b2d182ab3caff020f2',
  TRANSFER: '0x8502233096d909befbda0999bb8ea2f3a6be3c138b9fbf003752a4c8bce86f6c',
  SET_AGREEMENT: '0x8dad640ab1b088990c972676ada708447affc660890ec9fc9a5483241c49f036',
  UPDATE_SETTINGS: '0x9d4f140430c9045e12b5a104aa9e641c09b980a26ab8e12a32a2f3d155229ae3',
  CHANGE_QUORUM: '0xa3f675280fb3c54662067f92659ca1ee3ef7c1a7f2a6ff03a5c4228aa26b6a82',
  RUN_SCRIPT: '0xb421f7ad7646747f3051c50c0b8e2377839296cd4973e27f63821d73e390338f',
  APP_MANAGER: '0xb6d92708f3d4817afc106147d969e229ced5c46e65e0a5002a0d391287762bd0',
  CHANGE_VOTE_TIME: '0xbc5d8ebc0830a2fed8649987b8263de1397b7fa892f3b87dc2d8cad35c691f86',
  CREATE_PROPOSALS: '0xbf05b9322505d747ab5880dfb677dc4864381e9fc3a25ccfa184a3a53d02f4b2',
  EVM_SCRIPT_ROLE_A: '0xc4e90f38eea8c4212a009ca7b8947943ba4d4a58d19b683417f65291d1cd9ed2',
  SUPERFLUID_ROLE_B: '0xc3785b41f0ebb77bd89636ecae52c950cee1cd359f0a1e5fababbcb5a0bfcb97',
  EXECUTE: '0xcebf517aa4440d1d125e0355aae64401211d0848a23c02cc5d29a14822580ba4',
  CREATE_VOTES: '0xe7dcd7275292e064d090fbc5f3bd7995be23b502c1fed5cd94cfddbbdcd32bbc',
  BURN: '0xe97b137254058bd94f28d2f3eb79e2d34074ffb488d042e3bc958e0a57d2fa22',
  CHALLENGE: '0xef025787d7cd1a96d9014b8dc7b44899b8c1350859fb9e1e05f5a546dd65158d',
  CHANGE_SUPPORT: '0xf3a5f71f3cb50dae9454dd13cdf0fd1b559f7e20d63c08902592486e6d460c90',
  EVM_SCRIPT_ROLE_B: '0xf7a450ef335e1892cb42c8ca72e7242359d7711924b75db5717410da3f614aa3',
  SUPERFLUID_ROLE_C: '0xf57d195c0663dd0e8a2210bb519e2b7de35301795015198efff16e9a2be238c8',
  SAFE_EXECUTE: '0x0a1ad7b87f5846153c6d5a1f761d71c7d0cfd122384f56066cd33239b7933694',
  CHANGE_AGREEMENT: '0x07813bca4905795fa22783885acd0167950db28f2d7a40b70f666f429e19f1d9'
} as const satisfies Record<string, Hex>;

export type Permission = { app: Address; role: Hex; label: string };
export type PermissionGrant = Permission & { entity: Address };
export type RawAction = { to: Address; data: Hex; label: string };

const permission = (app: Address, role: Hex, label: string): Permission => ({ app, role, label });
const grant = (entity: Address, app: Address, role: Hex, label: string): PermissionGrant => ({ entity, app, role, label });

export const MANAGER_ROLES: readonly Permission[] = [
  permission(ADDRESSES.CONVICTION_VOTING, ROLES.PAUSE_CONTRACT, 'ConvictionVoting.PAUSE_CONTRACT_ROLE'),
  permission(ADDRESSES.CONVICTION_VOTING, ROLES.CANCEL_PROPOSALS, 'ConvictionVoting.CANCEL_PROPOSALS_ROLE'),
  permission(ADDRESSES.CONVICTION_VOTING, ROLES.SET_AGREEMENT, 'ConvictionVoting.SET_AGREEMENT_ROLE'),
  permission(ADDRESSES.CONVICTION_VOTING, ROLES.UPDATE_SETTINGS, 'ConvictionVoting.UPDATE_SETTINGS_ROLE'),
  permission(ADDRESSES.CONVICTION_VOTING, ROLES.CREATE_PROPOSALS, 'ConvictionVoting.CREATE_PROPOSALS_ROLE'),
  permission(ADDRESSES.CONVICTION_VOTING, ROLES.CHALLENGE, 'ConvictionVoting.CHALLENGE_ROLE'),
  permission(ADDRESSES.EVM_SCRIPT_REGISTRY, ROLES.EVM_SCRIPT_ROLE_A, 'EVMScriptRegistry role A'),
  permission(ADDRESSES.EVM_SCRIPT_REGISTRY, ROLES.EVM_SCRIPT_ROLE_B, 'EVMScriptRegistry role B'),
  permission(ADDRESSES.COMMON_POOL, ROLES.SAFE_EXECUTE, 'Agent.SAFE_EXECUTE_ROLE'),
  permission(ADDRESSES.COMMON_POOL, ROLES.TRANSFER, 'Agent.TRANSFER_ROLE'),
  permission(ADDRESSES.COMMON_POOL, ROLES.RUN_SCRIPT, 'Agent.RUN_SCRIPT_ROLE'),
  permission(ADDRESSES.COMMON_POOL, ROLES.EXECUTE, 'Agent.EXECUTE_ROLE'),
  permission(ADDRESSES.AGREEMENT, ROLES.CHANGE_AGREEMENT, 'Agreement.CHANGE_AGREEMENT_ROLE'),
  permission(ADDRESSES.AGREEMENT, ROLES.AGREEMENT_ROLE_A, 'Agreement role A'),
  permission(ADDRESSES.AGREEMENT, ROLES.AGREEMENT_ROLE_B, 'Agreement role B'),
  permission(ADDRESSES.SUPERFLUID, ROLES.SUPERFLUID_ROLE_A, 'Superfluid role A'),
  permission(ADDRESSES.SUPERFLUID, ROLES.SUPERFLUID_ROLE_B, 'Superfluid role B'),
  permission(ADDRESSES.SUPERFLUID, ROLES.SUPERFLUID_ROLE_C, 'Superfluid role C'),
  permission(ADDRESSES.BRIGHT_ID_REGISTER, ROLES.UPDATE_SETTINGS, 'BrightIdRegister.UPDATE_SETTINGS_ROLE'),
  permission(ADDRESSES.DYNAMIC_ISSUANCE, ROLES.UPDATE_SETTINGS, 'DynamicIssuance.UPDATE_SETTINGS_ROLE'),
  permission(ADDRESSES.DAO_KERNEL, ROLES.APP_MANAGER, 'Kernel.APP_MANAGER_ROLE'),
  permission(ADDRESSES.ACL, ROLES.CREATE_PERMISSIONS, 'ACL.CREATE_PERMISSIONS_ROLE'),
  permission(ADDRESSES.TOKEN_MANAGER, ROLES.MINT, 'HookedTokenManager.MINT_ROLE'),
  permission(ADDRESSES.TOKEN_MANAGER, ROLES.BURN, 'HookedTokenManager.BURN_ROLE'),
  permission(ADDRESSES.DECISION_VOTING, ROLES.QUIET_ENDING, 'DisputableVoting.CHANGE_QUIET_ENDING_ROLE'),
  permission(ADDRESSES.DECISION_VOTING, ROLES.DELEGATED_VOTING_PERIOD, 'DisputableVoting.CHANGE_DELEGATED_VOTING_PERIOD_ROLE'),
  permission(ADDRESSES.DECISION_VOTING, ROLES.EXECUTION_DELAY, 'DisputableVoting.CHANGE_EXECUTION_DELAY_ROLE'),
  permission(ADDRESSES.DECISION_VOTING, ROLES.SET_AGREEMENT, 'DisputableVoting.SET_AGREEMENT_ROLE'),
  permission(ADDRESSES.DECISION_VOTING, ROLES.CHANGE_QUORUM, 'DisputableVoting.CHANGE_QUORUM_ROLE'),
  permission(ADDRESSES.DECISION_VOTING, ROLES.CHANGE_VOTE_TIME, 'DisputableVoting.CHANGE_VOTE_TIME_ROLE'),
  permission(ADDRESSES.DECISION_VOTING, ROLES.CREATE_VOTES, 'DisputableVoting.CREATE_VOTES_ROLE'),
  permission(ADDRESSES.DECISION_VOTING, ROLES.CHALLENGE, 'DisputableVoting.CHALLENGE_ROLE'),
  permission(ADDRESSES.DECISION_VOTING, ROLES.CHANGE_SUPPORT, 'DisputableVoting.CHANGE_SUPPORT_ROLE')
];

const decisionExcluded = new Set([
  `${ADDRESSES.CONVICTION_VOTING}:${ROLES.PAUSE_CONTRACT}`,
  `${ADDRESSES.CONVICTION_VOTING}:${ROLES.SET_AGREEMENT}`,
  `${ADDRESSES.CONVICTION_VOTING}:${ROLES.CREATE_PROPOSALS}`,
  `${ADDRESSES.CONVICTION_VOTING}:${ROLES.CHALLENGE}`,
  `${ADDRESSES.COMMON_POOL}:${ROLES.SAFE_EXECUTE}`,
  `${ADDRESSES.COMMON_POOL}:${ROLES.TRANSFER}`,
  `${ADDRESSES.AGREEMENT}:${ROLES.AGREEMENT_ROLE_A}`,
  `${ADDRESSES.AGREEMENT}:${ROLES.AGREEMENT_ROLE_B}`,
  `${ADDRESSES.TOKEN_MANAGER}:${ROLES.MINT}`,
  `${ADDRESSES.TOKEN_MANAGER}:${ROLES.BURN}`,
  `${ADDRESSES.DECISION_VOTING}:${ROLES.SET_AGREEMENT}`,
  `${ADDRESSES.DECISION_VOTING}:${ROLES.CREATE_VOTES}`,
  `${ADDRESSES.DECISION_VOTING}:${ROLES.CHALLENGE}`
].map((value) => value.toLowerCase()));

export const DECISION_ADMIN_ROLES = MANAGER_ROLES.filter(({ app, role }) => !decisionExcluded.has(`${app}:${role}`.toLowerCase()));

export const SAFE_DIRECT_ROLES: readonly Permission[] = [
  ...DECISION_ADMIN_ROLES,
  permission(ADDRESSES.CONVICTION_VOTING, ROLES.PAUSE_CONTRACT, 'ConvictionVoting.PAUSE_CONTRACT_ROLE'),
  permission(ADDRESSES.COMMON_POOL, ROLES.TRANSFER, 'Agent.TRANSFER_ROLE')
];

export const PRESERVED_GRANTS: readonly PermissionGrant[] = [
  grant(ADDRESSES.SUPERFLUID, ADDRESSES.COMMON_POOL, ROLES.SAFE_EXECUTE, 'Preserve Superfluid Agent safe execute'),
  grant(ADDRESSES.SUPERFLUID, ADDRESSES.COMMON_POOL, ROLES.TRANSFER, 'Preserve Superfluid Agent transfer'),
  grant(ADDRESSES.AGREEMENT_SETTINGS_ADMIN, ADDRESSES.AGREEMENT, ROLES.AGREEMENT_ROLE_A, 'Preserve Agreement settings role A'),
  grant(ADDRESSES.AGREEMENT_SETTINGS_ADMIN, ADDRESSES.AGREEMENT, ROLES.AGREEMENT_ROLE_B, 'Preserve Agreement settings role B'),
  grant(ADDRESSES.SUPERFLUID_HELPER, ADDRESSES.SUPERFLUID, ROLES.SUPERFLUID_ROLE_A, 'Preserve Superfluid helper role A'),
  grant(ADDRESSES.SUPERFLUID_HELPER, ADDRESSES.SUPERFLUID, ROLES.SUPERFLUID_ROLE_B, 'Preserve Superfluid helper role B'),
  grant(ADDRESSES.BRIGHT_ID_SETTINGS_ADMIN, ADDRESSES.BRIGHT_ID_REGISTER, ROLES.UPDATE_SETTINGS, 'Preserve BrightID settings admin')
];

const TEMPORARY_GRANTS: readonly PermissionGrant[] = [
  grant(ADDRESSES.DECISION_VOTING, ADDRESSES.CONVICTION_VOTING, ROLES.PAUSE_CONTRACT, 'Temporarily grant DecisionVoting Conviction pause'),
  grant(ADDRESSES.DECISION_VOTING, ADDRESSES.COMMON_POOL, ROLES.TRANSFER, 'Temporarily grant DecisionVoting Agent transfer')
];

const CONVICTION_PUBLIC_GRANTS: readonly PermissionGrant[] = [
  grant(ADDRESSES.ANY_ENTITY, ADDRESSES.CONVICTION_VOTING, ROLES.CREATE_PROPOSALS, 'Revoke public Conviction proposal creation'),
  grant(ADDRESSES.ANY_ENTITY, ADDRESSES.CONVICTION_VOTING, ROLES.CHALLENGE, 'Revoke public Conviction challenge')
];

const DECISION_PUBLIC_GRANTS: readonly PermissionGrant[] = [
  grant(ADDRESSES.ANY_ENTITY, ADDRESSES.DECISION_VOTING, ROLES.CREATE_VOTES, 'Revoke public Decision vote creation'),
  grant(ADDRESSES.ANY_ENTITY, ADDRESSES.DECISION_VOTING, ROLES.CHALLENGE, 'Revoke public Decision challenge')
];

const CONVICTION_LEGACY_GRANTS: readonly PermissionGrant[] = [
  grant(ADDRESSES.AGREEMENT, ADDRESSES.CONVICTION_VOTING, ROLES.SET_AGREEMENT, 'Revoke Agreement link to ConvictionVoting'),
  grant(ADDRESSES.CONVICTION_VOTING, ADDRESSES.COMMON_POOL, ROLES.TRANSFER, 'Revoke ConvictionVoting Agent transfer'),
  grant(ADDRESSES.LEGACY_CONVICTION_PAUSER, ADDRESSES.CONVICTION_VOTING, ROLES.PAUSE_CONTRACT, 'Revoke legacy Conviction pauser')
];

const ISSUANCE_GRANTS: readonly PermissionGrant[] = [
  grant(ADDRESSES.DYNAMIC_ISSUANCE, ADDRESSES.TOKEN_MANAGER, ROLES.MINT, 'Revoke DynamicIssuance mint'),
  grant(ADDRESSES.DYNAMIC_ISSUANCE, ADDRESSES.TOKEN_MANAGER, ROLES.BURN, 'Revoke DynamicIssuance burn')
];

const DECISION_ADMIN_GRANTS: readonly PermissionGrant[] = DECISION_ADMIN_ROLES.map(({ app, role, label }) =>
  grant(ADDRESSES.DECISION_VOTING, app, role, `Revoke DecisionVoting ${label}`)
);

export const SHUTDOWN_REVOKED_GRANTS: readonly PermissionGrant[] = [
  ...TEMPORARY_GRANTS,
  ...CONVICTION_PUBLIC_GRANTS,
  ...CONVICTION_LEGACY_GRANTS,
  ...ISSUANCE_GRANTS
];

export const AUTHORITY_REVOKED_GRANTS: readonly PermissionGrant[] = [
  ...DECISION_ADMIN_GRANTS,
  ...DECISION_PUBLIC_GRANTS,
  grant(ADDRESSES.AGREEMENT, ADDRESSES.DECISION_VOTING, ROLES.SET_AGREEMENT, 'Revoke Agreement link to DisputableVoting')
];

export const ALL_REVOKED_GRANTS = [...SHUTDOWN_REVOKED_GRANTS, ...AUTHORITY_REVOKED_GRANTS] as const;

function aclCall(functionName: 'grantPermission' | 'revokePermission' | 'setPermissionManager', item: PermissionGrant): Hex {
  return encodeFunctionData({ abi: ACL_ABI, functionName, args: [item.entity, item.app, item.role] } as Parameters<typeof encodeFunctionData>[0]);
}

export function encodeCallScript(actions: readonly Pick<RawAction, 'to' | 'data'>[]): Hex {
  let encoded = '00000001';
  for (const action of actions) {
    if (!isAddress(action.to)) throw new Error(`Invalid CallScript target: ${action.to}`);
    if (!/^0x(?:[a-fA-F0-9]{2})*$/.test(action.data)) throw new Error(`Invalid CallScript calldata for ${action.to}.`);
    const byteLength = (action.data.length - 2) / 2;
    if (byteLength > 0xffffffff) throw new Error('CallScript action exceeds uint32 length.');
    encoded += action.to.slice(2).toLowerCase();
    encoded += byteLength.toString(16).padStart(8, '0');
    encoded += action.data.slice(2);
  }
  return `0x${encoded}`;
}

export function decodeCallScript(script: Hex): Array<{ to: Address; data: Hex }> {
  if (!script.toLowerCase().startsWith('0x00000001')) throw new Error('Unsupported or malformed CallScript spec ID.');
  const actions: Array<{ to: Address; data: Hex }> = [];
  let cursor = 10;
  while (cursor < script.length) {
    if (cursor + 48 > script.length) throw new Error('Truncated CallScript action header.');
    const to = `0x${script.slice(cursor, cursor + 40)}` as Address;
    cursor += 40;
    const byteLength = Number.parseInt(script.slice(cursor, cursor + 8), 16);
    cursor += 8;
    const end = cursor + byteLength * 2;
    if (!Number.isSafeInteger(byteLength) || end > script.length) throw new Error('Truncated CallScript action calldata.');
    actions.push({ to, data: `0x${script.slice(cursor, end)}` });
    cursor = end;
  }
  return actions;
}

function assertAuthority(authority: Address): void {
  if (!isAddress(authority)) throw new Error('replacementAuthority must be a valid address.');
}

function safeGrantActions(authority: Address): RawAction[] {
  return SAFE_DIRECT_ROLES.map((item) => {
    const authorityGrant = grant(authority, item.app, item.role, `Grant replacement authority ${item.label}`);
    return { to: ADDRESSES.ACL, data: aclCall('grantPermission', authorityGrant), label: authorityGrant.label };
  });
}

function managerActions(authority: Address): RawAction[] {
  const createPermission = MANAGER_ROLES.find(({ app, role }) => app === ADDRESSES.ACL && role === ROLES.CREATE_PERMISSIONS);
  if (!createPermission) throw new Error('ACL.CREATE_PERMISSIONS_ROLE missing from manager manifest.');
  return MANAGER_ROLES.filter((item) => item !== createPermission).concat(createPermission).map((item) => {
    const manager = grant(authority, item.app, item.role, `Set replacement manager for ${item.label}`);
    return { to: ADDRESSES.ACL, data: aclCall('setPermissionManager', manager), label: manager.label };
  });
}

export function buildShutdown(authority: Address, hnyAmount: bigint): { actions: RawAction[]; executionScript: Hex } {
  assertAuthority(authority);
  if (hnyAmount <= 0n) throw new Error('hnyAmount must be greater than zero.');
  const pause = TEMPORARY_GRANTS[0]!;
  const transfer = TEMPORARY_GRANTS[1]!;
  const actions: RawAction[] = [
    { to: ADDRESSES.ACL, data: aclCall('grantPermission', pause), label: pause.label },
    { to: ADDRESSES.CONVICTION_VOTING, data: encodeFunctionData({ abi: CONVICTION_ABI, functionName: 'pauseContract', args: [true] }), label: 'Pause ConvictionVoting' },
    { to: ADDRESSES.ACL, data: aclCall('grantPermission', transfer), label: transfer.label },
    { to: ADDRESSES.COMMON_POOL, data: encodeFunctionData({ abi: AGENT_ABI, functionName: 'transfer', args: [ADDRESSES.HNY, authority, hnyAmount] }), label: `Transfer ${hnyAmount} wei HNY to replacement authority` }
  ];
  actions.push(...safeGrantActions(authority));
  actions.push(...SHUTDOWN_REVOKED_GRANTS.map((item) => ({ to: ADDRESSES.ACL, data: aclCall('revokePermission', item), label: item.label })));
  return { actions, executionScript: encodeCallScript(actions) };
}

export function buildAuthorityTransfer(authority: Address): { actions: RawAction[]; executionScript: Hex } {
  assertAuthority(authority);
  const actions: RawAction[] = AUTHORITY_REVOKED_GRANTS.map((item) => ({ to: ADDRESSES.ACL, data: aclCall('revokePermission', item), label: item.label }));
  actions.push(...managerActions(authority));
  return { actions, executionScript: encodeCallScript(actions) };
}

export function buildCombined(authority: Address, hnyAmount: bigint): { actions: RawAction[]; executionScript: Hex } {
  const actions = [...buildShutdown(authority, hnyAmount).actions, ...buildAuthorityTransfer(authority).actions];
  return { actions, executionScript: encodeCallScript(actions) };
}
