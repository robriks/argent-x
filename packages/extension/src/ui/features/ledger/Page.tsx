import React, { Children, FC, PropsWithChildren } from "react"
import styled from "styled-components"

import { ArgentXBanner } from "../../components/Icons/ArgentXBanner"

const Header = styled.div`
  position: absolute;
  left: 56px;
  top: 46px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
`

const Panel = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 100%;
  padding: 0 56px;
`

const PageWrapper = styled.div`
  display: flex;
  flex-direction: column-reverse;
  align-items: center;
  justify-content: flex-end;
  width: 100%;
  margin-top: max(120px, 15vh);

  ${({ theme }) => theme.mediaMinWidth.md`
    flex-direction: row;
    margin-top: 0;
    height: 100vh;

    > ${Panel}:last-child {
      width: 50%;
      display: flex;
      background-color: black;
      height: 100%;
    }
  `}
`

export const LedgerPage: FC<PropsWithChildren> = ({ children }) => {
  const [panel, ...restChildren] = Children.toArray(children)
  return (
    <>
      <Header>
        <ArgentXBanner />
      </Header>
      <PageWrapper>
        <Panel>{restChildren}</Panel>
        <Panel>{panel}</Panel>
      </PageWrapper>
    </>
  )
}
