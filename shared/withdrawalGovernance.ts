import { TransactionStatus } from './contracts';

export const MAX_ADMINS_ALLOWED = 2;

export type WithdrawalRequestEligibilityContext = {
  adminCount: number;
  hasActiveWithdrawal: boolean;
  isCreator: boolean;
};

export const isActiveWithdrawalStatus = (status: TransactionStatus): boolean => {
  return [TransactionStatus.PENDING_APPROVAL, TransactionStatus.APPROVED].includes(status);
};

export const getRequiredWithdrawalApprovals = (
  adminCount: number,
  snapshotAdminIds: string[] = [],
): number => {
  if (adminCount > 0) {
    return adminCount;
  }

  return snapshotAdminIds.length;
};

export const canPromoteAnotherAdmin = (adminCount: number): boolean => {
  return adminCount < MAX_ADMINS_ALLOWED;
};

export const canInitiateWithdrawal = (isCreator: boolean): boolean => {
  return isCreator;
};

export const canAdminActOnWithdrawal = (isAdmin: boolean, isCreator: boolean): boolean => {
  return isAdmin && !isCreator;
};

export const isWithdrawalRequestEligible = (
  context: WithdrawalRequestEligibilityContext,
): boolean => {
  return (
    context.isCreator &&
    context.adminCount === MAX_ADMINS_ALLOWED &&
    !context.hasActiveWithdrawal
  );
};

export const getWithdrawalRequestBlockingReason = (
  context: WithdrawalRequestEligibilityContext,
): string | null => {
  if (!context.isCreator) {
    return 'Only the Space Creator can request withdrawals.';
  }

  if (context.hasActiveWithdrawal) {
    return 'A withdrawal is already in progress.';
  }

  if (context.adminCount !== MAX_ADMINS_ALLOWED) {
    return 'You need 2 Admins in this space before you can request a withdrawal.';
  }

  return null;
};

export const isWithdrawalFullyApproved = (
  approvedCount: number,
  requiredApprovals: number,
): boolean => {
  return approvedCount >= requiredApprovals;
};

export const canCancelWithdrawal = (isCreator: boolean, status: TransactionStatus): boolean => {
  return isCreator && isActiveWithdrawalStatus(status);
};

export const hasActiveWithdrawal = (statuses: TransactionStatus[]): boolean => {
  return statuses.some((status) =>
    isActiveWithdrawalStatus(status),
  );
};
