import { Show, SignInButton, UserButton } from '@clerk/react'
import { authEnabled } from '../shared/auth'

export default function AuthControls() {
  if (!authEnabled) return null
  return (
    <>
      <Show when="signed-out">
        <SignInButton mode="modal">
          <button className="header-button library-button">Sign in</button>
        </SignInButton>
      </Show>
      <Show when="signed-in">
        <UserButton />
      </Show>
    </>
  )
}
