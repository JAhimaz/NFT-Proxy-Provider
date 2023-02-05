import express, { Express } from 'express';
import WebSocket from 'ws';
import dotenv from 'dotenv';
import { RMRK1Provider, RMRK2Provider } from './providers';
import { StatemineProvider } from './providers/Statemine/StatemineProvider';
import { NFTData } from './providers/types';

dotenv.config();

const wss = new WebSocket.Server({ port: 8080 });

wss.on('connection', (ws) => {
  console.log('Ramen NFT API connected');
  ws.on('message', async (address) => {

    const userAddress: string = address.toString();

    const nftData = {
      address: userAddress,
      nfts: [],
      count: 0,
      isFetching: true,
      error: undefined,
    } as NFTData;
    
    if(!userAddress) {
      ws.send(JSON.stringify({ ...nftData, error: "No Address Provided"}));
      return;
    }

    const providerFactory = [
      new RMRK2Provider(),
      new RMRK1Provider(),
      new StatemineProvider(),
    ]

    Promise.allSettled([
      ...providerFactory.map((provider) => 
      provider.fetchNFTsByAddress(userAddress))
    ]).then((results) => {
      results.forEach((result) => {
        if (result.status === 'fulfilled') {
          if(result.value === undefined) return;
          nftData.nfts = nftData?.nfts.concat(result.value?.nfts ?? []);
          nftData.count += result.value?.count ?? 0;
        }

        ws.send(JSON.stringify(nftData));
      });

      nftData.isFetching = false;
      ws.send(JSON.stringify(nftData));
    });

    ws.send(JSON.stringify(nftData));

  });
});