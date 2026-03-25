export const parseAkibaLink = (url: string): { spaceId?: string } => {
  try {
    if (!url.startsWith('akiba://')) {
      return {};
    }

    const path = url.replace('akiba://', '');
    const parts = path.split('/');

    if (parts[0] === 'spaces' && parts[1]) {
      return { spaceId: parts[1] };
    }

    return {};
  } catch {
    return {};
  }
};
