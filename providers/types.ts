export type NFTCategory =
  | 'image'
  | 'video'
  | 'model'
  | 'application'
  | 'audio'
  | 'pdf'
  | 'loading'
  | 'blank'
  | undefined

type NFTCollectionDetails = {
  id?: string
  name?: string
  totalCount?: number
  floorPrice?: string
}

type NFTAttributes = Record<string, any>

export type NFTItem = {
  id: string
  name: string
  description: string | undefined
  serialNumber?: number
  attributes: NFTAttributes
  platformUri: string | undefined
  tokenSymbol: string
  thumb: string | undefined
  type: NFTCategory
  metadata: string | undefined
  mediaUri: string | undefined
  provider: string
  collection: NFTCollectionDetails
  address: string
  nftSpecificData: any
}

export type NFTData = {
  nfts: NFTItem[]
  count: number
  isFetching: boolean
  address: string
  error?: string
}