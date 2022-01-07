import { faBookOpen, faClock } from '@fortawesome/free-solid-svg-icons'
import { NoteModel, RequestError } from '@mx-space/api-client'
import { useHeaderMeta, useHeaderShare } from 'common/hooks/use-header-meta'
import { useLoadSerifFont } from 'common/hooks/use-load-serif-font'
import { noteStore, userStore, useStore } from 'common/store'
import Action, { ActionProps } from 'components/Action'
import { LikeButton } from 'components/LikeButton'
import { Loading } from 'components/Loading'
import { NumberRecorder } from 'components/NumberRecorder'
import { RelativeTime } from 'components/RelativeTime'
import dayjs from 'dayjs'
import { ArticleLayout } from 'layouts/ArticleLayout'
import { NoteLayout } from 'layouts/NoteLayout'
import { isEqual, omit } from 'lodash-es'
import { toJS } from 'mobx'
import { observer } from 'mobx-react-lite'
import { NextPage } from 'next'
import { useRouter } from 'next/router'
import React, { FC, useEffect, useMemo, useRef, useState } from 'react'
import { useUpdate } from 'react-use'
import { imagesRecord2Map } from 'utils/images'
import { message } from 'utils/message'
import { mood2icon, weather2icon } from 'utils/meta-icon'
import { parseDate } from 'utils/time'
import CommentWrap from 'views/Comment'
import { NotePasswordConfrim } from 'views/for-pages/NotePasswordConfirm'
import { NoteTimelineList } from 'views/for-pages/NoteTimelineList'
import { BanCopy } from 'views/for-pages/WarningOverlay/ban-copy'
import { Markdown } from 'views/Markdown'
import { ImageSizeMetaContext } from '../../common/context/image-size'
import { Seo } from '../../components/SEO'
import { getSummaryFromMd, isDev, noop } from '../../utils'

const renderLines: FC<{ value: string }> = ({ value }) => {
  return <span className="indent">{value}</span>
}

const useUpdateNote = (id: string) => {
  const note = noteStore.get(id)
  const beforeModel = useRef<NoteModel>()
  const router = useRouter()

  useEffect(() => {
    const before = beforeModel.current

    if (!before && note) {
      beforeModel.current = toJS(note)
      return
    }

    if (!before || !note || isEqual(before, toJS(note))) {
      return
    }

    if (before.id === note.id) {
      if (note.hide && !userStore.isLogged) {
        router.push('/notes')
        message.error('该生活记录已删除或隐藏')
        return
      }
      message.info('生活记录已更新')

      if (isDev) {
        console.log(
          'note-change: ',
          JSON.stringify(note),
          'before: ',
          JSON.stringify(before),
        )
      }
    }
    beforeModel.current = toJS(note)
    // TODO password etc.
  }, [note?.title, note?.text, note?.modified, note?.weather, note?.hide])
}

const NoteView: React.FC<{ id: string }> = observer((props) => {
  const note = noteStore.get(props.id) || (noop as NoteModel)

  const router = useRouter()
  const { userStore, musicStore } = useStore()

  useEffect(() => {
    if (router.query.id === 'latest') {
      router.replace({
        pathname: '/notes/' + note.nid,
        query: { ...omit(router.query, 'id') },
      })
    }
  }, [note.nid])

  useEffect(() => {
    // FIXME: SSR 之后的 hydrate 没有同步数据
    if (!noteStore.relationMap.has(props.id)) {
      noteStore.fetchById(note.id, undefined, { force: true })
    }
  }, [note.id])

  useHeaderShare(note.title, note.text)
  useUpdateNote(note.id)
  useLoadSerifFont()
  useHeaderMeta(note.title, '生活记录')

  const { title, id, text } = note

  const [tips, setTips] = useState(``)

  const { description, wordCount } = getSummaryFromMd(text, {
    count: true,
    length: 150,
  })
  useEffect(() => {
    try {
      setTips(
        `创建于 ${parseDate(note.created, 'YYYY-MM-DD dddd')}${
          note.modified &&
          `, 修改于 ${parseDate(note.modified, 'YYYY-MM-DD dddd')}`
        }, 全文字数: ${wordCount}, 阅读次数: ${note.count.read}, 喜欢次数: ${
          note.count.like
        }`,
      )
      // eslint-disable-next-line no-empty
    } catch {}
  }, [
    text,
    note.created,
    note.modified,
    note.count.read,
    note.count.like,
    wordCount,
  ])
  useEffect(() => {
    if (document.documentElement.scrollTop > 50) {
      document.documentElement.scrollTop = 50
    }
    setTimeout(() => {
      window.scroll({ top: 0, left: 0, behavior: 'smooth' })
    }, 10)
  }, [props.id])

  // if this note has music, auto play it.

  useEffect(() => {
    // now support netease
    const ids =
      note.music && Array.isArray(note.music) && note.music.length > 0
        ? note.music
            .filter((m) => m.id && m.type === 'netease')
            .map((m) => ~~m.id)
        : null

    if (!ids) {
      return
    }
    musicStore.setPlaylist(ids)

    // eslint-disable-next-line react-hooks/exhaustive-deps

    return () => {
      musicStore.empty()
      musicStore.setHide(true)
    }
  }, [note.music, note.nid])

  const isSecret = note.secret ? dayjs(note.secret).isAfter(new Date()) : false
  const secretDate = useMemo(() => new Date(note.secret!), [note.secret])
  const dateFormat = note.secret
    ? Intl.DateTimeFormat('zh-cn', {
        hour12: false,
        hour: 'numeric',
        minute: 'numeric',
        year: 'numeric',
        day: 'numeric',
        month: 'long',
      }).format(secretDate)
    : ''
  useEffect(() => {
    let timer: any
    if (isSecret) {
      timer = setTimeout(() => {
        message.info('刷新以查看解锁的文章', 3)
      }, +secretDate - +new Date())
    }
    return () => {
      clearTimeout(timer)
    }
  }, [isSecret, secretDate])
  return (
    <>
      <Seo
        {...{
          title: title,
          description,

          openGraph: {
            title,
            type: 'article',
            description,
            article: {
              publishedTime: note.created,
              modifiedTime: note.modified || undefined,
              tags: ['Note of Life'],
            },
          },
        }}
      />

      <NoteLayout
        title={title}
        date={new Date(note.created)}
        tips={tips}
        bookmark={note.hasMemory}
        id={note.id}
      >
        {isSecret && !userStore.isLogged ? (
          <p className="text-center my-8">
            这篇文章暂时没有公开呢，将会在 {dateFormat} 解锁，再等等哦
          </p>
        ) : (
          <ImageSizeMetaContext.Provider
            value={useMemo(
              () => imagesRecord2Map(note.images || []),
              [note.images],
            )}
          >
            {isSecret && (
              <span className={'flex justify-center -mb-3.5'}>
                这是一篇非公开的文章。(将在 {dateFormat} 解锁)
              </span>
            )}

            <BanCopy>
              <Markdown
                value={text}
                escapeHtml={false}
                renderers={{ text: renderLines }}
                toc
              />
            </BanCopy>

            <NoteTimelineList noteId={note.id} />
          </ImageSizeMetaContext.Provider>
        )}

        <FooterActionBar id={props.id} />
        <FooterNavigation id={props.id} />
      </NoteLayout>

      {!isSecret && (
        <ArticleLayout
          style={{ minHeight: 'unset', paddingTop: '0' }}
          focus
          key={'at'}
        >
          <CommentWrap
            type={'Note'}
            id={id}
            allowComment={note.allowComment ?? true}
          />
        </ArticleLayout>
      )}
    </>
  )
})

const FooterActionBar: FC<{ id: string }> = observer(({ id }) => {
  const note = noteStore.get(id)

  if (!note) {
    return null
  }
  const nid = note.nid
  const { mood, weather } = note
  const isSecret = note.secret ? dayjs(note.secret).isAfter(new Date()) : false
  const isLiked = noteStore.isLiked(nid)
  const actions: ActionProps = {
    informs: [],
    actions: [
      {
        name: (
          <div className="inline-flex items-center leading-[1]">
            <div className="h-[1rem] w-[1rem] relative mr-2">
              <LikeButton
                checked={isLiked}
                width={'2rem'}
                className={
                  'absolute inset-0 -translate-y-1/2 -translate-x-1/2 transform '
                }
              />
            </div>
            <NumberRecorder number={note.count?.like || 0} />
          </div>
        ),
        color: isLiked ? '#e74c3c' : undefined,

        callback: () => {
          noteStore.like(nid)
        },
      },
    ],
  }
  {
    if (weather) {
      actions.informs!.push({
        name: weather,
        icon: weather2icon(weather),
      })
    }
    if (mood) {
      actions.informs!.push({
        name: mood,
        icon: mood2icon(mood),
      })
    }

    actions.informs!.push(
      {
        name: <RelativeTime date={new Date(note.created)} />,
        icon: faClock,
      },
      {
        name: note.count.read.toString(),
        icon: faBookOpen,
      },
    )
  }

  return <>{!isSecret && <Action {...actions} />}</>
})

const FooterNavigation: FC<{ id: string }> = observer(({ id }) => {
  const [prev, next] =
    noteStore.relationMap.get(id) ||
    ([noop, noop] as [Partial<NoteModel>, Partial<NoteModel>])
  const router = useRouter()
  return (
    <>
      {(!!next || !!prev) && (
        <section className="kami-more">
          {!!next && (
            <button
              className="btn green"
              onClick={() => {
                router.push('/notes/[id]', `/notes/${next.nid}`)
              }}
            >
              前一篇
            </button>
          )}
          {
            <button
              className="btn yellow"
              onClick={() => {
                window.scrollTo({
                  left: 0,
                  top: 0,
                  behavior: 'smooth',
                })
                router.push('/timeline?type=note')
              }}
            >
              时间线
            </button>
          }
          {!!prev && (
            <button
              className="btn green"
              onClick={() => {
                router.push('/notes/[id]', `/notes/${prev.nid}`)
              }}
            >
              后一篇
            </button>
          )}
        </section>
      )}
    </>
  )
})

const PP: NextPage<NoteModel | { needPassword: true; id: string }> = observer(
  (props) => {
    const router = useRouter()
    const note = noteStore.get((props as NoteModel)?.id)

    const update = useUpdate()
    useEffect(() => {
      if (!note) {
        update()
      }
    }, [note])

    if ('needPassword' in props) {
      if (!note) {
        const fetchData = (password: string) => {
          const id = router.query.id as string
          noteStore
            .fetchById(isNaN(+id) ? id : +id, password)
            .catch((err) => {
              message.error('密码错误')
            })
            .then(() => {
              update()
            })
        }
        return <NotePasswordConfrim onSubmit={fetchData} />
      } else {
        return <NoteView id={note.id} />
      }
    }

    if (!note) {
      noteStore.add(props)

      return <Loading />
    }

    return <NoteView id={props.id} />
  },
)

PP.getInitialProps = async (ctx) => {
  const id = ctx.query.id as string
  const password = ctx.query.password as string
  if (id == 'latest') {
    return await noteStore.fetchLatest()
  }
  try {
    const res = await noteStore.fetchById(
      isNaN(+id) ? id : +id,
      password ? String(password) : undefined,
      { force: true },
    )
    return res as any
  } catch (err: any) {
    if (err instanceof RequestError) {
      if (err.status !== 403) {
        throw err
      }
      return { needPassword: true, id: +id }
    } else {
      throw err
    }
  }
}

export default PP
