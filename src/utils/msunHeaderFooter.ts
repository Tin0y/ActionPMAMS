/**
 * Official MSU at Naawan header and footer images provided by the user.
 * Served directly from public/msun-header.png and public/msun-footer.png.
 */

const getOrigin = () => {
  if (typeof window !== 'undefined' && window.location && window.location.origin) {
    return window.location.origin;
  }
  return '';
};

export const MSUN_HEADER_IMG = `${getOrigin()}/msun-header.png`;
export const MSUN_FOOTER_IMG = `${getOrigin()}/msun-footer.png`;

/**
 * Helper to fetch PNG bytes for Word (.docx) export
 */
export async function getMsunHeaderBytes(): Promise<Uint8Array> {
  try {
    const res = await fetch(`${getOrigin()}/msun-header.png`);
    const buf = await res.arrayBuffer();
    return new Uint8Array(buf);
  } catch (err) {
    console.error('Failed to fetch msun-header.png bytes:', err);
    return new Uint8Array();
  }
}

export async function getMsunFooterBytes(): Promise<Uint8Array> {
  try {
    const res = await fetch(`${getOrigin()}/msun-footer.png`);
    const buf = await res.arrayBuffer();
    return new Uint8Array(buf);
  } catch (err) {
    console.error('Failed to fetch msun-footer.png bytes:', err);
    return new Uint8Array();
  }
}
