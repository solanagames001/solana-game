"use client"

import { createContext, useContext, useState, type ReactNode, type FC } from 'react'

interface WalletModalContextState {
  visible: boolean
  setVisible: (visible: boolean) => void
}

const DEFAULT_CONTEXT = {
  visible: false,
  setVisible: () => {
    console.warn(
      'useWalletModal must be used within a WalletModalProvider. ' +
        'Make sure to render a WalletModalProvider at the root of your app.'
    )
  },
} as WalletModalContextState

export const WalletModalContext = createContext<WalletModalContextState>(DEFAULT_CONTEXT)

export function useWalletModal(): WalletModalContextState {
  return useContext(WalletModalContext)
}

interface WalletModalProviderProps {
  children: ReactNode
}

/**
 * Кастомный WalletModalProvider, который НЕ рендерит стандартный модал из библиотеки.
 * Используется только для контекста, модал показывается через кастомный компонент WalletModal.
 */
export const WalletModalProvider: FC<WalletModalProviderProps> = ({ children }) => {
  const [visible, setVisible] = useState(false)

  return (
    <WalletModalContext.Provider
      value={{
        visible,
        setVisible,
      }}
    >
      {children}
      {/* НЕ рендерим стандартный WalletModal - используем только кастомный */}
    </WalletModalContext.Provider>
  )
}

