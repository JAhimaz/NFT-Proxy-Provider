import fetch from 'cross-fetch';
import { ApolloClient } from "@apollo/client";
import { createHttpLink, gql, InMemoryCache } from "@apollo/client/core";
import { encodeAddress } from "@polkadot/util-crypto";
import { ProviderInterface } from "../ProviderInterface";
import { NFTItem } from '../types';
import { isValidSubstrateAddress } from '../helpers';

const RMRK1_QUERY = gql`
  query RMRK1($address: String!) {
    nfts(where: { owner: { _eq: $address }, burned: { _eq: "" } }) {
      id
      sn
      metadata
      metadata_name
      metadata_description
      metadata_animation_url
      metadata_image
      metadata_content_type
      collection {
        id
        name
        max
      }
    }
  }
`

export class RMRK1Provider extends ProviderInterface {
  name = "RMRK1";
  tokenSymbol = "KSM";
  // Specific to RMRK1
  graphQLUri = "https://gql-rmrk1.rmrk.link/v1/graphql";
  // The collectibles platform URI
  platformUri = "https://singular.rmrk.app/collectibles/"
  // The collectibles collection URI
  collectionUri = 'https://singular.rmrk.app/api/stats/collection/'
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
    if(!isValidSubstrateAddress(address)) return;

    // Set isFetching to true, so that the client knows that the provider is fetching NFTs
    this.isFetching = true;

    // Get the client
    const client = await this.getClient();
    // This encodes the address to the required ss58 format
    const encodedAddress = encodeAddress(address, 2); // In this case, Kusama

    // const itemIdMap: { [key: string] : string } = {};

    const nfts = await client.query({
      query: RMRK1_QUERY,
      variables: {
        address: encodedAddress
      }
    }).then(({ data } : any ) => {  
      const items : NFTItem[] = data?.nfts.map((nft: any) => {

        const thumb = this.toIPFSUrl(nft?.metadata_image || nft?.metadata_animation_url)
        const mediaUri = this.toIPFSUrl(nft?.metadata_animation_url || nft?.metadata_image )
        const type = nft?.metadata_content_type.split('/')[0]

        // if(!mediaUri) return undefined;

        return {
          id: nft.id,
          name: nft?.metadata_name,
          description: nft?.metadata_description,
          serialNumber: nft?.sn.replace(/^0+/, ''),
          attributes: nft?.metadata_properties || [],
          platformUri: this.platformUri,
          tokenSymbol: this.tokenSymbol,
          thumb,
          type,
          metadata: this.toIPFSUrl(nft?.metadata),
          mediaUri,
          provider: this.name,
          collection: {
            id: nft?.collection?.id,
            name: nft?.collection?.name,
            totalCount: nft?.collection?.max,
          },
          address,
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