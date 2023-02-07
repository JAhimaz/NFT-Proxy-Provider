import fetch from "cross-fetch";
import { ethers } from "ethers";
import { ProviderInterface } from "../ProviderInterface";
import { Contract, EVMChain, NFTItem } from "../types";
import { abi } from "./ABI";

export class EVMProvider extends ProviderInterface {
  name = "EVM";
  tokenSymbol = "ETH";
  rpc: string[] = [];
  contracts: Contract = {};
  platformUri: string = "";
  web3: ethers.providers.JsonRpcProvider | undefined = undefined;
  chainId: number;

  constructor(config: EVMChain) {
    super();
    this.name = config.name;
    this.tokenSymbol = config.chainCurrency;
    this.rpc = config.rpc;
    this.contracts = config.contracts;
    this.platformUri = config.platformExternalLink;
    this.chainId = config.chainId;
  }

  typeCheck(mediaUri: string): string | undefined {
    if (!mediaUri) return undefined
    // check if media uri ends with png, jpg or gif
    if (mediaUri.endsWith('.png') || mediaUri.endsWith('.jpg') || mediaUri.endsWith('.gif')) {
      return 'image'
    }
    // check if media uri ends with mp4
    if (mediaUri.endsWith('.mp4')) {
      return 'video'
    }
    return undefined
  }

  public async fetchNFTsByAddress(address: string) {
    // Checks if valid ethereum address
    if (!ethers.utils.isAddress(address)) {
      return;
    }
    
    // Sets fetching to true
    this.isFetching = true;

    const providers = await Promise.all(
      // map through each RPC on the list
      this.rpc.map(async rpc => {
        // Test the provider
        const provider = new ethers.providers.JsonRpcProvider(rpc);
        // Get the chainId of the provider
        const chainId = await provider
          .getNetwork()
          .then(network => network.chainId)
          .catch(() => undefined);

        // If the chainId does not match the chainId of the provider, return undefined
        if (chainId !== this.chainId || chainId === undefined) {
          return undefined;
        }

        // If the chainId matches, return the provider
        return rpc;
      })
    )

    // return first matching
    const provider = providers.find(p => p !== undefined);

    if (provider === undefined) {
      this.isFetching = false;
      return;
    }

    this.web3 = new ethers.providers.JsonRpcProvider(provider);

    if(this.web3 === undefined) {
      this.isFetching = false;
      return;
    }


    const nfts = Object.values(this.contracts).map(async (contract) => {
      try {
        const contractInstance = new ethers.Contract(
          contract.address,
          abi,
          this.web3
        );

        const prebalance = await contractInstance.balanceOf(address);
        const preContractTotalSupply = await contractInstance.totalSupply();

        const balance = ethers.BigNumber.from(prebalance).toNumber();
        const contractTotalSupply = ethers.BigNumber.from(preContractTotalSupply).toNumber();

        const perContractNFTs = await Promise.all(
          Array.from(Array(balance).keys()).map(async (index) => {
            const preTokenId = await contractInstance.tokenOfOwnerByIndex(address, index);
            const tokenId = ethers.BigNumber.from(preTokenId).toNumber();
            const tokenURI = this.toIPFSUrl(await contractInstance.tokenURI(tokenId));

            if(tokenURI === undefined){
              return;
            };

            const nftDetails = await fetch(tokenURI).then(res => res.json());

            return ({
              id: tokenId + "-" + contract.name,
              name: nftDetails?.name ?? contract.name,
              description: nftDetails?.description,
              serialNumber: nftDetails?.edition ?? tokenId ?? "-",
              attributes: nftDetails?.attributes ?? {},
              platformUri: this.platformUri,
              tokenSymbol: this.tokenSymbol,
              thumb: this.toIPFSUrl(nftDetails?.image),
              type: this.typeCheck(nftDetails?.animation_url ?? nftDetails?.image),
              metadata: undefined,
              mediaUri: this.toIPFSUrl(nftDetails?.animation_url ?? nftDetails?.image),
              provider: this.name,
              collection: {
                name: contract.name,
                id: contract.address,
                totalSupply: contractTotalSupply,
              },
              address,
            } as NFTItem)
        }))

        return perContractNFTs.filter(nft => nft !== undefined);

        } catch (error) {
          console.log({
            contractName: contract.name,
            contractAddress: contract.address,
            error
          });
        }
    })

    const resolvedNfts = await Promise.all(nfts);

    this.isFetching = false;

    return {
      nfts: resolvedNfts.filter(Boolean),
      count: resolvedNfts.length,
      address: address,
      isFetching: this.isFetching
    }

  }
}