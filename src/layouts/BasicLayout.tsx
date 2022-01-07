import { faMoon, faSun } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { useMediaToggle } from 'common/hooks/use-media-toggle'
import { useThemeBackground } from 'common/hooks/use-theme-background'
import { observer } from 'mobx-react-lite'
import { FC, useCallback, useEffect, useRef, useState } from 'react'
import { Footer } from 'views/Footer'
import { MusicMiniPlayerStoreControlled } from 'views/for-pages/Player'
import { Header } from 'views/Header'
import { useStore } from '../common/store'
import { Switch } from '../components/LampSwitch'
import { NoticePanel } from '../components/Notice'

export const BasicLayout: FC = observer(({ children }) => {
  const { appStore, actionStore } = useStore()

  const { toggle, value: isDark } = useMediaToggle()

  useThemeBackground()

  const [showNotice, setNotice] = useState(false)
  const [tip, setTip] = useState({
    text: '白天模式',
    icon: faSun,
  })
  const handleChangeColorMode = useCallback(() => {
    toggle()

    // 去相反的值去比较, 因为 toggle 之后因为 react 的 batch 不会立刻更新
    setTip({
      text: !isDark ? '夜间模式' : '白天模式',
      icon: !isDark ? faMoon : faSun,
    })

    setNotice(!showNotice)
  }, [isDark, showNotice, toggle])
  const idSymbol = useRef(Symbol())
  useEffect(() => {
    actionStore.removeActionBySymbol(idSymbol.current)
    if (appStore.viewport.mobile || appStore.viewport.pad) {
      const action = {
        id: idSymbol.current,
        icon:
          appStore.colorMode === 'dark' ? (
            <FontAwesomeIcon icon={faSun} />
          ) : (
            <FontAwesomeIcon icon={faMoon} />
          ),
        onClick: handleChangeColorMode,
      }
      actionStore.appendActions(action)

      return () => {
        // eslint-disable-next-line react-hooks/exhaustive-deps
        actionStore.removeActionBySymbol(idSymbol.current)
      }
    }
  }, [
    actionStore,
    appStore.colorMode,
    appStore.viewport.mobile,
    appStore.viewport.pad,
    handleChangeColorMode,
  ])
  return (
    <>
      <Header />
      <div className="app-content">{children}</div>
      <Footer />
      <MusicMiniPlayerStoreControlled />
      {!(appStore.viewport.mobile || appStore.viewport.pad) && (
        <Switch onClick={handleChangeColorMode} />
      )}

      {showNotice && (
        <NoticePanel {...tip} setShow={setNotice} key={'notice'} />
      )}
    </>
  )
})
BasicLayout.displayName = 'BasicLayout'
