// ---------------------------------------------------------------------------
// ReadyOp Contacts REST API client — read-only subset used to populate
// the optional "ReadyOp Users" board column (see READYOP_SERVICE in
// config.js). This app never writes back to ReadyOp.
//
// Mirrors the request shape used by the standalone "ReadyOp Edit" app
// included in this same repo (see `ReadyOp Edit/readyop-client.js` and
// its README for the full API writeup, including the Modify/write
// endpoint this app deliberately doesn't need):
//   GET /api/2013-12-01/Contacts/{AgencyID}/   (search/list)
// ---------------------------------------------------------------------------

import { READYOP_SERVICE } from './config.js';

function authHeader(creds) {
  return 'Basic ' + btoa(`${creds.accountId}:${creds.token}`);
}

function contactsUrl(pathSuffix = '') {
  return `${READYOP_SERVICE.apiBaseUrl}/api/2013-12-01/Contacts/${READYOP_SERVICE.agencyId}${pathSuffix}`;
}

async function parseResponse(res) {
  const text = await res.text();
  let body;
  try {
    body = text ? JSON.parse(text) : {};
  } catch {
    body = { raw: text };
  }
  if (!res.ok) {
    const detail = body.Detail || body.Message || body.raw || res.statusText || '(no detail returned)';
    console.error('ReadyOp API error', { status: res.status, url: res.url, responseBody: body });
    throw new Error(`ReadyOp API error (HTTP ${res.status}): ${detail}`);
  }
  return body;
}

/**
 * List/search ReadyOp contacts for the configured agency.
 * @param {{accountId:string, token:string}} creds
 * @param {{page?:number, pageSize?:number, filters?:Object}} [opts]
 * @returns {Promise<{Contacts?:Array, Pages?:number, Total_Results?:number}>}
 */
export async function listContacts(creds, { page = 0, pageSize = READYOP_SERVICE.pageSize, filters = {} } = {}) {
  const url = new URL(contactsUrl('/'));
  url.searchParams.set('Page', page);
  url.searchParams.set('Page_Size', pageSize);
  for (const [key, value] of Object.entries(filters)) {
    if (value !== undefined && value !== null && value !== '') {
      url.searchParams.set(key, value);
    }
  }
  const res = await fetch(url.toString(), {
    headers: { Authorization: authHeader(creds) },
  });
  return parseResponse(res);
}
