import classNames from 'clsx'
import mediumZoom from 'medium-zoom'
import dynamic from 'next/dynamic'
import {
  ClassAttributes,
  DetailedHTMLProps,
  FC,
  forwardRef,
  ImgHTMLAttributes,
  memo,
  RefObject,
  useEffect,
  useRef,
  useState,
} from 'react'
import type { LazyImage as LazyImageProps } from 'react-lazy-images'
import { escapeHTMLTag, isClientSide } from '../../../utils'
import styles from './index.module.css'

const LazyImage = dynamic(() =>
  import('react-lazy-images').then((mo: any) => mo.LazyImage),
) as any as typeof LazyImageProps
interface ImageProps {
  defaultImage?: string
  src: string
  alt?: string
  height?: number | string
  width?: number | string
  backgroundColor?: string
  popup?: boolean
  overflowHidden?: boolean
}

const Image: FC<
  DetailedHTMLProps<ImgHTMLAttributes<HTMLImageElement>, HTMLImageElement> & {
    placeholderRef: RefObject<HTMLDivElement>
    popup?: boolean
  }
> = memo(({ src, alt, placeholderRef, popup = false }) => {
  const [loaded, setLoad] = useState(false)

  useEffect(() => {
    if (src) {
      const image = new window.Image()
      image.src = src as string
      image.onload = () => {
        setLoad(true)
        try {
          if (placeholderRef && placeholderRef.current) {
            placeholderRef.current.classList.add('hide')
          }

          // eslint-disable-next-line no-empty
        } catch {}
      }
      image.onerror = () => {
        try {
          if (placeholderRef && placeholderRef.current) {
            placeholderRef.current.innerHTML = `<p style="color: currentColor; filter: invert(100%) brightness(1.5)"><span>图片加载失败!</span><br/>
            <a href="${escapeHTMLTag(
              image.src,
            )}" target="_blank">${escapeHTMLTag(image.src)}</a></p>`
            placeholderRef.current.style.zIndex = '2'
          }
          // eslint-disable-next-line no-empty
        } catch {}
      }
    }
  }, [placeholderRef, src])

  const imageRef = useRef<HTMLImageElement>(null)

  useEffect(() => {
    if (!popup) {
      return
    }
    const $image = imageRef.current
    if ($image) {
      mediumZoom($image, {
        background: 'var(--light-bg)',
        margin: 50,
      })
    }
  }, [popup])
  return (
    <>
      <div
        className={classNames(
          styles['lazyload-image'],
          !loaded && styles['image-hide'],
        )}
        data-status={loaded ? 'loaded' : 'loading'}
      >
        <img src={src} alt={alt} ref={imageRef} />
      </div>
    </>
  )
})

export const ImageLazy: FC<
  ImageProps &
    DetailedHTMLProps<ImgHTMLAttributes<HTMLImageElement>, HTMLImageElement>
> = memo((props) => {
  const {
    defaultImage,
    src,
    alt = src,
    height,
    width,
    backgroundColor,
    popup = false,
    style,
    overflowHidden = false,
    ...rest
  } = props

  const realImageRef = useRef<HTMLImageElement>(null)
  const placeholderRef = useRef<HTMLDivElement>(null)

  const wrapRef = useRef<HTMLDivElement>(null)

  return (
    <figure style={style} className="inline-block">
      {defaultImage ? (
        <img src={defaultImage} alt={alt} {...rest} ref={realImageRef} />
      ) : (
        <div
          className="relative max-w-full m-auto inline-block"
          style={{
            transition: 'height .3s, width .3s',
            height,
            width,

            ...(overflowHidden
              ? { overflow: 'hidden', borderRadius: '3px' }
              : {}),
          }}
          ref={wrapRef}
        >
          <LazyImage
            src={src}
            alt={alt}
            loadEagerly={!isClientSide()}
            placeholder={({ ref }) => (
              <PlaceholderImage
                ref={ref}
                height={height}
                width={width}
                backgroundColor={backgroundColor}
              />
            )}
            actual={(props) => {
              return (
                <Image
                  className={classNames(
                    styles['image-hide'],
                    styles['lazyload-image'],
                    'inline-block',
                  )}
                  {...rest}
                  src={src}
                  alt={alt.replace(/^[!¡]/, '') || ''}
                  popup={popup}
                  {...{ placeholderRef }}
                  {...props}
                />
              )
            }}
            observerProps={
              isClientSide()
                ? {
                    rootMargin: '100px',
                  }
                : undefined
            }
          />
        </div>
      )}
      {alt && (alt.startsWith('!') || alt.startsWith('¡')) && (
        <figcaption className={styles['img-alt']}>{alt.slice(1)}</figcaption>
      )}
    </figure>
  )
})

const PlaceholderImage = memo(
  forwardRef<
    HTMLDivElement,
    { ref: any; className?: string } & Partial<ImageProps>
  >((props, ref) => {
    const { backgroundColor, height, width } = props
    return (
      <div
        className={classNames(styles['placeholder-image'], props.className)}
        ref={ref}
        style={{
          height,
          width,
          color: backgroundColor,
        }}
      ></div>
    )
  }),
)
export const ImageLazyWithPopup: FC<
  { src: string; alt?: string } & Partial<
    ImageProps &
      ClassAttributes<HTMLImageElement> &
      ImgHTMLAttributes<HTMLImageElement>
  >
> = (props) => {
  const { src, alt, height, width, ...rest } = props
  return (
    <ImageLazy
      src={src}
      alt={alt || src}
      height={height}
      width={width}
      popup
      {...rest}
    ></ImageLazy>
  )
}