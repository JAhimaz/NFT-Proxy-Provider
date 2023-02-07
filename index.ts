import WebSocket from 'ws';
import dotenv from 'dotenv';
import { EVMProvider, RMRK1Provider, RMRK2Provider } from './providers';
import { StatemineProvider } from './providers/Statemine/StatemineProvider';
import { EVMChain, NFTData } from './providers/types';
import { ProviderInterface } from './providers/ProviderInterface';
import { EVMChains } from './providers/EVM/EVMChains';
import { isEthereumAddress } from '@polkadot/util-crypto';
import { isValidSubstrateAddress } from './providers/helpers';

dotenv.config();

const wss = new WebSocket.Server({ 
  port: 3000,
  perMessageDeflate: {
    zlibDeflateOptions: {
      // See zlib defaults.
      chunkSize: 1024,
      memLevel: 7,
      level: 3
    },
    zlibInflateOptions: {
      chunkSize: 10 * 1024
    },
    // Other options settable:
    clientNoContextTakeover: true, // Defaults to negotiated value.
    serverNoContextTakeover: true, // Defaults to negotiated value.
    serverMaxWindowBits: 10, // Defaults to negotiated value.
    // Below options specified as default values.
    concurrencyLimit: 10, // Limits zlib concurrency for perf.
    threshold: 1024 // Size (in bytes) below which messages
    // should not be compressed if context takeover is disabled.
  }
});

wss.on('connection', (ws) => {
  console.log('Ramen NFT API connected');
  ws.on('message', async (address) => {

    const startTime = Date.now();

    const userAddress: string = address.toString();

    const nftData = {
      address: userAddress,
      nfts: [],
      count: 0,
      isFetching: true,
      timeTaken: 0 + "ms",
      error: undefined,
    } as NFTData;

    if (!userAddress) {
      ws.send(JSON.stringify({ ...nftData, error: "No Address Provided" }));
      return;
    }

    const providerFactory: ProviderInterface[] = [];

    // These checks can help prevent unnecessary needs to use interfaces

    if (isValidSubstrateAddress(userAddress)) {
      // Checks if Address is a valid Substrate Address
      providerFactory.push(new RMRK1Provider(), new RMRK2Provider(), new StatemineProvider());
    }

    if (isEthereumAddress(userAddress)) {
      // Checks if Address is a valid Ethereum Address
      Object.values(EVMChains).map((chain: EVMChain) => providerFactory.push(new EVMProvider(chain)));
    }

    if (providerFactory.length === 0) {
      ws.send(JSON.stringify({ ...nftData, error: "Address is not a valid Substrate or Ethereum Address" }));
      return;
    }

    Promise.allSettled([
      ...providerFactory.map((provider) =>
        provider.fetchNFTsByAddress(userAddress))
    ]).then((results) => {
      results.forEach((result) => {
        if (result.status === 'fulfilled') {
          if (result.value === undefined) return;

          const nftPromiseResult: NFTData = result?.value;

          nftData.nfts = nftData?.nfts.concat(nftPromiseResult?.nfts ?? []);
          nftData.count += nftPromiseResult?.count ?? 0;
          nftData.timeTaken = Date.now() - startTime + "ms";
        }

        ws.send(JSON.stringify(nftData));
      });

      nftData.isFetching = false;
      nftData.timeTaken = Date.now() - startTime + "ms";
      ws.send(JSON.stringify(nftData));

      ws.close();
    });

    ws.send(JSON.stringify(nftData));

  });
});