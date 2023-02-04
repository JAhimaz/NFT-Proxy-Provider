import { encodeAddress } from "@polkadot/keyring";
import { hexToU8a, isHex } from "@polkadot/util";
import { decodeAddress } from "@polkadot/util-crypto";
import { NFTItem } from "./types";

export class ProviderInterface {
  name: string = "";
  baseIPFSUrl: string = "https://talisman.mypinata.cloud/ipfs/"
  tokenSymbol: string = "";
  count: number = 0;
  isFetching: boolean = false;
  nftItems: { [key: string] : NFTItem } = {};

  protected toIPFSUrl(url: string): string | undefined {
    if(url === undefined || url === null) return undefined;
    if (url.startsWith('ipfs://ipfs/')) return url.replace('ipfs://ipfs/', this.baseIPFSUrl);
    if (url.startsWith('ipfs://')) return url.replace('ipfs://', this.baseIPFSUrl);
    return url;
  }

  public fetchNFTsByAddress(address: string) {}

  public fetchOneById(id: string) : NFTItem | undefined {
    return undefined;
  }

  protected isValidSubstrateAddress(address: string): boolean {
    try {
      encodeAddress(
        isHex(address)
          ? hexToU8a(address)
          : decodeAddress(address)
      );

      return true;
    } catch ( error ) {
      return false;
    }
  };
}