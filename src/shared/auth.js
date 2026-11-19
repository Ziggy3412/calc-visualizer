// Login is only turned on for the website build: it needs a Clerk key, and
// Clerk cannot run inside the Electron desktop app (which loads from file://).
export const isWeb = window.location.protocol.startsWith('http')
export const clerkKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY
export const authEnabled = Boolean(clerkKey) && isWeb
