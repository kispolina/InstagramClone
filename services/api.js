const API_URL =
  "https://socialnetwork-api-staging.onrender.com";

let accessToken = null;
let refreshToken = null;

export function saveTokens(auth) {
  accessToken = auth.accessToken;
  refreshToken = auth.refreshToken;
}

export function clearTokens() {
  accessToken = null;
  refreshToken = null;
}

export async function api(path, options = {}) {
  const response = await fetch(
    `${API_URL}${path}`,
    {
      ...options,
      headers: {
        ...(options.headers || {}),
        ...(accessToken
          ? {
              Authorization: `Bearer ${accessToken}`,
            }
          : {}),
      },
    }
  );

  const result = await response.json();
	console.log("STATUS:", response.status);
	console.log("RESULT:", result);

  if (!response.ok) {
	  console.log("ERROR RESPONSE:", result);
		
	  throw new Error(
	    result.message ||
	    JSON.stringify(result.errors) ||
	    "Помилка сервера"
	  );
	}

  return result;
}