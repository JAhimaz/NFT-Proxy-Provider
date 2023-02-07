import { ApiPromise, WsProvider } from "@polkadot/api";
import { encodeAddress } from "@polkadot/util-crypto";
import { ProviderInterface } from "../ProviderInterface";
import fetch from 'cross-fetch';
import { NFTItem } from "../types";
import { isValidSubstrateAddress } from "../helpers";

export class StatemineProvider extends ProviderInterface {
    name = "Statemine";
    tokenSymbol = "KSM";
    uri = 'wss://statemine.api.onfinality.io/public-ws';
    platformUri = 'https://singular.app/collectibles/statemine/';

    webSocket: ApiPromise | null = null;

      // Start the websocket
    async wsProvider() {
        const wsProvider = new WsProvider(this.uri)
        return ApiPromise.create({ provider: wsProvider, noInitWarn: true })
    }

    public async getTokenDetails(assetId: any): Promise<any> {
        if (!this.webSocket) return undefined

        const { collectionId, nftTokenId } = assetId

        // Fetch the metadata of the NFT by querying the collection ID and NFT item number. Since the return is toHuman(). We are unsure of the return type, so we use any.
        const metadataNft: any = (
            await this.webSocket.query.uniques.instanceMetadataOf(collectionId, nftTokenId)
        ).toHuman()

        // A check to see if there is any metadata, without the metadata, we're unable to fetch the media of the NFT.
        // Hence, we return null. Which will disregard the NFT altogether.
        if (!metadataNft?.data) return undefined

        // Get the NFT name, description and Media URI from the metadata using the base IPFS url.
        const metadata = await this.fetchNFTs_Metadata(metadataNft.data)

        // Return the promised data for token details
        return Promise.resolve({
            id: `${collectionId}-${nftTokenId}`,
            name: metadata?.name,
            description: metadata?.description,
            mediaUri: metadata?.mediaUri,
            serialNumber: nftTokenId,
            collectionId: collectionId,
        })
    }

    async fetchNFTs_Metadata(metadataId: string) {
        if (metadataId == null) return
        return fetch(this.baseIPFSUrl + metadataId)
          .then(res => res.json())
          .then(data => {
            return {
              name: data.name,
              description: data.description,
              mediaUri: this.toIPFSUrl(data.image),
              // Store Attributes / Properties as two seperate under ProtocolSpecificDetails
            }
        })
    }

    public async fetchNFTsByAddress(address: string) {

        // Check if the address starts with 0x, this determines if it is a valid substrate address
        if(!isValidSubstrateAddress(address)) return;

        // Set isFetching to true, so that the client knows that the provider is fetching NFTs
        this.isFetching = true;

        // Connect to the websocket
        this.webSocket = await this.wsProvider();

        // If websocket is not connected, return as it is invalid.
        if (!this.webSocket.isConnected) return;

        const encodedAddress = encodeAddress(address, 2);
        const rawNFTData = await this.webSocket.query.uniques.account.keys(encodedAddress) // CollectionID, NFTID
        
        const nfts = rawNFTData.map(async (key: any) => {

            const collectionId = key.args[1].toString().replaceAll(',', '')
            const nftTokenId = key.args[2].toString().replaceAll(',', '')

            const nftDetails = await this.getTokenDetails({
                collectionId, nftTokenId      
            })
            
            // resolve promise before returning
            return {
                id: nftDetails?.id,
                name: nftDetails?.name,
                description: nftDetails?.description,
                serialNumber: nftTokenId,
                attributes: {},
                platformUri: this.platformUri,
                tokenSymbol: this.tokenSymbol,
                thumb: nftDetails?.mediaUri,
                type: undefined,
                metadata: undefined,
                mediaUri: nftDetails?.mediaUri,
                provider: this.name,
                collection: {
                    id: collectionId,
                },
                address,
            } as NFTItem

            // Assign NFTDetails to an NFTItem and return it to the nfts list
        })

        const resolvedNfts = await Promise.all(nfts);
        this.count = resolvedNfts.length;

        // Disconnect from the websocket after fetching NFTs to prevent memory leaks
        this.webSocket.disconnect();

        return {
            nfts: resolvedNfts.filter(Boolean),
            count: this.count,
            address: address,
            isFetching: this.isFetching,
        }
    }
}