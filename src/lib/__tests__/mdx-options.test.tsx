import { renderToStaticMarkup } from 'react-dom/server'
import { MDXRemote } from 'next-mdx-remote/rsc'
import { describe, expect, it } from 'vitest'
import { MDX_OPTIONS } from '../mdx-options'

describe('MDX_OPTIONS', () => {
  it('renders GFM pipe tables as <table> — course content relies on this constantly', async () => {
    const source = ['| A | B |', '| --- | --- |', '| uno | dos |'].join('\n')

    const element = await MDXRemote({ source, options: MDX_OPTIONS })
    const html = renderToStaticMarkup(element)

    expect(html).toContain('<table')
    expect(html).toContain('uno')
  })
})
