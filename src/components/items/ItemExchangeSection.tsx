'use client'



import { ConsumeList } from '@/components/game/ConsumeList'

import type { ExchangeBlock } from '@/lib/game/item-business'

import type { ConsumeRefMap } from '@/lib/game/load-hero-talents-bundle'

import { UI_KEYS, useUiTranslation } from '@/lib/i18n/use-ui-translation'



const EXCHANGE_LABEL_KEYS: Record<string, string> = {

  compose: UI_KEYS.item.materialCompose,

  decompose: UI_KEYS.item.materialDecompose,

  exchange: UI_KEYS.item.materialExchange,

}



export function getExchangeSectionTitle(

  blocks: ExchangeBlock[],

  t: (key: string) => string

): string {

  const labelKey = blocks[0]?.labelKey ?? 'exchange'

  return t(EXCHANGE_LABEL_KEYS[labelKey] ?? UI_KEYS.item.materialExchange)

}



function BlockSubheading({ children }: { children: React.ReactNode }) {

  return <h3 className="mb-3 text-sm font-semibold text-foreground">{children}</h3>

}



type ItemExchangeSectionProps = {

  exchangeBlocks: ExchangeBlock[]

  consumeRefMap: ConsumeRefMap

  embedded?: boolean

}



export function ItemExchangeSection({

  exchangeBlocks,

  consumeRefMap,

  embedded = false,

}: ItemExchangeSectionProps) {

  const { t } = useUiTranslation()



  if (!exchangeBlocks.length) return null



  const blocksContent = exchangeBlocks.map((block, idx) => (

    <div

      key={`${block.labelKey}-${idx}`}

      className={idx > 0 ? 'mt-6 border-t border-border/60 pt-6' : undefined}

    >

      {!embedded ? (

        <h2 className="item-detail-section__title">

          {t(EXCHANGE_LABEL_KEYS[block.labelKey] ?? UI_KEYS.item.materialExchange)}

        </h2>

      ) : exchangeBlocks.length > 1 ? (

        <BlockSubheading>

          {t(EXCHANGE_LABEL_KEYS[block.labelKey] ?? UI_KEYS.item.materialExchange)}

        </BlockSubheading>

      ) : null}



      {!embedded && block.consume.length > 0 ? (

        <ConsumeList

          items={block.consume}

          consumeRefMap={consumeRefMap}

          layout="rewards"

          className={block.get.length > 0 ? '!mt-0 mb-4' : '!mt-0'}

        />

      ) : null}



      {block.get.length > 0 ? (

        <div>

          {!embedded && block.consume.length > 0 ? (

            <BlockSubheading>{t(UI_KEYS.common.preview)}</BlockSubheading>

          ) : null}

          <ConsumeList

            items={block.get}

            consumeRefMap={consumeRefMap}

            layout="rewards"

            className="!mt-0"

          />

        </div>

      ) : null}

    </div>

  ))



  if (embedded) {

    return <>{blocksContent}</>

  }



  return <section className="surface panel item-detail-section">{blocksContent}</section>

}

