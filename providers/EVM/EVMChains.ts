import { EVMChain } from "../types";

export const EVMChains: { [key: string]: EVMChain } = {

  // Moonbeam

  moonbeam: {
    name: "Moonbeam",
    chainId: 1284,
    chainCurrency: "GLMR",
    rpc: ['https://moonbeam.api.onfinality.io/public'],
    platformExternalLink: 'https://moonbeam.moonscan.io/address/',
    contracts: {
      talismanghosts: {
        address: '0xDF67E64DC198E5287a6a625a4733841bD147E584',
        name: 'Ghosts of the Past',
        symbol: 'GOTP',
      },
    }
  },

  // Polygon

  polygon: {
    name: "Polygon",
    chainId: 137,
    chainCurrency: "MATIC",
    rpc: ['https://polygon-mainnet.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161'],
    platformExternalLink: 'https://polygonscan.com/address/',
    contracts: {
      snookNFT: {
        address: '0x4372597f1c600D86598675DCB6cF5713bB7525Cf',
        name: 'Snook NFT',
        symbol: 'SNK',
      },
    }
  }
}