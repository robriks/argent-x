import { get } from "lodash-es"
import { useEffect, useRef } from "react"
import useSWR, { SWRConfiguration } from "swr"

import { getTokenBalanceForWalletAccount } from "../../../shared/multicall"
import { BaseToken } from "../../../shared/token/type"
import { IS_DEV } from "../../../shared/utils/dev"
import { isNumeric } from "../../../shared/utils/number"
import { isEqualAddress } from "../../services/addresses"
import { Account } from "../accounts/Account"
import { useAccountTransactions } from "../accounts/accountTransactions.state"

interface UseTokenBalanceForAccountArgs {
  token: BaseToken
  account: Account
  /** Return {@link TokenBalanceErrorMessage} rather than throwing so the UI can choose if / how to display it to the user without `ErrorBoundary` */
  shouldReturnError?: boolean
}

/**
 * Get the individual token balance for the account, using Multicall if available
 * This will automatically mutate when the number of pending transactions decreases
 */

export const useTokenBalanceForAccount = (
  { token, account, shouldReturnError = false }: UseTokenBalanceForAccountArgs,
  config?: SWRConfiguration,
) => {
  const { pendingTransactions } = useAccountTransactions(account)
  const pendingTransactionsLengthRef = useRef(pendingTransactions.length)
  const key = [
    "balanceOf",
    token.address,
    token.networkId,
    account.address,
    account.network.multicallAddress,
  ]
    .filter(Boolean)
    .join("-")
  const { mutate, ...rest } = useSWR<string | TokenBalanceErrorMessage>(
    key,
    async () => {
      try {
        const balance = await getTokenBalanceForWalletAccount(
          token.address,
          account.toBaseWalletAccount(),
        )
        return balance
      } catch (error) {
        if (shouldReturnError) {
          return errorToMessage(
            error,
            token.address,
            account.network.multicallAddress,
          )
        } else {
          throw error
        }
      }
    },
    config,
  )

  // refetch when number of pending transactions goes down
  useEffect(() => {
    if (pendingTransactionsLengthRef.current > pendingTransactions.length) {
      mutate()
    }
    pendingTransactionsLengthRef.current = pendingTransactions.length
  }, [mutate, pendingTransactions.length])

  return {
    mutate,
    ...rest,
  }
}

const isNetworkError = (errorCode: string | number) => {
  if (!isNumeric(errorCode)) {
    return false
  }
  const code = Number(errorCode)
  return [429, 502].includes(code)
}

export interface TokenBalanceErrorMessage {
  message: string
  description: string
}

const errorToMessage = (
  error: unknown,
  tokenAddress: string,
  multicallAddress?: string,
): TokenBalanceErrorMessage => {
  const errorCode = get(error, "errorCode")
  const message = get(error, "message")
  if (errorCode === "StarknetErrorCode.UNINITIALIZED_CONTRACT") {
    /** tried to use a contract not found on this network */
    /** message like "Requested contract address 0x05754af3760f3356da99aea5c3ec39ccac7783d925a19666ebbeca58ff0087f4 is not deployed" */
    const contractAddressMatches = message.match(/(0x[0-9a-f]+)/gi)
    const contractAddress = contractAddressMatches?.[0] ?? undefined
    if (contractAddress) {
      if (isEqualAddress(contractAddress, tokenAddress)) {
        return {
          message: "Token not found",
          description: `Token with address ${tokenAddress} not deployed on this network`,
        }
      } else if (
        multicallAddress &&
        isEqualAddress(contractAddress, multicallAddress)
      ) {
        return {
          message: "No Multicall",
          description: `Multicall contract with address ${multicallAddress} not deployed on this network`,
        }
      }
      return {
        message: "Missing contract",
        description: `Contract with address ${contractAddress} not deployed on this network`,
      }
    }
    return {
      message: "Missing contract",
      description: message,
    }
  } else if (isNetworkError(errorCode)) {
    /* some other network error */
    return {
      message: "Network error",
      description: message,
    }
  } else {
    /* show a console message in dev for any unhandled errors that could be better handled here */
    IS_DEV &&
      console.warn(
        `TokenListItemMulticall - ignoring errorCode ${errorCode} with error:`,
        error,
      )
  }
  return {
    message: "Error",
    description: message,
  }
}
