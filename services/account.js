import {
  api,
  saveTokens,
  clearTokens,
} from "./api";

export async function login(
  login,
  password
) {
  const response = await api(
    "/auth/login",
    {
      method: "POST",
      headers: {
        "Content-Type":
          "application/json",
      },
      body: JSON.stringify({
        login,
        password,
      }),
    }
  );

  saveTokens(response.data);

  return response.data.user;
}

export async function register(
  email,
  username,
  displayName,
  password
) {
  const response = await api(
    "/auth/register",
    {
      method: "POST",
      headers: {
        "Content-Type":
          "application/json",
      },
      body: JSON.stringify({
        email,
        username,
        displayName,
        password,
      }),
    }
  );

  saveTokens(response.data);

  return response.data.user;
}

export async function loadProfile() {
  const response = await api(
    "/users/me"
  );

  return response.data;
}

export async function loadFeed() {
  const response = await api(
    "/feed"
  );

  return response.data;
}

export async function logout() {
  clearTokens();
}