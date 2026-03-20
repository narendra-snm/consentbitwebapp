const PRODUCTION_API_BASE ='https://consent-webapp-manager.web-8fb.workers.dev';


export function getProductionApiBase() {
  return PRODUCTION_API_BASE.replace(/\/+$/, '');
}


export async function serverFetch(
  endpoint: string,
  options: {
    method?: string;
    headers?: Record<string, string>;
    body?: any;
    cookies?: string;
  } = {}
): Promise<Response> {
  const { method = 'GET', headers = {}, body, cookies } = options;
  
  const url = `${getProductionApiBase()}${endpoint}`;
  
  const requestHeaders: Record<string, string> = {
    ...headers,
  };
  
  // Forward cookies if provided
  if (cookies) {
    requestHeaders['Cookie'] = cookies;
  }
  
  const fetchOptions: RequestInit = {
    method,
    headers: requestHeaders,
  };
  
  if (body) {
    if (typeof body === 'string') {
      fetchOptions.body = body;
    } else {
      fetchOptions.body = JSON.stringify(body);
      if (!requestHeaders['Content-Type']) {
        requestHeaders['Content-Type'] = 'application/json';
      }
    }
  }
  
  return fetch(url, fetchOptions);
}


