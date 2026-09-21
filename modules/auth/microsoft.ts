export async function startMicrosoftLogin(): Promise<never> {
  throw Object.assign(new Error("Microsoft identity is not connected. Use authenticator sign-in."), {
    status: 501,
  });
}

export async function handleMicrosoftCallback(): Promise<never> {
  throw Object.assign(new Error("Microsoft identity is not connected. Use authenticator sign-in."), {
    status: 501,
  });
}
