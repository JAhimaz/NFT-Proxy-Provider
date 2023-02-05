import fetch from 'cross-fetch';
import { ApolloClient } from "@apollo/client";
import { createHttpLink, gql, InMemoryCache } from "@apollo/client/core";
import { encodeAddress } from "@polkadot/util-crypto";
import { ProviderInterface } from "../ProviderInterface";
import { NFTItem } from '../types';

const RMRK2_QUERY = gql`
  query RMRK2($address: String!) {
    nfts(where: { owner: { _eq: $address }, burned: { _eq: "" } }) {
      id
      sn
      symbol
      metadata
      metadata_name
      metadata_image
      metadata_description
      metadata_properties
      children {
        id
        metadata_name
        metadata_image
        sn
      }
      resources {
        metadata_content_type
        thumb
        src
      }
      collection {
        id
        metadata_name
        max
      }
    }
  }
`

export class RMRK2Provider extends ProviderInterface {
  name = "RMRK2";
  tokenSymbol = "KSM";
  // Specific to RMRK2
  graphQLUri = "https://gql-rmrk2-prod.graphcdn.app";
  // The collectibles platform URI
  platformUri = "https://singular.app/collectibles/"
  // The collectibles collection URI
  collectionUri = 'https://singular.app/api/stats/collection/'
  // Client for the Apollo GraphQL client
  client: any

  async getClient() {
    // If a client already exists, return it
    if (this.client) return this.client;
    
    // Otherwise, create a new client
    this.client = new ApolloClient({
      link: createHttpLink({ uri: this.graphQLUri, fetch }),
      cache: new InMemoryCache(),
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': 'true',
      }
    });

    // Once the client is created, return it
    return this.client;
  }

  public async fetchNFTsByAddress(address: string) {

    // Check if the address starts with 0x, this determines if it is a valid substrate address
    if(!this.isValidSubstrateAddress(address)) return;

    // Set isFetching to true, so that the client knows that the provider is fetching NFTs
    this.isFetching = true;

    // Get the client
    const client = await this.getClient();
    // This encodes the address to the required ss58 format
    const encodedAddress = encodeAddress(address, 2); // In this case, Kusama

    // const itemIdMap: { [key: string] : string } = {};

    const nfts : NFTItem[] = await client.query({
      query: RMRK2_QUERY,
      variables: {
        address: encodedAddress
      }
    }).then(({ data } : any ) => {  
      const items = data?.nfts.map((nft: any) => {
        const mediaUri = !!nft?.resources?.[0]?.src 
        ? this.toIPFSUrl(nft?.resources?.[0]?.src)
        : !!nft?.metadata_image
        ? this.toIPFSUrl(nft?.metadata_image)
        : undefined;

        // if(!mediaUri) return undefined;

        return {
          id: nft.id,
          name: nft?.metadata_name,
          description: nft?.metadata_description,
          serialNumber: nft?.sn,
          attributes: nft?.metadata_properties,
          platformUri: this.platformUri,
          tokenSymbol: this.tokenSymbol,
          thumb: nft?.resources?.[0]?.thumb,
          type: nft?.resources?.[0]?.metadata_content_type || undefined,
          metadata: this.toIPFSUrl(nft?.metadata),
          mediaUri,
          provider: this.name,
          collection: {
            id: nft?.collection?.id,
            name: nft?.collection?.metadata_name,
            totalCount: nft?.collection?.max,
          },
          address,
          nftSpecificData: {
            children: nft?.children?.map((child: any) => {
              return {
                id: child?.id,
                name: child?.metadata_name,
                serialNumber: child?.sn,
                thumb: child?.metadata_image,
              }
            })
          }
        } as NFTItem
      });

      this.count = items?.length ?? 0;

      return items;

    }).catch((error: any) => {
      console.log(error);
    });

    // Set isFetching to false, so that the client knows that the provider is done fetching NFTs
    this.isFetching = false;
    
    return {
      nfts: nfts.filter(Boolean),
      count: this.count,
      address: address,
      isFetching: this.isFetching,
    }
  }
}